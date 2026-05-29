import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  RefreshCw, Loader2, MoreHorizontal,
  Columns as ColumnsIcon, List, Search, X, Inbox
} from 'lucide-react';
import type { Conversation, ConversationStatus, CustomerTier } from '@/types';
import { currentAgent } from '@/data/appConfig';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';

const COLUMNS: { id: ConversationStatus; label: string; color: string }[] = [
  { id: 'open',               label: 'Open',              color: 'emerald' },
  { id: 'pending',            label: 'Pending',           color: 'amber' },
  { id: 'awaiting_response',  label: 'Awaiting Reply',    color: 'blue' },
  { id: 'resolved',           label: 'Resolved',          color: 'slate' },
];

function TierLabel({ tier }: { tier: CustomerTier }) {
  const colors: Record<string, string> = {
    premium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    enterprise: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    standard: 'text-slate-500 dark:text-zinc-500 bg-white/[0.04] border-white/[0.08]',
    free: 'text-slate-500 dark:text-zinc-500 bg-white/[0.02] border-white/[0.06]',
  };
  return <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full uppercase border ${colors[tier] || colors.standard}`}>{tier}</span>;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-slate-500 dark:bg-zinc-500',
    low: 'bg-slate-400 dark:bg-zinc-600',
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[priority] || colors.medium}`} title={priority} />;
}

function ColumnColorBar({ color }: { color: string }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-400 dark:bg-zinc-500',
  };
  return <div className={`h-1.5 shrink-0 rounded-t-2xl ${map[color] || map.slate}`} />;
}

interface TicketCardProps {
  conv: Conversation;
  onSelect: (id: string) => void;
}

