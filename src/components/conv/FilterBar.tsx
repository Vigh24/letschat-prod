import { Search, FilterX } from 'lucide-react';
import type { ConversationStatus, ChannelType } from '@/types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: ConversationStatus | 'all';
  onStatusFilterChange: (s: ConversationStatus | 'all') => void;
  channelFilter: ChannelType | 'all';
  onChannelFilterChange: (c: ChannelType | 'all') => void;
  priorityFilter: string;
  onPriorityFilterChange: (p: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (v: boolean) => void;
  agentFilter: string;
  setAgentFilter: (v: string) => void;
  availableAgentIds: string[];
  agents: any[];
}

export function FilterBar(props: FilterBarProps) {
  const hasAnyFilter = props.searchQuery || props.statusFilter !== 'all' || props.channelFilter !== 'all' || props.priorityFilter !== 'all' || props.unreadOnly || props.agentFilter !== 'all';

  const statuses: (ConversationStatus | 'all')[] = ['all', 'open', 'pending', 'awaiting_response', 'resolved'];
  const channels: (ChannelType | 'all')[] = ['all', 'whatsapp', 'email', 'instagram', 'web_widget'];
  const priorities = ['all', 'urgent', 'high', 'medium', 'low'];

  return (
    <div className="filter-bar px-3 sm:px-4 pb-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-zinc-500 pointer-events-none" />
        <input
          type="text" placeholder="Search by name, phone, ticket, or message..."
          value={props.searchQuery}
          onChange={e => props.onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-9 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
        {props.searchQuery && (
          <button
            onClick={() => props.onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-white/[0.06] p-0.5 rounded transition-all cursor-pointer"
          >
            <FilterX className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex gap-1.5 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04] shrink-0">
          {statuses.map(s => (
            <button key={s} onClick={() => props.onStatusFilterChange(s)}
              className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                props.statusFilter === s
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >{s === 'all' ? 'All' : s.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="flex gap-1.5 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04] shrink-0">
          {channels.map(c => (
            <button key={c} onClick={() => props.onChannelFilterChange(c)}
              className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                props.channelFilter === c
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >{c === 'all' ? 'All' : c}</button>
          ))}
        </div>
        <div className="flex gap-1.5 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04] shrink-0">
          {priorities.map(p => (
            <button key={p} onClick={() => props.onPriorityFilterChange(p)}
              className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                props.priorityFilter === p
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => props.onUnreadOnlyChange(!props.unreadOnly)}
          className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-xl transition-all cursor-pointer border ${
            props.unreadOnly
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20 shadow-sm'
              : 'text-slate-500 dark:text-zinc-500 border-white/[0.04] hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-white/[0.04]'
          }`}
        >Unread</button>
        {hasAnyFilter && (
          <button onClick={() => { props.onSearchChange(''); props.onStatusFilterChange('all'); props.onChannelFilterChange('all'); props.onPriorityFilterChange('all'); props.onUnreadOnlyChange(false); props.setAgentFilter('all'); }}
            className="whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-xl transition-all text-slate-500 dark:text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.04] cursor-pointer shrink-0"
          ><FilterX className="h-3 w-3 inline-block mr-0.5" />Clear</button>
        )}
      </div>
    </div>
  );
}
