import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Send, Paperclip,
  Smile, CheckCheck, ArrowLeft, Sparkles, Phone,
  MessageCircle, Wifi, Cpu,
  Loader2, Lock, Plus, X, ChevronDown,
  ChevronLeft, ChevronRight, PanelRightClose
} from 'lucide-react';
import type { Conversation, Message, ConversationStatus, ChannelType, CustomerTier } from '../types';
import { currentAgent } from '../data/appConfig';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { useTwilioVoice } from '../hooks/useTwilioVoice';
import { StatusBadge, PriorityBadge, TierBadge, TicketBadge } from './ui/Badge';
import { TagBadge } from './ui/TagBadge';
import { TagPicker } from './ui/TagPicker';
import { OnboardingFlow } from './OnboardingFlow';
import { ConversationDetailsSidebar } from './ConversationDetailsSidebar';
import { ConvItem } from './conv/ConvItem';
import { MessageBubble } from './conv/MessageBubble';
import { AgentAssignDropdown } from './conv/AgentAssignDropdown';
import { FilterBar } from './conv/FilterBar';

// ─── Chat Panel ───────────────────────────────────────────────

function ChatPanel({ 
  conv, 
  onBack,
  onUpdateConversation,
  cannedReplies = [],
  refreshTrigger = 0,
  agents = [],
  tags = [],
  onTagsChange,
  rightCollapsed,
  setRightCollapsed,
  rightWidth,
  handleMouseDown,
  rightSidebarRef,
  isResizingRight
}: { 
  conv: Conversation; 
  onBack: () => void;
  onUpdateConversation: (id: string, fields: Partial<Conversation>) => void;
  cannedReplies?: any[];
  refreshTrigger?: number;
  agents?: any[];
  tags?: any[];
  onTagsChange?: (tags: any[]) => void;
  rightCollapsed: boolean;
  setRightCollapsed: (val: boolean) => void;
  rightWidth: number;
  handleMouseDown: (side: 'left' | 'right') => void;
  rightSidebarRef?: React.RefObject<HTMLDivElement | null>;
  isResizingRight?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [rephrasing, setRephrasing] = useState(false);
  const { twilioConfig, makeCall } = useTwilioVoice();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingAgents, setTypingAgents] = useState<{ id: string; name: string }[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    if (!loadingMsgs) {
      scrollToBottom();
    }
  }, [messages, loadingMsgs]);

  // Restore draft from localStorage when conversation changes
  useEffect(() => {
    const saved = localStorage.getItem(`letschat-draft:${conv.id}`);
    if (saved) setDraft(saved);
  }, [conv.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setDraft(base64String);
    };
    reader.readAsDataURL(file);
  };

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [queryClass, setQueryClass] = useState('Inquiry');
  const [category, setCategory] = useState('General');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [sendCsat, setSendCsat] = useState(true);
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/conversations/${conv.id}/summarize`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.summary) {
        onUpdateConversation(conv.id, {
          metadata: {
            ...(conv.metadata || {}),
            ai_summary: data.summary
          }
        });
      } else {
        alert('Failed to generate summary: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI summary. Please ensure the backend is running.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution notes');
      return;
    }
    setSubmittingResolve(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/conversations/${conv.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposition: {
            query_class: queryClass,
            category: category,
            resolution_notes: resolutionNotes.trim()
          },
          sendCsat: sendCsat
        })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateConversation(conv.id, {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          assigned_agent_id: null,
          metadata: {
            ...(conv.metadata || {}),
            disposition: {
              query_class: queryClass,
              category: category,
              resolution_notes: resolutionNotes.trim()
            },
            resolved_by: conv.assigned_agent_id || null,
            ...(sendCsat ? { csat: { status: 'requested', requested_at: new Date().toISOString() } } : {})
          }
        });
        setShowResolveModal(false);
        setResolutionNotes('');
      } else {
        alert('Failed to resolve conversation: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to resolve conversation. Please make sure the backend is running.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleRephrase = async () => {
    if (!draft.trim()) return;
    setRephrasing(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/rephrase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: draft,
          tone: 'professional'
        })
      });
      const data = await res.json();
      if (data.rephrased) {
        setDraft(data.rephrased);
      }
    } catch (err) {
      console.error('Failed to rephrase draft:', err);
    } finally {
      setRephrasing(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ConversationStatus) => {
    // Optimistic UI update
    onUpdateConversation(conv.id, { 
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
    });

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('conversations')
            .update({ 
              status: newStatus,
              resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
            })
            .eq('id', conv.id);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to update conversation status:', err);
        }
      }
    });
  };

  const handleAssignAgent = async (agentId: string | null) => {
    // Optimistic UI update
    onUpdateConversation(conv.id, { 
      assigned_agent_id: agentId,
      assigned_agent: agentId === currentAgent.id ? currentAgent as any : undefined
    });

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('conversations')
            .update({ assigned_agent_id: agentId })
            .eq('id', conv.id);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to assign agent:', err);
        }
      }
    });
  };

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setMessages([]);
          setLoadingMsgs(false);
        }
        return;
      }

      // Fetch initial messages
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (isMounted && data) {
        setMessages(data as Message[]);
        setLoadingMsgs(false);
      }

      // Use a unique name for the channel instance
      const channelName = `room-${conv.id}-${Date.now()}`;

      typingChannelRef.current = null;
      channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conv.id}`
        }, (payload) => {
          if (isMounted) {
            setMessages((prev) => {
              const newMsg = payload.new as Message;
              const exists = prev.some(m =>
                m.id === newMsg.id ||
                (m.sender_type === 'agent' && m.content === newMsg.content && (m.status === 'sending' || m.id.startsWith('msg-')))
              );
              if (exists) {
                return prev.map(m => {
                  if (m.id === newMsg.id || (m.sender_type === 'agent' && m.content === newMsg.content && (m.status === 'sending' || m.id.startsWith('msg-')))) {
                    return newMsg;
                  }
                  return m;
                });
              }
              return [...prev, newMsg];
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conv.id}`
        }, (payload) => {
          if (isMounted) {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
          }
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (!isMounted) return;
          const { agent_id, agent_name, is_typing } = payload.payload || {};
          if (agent_id === currentAgent.id) return;
          setTypingAgents(prev => {
            if (is_typing) {
              return prev.some(t => t.id === agent_id) ? prev : [...prev, { id: agent_id, name: agent_name || 'Someone' }];
            }
            return prev.filter(t => t.id !== agent_id);
          });
        })
        .subscribe();
      typingChannelRef.current = channel;
    });

    return () => {
      isMounted = false;
      setTypingAgents([]);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (channel) {
        import('../lib/supabase').then(({ supabase }) => supabase.removeChannel(channel));
      }
    };
  }, [conv.id, refreshTrigger]);
  const contact = conv.contact;
  const channelInfo = conv.channel;
  const agent = conv.assigned_agent;
  const tier = (contact?.metadata?.account_tier as CustomerTier) ?? 'standard';

  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [cannedMenuOpen, setCannedMenuOpen] = useState(false);
  const [windowExpired, setWindowExpired] = useState(false);
  const [cannedQuery, setCannedQuery] = useState('');
  const [cannedActiveIndex, setCannedActiveIndex] = useState(0);

  const filteredCanned = useMemo(() => {
    if (!cannedQuery) return cannedReplies;
    return cannedReplies.filter(r => r.shortcut.toLowerCase().includes(cannedQuery.toLowerCase()));
  }, [cannedReplies, cannedQuery]);

  const broadcastTyping = (isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    const ch = typingChannelRef.current;
    if (!ch || !ch.send) return;
    ch.send({ type: 'broadcast', event: 'typing', payload: { agent_id: currentAgent.id, agent_name: currentAgent.full_name, is_typing: isTyping } });
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2500);
    }
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    localStorage.setItem(`letschat-draft:${conv.id}`, val);
    broadcastTyping(val.trim().length > 0);
    const match = val.match(/\/(\w*)$/);
    if (match) {
      setCannedMenuOpen(true);
      setCannedQuery(match[1]);
      setCannedActiveIndex(0);
    } else {
      setCannedMenuOpen(false);
    }
  };

  const selectCannedResponse = (response: string) => {
    setDraft(prev => {
      return prev.replace(/\/(\w*)$/, response);
    });
    setCannedMenuOpen(false);
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    const content = draft.trim();
    broadcastTyping(false);
    setDraft('');
    localStorage.removeItem(`letschat-draft:${conv.id}`);
    setCannedMenuOpen(false);

    const isNote = composerMode === 'note';
    const msgMetadata = {
      ...(isNote ? { is_internal: true } : {}),
      sender_name: currentAgent.full_name,
      ...(replyToMessage ? {
        reply_to_message: {
          id: replyToMessage.id,
          content: replyToMessage.content,
          sender_type: replyToMessage.sender_type
        }
      } : {})
    };

    const newMsg: Message = {
      id: `msg-${Date.now()}`, conversation_id: conv.id, sender_id: currentAgent.id,
      sender_type: 'agent', message_type: 'outgoing', content: content,
      status: 'sending', attachments: [], 
      metadata: msgMetadata,
      ai_processed: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    
    setReplyToMessage(null);

    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);

    import('../lib/supabase').then(async ({ isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
          const res = await fetch(`${apiUrl}/api/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: conv.id,
              content: content,
              recipientPhone: contact?.whatsapp_number,
              senderId: currentAgent.id,
              senderName: currentAgent.full_name,
              isInternal: isNote,
              metadata: msgMetadata
            })
          });
          const data = await res.json();
          if (data.success) {
            setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered', id: data.message.id } : m));
            setWindowExpired(false);
          } else if (data.error === '24H_WINDOW_EXPIRED') {
            setMessages(prev => prev.filter(m => m.id !== newMsg.id));
            setWindowExpired(true);
          } else {
            setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'failed' } : m));
          }
        } catch (err) {
          console.error(err);
          setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'failed' } : m));
        }
      } else {
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m));
        }, 1000);
      }
    });
  };

  const handleTagToggle = async (tagId: string) => {
    const current = conv.tags || [];
    const next = current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId];
    onUpdateConversation(conv.id, { tags: next });
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) return;
      await supabase.from('conversations').update({ tags: next }).eq('id', conv.id);
    });
  };

  const handleCreateTag = async (name: string, color: string) => {
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured || !onTagsChange) return;
      const { data } = await supabase.from('tags').insert({
        organization_id: '00000000-0000-0000-0000-000000000001',
        name, color
      }).select().single();
      if (data) onTagsChange([...tags, data]);
    });
  };

  const lastMsgFromAgent = messages.length > 0 && messages[messages.length - 1]?.sender_type === 'agent';

  return (
    <div className="flex h-full w-full overflow-hidden theme-bg-panel relative">
      <div className="flex flex-col flex-1 h-full min-w-0 theme-bg-primary">
        {/* Chat header */}
        <div className="flex h-14 shrink-0 items-center gap-3 theme-bg-secondary px-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button onClick={onBack} className="rounded-lg p-1.5 theme-text-muted hover:bg-white/[0.03] hover:theme-text-main transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {contact && <Avatar size="sm"><AvatarImage src={contact.avatar_url} alt={contact.full_name || ''} /><AvatarFallback>{(contact.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold theme-text-main text-xs">{contact?.full_name ?? 'Unknown'}</span>
              <TicketBadge ticketId={conv.ticket_id} />
              <TierBadge tier={tier} />
              <StatusBadge status={conv.status} />
            </div>
            <div className="flex items-center gap-3 text-[9px] theme-text-muted mt-0.5">
              {contact?.whatsapp_number && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5 text-emerald-500/80" /><span className="theme-text-secondary font-mono">{contact.whatsapp_number}</span></span>}
              <span className="flex items-center gap-1">
                <Wifi className="h-2.5 w-2.5 text-emerald-500/80" />
                <span className="theme-text-secondary font-medium">WhatsApp</span>
                {channelInfo && <> · {channelInfo.name}</>}
              </span>
            </div>
            {(conv.tags || []).length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {(conv.tags || []).map(id => {
                  const tag = tags.find(t => t.id === id);
                  if (!tag) return null;
                  return <TagBadge key={tag.id} tag={tag} />;
                })}
              </div>
            )}
          </div>
          {typingAgents.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium animate-pulse shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {typingAgents[0].name} is typing...
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {agent ? (
              <div className="flex items-center gap-1.5 border theme-border bg-white/[0.01] px-2.5 py-1 rounded-lg">
                <Avatar size="sm"><AvatarFallback>{agent.full_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <span className="text-[11px] theme-text-secondary hidden sm:block truncate max-w-[80px]">{agent.full_name}</span>
                <button 
                  onClick={() => handleAssignAgent(null)}
                  className="text-[11px] text-red-500 hover:text-red-650 ml-1 font-bold transition-colors leading-none"
                  title="Unassign Agent"
                >
                  ×
                </button>
              </div>
            ) : (
              <AgentAssignDropdown agents={agents} currentAssignedId={conv.assigned_agent_id} onAssign={handleAssignAgent} />
            )}
            <PriorityBadge priority={conv.priority} />
            {tags.length > 0 && (
              <TagPicker
                tags={tags}
                selectedTagIds={conv.tags || []}
                onToggle={handleTagToggle}
                onCreate={handleCreateTag}
              />
            )}
            {tags.length === 0 && (
              <TagPicker
                tags={tags}
                selectedTagIds={conv.tags || []}
                onToggle={handleTagToggle}
                onCreate={handleCreateTag}
              />
            )}
            {contact?.whatsapp_number && twilioConfig.isEnabled && (
              <button
                onClick={() => makeCall(contact.whatsapp_number!)}
                className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.08] p-1.5 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer"
                title={`Call ${contact.full_name} via Twilio`}
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
            )}
            {conv.status === 'resolved' || conv.status === 'awaiting_response' ? (
              <button 
                onClick={() => handleUpdateStatus('open')}
                className="flex items-center gap-1 rounded-lg border border-blue-500/10 bg-blue-500/5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors duration-150 cursor-pointer"
              >
                Reopen
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setShowResolveModal(true)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleUpdateStatus('awaiting_response')}
                  disabled={!lastMsgFromAgent}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    lastMsgFromAgent
                      ? 'border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer'
                      : 'border-white/[0.04] bg-white/[0.01] text-zinc-500 dark:text-zinc-650 cursor-not-allowed'
                  }`}
                  title={lastMsgFromAgent ? 'Mark as awaiting customer reply' : 'Only available after you send a message'}
                >
                  Awaiting Reply
                </button>
              </>
            )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.08] p-1.5 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer"
              title={rightCollapsed ? "Expand Details Sidebar" : "Collapse Details Sidebar"}
            >
              <PanelRightClose className="h-3.5 w-3.5" style={{ transform: rightCollapsed ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative theme-bg-chat">
          {loadingMsgs ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="h-10 w-10 rounded-full bg-white/[0.02] border theme-border flex items-center justify-center mb-3">
                <MessageCircle className="h-5 w-5 theme-text-muted" />
              </div>
              <p className="text-xs font-semibold theme-text-secondary">No messages yet</p>
              <p className="text-[10px] theme-text-muted mt-1 max-w-[200px]">Send a template message or wait for the contact to start the chat.</p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  msg={msg} 
                  contact={conv.contact} 
                  agents={agents} 
                  onReply={() => setReplyToMessage(msg)}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Composer */}
        {conv.status === 'resolved' ? (
          <div className="border-t theme-border theme-bg-secondary p-5 flex flex-col items-center justify-center text-center gap-2 select-none">
            <Lock className="h-5 w-5 text-amber-500 animate-pulse" />
            <p className="text-xs font-bold theme-text-main">This conversation is resolved.</p>
            <p className="text-[10px] theme-text-muted max-w-md">
              You cannot send outbound messages. If the customer replies, the conversation will automatically reopen and be reassigned to you.
            </p>
          </div>
        ) : (
          <>
            {windowExpired && (
              <div className="border-t theme-border bg-rose-500/5 p-4 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-rose-400">24-Hour Window Expired</p>
                  <p className="text-[10px] theme-text-muted mt-1 leading-relaxed">
                    More than 24 hours have passed since the customer last replied. 
                    WhatsApp only allows replies within the 24-hour customer service window. 
                    Ask the customer to send a message to reopen the window.
                  </p>
                </div>
              </div>
            )}
            <div className="border-t theme-border theme-bg-secondary p-4 relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Quoted Reply context */}
              {replyToMessage && (
                <div className="mb-2.5 flex items-center justify-between rounded-xl bg-black/20 border-l-4 border-emerald-500/50 p-2.5 text-xs animate-slide-up">
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold theme-text-muted uppercase tracking-wider">
                      Replying to {replyToMessage.sender_type === 'agent' ? 'Agent' : 'Customer'}
                    </span>
                    <p className="truncate theme-text-secondary mt-0.5">{replyToMessage.content}</p>
                  </div>
                  <button 
                    onClick={() => setReplyToMessage(null)} 
                    className="p-1 theme-text-muted hover:theme-text-secondary cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Uploaded base64 image preview */}
              {draft.startsWith('data:image/') && (
                <div className="relative inline-block mb-3 p-1 bg-white/[0.04] border theme-border rounded-xl">
                  <img src={draft} className="h-20 max-w-[200px] object-cover rounded-lg" />
                  <button 
                    onClick={() => setDraft('')} 
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 cursor-pointer hover:bg-rose-500"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {showEmojiPicker && (
                <div className="absolute bottom-full right-4 mb-2 w-64 rounded-xl border theme-border theme-bg-panel shadow-2xl p-2.5 z-20 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😮‍💨', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '👍', '👎', '✊', '👊', '👏', '🙌', '🙏', '💪', '❤️', '💔', '🔥', '✨', '🎉'].map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setDraft(prev => prev + e);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-0.5 cursor-pointer"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cannedMenuOpen && filteredCanned.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-72 rounded-xl border theme-border theme-bg-panel shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                  <div className="px-3 py-1.5 border-b theme-border bg-white/[0.01] flex items-center justify-between">
                    <span className="text-[9px] font-bold theme-text-muted uppercase tracking-wider">Quick Shortcuts</span>
                    <span className="text-[9px] theme-text-muted font-semibold">Press Enter to select</span>
                  </div>
                  {filteredCanned.map((rep, idx) => (
                    <button
                      key={rep.shortcut}
                      onClick={() => selectCannedResponse(rep.text)}
                      onMouseEnter={() => setCannedActiveIndex(idx)}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between border-b theme-border-extra-subtle last:border-0 ${
                        idx === cannedActiveIndex ? 'bg-white/[0.03] theme-text-main' : 'theme-text-secondary hover:bg-white/[0.01]'
                      }`}
                    >
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">/{rep.shortcut}</span>
                      <span className="truncate max-w-[150px] theme-text-muted text-[10px]">{rep.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-2 px-1">
                <button
                  type="button"
                  onClick={() => setComposerMode('reply')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                    composerMode === 'reply'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'theme-text-muted hover:theme-text-secondary'
                  }`}
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode('note')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                    composerMode === 'note'
                      ? 'bg-amber-500/10 text-amber-455 border border-amber-500/20'
                      : 'theme-text-muted hover:theme-text-secondary'
                  }`}
                >
                  Internal Note
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-xl border theme-border bg-white/[0.01] p-3 focus-within:border-emerald-500/30 transition-all duration-200">
                <textarea
                  value={draft}
                  onChange={e => handleDraftChange(e.target.value)}
                  onKeyDown={e => {
                    if (cannedMenuOpen && filteredCanned.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCannedActiveIndex(prev => (prev + 1) % filteredCanned.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCannedActiveIndex(prev => (prev - 1 + filteredCanned.length) % filteredCanned.length);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        selectCannedResponse(filteredCanned[cannedActiveIndex].text);
                      } else if (e.key === 'Escape') {
                        setCannedMenuOpen(false);
                      }
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={composerMode === 'note' ? "Type an internal agent note... (visible only to team)" : "Type a reply... (Enter to send, / for shortcuts)"}
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-xs theme-text-main outline-none placeholder:theme-text-muted leading-relaxed"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg p-1.5 theme-text-muted hover:bg-white/[0.03] hover:theme-text-secondary transition-colors cursor-pointer"
                    title="Upload Image"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="rounded-lg p-1.5 theme-text-muted hover:bg-white/[0.03] hover:theme-text-secondary transition-colors cursor-pointer"
                    title="Insert Emoji"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                      composerMode === 'note'
                        ? 'border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10'
                        : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {composerMode === 'note' ? (
                      <>
                        <Lock className="h-3 w-3" />Note
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 px-1">
              {composerMode === 'note' ? (
                <>
                  <span className="text-[9px] text-amber-455 font-medium">Internal Note (Agent Only)</span>
                  <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                </>
              ) : (
                <>
                  <span className="text-[9px] theme-text-muted font-medium">Replying via WhatsApp</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                </>
              )}
              {composerMode !== 'note' && (
                <button 
                  onClick={handleRephrase}
                  disabled={rephrasing || !draft.trim()}
                  className="ml-auto text-[9px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium transition-colors flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rephrasing ? (
                    <>
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />Rephrasing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-2.5 w-2.5" />Rephrase with AI
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Resize Handle */}
      {!rightCollapsed && (
        <div 
          className="resize-handle hidden lg:block"
          onMouseDown={() => handleMouseDown('right')}
        />
      )}

      {/* Right Sidebar - Conversation Details */}
      <div 
        ref={rightSidebarRef}
        className={`hidden lg:flex flex-col shrink-0 h-full theme-bg-secondary overflow-y-auto ${isResizingRight ? '' : 'sidebar-transition'} ${rightCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{ width: rightCollapsed ? 0 : rightWidth, minWidth: rightCollapsed ? 0 : 220 }}
      >
        <ConversationDetailsSidebar
          conv={conv}
          onGenerateSummary={handleGenerateSummary}
          generatingSummary={generatingSummary}
          tags={tags}
          onMakeCall={contact?.whatsapp_number && twilioConfig.isEnabled ? (phone) => makeCall(phone) : undefined}
        />
      </div>

      {/* Resolve Disposition Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border theme-border theme-bg-panel shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">Ticket Resolution</h3>
              <button 
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer font-semibold"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Query Class</label>
                <select
                  value={queryClass}
                  onChange={e => setQueryClass(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs theme-text-secondary focus:border-emerald-500/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Inquiry" className="theme-bg-panel theme-text-secondary">Inquiry</option>
                  <option value="Complaint" className="theme-bg-panel theme-text-secondary">Complaint</option>
                  <option value="Request" className="theme-bg-panel theme-text-secondary">Request</option>
                  <option value="Other" className="theme-bg-panel theme-text-secondary">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs theme-text-secondary focus:border-emerald-500/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="General" className="theme-bg-panel theme-text-secondary">General</option>
                  <option value="Billing" className="theme-bg-panel theme-text-secondary">Billing / Payments</option>
                  <option value="Technical" className="theme-bg-panel theme-text-secondary">Technical Support</option>
                  <option value="Product Feature" className="theme-bg-panel theme-text-secondary">Product Feature Request</option>
                  <option value="Account" className="theme-bg-panel theme-text-secondary">Account Management</option>
                  <option value="Other" className="theme-bg-panel theme-text-secondary">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder="Provide details on how this ticket was resolved..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs theme-text-secondary placeholder:text-zinc-400 dark:placeholder:text-zinc-550 focus:border-emerald-500/30 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="sendCsat"
                  checked={sendCsat}
                  onChange={e => setSendCsat(e.target.checked)}
                  className="rounded border-white/[0.08] bg-white/[0.02] text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
                <label htmlFor="sendCsat" className="text-xs theme-text-secondary font-semibold cursor-pointer select-none">
                  Trigger automated CSAT feedback survey via WhatsApp
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingResolve}
                  className="w-full flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-500 focus:outline-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingResolve ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Main Inbox View ──────────────────────────────────────────

interface InboxViewProps {
  selectedConvId?: string | null;
  setSelectedConvId?: (id: string | null) => void;
}

export function InboxView({ selectedConvId: propSelectedConvId, setSelectedConvId: propSetSelectedConvId }: InboxViewProps = {}) {
  const [localSelectedConvId, localSetSelectedConvId] = useState<string | null>(null);
  const selectedConvId = propSelectedConvId !== undefined ? propSelectedConvId : localSelectedConvId;
  const setSelectedConvId = propSetSelectedConvId !== undefined ? propSetSelectedConvId : localSetSelectedConvId;
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [agents, setAgents] = useState<any[]>([]);

  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const leftCollapseBtnRef = useRef<HTMLButtonElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  // Sidebar resize state
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('letschat-left-sidebar-width');
    return saved ? parseInt(saved, 10) : 384;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('letschat-right-sidebar-width');
    return saved ? parseInt(saved, 10) : 288;
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

  const handleMouseDown = useCallback((side: 'left' | 'right') => {
    setIsResizing(side);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const startLeftX = leftSidebarRef.current ? leftSidebarRef.current.getBoundingClientRect().left : 208;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing === 'left') {
        const newWidth = Math.min(560, Math.max(240, e.clientX - startLeftX));
        if (leftSidebarRef.current) {
          leftSidebarRef.current.style.width = `${newWidth}px`;
        }
        if (leftCollapseBtnRef.current) {
          leftCollapseBtnRef.current.style.left = `${newWidth}px`;
        }
      } else if (isResizing === 'right') {
        const newWidth = Math.min(450, Math.max(220, window.innerWidth - e.clientX));
        if (rightSidebarRef.current) {
          rightSidebarRef.current.style.width = `${newWidth}px`;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (isResizing === 'left') {
        const finalWidth = Math.min(560, Math.max(240, e.clientX - startLeftX));
        setLeftWidth(finalWidth);
        localStorage.setItem('letschat-left-sidebar-width', String(finalWidth));
      } else if (isResizing === 'right') {
        const finalWidth = Math.min(450, Math.max(220, window.innerWidth - e.clientX));
        setRightWidth(finalWidth);
        localStorage.setItem('letschat-right-sidebar-width', String(finalWidth));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Advanced features state handles
  const [cannedReplies, setCannedReplies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [accessScope, setAccessScope] = useState<'all' | 'assigned'>('all');
  
  const [openTemplateModal, setOpenTemplateModal] = useState(false);
  const [templatePhone, setTemplatePhone] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Bulk selection
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const toggleSelected = (id: string) => setSelectedConvIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const [tags, setTags] = useState<any[]>([]);
  useEffect(() => {
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) return;
      const { data } = await supabase.from('tags').select('*').order('name');
      if (data) setTags(data);
    });
  }, []);

  // Set up periodic 5-second automatic polling
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isMounted) return;
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();
          if (data?.settings && isMounted) {
            setCannedReplies(data.settings.canned_responses || []);
            setTemplates(data.settings.whatsapp_templates || []);
            
            const scopes = data.settings.agent_access_scopes || {};
            const userScope = scopes[currentAgent.id] || (currentAgent.role === 'admin' ? 'all' : 'assigned');
            setAccessScope(userScope);
          }
        } catch (err) {
          console.error("Failed to load organization settings for shortcuts:", err);
        }
      } else {
        if (isMounted) {
          setCannedReplies([
            { shortcut: 'greet', text: 'Hello there! Welcome to Lets Chat. How can we help you today?' },
            { shortcut: 'pricing', text: 'Check our pricing page here: https://letschat.com/pricing' }
          ]);
          setTemplates([
            { name: 'welcome_template', language: 'en_US', body: 'Hi {{1}}, welcome to Lets Chat! Feel free to ask any questions.' }
          ]);
          setAccessScope(currentAgent.role === 'admin' ? 'all' : 'assigned');
        }
      }
    });
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: any = null;

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      let fetchedAgents: any[] = [];
      if (!isSupabaseConfigured) {
        fetchedAgents = [
          { id: currentAgent.id, email: currentAgent.email, full_name: currentAgent.full_name, role: currentAgent.role, is_online: true },
          { id: '2', email: 'rahul.kumar@letschat.com', full_name: 'Rahul Kumar', role: 'agent', is_online: false },
          { id: '3', email: 'neha.singh@letschat.com', full_name: 'Neha Singh', role: 'agent', is_online: true }
        ];
        if (isMounted) {
          setAgents(fetchedAgents);
          setConversations([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name, role, is_online, avatar_url')
          .order('full_name', { ascending: true });
        if (usersData) {
          fetchedAgents = usersData;
        }
      } catch (err) {
        console.error("Failed to fetch team users:", err);
      }
      if (isMounted) {
        setAgents(fetchedAgents);
      }

      // Helper to format a raw conversation row into the Conversation shape
      const formatConv = (conv: any): Conversation => {
        const matchedAgent = fetchedAgents.find(a => a.id === conv.assigned_agent_id);
        return {
          ...conv,
          tags: conv.tags ?? [],
          contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
          channel: Array.isArray(conv.channel) ? conv.channel[0] : conv.channel,
          assigned_agent: matchedAgent ?? null,
        };
      };

      // Fetch live conversations
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*),
          channel:channels(*)
        `)
        .order('updated_at', { ascending: false });

      if (isMounted) {
        if (!error && data) {
          const formattedConvs = data.map(formatConv);
          setConversations(formattedConvs);
        } else {
          console.error("Failed to fetch conversations:", error);
        }
        setLoading(false);
      }

      // ── Realtime subscription for new/updated conversations ──
      const channelName = `inbox-conversations-${Date.now()}`;
      realtimeChannel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        }, async (payload: any) => {
          if (!isMounted || document.visibilityState !== 'visible') return;
          // Fetch the full conversation with contact + channel joins
          const { data: fullConv } = await supabase
            .from('conversations')
            .select(`*, contact:contacts(*), channel:channels(*)`)
            .eq('id', payload.new.id)
            .single();

          if (fullConv && isMounted) {
            const formatted = formatConv(fullConv);
            setConversations(prev => {
              // Avoid duplicates
              if (prev.some(c => c.id === formatted.id)) return prev;
              return [formatted, ...prev];
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        }, async (payload: any) => {
          if (!isMounted || document.visibilityState !== 'visible') return;
          // Refetch the full conversation to get joined contact/channel data
          const { data: fullConv } = await supabase
            .from('conversations')
            .select(`*, contact:contacts(*), channel:channels(*)`)
            .eq('id', payload.new.id)
            .single();

          if (fullConv && isMounted) {
            const formatted = formatConv(fullConv);
            setConversations(prev => {
              const exists = prev.some(c => c.id === formatted.id);
              if (exists) {
                // Update in place and re-sort by updated_at (most recent first)
                return prev
                  .map(c => c.id === formatted.id ? formatted : c)
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              }
              return [formatted, ...prev];
            });
          }
        })
        .subscribe();
    });

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        import('../lib/supabase').then(({ supabase }) => supabase.removeChannel(realtimeChannel));
      }
    };
  }, [refreshTrigger]);

  const [role, setRole] = useState<'admin' | 'agent'>(() => {
    if (currentAgent.role !== 'admin') return 'agent';
    return (localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin';
  });

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentAgent.role !== 'admin') {
      setRole('agent');
    } else {
      setRole((localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin');
    }
  }, [currentAgent.role]);

  useEffect(() => {
    const handleRoleChange = () => {
      if (currentAgent.role !== 'admin') {
        setRole('agent');
        return;
      }
      setRole((localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin');
    };
    window.addEventListener('user-role-changed', handleRoleChange);
    return () => window.removeEventListener('user-role-changed', handleRoleChange);
  }, []);

  const filteredByRole = useMemo(() => {
    if (role === 'admin' && accessScope === 'all') {
      return conversations;
    }
    if (accessScope === 'all') {
      return conversations;
    }
    return conversations.filter(c => c.assigned_agent_id === currentAgent.id);
  }, [conversations, role, accessScope]);

  const filtered = useMemo(() => {
    let list = filteredByRole;
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    if (channelFilter !== 'all') {
      list = list.filter(c => c.channel?.channel_type === channelFilter);
    }
    if (priorityFilter !== 'all') {
      list = list.filter(c => c.priority === priorityFilter);
    }
    if (unreadOnly) {
      list = list.filter(c => (c.unread_count ?? 0) > 0);
    }
    if (agentFilter !== 'all') {
      list = list.filter(c => c.assigned_agent_id === agentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const name = c.contact?.full_name?.toLowerCase() ?? '';
        const phone = c.contact?.whatsapp_number ?? '';
        const ticketId = (c.ticket_id ?? '').toLowerCase();
        const subject = (c.subject ?? '').toLowerCase();
        return name.includes(q) || phone.includes(q) || ticketId.includes(q) || subject.includes(q);
      });
    }
    return list;
  }, [statusFilter, channelFilter, priorityFilter, unreadOnly, agentFilter, searchQuery, filteredByRole]);

  const handleSendTemplate = async () => {
    if (!templatePhone.trim() || !selectedTemplateName) return;
    setSendingTemplate(true);

    import('../lib/supabase').then(async ({ isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const selectedT = templates.find(t => t.name === selectedTemplateName);
          const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/api/send-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientPhone: templatePhone.trim(),
              templateName: selectedTemplateName,
              languageCode: selectedT?.language || 'en_US',
              variables: templateVariables,
              senderId: currentAgent.id,
              senderName: currentAgent.full_name
            })
          });
          const data = await res.json();
          if (data.success) {
            setOpenTemplateModal(false);
            setTemplatePhone('');
            setSelectedTemplateName('');
            setTemplateVariables([]);
            // Switch to that conversation!
            if (data.conversationId) {
              setSelectedConvId(data.conversationId);
            }
          } else {
            alert(`Failed to send WhatsApp Template: ${data.error || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.error(err);
          alert(`Failed to send WhatsApp Template: ${err.message}`);
        } finally {
          setSendingTemplate(false);
        }
      } else {
        // Mock sending
        setTimeout(() => {
          setOpenTemplateModal(false);
          setTemplatePhone('');
          setSelectedTemplateName('');
          setTemplateVariables([]);
          setSendingTemplate(false);
          alert('Template sent successfully (Mock Mode)');
        }, 1000);
      }
    });
  };

  const handleBatchAssign = async (agentId: string) => {
    setBulkAssigning(true);
    const ids = Array.from(selectedConvIds);
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        await Promise.all(ids.map(id =>
          supabase.from('conversations').update({ assigned_agent_id: agentId }).eq('id', id)
        ));
      }
      setConversations(prev => prev.map(c => ids.includes(c.id) ? { ...c, assigned_agent_id: agentId } : c));
      setSelectedConvIds(new Set());
      setBulkAssigning(false);
    });
  };

  useEffect(() => {
    if (selectedConvId) {
      const hasAccess = filteredByRole.some(c => c.id === selectedConvId);
      if (!hasAccess) {
        if (filtered.length > 0) {
          setSelectedConvId(filtered[0].id);
        } else {
          setSelectedConvId(null);
        }
      }
    } else if (filtered.length > 0) {
      setSelectedConvId(filtered[0].id);
    }
  }, [filtered, filteredByRole, selectedConvId, setSelectedConvId]);

  const selectedTemplate = templates.find(t => t.name === selectedTemplateName) || null;
  const selectedConv = filteredByRole.find(c => c.id === selectedConvId) ?? null;
  const openCount = filteredByRole.filter(c => c.status === 'open').length;
  const pendingCount = filteredByRole.filter(c => c.status === 'pending').length;
  const awaitingCount = filteredByRole.filter(c => c.status === 'awaiting_response').length;

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Left Sidebar - Conversation List */}
      <div 
        ref={leftSidebarRef}
        className={`flex h-full flex-col theme-bg-secondary relative ${selectedConvId ? 'hidden lg:flex' : 'flex w-full'} shrink-0 ${isResizing === 'left' ? '' : 'sidebar-transition'} ${leftCollapsed ? 'sidebar-collapsed' : ''}`}
        style={selectedConvId ? { width: leftCollapsed ? 0 : leftWidth, minWidth: leftCollapsed ? 0 : 240 } : undefined}
      >
        <div className="px-5 py-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold theme-text-main uppercase tracking-wider">Conversations</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setOpenTemplateModal(true)}
                title="Initiate WhatsApp Chat"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-sm rounded-full px-3.5 py-1.5 transition-all duration-150 cursor-pointer"
              >
                <Plus className="h-3 w-3" />New Chat
              </button>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)} 
                title="Refresh Inbox" 
                className="rounded-lg p-1.5 theme-text-muted hover:bg-white/[0.04] hover:theme-text-secondary transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-medium theme-text-muted mb-4">
            <span>{openCount} open</span>
            <span className="text-zinc-600 dark:text-zinc-500">·</span>
            <span>{pendingCount} pending</span>
            {awaitingCount > 0 && (<>
              <span className="text-zinc-600 dark:text-zinc-500">·</span>
              <span>{awaitingCount} awaiting</span>
            </>)}
          </div>
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={setUnreadOnly}
            agentFilter={agentFilter}
            setAgentFilter={setAgentFilter}
            availableAgentIds={agents.map(a => a.id)}
            agents={agents}
          />
          {selectedConvIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-emerald-500/5 mt-3 animate-fade-in">
              <span className="text-[10px] font-semibold theme-text-secondary">
                {selectedConvIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                {agents.length > 0 && (
                  <select
                    disabled={bulkAssigning}
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      handleBatchAssign(e.target.value);
                      e.target.value = '';
                    }}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[10px] theme-text-secondary focus:outline-none cursor-pointer"
                  >
                    <option value="" className="theme-bg-panel">Assign to...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id} className="theme-bg-panel">{a.full_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setSelectedConvIds(new Set())}
                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <p className="text-xs">Loading conversations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold theme-text-secondary">All caught up!</p>
                <p className="text-[10px] theme-text-muted mt-0.5">No pending conversations to review</p>
              </div>
            </div>
          ) : (
            filtered.map(conv => (
              <ConvItem key={conv.id} conv={conv} isActive={conv.id === selectedConvId} onClick={() => setSelectedConvId(conv.id)} convTags={tags} isSelected={selectedConvIds.has(conv.id)} onToggleSelect={() => toggleSelected(conv.id)} />
            ))
          )}
        </div>

        <div className="px-4 py-2.5 theme-bg-panel transition-all" style={{ boxShadow: '0 -1px 2px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-1.5 relative">
            <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted animate-fade-in">Agent Online</p>
            {currentAgent.role === 'admin' ? (
              <div className="relative" ref={roleRef}>
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  {role} <ChevronDown className="h-3 w-3" />
                </button>
                {roleMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 z-50 w-24 rounded-xl border theme-border theme-bg-panel shadow-2xl p-1 animate-scale-in origin-bottom-right">
                    <button
                      onClick={() => {
                        setRole('admin');
                        localStorage.setItem('user-role', 'admin');
                        window.dispatchEvent(new Event('user-role-changed'));
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        role === 'admin' ? 'theme-bg-active theme-text-main' : 'theme-text-muted hover:theme-text-secondary hover:theme-bg-hover'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => {
                        setRole('agent');
                        localStorage.setItem('user-role', 'agent');
                        window.dispatchEvent(new Event('user-role-changed'));
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        role === 'agent' ? 'theme-bg-active theme-text-main' : 'theme-text-muted hover:theme-text-secondary hover:theme-bg-hover'
                      }`}
                    >
                      Agent
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase select-none">
                Agent
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Avatar size="xs"><AvatarImage src={currentAgent.avatar_url} alt={currentAgent.full_name} /><AvatarFallback>{currentAgent.full_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <span className="text-[10px] theme-text-muted ml-1 select-none">
              {currentAgent.full_name} ({role === 'admin' ? 'Admin' : 'Agent'})
            </span>
          </div>
        </div>
      </div>

      {/* Left Resize Handle */}
      {selectedConvId && !leftCollapsed && (
        <div 
          className="resize-handle hidden lg:block"
          onMouseDown={() => handleMouseDown('left')}
        />
      )}

      {/* Collapse/Expand conversations button */}
      {selectedConvId && (
        <button 
          ref={leftCollapseBtnRef}
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          className="hidden lg:flex sidebar-collapse-btn z-30"
          style={{ 
            left: leftCollapsed ? 0 : leftWidth,
            transition: isResizing === 'left' ? 'none' : 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title={leftCollapsed ? "Expand conversations" : "Collapse conversations"}
        >
          {leftCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}

      {/* Chat Panel */}
      <div className={`flex-1 overflow-hidden ${!selectedConvId ? 'hidden lg:flex' : 'flex flex-col'}`}>
        {selectedConv ? (
          <ChatPanel 
            conv={selectedConv} 
            onBack={() => setSelectedConvId(null)} 
            onUpdateConversation={(id, fields) => {
              setConversations(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
            }}
            cannedReplies={cannedReplies}
            refreshTrigger={refreshTrigger}
            agents={agents}
            tags={tags}
            onTagsChange={setTags}
            rightCollapsed={rightCollapsed}
            setRightCollapsed={setRightCollapsed}
            rightWidth={rightWidth}
            handleMouseDown={handleMouseDown}
            rightSidebarRef={rightSidebarRef}
            isResizingRight={isResizing === 'right'}
          />
        ) : conversations.length === 0 && !localStorage.getItem('letschat-onboarding-dismissed') ? (
          <OnboardingFlow onDismiss={() => localStorage.setItem('letschat-onboarding-dismissed', 'true')} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 theme-bg-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 relative">
              <MessageCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-center relative">
              <p className="text-sm font-bold theme-text-main">Select a conversation</p>
              <p className="text-[11px] theme-text-muted mt-1.5 max-w-[260px] leading-relaxed">
                Choose a customer from the sidebar to start chatting and managing support tickets
              </p>
            </div>
            <div className="flex items-center gap-6 text-[9px] theme-text-muted relative mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-emerald-400/80">Live</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3" />
                <span className="font-medium">WhatsApp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3" />
                <span className="font-medium">AI Powered</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {openTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border theme-border theme-bg-panel shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">Initiate WhatsApp Chat</h3>
              <button 
                onClick={() => {
                  setOpenTemplateModal(false);
                  setTemplatePhone('');
                  setSelectedTemplateName('');
                  setTemplateVariables([]);
                }} 
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Recipient Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  value={templatePhone}
                  onChange={e => setTemplatePhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs theme-text-secondary placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Select Meta Template</label>
                {templates.length === 0 ? (
                  <p className="text-[11px] text-amber-400">No WhatsApp Templates configured in Settings. Please add templates in Settings first.</p>
                ) : (
                  <select
                    value={selectedTemplateName}
                    onChange={e => {
                      setSelectedTemplateName(e.target.value);
                      setTemplateVariables([]);
                    }}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs theme-text-secondary focus:border-emerald-500/30 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" className="theme-bg-panel text-slate-400">-- Choose Template --</option>
                    {templates.map((t, idx) => (
                      <option key={idx} value={t.name} className="theme-bg-panel theme-text-secondary">{t.name} ({t.language})</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedTemplate && (
                <div className="rounded-xl bg-white/[0.01] border theme-border p-3 space-y-3">
                  <div>
                    <p className="text-[9px] font-bold theme-text-muted uppercase tracking-wider mb-1">Template Preview</p>
                    <p className="text-[11px] theme-text-secondary leading-relaxed bg-white/[0.02] p-2 rounded border border-white/[0.04]">{selectedTemplate.body}</p>
                  </div>

                  {/* Variable inputs */}
                  {Array.from({ length: (selectedTemplate.body.match(/\{\{\d+\}\}/g) || []).length }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <label className="block text-[9px] font-bold theme-text-muted uppercase tracking-wider">Variable {i + 1}</label>
                      <input 
                        type="text"
                        value={templateVariables[i] || ''}
                        onChange={e => {
                          const newVars = [...templateVariables];
                          newVars[i] = e.target.value;
                          setTemplateVariables(newVars);
                        }}
                        placeholder={`Value for {{${i + 1}}}`}
                        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs theme-text-secondary focus:border-emerald-500/30 focus:outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleSendTemplate}
                disabled={!templatePhone.trim() || !selectedTemplateName || sendingTemplate}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {sendingTemplate ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />Send WhatsApp Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