function TicketCard({ conv, onSelect }: TicketCardProps) {
  const contact = conv.contact;
  const tier = (contact?.metadata?.account_tier as CustomerTier) ?? 'standard';
  const convTags = (conv.tags || []).slice(0, 2);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', conv.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(conv.id)}
      className="group cursor-pointer rounded-xl border border-slate-200/60 dark:border-white/[0.05] bg-white dark:bg-zinc-900/40 p-4 text-[11px] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/[0.1] hover:scale-[1.01] transition-all duration-200 ease-out active:scale-[0.98] active:shadow-inner"
    >
      {/* Top row: ticket ID + update time */}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 font-mono">
          {conv.ticket_id || '—'}
        </span>
        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}</span>
      </div>

      {/* Contact info */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar size="sm" className="border border-white/20 dark:border-zinc-800">
          {contact?.avatar_url ? <AvatarImage src={contact.avatar_url} alt={contact.full_name || ''} /> : null}
          <AvatarFallback className="font-display font-semibold text-[10px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-450">
            {(contact?.full_name || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate text-xs font-sans">
              {contact?.full_name || 'Unknown'}
            </span>
            {tier !== 'standard' && tier !== 'free' && <TierLabel tier={tier} />}
          </div>
          {conv.subject && (
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{conv.subject}</p>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityDot priority={conv.priority} />
        {conv.channel && (
          <span className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
            {conv.channel.channel_type}
          </span>
        )}
        {conv.assigned_agent && (
          <span className="text-[8px] text-slate-400 dark:text-zinc-500 flex items-center gap-0.5 ml-auto" title={conv.assigned_agent.full_name}>
            <Avatar size="sm" className="h-5 w-5 border border-white/10 dark:border-zinc-850">
              {conv.assigned_agent.avatar_url ? <AvatarImage src={conv.assigned_agent.avatar_url} alt={conv.assigned_agent.full_name} /> : null}
              <AvatarFallback className="text-[8px] font-semibold">{conv.assigned_agent.full_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </span>
        )}
      </div>

      {/* Tags */}
      {convTags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {convTags.map(id => {
            return <span key={id as string} className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-zinc-500" />;
          })}
        </div>
      )}
    </div>
  );
}

function Column({
  status,
  label,
  color,
  tickets,
  onSelect,
  onDrop,
}: {
  status: ConversationStatus;
  label: string;
  color: string;
  tickets: Conversation[];
  onSelect: (id: string) => void;
  onDrop: (ticketId: string, newStatus: ConversationStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId) onDrop(ticketId, status);
  }, [status, onDrop]);

  return (
    <div 
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-full min-w-[280px] max-w-[325px] flex-1 flex-col rounded-2xl border transition-all duration-200 ${
        dragOver 
          ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]' 
          : 'theme-border bg-slate-50/20 dark:bg-white/[0.015] shadow-sm hover:shadow-md'
      }`}
    >
      <ColumnColorBar color={color} />
      <div className="flex flex-1 flex-col">
        {/* Column header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider font-display">{label}</span>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200/65 dark:bg-white/[0.05] px-1.5 text-[9px] font-bold text-slate-500 dark:text-zinc-400 font-mono">
              {tickets.length}
            </span>
          </div>
          <button className="rounded-md p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Ticket cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-5 w-5 text-slate-300 dark:text-zinc-600 mb-1.5" />
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">No tickets</p>
              <p className="text-[8px] text-slate-300 dark:text-zinc-600 mt-0.5">Drag tickets here</p>
            </div>
          ) : (
            tickets.map(conv => (
              <TicketCard key={conv.id} conv={conv} onSelect={onSelect} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface TicketsKanbanBoardProps {
  onSelectTicket: (convId: string) => void;
}

export function TicketsKanbanBoard({ onSelectTicket }: TicketsKanbanBoardProps) {
  const [tickets, setTickets] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'agent'>(() => {
    if (currentAgent.role !== 'admin') return 'agent';
    return (localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin';
  });
  const [accessScope, setAccessScope] = useState<'all' | 'assigned'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (currentAgent.role !== 'admin') setRole('agent');
    else setRole((localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin');
  }, []);

  useEffect(() => {
    const handleRoleChange = () => {
      if (currentAgent.role !== 'admin') setRole('agent');
      else setRole((localStorage.getItem('user-role') as 'admin' | 'agent') || 'admin');
    };
    window.addEventListener('user-role-changed', handleRoleChange);
    return () => window.removeEventListener('user-role-changed', handleRoleChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) {
        if (isMounted) { setTickets([]); setLoading(false); }
        return;
      }
      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();
      let currentScope: 'all' | 'assigned' = currentAgent.role === 'admin' ? 'all' : 'assigned';
      if (orgData?.settings?.agent_access_scopes) {
        currentScope = orgData.settings.agent_access_scopes[currentAgent.id] || currentScope;
      }
      if (isMounted) setAccessScope(currentScope);

      const { data: usersData } = await supabase.from('users').select('id, full_name, avatar_url');
      const userMap = new Map((usersData || []).map(u => [u.id, u]));

      const { data, error } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*), channel:channels(*)')
        .order('updated_at', { ascending: false });

      if (isMounted && !error && data) {
        const formatted = data.map((conv: any) => ({
          ...conv,
          tags: conv.tags ?? [],
          contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
          channel: Array.isArray(conv.channel) ? conv.channel[0] : conv.channel,
          assigned_agent: conv.assigned_agent_id ? userMap.get(conv.assigned_agent_id) || null : null,
        })) as Conversation[];
        setTickets(formatted);
      }
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (role !== 'admin' && accessScope === 'assigned') {
      result = result.filter(c => c.assigned_agent_id === currentAgent.id);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.ticket_id?.toLowerCase().includes(q) ||
        c.contact?.full_name?.toLowerCase().includes(q) ||
        c.contact?.whatsapp_number?.includes(q) ||
        c.subject?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, role, accessScope, searchQuery]);

  const columns = useMemo(() =>
    COLUMNS.map(col => ({
      ...col,
      tickets: filteredTickets.filter(t => t.status === col.id),
    })),
    [filteredTickets]
  );

  const handleDrop = async (ticketId: string, newStatus: ConversationStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

    import('../lib/supabase').then(({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) return;
      supabase.from('conversations').update({
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
      }).eq('id', ticketId).then(({ error }) => {
        if (error) {
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t } : t));
        }
      });
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col theme-bg-primary overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between shrink-0 px-6 py-3 border-b border-slate-200/60 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Tickets</h1>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              <ColumnsIcon className="h-3 w-3" />Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-800 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              <List className="h-3 w-3" />List
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 dark:text-zinc-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-48 rounded-lg border border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] pl-7 pr-7 py-1.5 text-[10px] text-slate-700 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="rounded-lg p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Role bar */}
      {currentAgent.role === 'admin' && (
        <div className="flex items-center gap-2 shrink-0 px-6 py-2 border-b border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Viewing as</span>
          <select
            value={role}
            onChange={e => {
              setRole(e.target.value as 'admin' | 'agent');
              localStorage.setItem('user-role', e.target.value);
              window.dispatchEvent(new Event('user-role-changed'));
            }}
            className="rounded-md border border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
          </select>
        </div>
      )}

      {/* Kanban board */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-4 p-5 min-w-0">
            {columns.map(col => (
              <Column
                key={col.id}
                status={col.id}
                label={col.label}
                color={col.color}
                tickets={col.tickets}
                onSelect={onSelectTicket}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-5xl mx-auto w-full">
            {filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Inbox className="h-8 w-8 text-slate-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">No tickets found</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Tickets will appear when customers message via WhatsApp'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredTickets.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => onSelectTicket(conv.id)}
                      className="flex items-center gap-4 rounded-xl border border-slate-200/60 dark:border-white/[0.06] px-4 py-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group"
                    >
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 font-mono shrink-0">
                        {conv.ticket_id || '—'}
                      </span>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar size="sm">
                          {conv.contact?.avatar_url ? <AvatarImage src={conv.contact.avatar_url} alt={conv.contact.full_name || ''} /> : null}
                          <AvatarFallback>{(conv.contact?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-zinc-100 truncate">{conv.contact?.full_name ?? 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{conv.subject ?? 'No subject'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityDot priority={conv.priority} />
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${
                          conv.status === 'open' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                          conv.status === 'pending' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' :
                          conv.status === 'resolved' ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' :
                          'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]'
                        }`}>
                          {conv.status === 'awaiting_response' ? 'Awaiting' : conv.status}
                        </span>
                      </div>
                      {conv.channel && (
                        <span className="text-[9px] text-slate-500 dark:text-zinc-400 shrink-0">{conv.channel.channel_type}</span>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
