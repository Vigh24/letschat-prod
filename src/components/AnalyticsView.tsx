import { useState, useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, Clock, Users, Star, Ticket, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { currentAgent } from '../data/appConfig';
import { Avatar, AvatarFallback } from './ui/Avatar';

interface ChannelDistItem {
  channel: string;
  count: number;
  pct: number;
  color: string;
  icon: string;
}

interface IntentDistItem {
  intent: string;
  count: number;
  pct: number;
  color: string;
}

interface AgentPerformanceItem {
  name: string;
  convos: number;
  firstResp: string;
  avgResolve: string;
  csat: string;
  csatDist: Record<number, number>;
  csatCount: number;
  rate: number;
  role: string;
}

function parseLocalDate(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? parseLocalDate(value) : new Date();
    return d.getMonth();
  });
  const [viewYear, setViewYear] = useState(() => {
    const d = value ? parseLocalDate(value) : new Date();
    return d.getFullYear();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value ? parseLocalDate(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(formatLocalDate(d));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          const d = value ? parseLocalDate(value) : new Date();
          setViewMonth(d.getMonth());
          setViewYear(d.getFullYear());
          setOpen(!open);
        }}
        className="rounded-lg border theme-border theme-bg-active hover:theme-bg-hover px-2.5 py-1.5 text-[11px] theme-text-main font-mono focus:outline-none focus:border-emerald-500/40 transition-colors flex items-center gap-2 min-w-[130px]"
      >
        <span className="flex-1 text-left">
          {value ? parseLocalDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
        </span>
        <svg className="h-3 w-3 theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 rounded-xl border theme-border theme-bg-secondary backdrop-blur-xl shadow-2xl p-3 w-[260px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="p-1 rounded-md hover:bg-white/[0.06] theme-text-muted hover:theme-text-main transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-semibold theme-text-main">
              {new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="p-1 rounded-md hover:bg-white/[0.06] theme-text-muted hover:theme-text-main transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[8px] font-semibold theme-text-muted uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const d = new Date(viewYear, viewMonth, day);
              const isSelected = selected && d.getTime() === selected.getTime();
              const isToday = d.getTime() === today.getTime();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`text-[11px] h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    isSelected
                      ? 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20'
                      : isToday
                      ? 'border border-emerald-500/30 theme-text-main font-semibold'
                      : 'theme-text-secondary hover:bg-white/[0.06] hover:theme-text-main'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BarHorizontal({ label, value, pct, color, icon }: { label: string; value: number; pct: number; color: string; icon?: string }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs theme-text-secondary flex items-center gap-1.5">{icon && <span>{icon}</span>}{label}</span>
        <span className="text-xs font-semibold theme-text-main">{value.toLocaleString()} <span className="theme-text-muted font-normal">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200/50 dark:bg-white/[0.04] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700 group-hover:opacity-80`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalTickets: 0,
    avgResponseTime: '—',
    csat: '—',
    resolutionRate: '0%',
    ticketsChange: '+0%',
    csatChange: '0.0',
    resolutionChange: '+0%',
  });
  const [channelDist, setChannelDist] = useState<ChannelDistItem[]>([]);
  const [intentDist, setIntentDist] = useState<IntentDistItem[]>([]);
  const [hourlyVolume, setHourlyVolume] = useState<number[]>(Array(24).fill(0));
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceItem[]>([]);
  const [csatDistribution, setCsatDistribution] = useState<Record<number, number>>({1:0,2:0,3:0,4:0,5:0});
  const [csatTotalCount, setCsatTotalCount] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return formatLocalDate(d);
  });
  const [dateTo, setDateTo] = useState(() => formatLocalDate(new Date()));

  useEffect(() => {
    let isMounted = true;

    const loadData = () => {
      import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) {
        if (isMounted) setLoading(false);
        return;
      }

      // Fetch all conversations for stats calculation
      let convQuery = supabase
        .from('conversations')
        .select(`
          id,
          status,
          intent,
          sentiment_score,
          created_at,
          assigned_agent_id,
          metadata,
          channel:channels(channel_type)
        `);
      if (dateFrom) { const d = parseLocalDate(dateFrom); convQuery = convQuery.gte('created_at', d.toISOString()); }
      if (dateTo) { const d = parseLocalDate(dateTo); d.setHours(23, 59, 59, 999); convQuery = convQuery.lte('created_at', d.toISOString()); }
      const { data: convs, error: convsError } = await convQuery;

      if (convsError) {
        console.error('Error fetching analytics:', convsError);
        if (isMounted) setLoading(false);
        return;
      }

      // Fetch all messages to calculate Average Response Time (ART) and hourly counts
      let msgQuery = supabase
        .from('messages')
        .select('conversation_id, sender_type, sender_id, created_at, metadata');
      if (dateFrom) { const d = parseLocalDate(dateFrom); msgQuery = msgQuery.gte('created_at', d.toISOString()); }
      if (dateTo) { const d = parseLocalDate(dateTo); d.setHours(23, 59, 59, 999); msgQuery = msgQuery.lte('created_at', d.toISOString()); }
      const { data: allMsgs } = await msgQuery;

      // Fetch registered users to display in Agent Performance
      const { data: agentsData } = await supabase
        .from('users')
        .select('id, full_name, role')
        .order('full_name', { ascending: true });

      // 1. Calculate General Metrics
      const total = convs.length;
      const resolved = convs.filter(c => c.status === 'resolved').length;
      const resRateVal = total > 0 ? (resolved / total) * 100 : 0;

      // Calculate actual CSAT average score across all conversations
      const allCsatScores: number[] = [];
      convs.forEach(c => {
        const meta = (c as any).metadata || {};

        // Legacy: single csat object in metadata
        if (meta.csat?.score != null) {
          allCsatScores.push(Number(meta.csat.score));
        }
        // New: csat_history array (preserves multiple ratings per conversation)
        if (meta.csat_history && Array.isArray(meta.csat_history)) {
          meta.csat_history.forEach((entry: any) => {
            if (entry?.score != null) {
              allCsatScores.push(Number(entry.score));
            }
          });
        }
        // Archived: csat inside ticket_history entries
        if (meta.ticket_history && Array.isArray(meta.ticket_history)) {
          meta.ticket_history.forEach((h: any) => {
            if (h.csat?.score != null) {
              allCsatScores.push(Number(h.csat.score));
            }
            if (h.csat_pending?.resolved && h.csat_pending?.score != null) {
              allCsatScores.push(Number(h.csat_pending.score));
            }
          });
        }
      });

      const actualCsatAvg = allCsatScores.length > 0
        ? allCsatScores.reduce((acc, s) => acc + s, 0) / allCsatScores.length
        : null;

      // CSAT distribution breakdown (how many of each star rating)
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allCsatScores.forEach(s => { if (s >= 1 && s <= 5) dist[s as keyof typeof dist]++; });

      // CSAT estimation based on average sentiment_score (range: -1 to 1 mapped to 1-5 stars)
      const validSentiments = convs.filter(c => c.sentiment_score !== null && c.sentiment_score !== undefined);
      const avgSentiment = validSentiments.length > 0
        ? validSentiments.reduce((acc, c) => acc + Number(c.sentiment_score), 0) / validSentiments.length
        : null;
      const csatStars = actualCsatAvg !== null 
        ? actualCsatAvg 
        : (avgSentiment !== null ? ((avgSentiment + 1) / 2) * 4 + 1 : null);

      // Calculate Average Response Time (ART)
      let avgResponseTimeStr = '—';
      let totalSeconds = 0;
      let countResponseTimes = 0;

      if (allMsgs && allMsgs.length > 0) {
        const convMsgs: Record<string, typeof allMsgs> = {};
        allMsgs.forEach(m => {
          if (!convMsgs[m.conversation_id]) convMsgs[m.conversation_id] = [];
          convMsgs[m.conversation_id].push(m);
        });

        Object.values(convMsgs).forEach(msgs => {
          const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const firstContactIdx = sorted.findIndex(m => m.sender_type === 'contact');
          if (firstContactIdx !== -1) {
            const firstAgentReply = sorted.slice(firstContactIdx + 1).find(m => 
              (m.sender_type === 'agent' || m.sender_type === 'bot') && 
              !(m.metadata as any)?.is_internal
            );
            if (firstAgentReply) {
              const diffMs = new Date(firstAgentReply.created_at).getTime() - new Date(sorted[firstContactIdx].created_at).getTime();
              if (diffMs > 0) {
                totalSeconds += diffMs / 1000;
                countResponseTimes++;
              }
            }
          }
        });

        if (countResponseTimes > 0) {
          const avgSec = totalSeconds / countResponseTimes;
          if (avgSec < 60) {
            avgResponseTimeStr = `${Math.round(avgSec)}s`;
          } else if (avgSec < 3600) {
            avgResponseTimeStr = `${Math.round(avgSec / 60)}m ${Math.round(avgSec % 60)}s`;
          } else {
            avgResponseTimeStr = `${(avgSec / 3600).toFixed(1)}h`;
          }
        }
      }

      // Average Resolution Time across all resolved conversations
      let avgResolveTimeStr = '—';
      let resolveTotalSeconds = 0;
      let resolveCount = 0;
      convs.filter(c => c.status === 'resolved').forEach(c => {
        const meta = c.metadata || {};
        const resolvedAt = meta.resolved_at || (Array.isArray(meta.ticket_history) ? meta.ticket_history[0]?.resolved_at : null);
        if (resolvedAt) {
          const diff = new Date(resolvedAt).getTime() - new Date(c.created_at).getTime();
          if (diff > 0) { resolveTotalSeconds += diff / 1000; resolveCount++; }
        }
      });
      if (resolveCount > 0) {
        const avgSec = resolveTotalSeconds / resolveCount;
        avgResolveTimeStr = avgSec < 60 ? `${Math.round(avgSec)}s` : avgSec < 3600 ? `${Math.round(avgSec / 60)}m` : `${(avgSec / 3600).toFixed(1)}h`;
      }

      // 2. Channel Distribution
      const channelsMap: Record<string, { label: string; color: string; icon: string; count: number }> = {
        whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500', icon: '💬', count: 0 },
        email: { label: 'Email', color: 'bg-blue-500', icon: '📧', count: 0 },
        web_widget: { label: 'Website Widget', color: 'bg-violet-500', icon: '🌐', count: 0 },
        instagram: { label: 'Instagram', color: 'bg-pink-500', icon: '📸', count: 0 },
      };

      convs.forEach(c => {
        const channelObj = Array.isArray(c.channel) ? c.channel[0] : c.channel;
        const ctype = (channelObj as any)?.channel_type;
        if (ctype && channelsMap[ctype]) {
          channelsMap[ctype].count++;
        }
      });

      const formattedChannelDist: ChannelDistItem[] = Object.values(channelsMap)
        .map(ch => ({
          channel: ch.label,
          count: ch.count,
          pct: total > 0 ? (ch.count / total) * 100 : 0,
          color: ch.color,
          icon: ch.icon
        }))
        .sort((a, b) => b.count - a.count);

      // 3. Intent Distribution
      const intentCountMap: Record<string, number> = {};
      convs.forEach(c => {
        const intent = c.intent || 'General Inquiry';
        intentCountMap[intent] = (intentCountMap[intent] || 0) + 1;
      });

      const intentColors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-500', 'bg-slate-500'];
      const formattedIntentDist: IntentDistItem[] = Object.entries(intentCountMap)
        .map(([intent, count], idx) => ({
          intent,
          count,
          pct: total > 0 ? (count / total) * 100 : 0,
          color: intentColors[idx % intentColors.length]
        }))
        .sort((a, b) => b.count - a.count);

      // 4. Hourly Message Volume (Today)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const hourlyCounts = Array(24).fill(0);
      if (allMsgs) {
        allMsgs.forEach(m => {
          const mDate = new Date(m.created_at);
          if (mDate >= startOfDay) {
            const hr = mDate.getHours();
            if (hr >= 0 && hr < 24) {
              hourlyCounts[hr]++;
            }
          }
        });
      }

      // 5. Agent Performance calculation
      const getResolverId = (convObj: any) => {
        const meta = convObj.metadata || {};
        if (meta.resolved_by) return meta.resolved_by;
        
        // Fallback: find the last agent message for this conversation
        const convMessages = allMsgs ? allMsgs.filter(m => m.conversation_id === convObj.id && m.sender_type === 'agent') : [];
        if (convMessages.length > 0) {
          const sortedAgentMsgs = [...convMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (sortedAgentMsgs[0]?.sender_id) {
            return sortedAgentMsgs[0].sender_id;
          }
        }
        return convObj.assigned_agent_id;
      };

      const getHistoryResolverId = (convObj: any, historyItem: any) => {
        if (historyItem.resolved_by) return historyItem.resolved_by;
        
        // Fallback: find the last agent message sent before historyItem.resolved_at
        const resolvedTime = new Date(historyItem.resolved_at).getTime();
        const convMessages = allMsgs
          ? allMsgs.filter(m => 
              m.conversation_id === convObj.id && 
              m.sender_type === 'agent' && 
              new Date(m.created_at).getTime() <= resolvedTime
            )
          : [];
        if (convMessages.length > 0) {
          const sortedAgentMsgs = [...convMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (sortedAgentMsgs[0]?.sender_id) {
            return sortedAgentMsgs[0].sender_id;
          }
        }
        return convObj.assigned_agent_id;
      };

      const performanceList: AgentPerformanceItem[] = [];
      if (agentsData && agentsData.length > 0) {
        agentsData.forEach(agent => {
          const agentConvs = convs.filter(c => {
            const resolverId = getResolverId(c);
            const hasHistoryRes = c.metadata?.ticket_history?.some((h: any) => getHistoryResolverId(c, h) === agent.id);
            return c.assigned_agent_id === agent.id || resolverId === agent.id || hasHistoryRes;
          });
          const agentResolvedCount = agentConvs.filter(c => c.status === 'resolved').length;
          const agentRate = agentConvs.length > 0 ? Math.round((agentResolvedCount / agentConvs.length) * 100) : 100;
          
          let frSeconds = 0, frCount = 0, rtSeconds = 0, rtCount = 0;

          if (allMsgs && allMsgs.length > 0) {
            const convMsgs: Record<string, typeof allMsgs> = {};
            allMsgs.forEach(m => {
              if (!convMsgs[m.conversation_id]) convMsgs[m.conversation_id] = [];
              convMsgs[m.conversation_id].push(m);
            });

            Object.entries(convMsgs).forEach(([cid, msgs]) => {
              const convObj = convs.find(c => c.id === cid);
              if (!convObj) return;
              const resolverId = getResolverId(convObj);
              const isForAgent = convObj.assigned_agent_id === agent.id || resolverId === agent.id;
              if (!isForAgent) return;

              const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

              const firstAgentReply = sorted.find(m =>
                (m.sender_type === 'agent' || m.sender_type === 'bot') &&
                !(m.metadata as any)?.is_internal
              );
              if (firstAgentReply) {
                const diff = new Date(firstAgentReply.created_at).getTime() - new Date(convObj.created_at).getTime();
                if (diff > 0) { frSeconds += diff / 1000; frCount++; }
              }

              if (convObj.status === 'resolved' && resolverId === agent.id) {
                const meta = convObj.metadata || {};
                let resolvedAt = meta.resolved_at || null;
                if (!resolvedAt && meta.ticket_history) {
                  const entry = meta.ticket_history.find((h: any) => getHistoryResolverId(convObj, h) === agent.id);
                  if (entry?.resolved_at) resolvedAt = entry.resolved_at;
                }
                if (resolvedAt) {
                  const diff = new Date(resolvedAt).getTime() - new Date(convObj.created_at).getTime();
                  if (diff > 0) { rtSeconds += diff / 1000; rtCount++; }
                }
              }
            });
          }

          const fmtTime = (sec: number) =>
            sec < 60 ? `${Math.round(sec)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${(sec / 3600).toFixed(1)}h`;
          const firstRespStr = frCount > 0 ? fmtTime(frSeconds / frCount) : '—';
          const resolveStr = rtCount > 0 ? fmtTime(rtSeconds / rtCount) : '—';

          // Calculate actual CSAT average score for this agent (including current and past resolutions)
          const agentScores: number[] = [];
          const agentDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          agentConvs.forEach(c => {
            const meta = (c as any).metadata || {};
            const resolverId = getResolverId(c);

            const collectScore = (s: number) => {
              agentScores.push(s);
              if (s >= 1 && s <= 5) (agentDist as any)[s]++;
            };

            if (resolverId === agent.id && meta.csat?.score != null) {
              collectScore(Number(meta.csat.score));
            }
            if (meta.csat_history && Array.isArray(meta.csat_history)) {
              meta.csat_history.forEach((entry: any) => {
                if (entry?.resolved_by === agent.id && entry?.score != null) {
                  collectScore(Number(entry.score));
                }
              });
            }
            if (meta.ticket_history && Array.isArray(meta.ticket_history)) {
              meta.ticket_history.forEach((h: any) => {
                const historyResolverId = getHistoryResolverId(c, h);
                if (historyResolverId === agent.id && h.csat?.score != null) {
                  collectScore(Number(h.csat.score));
                }
                if (historyResolverId === agent.id && h.csat_pending?.resolved && h.csat_pending?.score != null) {
                  collectScore(Number(h.csat_pending.score));
                }
              });
            }
          });

          const agentCsatAvg = agentScores.length > 0
            ? agentScores.reduce((acc, score) => acc + score, 0) / agentScores.length
            : null;

          performanceList.push({
            name: agent.full_name,
            convos: agentConvs.length,
            firstResp: firstRespStr,
            avgResolve: resolveStr,
            csat: agentCsatAvg !== null ? `${agentCsatAvg.toFixed(1)}/5` : '—',
            csatDist: agentDist,
            csatCount: agentScores.length,
            rate: agentRate,
            role: agent.role.charAt(0).toUpperCase() + agent.role.slice(1)
          });
        });
      }

      // Fallback (if no agents registered in user table yet — use currentAgent)
      if (performanceList.length === 0) {
        const agentConvs = convs.filter(c => {
          const resolverId = getResolverId(c);
          const hasHistoryRes = c.metadata?.ticket_history?.some((h: any) => getHistoryResolverId(c, h) === currentAgent.id);
          return c.assigned_agent_id === currentAgent.id || resolverId === currentAgent.id || hasHistoryRes;
        });
        const agentScores: number[] = [];
        const agentDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        agentConvs.forEach(c => {
          const meta = (c as any).metadata || {};
          const resolverId = getResolverId(c);

          const collectScore = (s: number) => {
            agentScores.push(s);
            if (s >= 1 && s <= 5) (agentDist as any)[s]++;
          };

          // Legacy: single csat object
          if (resolverId === currentAgent.id && meta.csat?.score != null) {
            collectScore(Number(meta.csat.score));
          }
          // New: csat_history array
          if (meta.csat_history && Array.isArray(meta.csat_history)) {
            meta.csat_history.forEach((entry: any) => {
              if (entry?.resolved_by === currentAgent.id && entry?.score != null) {
                collectScore(Number(entry.score));
              }
            });
          }
          // Archived: csat inside ticket_history
          if (meta.ticket_history && Array.isArray(meta.ticket_history)) {
            meta.ticket_history.forEach((h: any) => {
              const historyResolverId = getHistoryResolverId(c, h);
              if (historyResolverId === currentAgent.id && h.csat?.score != null) {
                collectScore(Number(h.csat.score));
              }
              if (historyResolverId === currentAgent.id && h.csat_pending?.resolved && h.csat_pending?.score != null) {
                collectScore(Number(h.csat_pending.score));
              }
            });
          }
        });

        const agentCsatAvg = agentScores.length > 0
          ? agentScores.reduce((acc, score) => acc + score, 0) / agentScores.length
          : null;

        performanceList.push({
          name: currentAgent.full_name,
          convos: agentConvs.length,
          firstResp: avgResponseTimeStr,
          avgResolve: avgResolveTimeStr,
          csat: agentCsatAvg !== null ? `${agentCsatAvg.toFixed(1)}/5` : '—',
          csatDist: agentDist,
          csatCount: agentScores.length,
          rate: resRateVal > 0 ? Math.round(resRateVal) : 100,
          role: currentAgent.role.charAt(0).toUpperCase() + currentAgent.role.slice(1)
        });
      }

      if (isMounted) {
        setMetrics({
          totalTickets: total,
          avgResponseTime: avgResponseTimeStr,
          csat: csatStars !== null ? `${csatStars.toFixed(1)}/5` : '—',
          resolutionRate: `${Math.round(resRateVal)}%`,
          ticketsChange: total > 0 ? '+100%' : '+0%',
          csatChange: csatStars !== null ? 'New' : '0.0',
          resolutionChange: total > 0 ? `+${Math.round(resRateVal)}%` : '+0%',
        });
        setChannelDist(formattedChannelDist);
        setIntentDist(formattedIntentDist);
        setHourlyVolume(hourlyCounts);
        setAgentPerformance(performanceList);
        setCsatDistribution(dist);
        setCsatTotalCount(allCsatScores.length);
        setLoading(false);
      }
    });
  };

    loadData();

    const interval = setInterval(loadData, 60_000);

    return () => { isMounted = false; clearInterval(interval); };
  }, [refreshKey, dateFrom, dateTo]);

  const handleExport = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push('Analytics Report');
    lines.push(`Date Range,${dateFrom} to ${dateTo}`);
    lines.push('');
    lines.push('Summary Metrics');
    lines.push(`Total Tickets,${metrics.totalTickets}`);
    lines.push(`Avg Response Time,${metrics.avgResponseTime}`);
    lines.push(`CSAT Score,${metrics.csat}`);
    lines.push(`Resolution Rate,${metrics.resolutionRate}`);
    lines.push('');
    lines.push('Agent Performance');
    lines.push('Name,Role,Tickets,Resolved,First Response,Avg Resolution,CSAT,CSAT Count,Resolution Rate');
    agentPerformance.forEach(a => {
      const resolved = Math.round(a.convos * a.rate / 100);
      lines.push(`${esc(a.name)},${esc(a.role)},${a.convos},${resolved},${a.firstResp},${a.avgResolve},${a.csat},${a.csatCount},${a.rate}%`);
    });
    lines.push('');
    lines.push('Channel Distribution');
    lines.push('Channel,Count,Percentage');
    channelDist.forEach(c => lines.push(`${esc(c.channel)},${c.count},${c.pct.toFixed(1)}%`));
    lines.push('');
    lines.push('Intent Distribution');
    lines.push('Intent,Count,Percentage');
    intentDist.forEach(i => lines.push(`${esc(i.intent)},${i.count},${i.pct.toFixed(1)}%`));
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statsCards = [
    { label: 'WhatsApp Tickets', value: metrics.totalTickets.toLocaleString(), change: metrics.ticketsChange, positive: true, icon: Ticket, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/15' },
    { label: 'Avg Response Time', value: metrics.avgResponseTime, change: '-0%', positive: true, icon: Clock, color: 'from-blue-500/10 to-cyan-500/10 text-blue-500 dark:text-blue-450 border-blue-500/15' },
    { label: 'CSAT Score', value: metrics.csat, change: metrics.csatChange, positive: true, icon: Star, color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15' },
    { label: 'Resolution Rate', value: metrics.resolutionRate, change: metrics.resolutionChange, positive: true, icon: TrendingUp, color: 'from-violet-500/10 to-purple-500/10 text-violet-500 dark:text-violet-400 border-violet-500/15' },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary select-none">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-md shadow-emerald-500/5">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold theme-text-main">Analytics</h1>
            <p className="text-xs theme-text-muted mt-0.5">Live performance metrics calculated directly from Supabase</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex h-7 w-7 items-center justify-center rounded-lg border theme-border theme-text-muted hover:theme-text-main hover:theme-bg-hover transition-colors"
              title="Export data as CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border theme-border theme-text-muted hover:theme-text-main hover:theme-bg-hover transition-colors"
              title="Refresh analytics data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wider">From</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wider">To</label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          {metrics.totalTickets > 0 && (
            <span className="text-[10px] theme-text-muted font-mono ml-auto">{metrics.totalTickets} conversation{metrics.totalTickets !== 1 ? 's' : ''} in range</span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {statsCards.map(({ label, value, change, positive, icon: Icon }) => (
            <div key={label} className="group rounded-2xl border border-white/[0.04] bg-gradient-to-br from-white/[0.01] to-transparent p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.1] hover:shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.04] flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-4 w-4" />
                </div>
                {value !== '—' && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold font-display theme-text-main tracking-tight leading-none">{value}</p>
              <p className="text-[10px] theme-text-muted mt-2.5 uppercase tracking-wider font-bold">{label}</p>
            </div>
          ))}
        </div>

        {/* CSAT Distribution Breakdown */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> CSAT Rating Distribution
            </h3>
            <span className="text-[10px] theme-text-muted font-mono">
              {csatTotalCount > 0 ? `${csatTotalCount} response${csatTotalCount !== 1 ? 's' : ''}` : 'No responses'}
            </span>
          </div>
          {csatTotalCount > 0 ? (
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(star => {
                const count = csatDistribution[star] || 0;
                const pct = csatTotalCount > 0 ? (count / csatTotalCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-12 text-[11px] font-semibold theme-text-secondary shrink-0">
                      {star} star{star !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-200/50 dark:bg-white/[0.04] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          star >= 4 ? 'bg-emerald-500' : star >= 3 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] font-bold theme-text-main tabular-nums shrink-0">
                      {count}
                    </span>
                    <span className="w-10 text-right text-[10px] theme-text-muted font-mono shrink-0">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs theme-text-muted py-6 text-center">No CSAT ratings received yet</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold theme-text-main mb-4 uppercase tracking-wider">Channel Distribution</h3>
            {channelDist.length === 0 ? (
              <p className="text-xs theme-text-muted py-8 text-center">No channel statistics available</p>
            ) : (
              <div className="space-y-4">
                {channelDist.map(c => <BarHorizontal key={c.channel} label={c.channel} value={c.count} pct={c.pct} color={c.color} icon={c.icon} />)}
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold theme-text-main mb-4 uppercase tracking-wider">Intent Distribution</h3>
            {intentDist.length === 0 ? (
              <p className="text-xs theme-text-muted py-8 text-center">No intent classification data yet</p>
            ) : (
              <div className="space-y-4">
                {intentDist.map(i => <BarHorizontal key={i.intent} label={i.intent} value={i.count} pct={i.pct} color={i.color} />)}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xs font-bold theme-text-main mb-4 uppercase tracking-wider">Hourly WhatsApp Message Volume (Today)</h3>
          {Math.max(...hourlyVolume) === 0 ? (
            <p className="text-xs theme-text-muted py-12 text-center">No messages sent or received today yet</p>
          ) : (
            <div className="flex items-end gap-1 h-32 pt-2">
              {hourlyVolume.map((v, i) => {
                const maxV = Math.max(...hourlyVolume);
                const h = maxV > 0 ? (v / maxV) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500/20 to-emerald-500 opacity-60 group-hover:opacity-100 transition-all duration-200" style={{ height: `${h}%` }} title={`${v} messages at ${i}:00`} />
                    <span className="text-[8px] theme-text-muted font-mono">{i}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-5 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative">
            <h3 className="text-xs font-bold theme-text-main flex items-center gap-2 uppercase tracking-wider">
              <Users className="h-4 w-4 text-emerald-500" />Agent Performance
            </h3>
            <span className="text-[10px] theme-text-muted font-mono">{agentPerformance.length} agent{agentPerformance.length !== 1 ? 's' : ''}</span>
          </div>

          {agentPerformance.length > 0 ? (
            <div className="relative">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[minmax(160px,1.5fr)_64px_64px_64px_64px_100px] gap-x-2 px-3 pb-2 border-b theme-border">
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider">Agent</span>
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider text-center">Resolved</span>
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider text-center">1st Resp</span>
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider text-center">Resolve</span>
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider text-center">CSAT</span>
                <span className="text-[9px] font-semibold theme-text-muted uppercase tracking-wider text-right">Resolution</span>
              </div>

              {/* Agent rows */}
              <div className="flex flex-col">
                {agentPerformance.map((a, idx) => {
                  const csatNum = a.csat !== '—' ? parseFloat(a.csat) : null;
                  const csatPct = csatNum !== null ? (csatNum / 5) * 100 : 0;
                  let speedScore = 50;
                  if (a.firstResp !== '—') {
                    const num = parseInt(a.firstResp);
                    if (a.firstResp.includes('s')) speedScore = num <= 15 ? 100 : num <= 30 ? 90 : num <= 60 ? 80 : 70;
                    else if (a.firstResp.includes('m')) speedScore = num <= 2 ? 75 : num <= 5 ? 60 : num <= 10 ? 40 : 25;
                    else if (a.firstResp.includes('h')) speedScore = num <= 1 ? 30 : num <= 2 ? 20 : 10;
                  }
                  const score = Math.round(csatPct * 0.35 + a.rate * 0.35 + speedScore * 0.3);
                  const resolvedCount = Math.round(a.convos * a.rate / 100);
                  const scoreColor = score >= 90 ? '#10b981' : score >= 75 ? '#3b82f6' : score >= 60 ? '#f59e0b' : '#ef4444';
                  const rateColor = a.rate >= 95 ? 'text-emerald-500' : a.rate >= 80 ? 'text-blue-500' : a.rate >= 60 ? 'text-amber-500' : 'text-red-500';
                  const rateBar = a.rate >= 95 ? 'bg-emerald-500' : a.rate >= 80 ? 'bg-blue-500' : a.rate >= 60 ? 'bg-amber-500' : 'bg-red-500';
                  const circumference = 2 * Math.PI * 15;
                  const strokeDashoffset = circumference - (score / 100) * circumference;

                  return (
                    <div
                      key={a.name}
                      className="group grid grid-cols-[1fr] sm:grid-cols-[minmax(160px,1.5fr)_64px_64px_64px_64px_100px] gap-x-2 items-center px-3 py-2 border-b theme-border-extra-subtle last:border-0 hover:bg-white/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-150 rounded-md"
                    >
                      {/* Agent info: score ring + avatar + name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Mini score ring */}
                        <div className="relative shrink-0" title={`Score: ${score}/100`}>
                          <svg className="-rotate-90" width="32" height="32" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" className="stroke-zinc-200/40 dark:stroke-zinc-700/40" strokeWidth="2.5" />
                            <circle
                              cx="18" cy="18" r="15" fill="none"
                              stroke={scoreColor}
                              strokeWidth="2.5"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-extrabold theme-text-main tabular-nums">{score}</span>
                        </div>

                        {/* Avatar + name */}
                        <div className="relative shrink-0">
                          <Avatar size="sm">
                            <AvatarFallback>{a.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {idx < 3 && (
                            <span className="absolute -top-1 -right-1.5 text-[8px] drop-shadow-md">
                              {['🥇', '🥈', '🥉'][idx]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold theme-text-main text-[12px] leading-tight truncate">{a.name}</p>
                          <p className="text-[9px] theme-text-muted leading-tight">{a.role}</p>
                        </div>
                      </div>

                      {/* Stats — stacked on mobile, inline cells on sm+ */}
                      <div className="flex sm:contents items-center gap-3 mt-1.5 sm:mt-0 pl-[72px] sm:pl-0 flex-wrap">
                        {/* Resolved */}
                        <div className="text-center">
                          <span className="text-[11px] font-bold theme-text-main tabular-nums">{resolvedCount}</span>
                          <span className="text-[9px] theme-text-muted font-normal">/{a.convos}</span>
                          <span className="text-[8px] theme-text-muted uppercase tracking-wider block sm:hidden">Resolved</span>
                        </div>

                        {/* 1st Resp */}
                        <div className="text-center">
                          <span className="text-[11px] font-semibold theme-text-secondary font-mono tabular-nums">{a.firstResp}</span>
                          <span className="text-[8px] theme-text-muted uppercase tracking-wider block sm:hidden">1st Resp</span>
                        </div>

                        {/* Avg Resolve */}
                        <div className="text-center">
                          <span className="text-[11px] font-semibold theme-text-secondary font-mono tabular-nums">{a.avgResolve}</span>
                          <span className="text-[8px] theme-text-muted uppercase tracking-wider block sm:hidden">Resolve</span>
                        </div>

                        {/* CSAT */}
                        <div className="text-center">
                          {csatNum !== null ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex gap-[1px]">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <span key={s} className={`text-[8px] ${s <= Math.round(csatNum) ? 'text-amber-400' : 'text-zinc-500 dark:text-zinc-700'}`}>★</span>
                                ))}
                              </div>
                              <span className="text-[10px] font-bold theme-text-main tabular-nums leading-none">{a.csat}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] theme-text-muted">—</span>
                          )}
                        </div>

                        {/* Resolution Rate */}
                        <div className="min-w-[80px] sm:min-w-0">
                          <div className="flex items-center justify-end gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold tabular-nums leading-none ${rateColor}`}>{a.rate}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-200/50 dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${rateBar}`} style={{ width: `${a.rate}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-8 w-8 mx-auto text-zinc-500 mb-3" />
              <p className="text-xs theme-text-muted">No agent performance data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
