import { useState, useEffect, useMemo } from 'react';
import { Inbox, Clock, MessageCircle, BarChart3, ArrowRight, Loader2, TrendingUp, AlertTriangle, Bot, Mail, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { StatusBadge, PriorityBadge, TierBadge, TicketBadge } from './ui/Badge';
import { currentAgent } from '../data/appConfig';
import type { Conversation, ChannelType, CustomerTier } from '../types';

interface DashboardViewProps {
  onNavigate: (view: 'inbox' | 'tickets' | 'analytics') => void;
  onSelectConversation: (convId: string) => void;
}

export function DashboardView({ onNavigate, onSelectConversation }: DashboardViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) {
        if (isMounted) { setConversations([]); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from('conversations')
        .select(`*, contact:contacts(*), channel:channels(*)`)
        .order('updated_at', { ascending: false });
      if (isMounted) {
        if (!error && data) {
          const formatted = data.map((conv: any) => ({
            ...conv, tags: conv.tags ?? [],
            contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
            channel: Array.isArray(conv.channel) ? conv.channel[0] : conv.channel,
            assigned_agent: null,
          })) as Conversation[];
          setConversations(formatted);
        }
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const openCount = conversations.filter(c => c.status === 'open').length;
  const pendingCount = conversations.filter(c => c.status === 'pending').length;
  const awaitingCount = conversations.filter(c => c.status === 'awaiting_response').length;
  const resolvedCount = conversations.filter(c => c.status === 'resolved').length;
  const totalCount = conversations.length;

  const resolvedToday = conversations.filter(c => {
    if (c.status !== 'resolved' || !c.resolved_at) return false;
    const d = new Date(c.resolved_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const urgentCount = conversations.filter(c => c.priority === 'urgent').length;
  const highCount = conversations.filter(c => c.priority === 'high').length;

  const channelDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    conversations.forEach(c => {
      const type = c.channel?.channel_type || 'unknown';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [conversations]);

  const channelIcons: Record<string, typeof MessageCircle> = {
    whatsapp: MessageCircle, email: Mail, instagram: MessageCircle, web_widget: Globe,
  };
  const channelColors: Record<string, string> = {
    whatsapp: 'text-emerald-500 bg-emerald-500/10', email: 'text-blue-500 bg-blue-500/10',
    instagram: 'text-pink-500 bg-pink-500/10', web_widget: 'text-slate-500 bg-white/[0.04]',
  };

  const priorityDistribution = useMemo(() => {
    const map: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    conversations.forEach(c => { map[c.priority] = (map[c.priority] || 0) + 1; });
    return Object.entries(map);
  }, [conversations]);

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-slate-500 dark:bg-zinc-500', low: 'bg-slate-400 dark:bg-zinc-600',
  };

  const statusDistribution = useMemo(() => {
    const map: Record<string, number> = { open: 0, pending: 0, awaiting_response: 0, resolved: 0 };
    conversations.forEach(c => { map[c.status] = (map[c.status] || 0) + 1; });
    return Object.entries(map);
  }, [conversations]);

  const csatScores = useMemo(() => {
    const scores: number[] = [];
    conversations.forEach(c => {
      const csat = c.metadata?.csat;
      if (csat?.score != null) scores.push(Number(csat.score));
    });
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { avg: Math.round(avg * 10) / 10, count: scores.length, responses: scores };
  }, [conversations]);

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const recentConversations = conversations.slice(0, 6);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-xl font-bold theme-text-main tracking-tight">
            {greeting}, {currentAgent.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm theme-text-muted mt-1">{today}</p>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border theme-border p-4 theme-bg-secondary border-l-[3px] border-l-blue-500 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2"><Inbox className="h-4 w-4 text-blue-500" /></div>
            <p className="text-2xl font-bold theme-text-main tracking-tight">{openCount}</p>
            <p className="text-xs theme-text-muted font-medium">Open Tickets</p>
            {urgentCount > 0 && <p className="text-[10px] text-red-400 mt-1 font-semibold">{urgentCount} urgent</p>}
          </div>
          <div className="rounded-xl border theme-border p-4 theme-bg-secondary border-l-[3px] border-l-amber-500 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2"><Clock className="h-4 w-4 text-amber-500" /></div>
            <p className="text-2xl font-bold theme-text-main tracking-tight">{pendingCount + awaitingCount}</p>
            <p className="text-xs theme-text-muted font-medium">Needs Attention</p>
            <p className="text-[10px] theme-text-muted mt-1">{pendingCount} pending · {awaitingCount} awaiting</p>
          </div>
          <div className="rounded-xl border theme-border p-4 theme-bg-secondary border-l-[3px] border-l-emerald-500 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
            <p className="text-2xl font-bold theme-text-main tracking-tight">{resolutionRate}%</p>
            <p className="text-xs theme-text-muted font-medium">Resolution Rate</p>
            <p className="text-[10px] theme-text-muted mt-1">{resolvedToday} resolved today</p>
          </div>
          <div className="rounded-xl border theme-border p-4 theme-bg-secondary border-l-[3px] border-l-violet-500 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2"><Bot className="h-4 w-4 text-violet-500" /></div>
            <p className="text-2xl font-bold theme-text-main tracking-tight">{csatScores.count}</p>
            <p className="text-xs theme-text-muted font-medium">CSAT Responses</p>
            <p className="text-[10px] theme-text-muted mt-1">{csatScores.avg > 0 ? `Avg: ${csatScores.avg}/5` : 'No ratings yet'}</p>
          </div>
        </div>

        {/* Alert Banner for urgent */}
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 mb-6 animate-fade-in">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs theme-text-secondary font-medium">
              <span className="font-bold text-red-400">{urgentCount} urgent</span> and <span className="font-bold text-orange-400">{highCount} high</span> priority tickets need immediate attention.
            </p>
          </div>
        )}

        {/* Distribution Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Channel Distribution */}
          <div className="rounded-xl border theme-border theme-bg-secondary p-5">
            <h3 className="text-xs font-bold theme-text-main mb-4 tracking-wide">Channel Distribution</h3>
            <div className="space-y-3">
              {channelDistribution.map(([type, count]) => {
                const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                const Icon = channelIcons[type] || MessageCircle;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${channelColors[type] || 'bg-white/[0.04] text-slate-500'}`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <span className="text-[11px] font-medium theme-text-secondary capitalize">{type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-[11px] font-bold theme-text-main">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                );
              })}
              {channelDistribution.length === 0 && <p className="text-[11px] theme-text-muted">No data</p>}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="rounded-xl border theme-border theme-bg-secondary p-5">
            <h3 className="text-xs font-bold theme-text-main mb-4 tracking-wide">Priority Breakdown</h3>
            <div className="space-y-3">
              {priorityDistribution.map(([priority, count]) => {
                const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium capitalize theme-text-secondary">{priority}</span>
                      <span className="text-[11px] font-bold theme-text-main">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={`h-full rounded-full ${priorityColors[priority] || 'bg-slate-500'} transition-all duration-500`} style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="rounded-xl border theme-border theme-bg-secondary p-5">
            <h3 className="text-xs font-bold theme-text-main mb-4 tracking-wide">Status Overview</h3>
            <div className="space-y-3">
              {statusDistribution.map(([status, count]) => {
                const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                const statusColors: Record<string, string> = {
                  open: 'bg-emerald-500', pending: 'bg-amber-500', awaiting_response: 'bg-purple-500', resolved: 'bg-blue-500',
                };
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium capitalize theme-text-secondary">{status.replace('_', ' ')}</span>
                      <span className="text-[11px] font-bold theme-text-main">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={`h-full rounded-full ${statusColors[status] || 'bg-slate-500'} transition-all duration-500`} style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => onNavigate('inbox')}
            className="flex items-center gap-2 rounded-lg border theme-border px-4 py-2 text-xs font-semibold theme-text-main hover:theme-bg-hover transition-colors cursor-pointer"
          ><Plus className="h-3.5 w-3.5" />New Chat</button>
          <button onClick={() => onNavigate('inbox')}
            className="flex items-center gap-2 rounded-lg border theme-border px-4 py-2 text-xs font-semibold theme-text-main hover:theme-bg-hover transition-colors cursor-pointer"
          ><Inbox className="h-3.5 w-3.5" />View Inbox</button>
          <button onClick={() => onNavigate('analytics')}
            className="flex items-center gap-2 rounded-lg border theme-border px-4 py-2 text-xs font-semibold theme-text-main hover:theme-bg-hover transition-colors cursor-pointer"
          ><BarChart3 className="h-3.5 w-3.5" />Analytics</button>
        </div>

        {/* Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold theme-text-main">Recent Conversations</h2>
            <button onClick={() => onNavigate('inbox')}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
            >View all <ArrowRight className="h-3 w-3" /></button>
          </div>
          {recentConversations.length === 0 ? (
            <div className="rounded-xl border theme-border theme-bg-secondary p-8 text-center">
              <MessageCircle className="h-8 w-8 theme-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold theme-text-secondary">No conversations yet</p>
              <p className="text-xs theme-text-muted mt-1">Conversations will appear when customers message via WhatsApp</p>
            </div>
          ) : (
            <div className="rounded-xl border theme-border theme-bg-secondary overflow-hidden">
              <div className="grid grid-cols-12 gap-4 border-b theme-border px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider theme-text-muted">
                <div className="col-span-1">Ticket</div>
                <div className="col-span-4">Contact</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-3 text-right">Updated</div>
              </div>
              {recentConversations.map((conv) => {
                const tier = (conv.contact?.metadata?.account_tier as CustomerTier) ?? 'standard';
                return (
                  <div key={conv.id} onClick={() => { onSelectConversation(conv.id); onNavigate('inbox'); }}
                    className="grid grid-cols-12 gap-4 border-b last:border-b-0 theme-border px-5 py-3.5 text-xs items-center cursor-pointer hover:theme-bg-hover transition-colors"
                  >
                    <div className="col-span-1"><TicketBadge ticketId={conv.ticket_id} /></div>
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      {conv.contact ? (
                        <Avatar size="sm">
                          {conv.contact.avatar_url ? <AvatarImage src={conv.contact.avatar_url} alt={conv.contact.full_name || ''} /> : null}
                          <AvatarFallback>{(conv.contact.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-slate-400">?</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold theme-text-main truncate">{conv.contact?.full_name ?? 'Unknown'}</p>
                        <p className="text-[10px] theme-text-muted truncate mt-0.5">{conv.subject ?? 'No subject'}</p>
                      </div>
                      {tier !== 'standard' && tier !== 'free' && <TierBadge tier={tier} />}
                    </div>
                    <div className="col-span-2"><StatusBadge status={conv.status} /></div>
                    <div className="col-span-2"><PriorityBadge priority={conv.priority} /></div>
                    <div className="col-span-3 text-right text-[10px] theme-text-muted font-mono">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
