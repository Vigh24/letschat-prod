import { useState, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Phone, Smartphone, Mail, Sparkles, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Clock, UserCheck, Tag,
  MessageCircle, CheckCheck, Star, StickyNote, Shield
} from 'lucide-react';
import type { Conversation, CustomerTier, Tag as TagType } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { TagBadge } from '@/components/ui/TagBadge';

interface Props {
  conv: Conversation;
  onGenerateSummary: () => Promise<void>;
  generatingSummary: boolean;
  tags: TagType[];
  onMakeCall?: (phone: string) => void;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500">{label}</span>
      <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 text-right max-w-[55%] truncate">
        {value}
      </div>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200/60 dark:border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-2.5 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-slate-400 dark:text-zinc-500">{icon}</span>}
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function TierLabel({ tier }: { tier: CustomerTier }) {
  const colors: Record<string, string> = { premium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', enterprise: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20', standard: 'text-slate-500 dark:text-zinc-500 bg-white/[0.04] border-white/[0.08]', free: 'text-slate-500 dark:text-zinc-500 bg-white/[0.02] border-white/[0.06]' };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${colors[tier] || colors.standard}`}>{tier}</span>;
}

function StatusLabel({ status }: { status: string }) {
  const colors: Record<string, string> = { open: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', pending: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', resolved: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20', awaiting_response: 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]' };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${colors[status] || colors.pending}`}>{status.replace('_', ' ')}</span>;
}

function ChannelLabel({ type }: { type: string }) {
  const icons: Record<string, string> = { whatsapp: 'text-emerald-500', email: 'text-blue-500', instagram: 'text-pink-500', web_widget: 'text-slate-500 dark:text-zinc-400' };
  return <span className={`text-[9px] font-semibold ${icons[type] || 'text-slate-500 dark:text-zinc-400'}`}>{type}</span>;
}

function PriorityLabel({ priority }: { priority: string }) {
  const colors: Record<string, string> = { urgent: 'text-red-500', high: 'text-orange-500', medium: 'text-slate-500 dark:text-zinc-400', low: 'text-slate-400 dark:text-zinc-500' };
  return <span className={`text-[9px] font-bold ${colors[priority] || colors.medium}`}>{priority}</span>;
}

function ContactProfileCard({ conv, onMakeCall }: { conv: Conversation; onMakeCall?: (phone: string) => void }) {
  const contact = conv.contact;
  const tier = (contact?.metadata?.account_tier as CustomerTier) ?? 'standard';
  const name = contact?.full_name || 'Customer';
  const avatarUrl = contact?.avatar_url || null;
  return (
    <div className="flex flex-col items-center px-5 py-6 text-center border-b border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
      <div className="relative mb-4 group/avatar">
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md group-hover/avatar:bg-emerald-500/20 transition-all duration-300" />
        <div className="relative">
          <Avatar size="lg" className="border-2 border-white dark:border-zinc-950 shadow-md">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="font-display font-bold text-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {contact?.whatsapp_number && (
            <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow">
              <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
          )}
        </div>
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-display tracking-tight">{name}</h4>
      <div className="flex items-center gap-1.5 mt-1.5 justify-center">
        <TierLabel tier={tier} />
        <StatusLabel status={conv.status} />
      </div>
      {contact?.whatsapp_number && (
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500 dark:text-zinc-400 font-mono select-all hover:text-emerald-500 transition-colors duration-150">
          <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
          {contact.whatsapp_number}
        </div>
      )}
      {contact?.email && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-zinc-400 select-all hover:text-blue-500 transition-colors duration-150">
          <Mail className="h-3.5 w-3.5 text-blue-500" />
          {contact.email}
        </div>
      )}
      {onMakeCall && contact?.whatsapp_number && (
        <button
          onClick={() => onMakeCall(contact.whatsapp_number!)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/[0.08] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
        >
          <Phone className="h-3.5 w-3.5" />
          Call via Twilio
        </button>
      )}
    </div>
  );
}

function TicketInfoCard({ conv }: { conv: Conversation }) {
  return (
    <div className="rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] p-3.5 text-[11px]">
      <DetailRow label="Ticket ID" value={<span className="font-mono text-emerald-600 dark:text-emerald-400">{conv.ticket_id || 'N/A'}</span>} />
      <DetailRow label="Status" value={<StatusLabel status={conv.status} />} />
      <DetailRow label="Priority" value={<PriorityLabel priority={conv.priority} />} />
      <DetailRow label="Channel" value={conv.channel ? <ChannelLabel type={conv.channel.channel_type} /> : '—'} />
      <DetailRow label="Assigned" value={conv.assigned_agent?.full_name || <span className="text-slate-400 dark:text-zinc-500 italic">Unassigned</span>} />
      <DetailRow label="Created" value={formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })} />
      {conv.resolved_at && (
        <DetailRow label="Resolved" value={formatDistanceToNow(new Date(conv.resolved_at), { addSuffix: true })} />
      )}
    </div>
  );
}

