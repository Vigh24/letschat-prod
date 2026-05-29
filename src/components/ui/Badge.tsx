import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import type { CustomerTier } from "@/types"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    resolved: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    awaiting_response: 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${colors[status] || colors.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: 'text-red-500 bg-red-500/10 border-red-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    medium: 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]',
    low: 'text-slate-400 dark:text-zinc-500 bg-white/[0.02] border-white/[0.06]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
}

function ChannelBadge({ type }: { type: string }) {
  const icons: Record<string, string> = {
    whatsapp: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    email: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    instagram: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    web_widget: 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${icons[type] || 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]'}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

function SentimentDot({ score }: { score: number | null }) {
  if (score == null) return null;
  const colors = score >= 0.3 ? 'bg-emerald-500' : score >= -0.3 ? 'bg-amber-500' : 'bg-red-500';
  return <span className={`h-2 w-2 rounded-full ${colors} ring-2 ring-black dark:ring-zinc-900`} />;
}

function TierBadge({ tier }: { tier: CustomerTier }) {
  const colors: Record<string, string> = {
    premium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    enterprise: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    standard: 'text-slate-500 dark:text-zinc-500 bg-white/[0.04] border-white/[0.08]',
    free: 'text-slate-500 dark:text-zinc-500 bg-white/[0.02] border-white/[0.06]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${colors[tier] || colors.standard}`}>
      {tier}
    </span>
  );
}

function TicketBadge({ ticketId }: { ticketId: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 font-mono">
      {ticketId || '—'}
    </span>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const colors: Record<string, string> = {
    billing_inquiry: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    technical_support: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    account_management: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    general_question: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    complaint: 'text-red-500 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${colors[intent] || 'text-slate-500 dark:text-zinc-400 bg-white/[0.04] border-white/[0.08]'}`}>
      {intent.replace(/_/g, ' ')}
    </span>
  );
}

export { Badge, badgeVariants, StatusBadge, PriorityBadge, ChannelBadge, SentimentDot, TierBadge, TicketBadge, IntentBadge }
