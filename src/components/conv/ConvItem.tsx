import { formatDistanceToNow } from 'date-fns';
import type { Conversation, CustomerTier } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { TagBadge } from '@/components/ui/TagBadge';

function SentimentDot({ score }: { score: number | null }) {
  if (score == null) return null;
  const colors = score >= 0.3 ? 'bg-emerald-500' : score >= -0.3 ? 'bg-amber-500' : 'bg-red-500';
  return <span className={`h-2 w-2 rounded-full ${colors} ring-2 ring-black dark:ring-zinc-900`} />;
}

function TierLabel({ tier }: { tier: CustomerTier }) {
  const colors: Record<string, string> = {
    premium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    enterprise: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    standard: 'text-slate-500 dark:text-zinc-500 bg-white/[0.04] border-white/[0.08]',
    free: 'text-slate-500 dark:text-zinc-500 bg-white/[0.02] border-white/[0.06]',
  };
  return <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full uppercase border ${colors[tier] || colors.standard}`}>{tier}</span>;
}

function StatusLabel({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    resolved: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    awaiting_response: 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]',
  };
  return <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full uppercase border ${colors[status] || colors.pending}`}>{status.replace('_', ' ')}</span>;
}

function PriorityLabel({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: 'text-red-500', high: 'text-orange-500', medium: 'text-slate-500 dark:text-zinc-400', low: 'text-slate-400 dark:text-zinc-500',
  };
  return <span className={`text-[8px] font-bold ${colors[priority] || colors.medium}`}>{priority}</span>;
}

function ChannelLabel({ type }: { type: string }) {
  const icons: Record<string, string> = { whatsapp: 'text-emerald-500', email: 'text-blue-500', instagram: 'text-pink-500', web_widget: 'text-slate-500 dark:text-zinc-400' };
  return <span className={`text-[8px] font-semibold ${icons[type] || 'text-slate-500 dark:text-zinc-400'}`}>{type}</span>;
}

function TicketBadgeInline({ ticketId }: { ticketId: string }) {
  return <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1 py-0.5 text-[7px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 font-mono">{ticketId || '—'}</span>;
}

export function ConvItem({ conv, isActive, onClick, convTags, isSelected, onToggleSelect }: {
  conv: Conversation; isActive: boolean; onClick: () => void; convTags: any[]; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true });
  const channel = conv.channel;
  const contact = conv.contact;
  const tier = (contact?.metadata?.account_tier as CustomerTier) ?? 'standard';
  const selectedTags = (conv.tags || []).map(id => convTags.find(t => t.id === id)).filter(Boolean);

  return (
    <button onClick={onClick} className="group w-full px-1 py-0.5 text-left transition-all">
      <div className={`conv-item-card flex items-start gap-3.5 px-4 py-3.5 ${isActive ? 'active border-l-2 border-l-emerald-400' : ''}`}>
        {onToggleSelect && (
          <div className="pt-1 shrink-0" onClick={e => { e.stopPropagation(); onToggleSelect(); }}>
            <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/[0.15] hover:border-white/30'}`}>
              {isSelected && <span className="text-[8px] text-white font-bold">✓</span>}
            </div>
          </div>
        )}
        <div className="relative shrink-0">
          <Avatar size="sm">
            {contact?.avatar_url ? <AvatarImage src={contact.avatar_url} alt={contact.full_name || ''} /> : null}
            <AvatarFallback>{(contact?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5">
            <SentimentDot score={conv.sentiment_score} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`truncate text-xs font-semibold ${isActive ? 'text-slate-800 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-zinc-100'}`}>
                {contact?.full_name ?? 'Unknown Contact'}
              </span>
              {tier !== 'standard' && tier !== 'free' && <TierLabel tier={tier} />}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {conv.unread_count != null && conv.unread_count > 0 && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
              <span className="text-[9px] text-slate-500 dark:text-zinc-500">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TicketBadgeInline ticketId={conv.ticket_id} />
            <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed flex-1">
              {conv.subject ?? 'No messages yet'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {channel && <ChannelLabel type={channel.channel_type} />}
            <StatusLabel status={conv.status} />
            {conv.priority !== 'medium' && <PriorityLabel priority={conv.priority} />}
            {selectedTags.slice(0, 2).map(tag => tag && <TagBadge key={tag.id} tag={tag} />)}
            {selectedTags.length > 2 && (
              <span className="text-[8px] text-slate-500 dark:text-zinc-500">+{selectedTags.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