function AISummaryCard({ conv, onGenerate, generating }: { conv: Conversation; onGenerate: () => Promise<void>; generating: boolean }) {
  const summary = conv.metadata?.ai_summary as string | undefined;
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.01] to-emerald-500/[0.03] border border-emerald-500/10 p-3.5">
      {summary ? (
        <div className="space-y-2.5">
          <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed italic">"{summary}"</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1 rounded-lg border border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wider"
          >
            {generating ? (
              <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Regenerating...</>
            ) : (
              <><RefreshCw className="h-2.5 w-2.5" /> Regenerate</>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-2 space-y-2">
          <Sparkles className="h-4 w-4 text-emerald-400 mx-auto" />
          <p className="text-[10px] text-slate-500 dark:text-zinc-500">No summary yet</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-[10px] font-bold text-white cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wider"
          >
            {generating ? (
              <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-2.5 w-2.5" /> Generate Summary</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityTimeline({ conv }: { conv: Conversation }) {
  const events: { icon: ReactNode; label: string; time: string; color: string }[] = [];

  if (conv.created_at) {
    events.push({
      icon: <MessageCircle className="h-3 w-3" />,
      label: 'Conversation created',
      time: formatDistanceToNow(new Date(conv.created_at), { addSuffix: true }),
      color: 'text-blue-500',
    });
  }

  if (conv.assigned_agent_id && conv.assigned_agent) {
    events.push({
      icon: <UserCheck className="h-3 w-3" />,
      label: `Assigned to ${conv.assigned_agent.full_name}`,
      time: conv.updated_at ? formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true }) : '',
      color: 'text-emerald-500',
    });
  }

  if (conv.status === 'resolved' && conv.resolved_at) {
    events.push({
      icon: <CheckCheck className="h-3 w-3" />,
      label: 'Marked as resolved',
      time: formatDistanceToNow(new Date(conv.resolved_at), { addSuffix: true }),
      color: 'text-emerald-500',
    });
  }

  if (conv.metadata?.csat && (conv.metadata.csat as any).responded_at) {
    events.push({
      icon: <Star className="h-3 w-3" />,
      label: `CSAT rating: ${(conv.metadata.csat as any).score}/5`,
      time: formatDistanceToNow(new Date((conv.metadata.csat as any).responded_at), { addSuffix: true }),
      color: 'text-amber-500',
    });
  }

  if (events.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {events.map((event, idx) => (
        <div key={idx} className="flex items-start gap-2.5">
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.04] ${event.color}`}>
            {event.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">{event.label}</p>
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5">{event.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TagsSection({ conv, tags }: { conv: Conversation; tags: TagType[] }) {
  const convTags = (conv.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean) as TagType[];
  if (convTags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {convTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  );
}

function DispositionCard({ conv }: { conv: Conversation }) {
  const disposition = conv.metadata?.disposition as any;
  if (!disposition || conv.status !== 'resolved') return null;
  return (
    <div className="rounded-xl bg-emerald-500/[0.01] border border-emerald-500/10 p-3.5 text-[11px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Query Class</span>
        <span className="font-semibold text-slate-700 dark:text-zinc-300">{disposition.query_class}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Category</span>
        <span className="font-semibold text-slate-700 dark:text-zinc-300">{disposition.category}</span>
      </div>
      {disposition.resolution_notes && (
        <div className="border-t border-slate-200/60 dark:border-white/[0.06] pt-2">
          <span className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Notes</span>
          <p className="text-slate-600 dark:text-zinc-400 italic">"{disposition.resolution_notes}"</p>
        </div>
      )}
    </div>
  );
}

function CsatCard({ conv }: { conv: Conversation }) {
  const csat = conv.metadata?.csat as any;
  if (!csat) return null;
  const isComplete = csat.status === 'completed' || csat.score;
  return (
    <div className="rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] p-3.5 text-[11px]">
      {isComplete ? (
        <div className="text-center space-y-2 py-1">
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={`h-4 w-4 ${idx < (csat.score || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-zinc-600'}`}
              />
            ))}
          </div>
          <p className="font-bold text-slate-800 dark:text-zinc-100 text-xs">{csat.score} / 5</p>
          {csat.feedback && (
            <div className="border-t border-slate-200/60 dark:border-white/[0.06] pt-2 mt-2">
              <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Feedback</p>
              <p className="text-slate-600 dark:text-zinc-400 italic text-[10px]">"{csat.feedback}"</p>
            </div>
          )}
          {csat.responded_at && (
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1">
              {formatDistanceToNow(new Date(csat.responded_at), { addSuffix: true })}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
          <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Survey Sent</p>
          <p className="text-[9px] text-slate-500 dark:text-zinc-500 text-center">Awaiting customer feedback</p>
        </div>
      )}
    </div>
  );
}

export function ConversationDetailsSidebar({ conv, onGenerateSummary, generatingSummary, tags, onMakeCall }: Props) {
  const hasTags = (conv.tags || []).length > 0;
  const isResolved = conv.status === 'resolved';
  const hasDisposition = isResolved && conv.metadata?.disposition != null;
  const hasCsat = conv.metadata?.csat != null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <ContactProfileCard conv={conv} onMakeCall={onMakeCall} />

      <Section title="Ticket Info" icon={<Shield className="h-3 w-3" />}>
        <TicketInfoCard conv={conv} />
      </Section>

      <Section title="AI Summary" icon={<Sparkles className="h-3 w-3" />}>
        <AISummaryCard conv={conv} onGenerate={onGenerateSummary} generating={generatingSummary} />
      </Section>

      <Section title="Activity" icon={<Clock className="h-3 w-3" />}>
        <ActivityTimeline conv={conv} />
      </Section>

      {hasTags && (
        <Section title="Tags" icon={<Tag className="h-3 w-3" />}>
          <TagsSection conv={conv} tags={tags} />
        </Section>
      )}

      {hasDisposition && (
        <Section title="Disposition" icon={<StickyNote className="h-3 w-3" />}>
          <DispositionCard conv={conv} />
        </Section>
      )}

      {hasCsat && (
        <Section title="Customer Satisfaction" icon={<Star className="h-3 w-3" />}>
          <CsatCard conv={conv} />
        </Section>
      )}

      <div className="h-4" />
    </div>
  );
}
