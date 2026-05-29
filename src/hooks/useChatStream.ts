// ============================================================
// useChatStream.ts — Production Supabase Realtime Chat Hook
// ============================================================
//
// ARCHITECTURE NOTES:
// ─────────────────────────────────────────────────────────────
// This hook implements a two-layer subscription strategy:
//
// 1. POSTGRES CHANGES (CDC): Subscribes to WAL-based change
//    data capture for INSERT/UPDATE/DELETE on the `messages`
//    table. This is the primary real-time delivery mechanism.
//    Filter: conversation_id=eq.{id} ensures per-tenant,
//    per-conversation isolation without a broadcast storm.
//
// 2. BROADCAST (Optional Layer): For ephemeral events like
//    typing indicators that should NOT be persisted to DB.
//    Uses Supabase Realtime's broadcast primitive.
//
// PERFORMANCE:
//    - Messages are deduplicated via a Map<id, Message> ref
//      to prevent React state thrashing on rapid inserts.
//    - Optimistic updates: caller can invoke `sendMessage`
//      which immediately appends a 'sending' status message,
//      then the Realtime subscription confirms/updates it.
//
// SECURITY:
//    - RLS policies on the `messages` table ensure the
//      authenticated Supabase session can only read messages
//      belonging to the agent's organization.
//    - No client-side filtering is trusted for security;
//      server-side RLS is the enforcement boundary.
// ─────────────────────────────────────────────────────────────

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type { Message, UUID } from '../types';

// ── Supabase Client Interface (decoupled for testability) ─────
// In production this is imported from `@/lib/supabase`:
//   import { supabase } from '@/lib/supabase'
// We define a minimal interface here so the hook is fully typed
// without requiring a live Supabase connection in demo mode.

interface RealtimeChannel {
  on: (
    event: 'postgres_changes' | 'broadcast',
    opts: Record<string, unknown>,
    callback: (payload: RealtimePayload) => void
  ) => RealtimeChannel;
  subscribe: (
    callback?: (status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR', err?: Error) => void
  ) => RealtimeChannel;
  unsubscribe: () => Promise<void>;
  send: (payload: BroadcastPayload) => Promise<void>;
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<Message>;
  old: Partial<Message>;
  errors: string[] | null;
}

interface BroadcastPayload {
  type: 'broadcast';
  event: string;
  payload: Record<string, unknown>;
}

interface SupabaseClient {
  channel: (name: string) => RealtimeChannel;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: Message[] | null; error: Error | null }>;
        };
      };
    };
    insert: (row: Partial<Message>) => Promise<{ data: Message | null; error: Error | null }>;
  };
}

// ── Hook Options ──────────────────────────────────────────────

interface UseChatStreamOptions {
  /** Supabase JS v2 client instance */
  supabase: SupabaseClient;
  /** Target conversation to stream */
  conversationId: UUID;
  /** Number of historical messages to backfill on mount */
  initialPageSize?: number;
  /** Called when the Realtime subscription status changes */
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
  /** Called on any Realtime error */
  onError?: (error: Error) => void;
}

// ── Hook Return Shape ─────────────────────────────────────────

interface UseChatStreamReturn {
  /** Ordered array of messages (ascending by created_at) */
  messages: Message[];
  /** True while loading initial page of messages */
  isLoading: boolean;
  /** True when Realtime subscription is SUBSCRIBED */
  isConnected: boolean;
  /** Non-null when any fetch/realtime error occurs */
  error: Error | null;
  /** IDs of agents currently typing (ephemeral, via Broadcast) */
  typingAgents: UUID[];
  /** Send a new message with optimistic UI update */
  sendMessage: (content: string, senderId: UUID) => Promise<void>;
  /** Broadcast a typing indicator (not persisted to DB) */
  setTyping: (agentId: UUID, isTyping: boolean) => Promise<void>;
  /** Manually refresh message history (e.g., after reconnect) */
  refresh: () => Promise<void>;
}

// ── Typing Indicator Debounce (ms) ───────────────────────────
const TYPING_BROADCAST_DEBOUNCE = 2500;

// ═════════════════════════════════════════════════════════════
// THE HOOK
// ═════════════════════════════════════════════════════════════

