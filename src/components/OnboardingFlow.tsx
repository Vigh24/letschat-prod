import { useState } from 'react';
import { MessageCircle, Inbox, Send, Keyboard, Cpu, CheckCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Inbox,
    title: 'Welcome to Lets Chat',
    description: 'Your WhatsApp-first customer support & ticketing platform. Handle conversations, track tickets, and leverage AI — all in one place.',
  },
  {
    icon: MessageCircle,
    title: 'The Conversation List',
    description: 'Every WhatsApp message from a customer creates a conversation. Use the filters to view Open, Pending, Awaiting, or Resolved tickets.',
  },
  {
    icon: Send,
    title: 'Replying to Customers',
    description: 'Click any conversation to open the chat panel. Type your reply and press Enter to send. Use / for canned responses.',
  },
  {
    icon: Keyboard,
    title: 'Quick Actions',
    description: 'Resolve conversations with a disposition note, reassign to teammates, or mark as awaiting customer reply after you send a message.',
  },
  {
    icon: Cpu,
    title: 'AI Copilot',
    description: 'Let AI suggest replies, rephrase your drafts, summarize resolved conversations, and automatically respond to common queries.',
  },
];

export function OnboardingFlow({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 theme-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <current.icon className="h-7 w-7 text-emerald-400" />
          </div>
        </div>

        <div className="text-center mb-2">
          <p className="text-[9px] font-bold tracking-wider uppercase text-emerald-400/80 mb-3 font-mono">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="text-sm font-bold theme-text-main mb-2 font-display tracking-tight">{current.title}</h2>
          <p className="text-[11px] theme-text-muted leading-relaxed max-w-[280px] mx-auto font-medium">
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 my-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-emerald-400'
                  : i < step
                  ? 'w-1.5 bg-emerald-400/40'
                  : 'w-1.5 bg-zinc-200 dark:bg-white/[0.06]'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isLast ? (
            <>
              <button
                onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-accent hover:opacity-95 text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider theme-text-muted hover:theme-text-secondary hover:theme-bg-hover transition-all cursor-pointer"
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-accent hover:opacity-95 text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