export function useChatStream({
  supabase,
  conversationId,
  initialPageSize = 50,
  onStatusChange,
  onError,
}: UseChatStreamOptions): UseChatStreamReturn {

  // ── State ──────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [typingAgents, setTypingAgents] = useState<UUID[]>([]);

  // ── Refs (stable across renders, no re-subscription) ───────
  // messageMap prevents duplicate messages on WS reconnect
  const messageMapRef = useRef<Map<UUID, Message>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Typing timeout refs per agent to auto-clear stale indicators
  const typingTimeoutsRef = useRef<Map<UUID, ReturnType<typeof setTimeout>>>(new Map());
  const isMountedRef = useRef(true);

  // ── Derived: sorted messages array from the map ────────────
  // Recomputed only when the map changes, not on every render
  const sortedMessages = useMemo(
    () =>
      Array.from(messageMapRef.current.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    // messages state is used as the memo dependency trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]
  );

  // ── fetchHistory: backfills messages on mount / refresh ────
  const fetchHistory = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*, sender:users(id, full_name, avatar_url, role)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(initialPageSize);

      if (fetchError) throw fetchError;
      if (!isMountedRef.current) return;

      // Populate the deduplication map
      messageMapRef.current.clear();
      (data ?? []).forEach((msg) => messageMapRef.current.set(msg.id, msg));

      // Trigger re-render via state update
      setMessages([...messageMapRef.current.values()]);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      onError?.(e);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [supabase, conversationId, initialPageSize, onError]);

  // ── handleRealtimeMessage: processes CDC payloads ──────────
  const handleRealtimeMessage = useCallback((payload: RealtimePayload) => {
    if (!isMountedRef.current) return;

    if (payload.eventType === 'INSERT' && payload.new.id) {
      const incoming = payload.new as Message;
      // Upsert into dedup map (handles the race between
      // optimistic insert and confirmed Realtime event)
      messageMapRef.current.set(incoming.id, {
        ...messageMapRef.current.get(incoming.id), // preserve optimistic data
        ...incoming,                               // overwrite with server truth
        status: 'delivered',
      });
      setMessages([...messageMapRef.current.values()]);
    }

    if (payload.eventType === 'UPDATE' && payload.new.id) {
      const updated = payload.new as Partial<Message>;
      const existing = messageMapRef.current.get(updated.id!);
      if (existing) {
        messageMapRef.current.set(updated.id!, { ...existing, ...updated });
        setMessages([...messageMapRef.current.values()]);
      }
    }

    if (payload.eventType === 'DELETE' && payload.old.id) {
      messageMapRef.current.delete(payload.old.id);
      setMessages([...messageMapRef.current.values()]);
    }
  }, []);

  // ── clearTypingAgent: removes a typing indicator ───────────
  const clearTypingAgent = useCallback((agentId: UUID) => {
    setTypingAgents((prev) => prev.filter((id) => id !== agentId));
    typingTimeoutsRef.current.delete(agentId);
  }, []);

  // ── handleBroadcast: processes ephemeral typing events ─────
  const handleBroadcast = useCallback(
    (payload: RealtimePayload & { payload?: { agent_id: UUID; is_typing: boolean } }) => {
      const { agent_id, is_typing } = (payload as unknown as { payload: { agent_id: UUID; is_typing: boolean } }).payload;

      if (is_typing) {
        setTypingAgents((prev) =>
          prev.includes(agent_id) ? prev : [...prev, agent_id]
        );
        // Auto-clear after debounce period (client dropped without sending stop)
        const existing = typingTimeoutsRef.current.get(agent_id);
        if (existing) clearTimeout(existing);
        const timeout = setTimeout(
          () => clearTypingAgent(agent_id),
          TYPING_BROADCAST_DEBOUNCE + 500 // small buffer over sender's debounce
        );
        typingTimeoutsRef.current.set(agent_id, timeout);
      } else {
        clearTypingAgent(agent_id);
      }
    },
    [clearTypingAgent]
  );

  // ── Effect: bootstrap subscription ────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Backfill history
    fetchHistory();

    // 2. Create the Realtime channel scoped to this conversation
    //    Channel name includes conversation_id for clean isolation.
    //    Supabase Realtime supports up to 200 concurrent channels.
    const channelName = `conversation:${conversationId}`;
    const channel = supabase.channel(channelName)
      // CDC subscription — filtered server-side via Postgres row filter
      .on(
        'postgres_changes',
        {
          event: '*',                          // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleRealtimeMessage
      )
      // Ephemeral broadcast for typing indicators
      .on(
        'broadcast',
        { event: 'typing' },
        handleBroadcast
      )
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          onStatusChange?.('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          const subscribeError = err ?? new Error('Realtime channel error');
          setError(subscribeError);
          onStatusChange?.('error');
          onError?.(subscribeError);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          onStatusChange?.('disconnected');
        }
      });

    channelRef.current = channel;

    // 3. Cleanup on unmount or conversationId change
    return () => {
      isMountedRef.current = false;
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach(clearTimeout);
      typingTimeoutsRef.current.clear();
      // Unsubscribe from Realtime channel
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, fetchHistory, handleRealtimeMessage, handleBroadcast, onStatusChange, onError]);

  // ── sendMessage: optimistic insert + DB write ──────────────
  const sendMessage = useCallback(
    async (content: string, senderId: UUID) => {
      // Optimistic ID — replaced by server UUID on confirmation
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: Message = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: 'agent',
        message_type: 'outgoing',
        content,
        status: 'sending', // Spinner shown in UI
        attachments: [],
        metadata: {},
        ai_processed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Immediately update local state (optimistic UI)
      messageMapRef.current.set(optimisticId, optimisticMessage);
      setMessages([...messageMapRef.current.values()]);

      try {
        // 2. Persist to Supabase — RLS ensures sender must be authenticated
        const { data: inserted, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            sender_type: 'agent',
            message_type: 'outgoing',
            content,
            status: 'sent',
            attachments: [],
            metadata: {},
            ai_processed: false,
          });

        if (insertError) throw insertError;

        // 3. Replace optimistic message with server-confirmed message
        //    (The Realtime INSERT event will also fire, but dedup map handles it)
        if (inserted) {
          messageMapRef.current.delete(optimisticId);
          messageMapRef.current.set((inserted as unknown as Message).id, inserted as unknown as Message);
          setMessages([...messageMapRef.current.values()]);
        }
      } catch (err) {
        // 4. Mark optimistic message as failed
        const failed = messageMapRef.current.get(optimisticId);
        if (failed) {
          messageMapRef.current.set(optimisticId, { ...failed, status: 'failed' });
          setMessages([...messageMapRef.current.values()]);
        }
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
      }
    },
    [supabase, conversationId, onError]
  );

  // ── setTyping: broadcasts ephemeral typing state ───────────
  const setTyping = useCallback(
    async (agentId: UUID, isTyping: boolean) => {
      if (!channelRef.current) return;
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { agent_id: agentId, is_typing: isTyping },
      });
    },
    []
  );

  return {
    messages: sortedMessages,
    isLoading,
    isConnected,
    error,
    typingAgents,
    sendMessage,
    setTyping,
    refresh: fetchHistory,
  };
}

// ── Companion: useConversationList ────────────────────────────
// Subscribes to ALL conversations for the current org,
// keeping the inbox sidebar count and last-message live.

export interface UseConversationListOptions {
  supabase: SupabaseClient;
  organizationId: UUID;
}

export function useConversationList({
  supabase,
  organizationId,
}: UseConversationListOptions) {
  const [conversationIds, setConversationIds] = useState<UUID[]>([]);

  useEffect(() => {
    // Subscribe to any message insert across the org
    // This drives the "unread count" badge in the sidebar
    const channel = supabase
      .channel(`org:${organizationId}:inbox`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // No row filter — we need org-wide visibility
          // RLS enforces org isolation at the Postgres level
        },
        (payload: RealtimePayload) => {
          const convId = payload.new.conversation_id;
          if (convId) {
            // Surface conversation to top of inbox
            setConversationIds((prev) =>
              prev.includes(convId)
                ? [convId, ...prev.filter((id) => id !== convId)]
                : [convId, ...prev]
            );
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [supabase, organizationId]);

  return { conversationIds };
}
