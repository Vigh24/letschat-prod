import { useState } from 'react';
import {
  Sparkles, RefreshCw, Copy, Check,
  Brain, MessageSquare, AlertTriangle,
  Clock, Loader2, Info, TrendingUp
} from 'lucide-react';
import type { RephraserRequest, IntentCategory } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { ChannelBadge, PriorityBadge, IntentBadge } from './ui/Badge';

const localMockConversations = [
  {
    id: 'conv-001',
    subject: 'Double charged for subscription',
    priority: 'urgent' as const,
    intent: 'billing_inquiry',
    sentiment_score: -0.6,
    tags: ['billing', 'payment-issue'],
    channel: { channel_type: 'whatsapp' as const },
    contact: {
      full_name: 'Rahul Gupta',
      whatsapp_number: '+91 98765 43210',
      email: 'rahul.gupta@gmail.com',
      avatar_url: null,
      is_online: true
    }
  }
];

const localMockMessages: Record<string, any[]> = {
  'conv-001': [
    {
      id: 'msg-1',
      sender_type: 'contact',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      content: "Hey, I tried upgrading to Pro plan and it said payment failed, but I got a SMS from my bank that ₹2,499 was deducted! Can you check this?"
    },
    {
      id: 'msg-2',
      sender_type: 'agent',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      content: "Let me check that for you. What is the email associated with your account?"
    },
    {
      id: 'msg-3',
      sender_type: 'contact',
      created_at: new Date(Date.now() - 600000).toISOString(),
      content: "It's rahul.gupta@gmail.com. Pls reply fast, my credit limit is almost full and I need the upgrade active today."
    }
  ]
};

interface IntentResult { intent: IntentCategory; confidence: number; escalation_recommended: boolean; suggested_tags: string[]; }
interface AiRephraserResult { original: string; rephrased: string; tone_applied: string; intent_detected: IntentResult; alternatives: string[]; processing_time_ms: number; }

const MOCK_REPHRASES: Record<string, Partial<AiRephraserResult>> = {
  professional: { rephrased: "Thank you for bringing this to our attention, Rahul. I understand this is an urgent matter. I have located your transaction from 2:30 PM IST and escalated it to our billing team with the highest priority. You will receive a confirmed resolution within 2 business hours. Your reference number is BIL-2847.", alternatives: ["I have reviewed your account, Rahul. The duplicate charge has been flagged and our billing team will process the reversal within 2 business hours. Reference: BIL-2847."], processing_time_ms: 1240 },
  empathetic: { rephrased: "Rahul, I completely understand how stressful it must be to see ₹2,499 deducted when the payment failed — that's the last thing you need right now. I've immediately flagged this as urgent and our billing team is looking at your card ending 4821 right now. I promise to keep you updated every 30 minutes until this is fully resolved.", alternatives: ["I hear you, Rahul — this is genuinely frustrating and you deserve a quick resolution. I've taken personal ownership of your case and escalated it urgently."], processing_time_ms: 980 },
  friendly: { rephrased: "Hey Rahul! Don't worry — we've got you covered! 🙂 I can see the transaction on your card ending in 4821 from this afternoon. Our billing team is on it right now and we'll have this sorted for you super quickly. I'll ping you with an update in the next hour!", alternatives: ["Hi Rahul! Totally understand the frustration here. We're on it! The billing team has been looped in and you'll hear back within the hour."], processing_time_ms: 876 },
  concise: { rephrased: "Noted. Card *4821, 2:30 PM IST transaction escalated to billing (Ref: BIL-2847). Resolution within 2 hrs.", alternatives: ["Case escalated. Ref BIL-2847. Billing team will contact you within 2 business hours."], processing_time_ms: 640 },
};

function SentimentMeter({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  const color = score < -0.3 ? 'bg-red-500' : score < 0.2 ? 'bg-amber-500' : 'bg-emerald-500';
  const label = score < -0.5 ? 'Very Frustrated' : score < -0.1 ? 'Frustrated' : score < 0.3 ? 'Neutral' : 'Positive';
  const textColor = score < -0.3 ? 'text-red-500 dark:text-red-400' : score < 0.2 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold theme-text-secondary">Customer Sentiment</span>
        <span className={`font-bold ${textColor}`}>{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden p-[1px] border border-zinc-200/50 dark:border-white/[0.01]">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConfidenceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1 select-none">
      <div className="flex justify-between text-[10px]">
        <span className="font-semibold theme-text-muted">{label}</span>
        <span className="font-bold theme-text-secondary font-mono">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden p-[1px] border border-zinc-200/50 dark:border-white/[0.01]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={handle} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:theme-text-main transition-colors shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function CopilotView() {
  const [selectedConvId, setSelectedConvId] = useState('conv-001');
  const [draft, setDraft] = useState("Hi Rahul, I found the transaction. Let me check with the billing team. It might take some time.");
  const [tone, setTone] = useState<RephraserRequest['target_tone']>('professional');
  const [language, setLanguage] = useState<RephraserRequest['target_language']>('en');
  const [result, setResult] = useState<Partial<AiRephraserResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rephrase' | 'intent' | 'context'>('rephrase');

  const selectedConv = localMockConversations.find(c => c.id === selectedConvId) || localMockConversations[0] || null;
  const messages = selectedConv ? (localMockMessages[selectedConv.id] ?? []) : [];

  const handleRephrase = async () => {
    if (!selectedConv) return;
    setLoading(true); setResult(null);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const base = MOCK_REPHRASES[tone] ?? MOCK_REPHRASES.professional;
    setResult({ ...base, original: draft, tone_applied: tone, intent_detected: { intent: (selectedConv.intent ?? 'billing_inquiry') as IntentCategory, confidence: 0.94, escalation_recommended: selectedConv.priority === 'urgent', suggested_tags: selectedConv.tags } });
    setLoading(false);
  };

  const toneOptions: { value: RephraserRequest['target_tone']; label: string; icon: string; desc: string }[] = [
    { value: 'professional', label: 'Professional', icon: '💼', desc: 'Formal, precise' },
    { value: 'empathetic', label: 'Empathetic', icon: '💙', desc: 'Warm, validating' },
    { value: 'friendly', label: 'Friendly', icon: '😊', desc: 'Casual, approachable' },
    { value: 'concise', label: 'Concise', icon: '⚡', desc: 'Brief, direct' },
  ];

  const langOptions: { value: RephraserRequest['target_language']; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'hinglish', label: 'Hinglish', flag: '🇮🇳' },
    { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
  ];

  return (
    <div className="flex h-full overflow-hidden theme-bg-primary select-none">
      {/* Left: Conversation context */}
      <div className="hidden xl:flex xl:w-80 flex-col border-r theme-border theme-bg-secondary overflow-hidden shrink-0">
        <div className="border-b theme-border px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold theme-text-main uppercase tracking-wider">Context</h2>
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">AI Active</span>
            </div>
          </div>
          <select value={selectedConvId} onChange={e => setSelectedConvId(e.target.value)}
            className="select-field w-full py-1.5 text-xs">
            {localMockConversations.map(c => <option key={c.id} value={c.id}>{c.contact?.full_name} — {(c.subject ?? '').slice(0, 24)}...</option>)}
          </select>
        </div>

        {selectedConv && (
          <div className="border-b theme-border px-4 py-4 space-y-4 bg-zinc-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                {selectedConv.contact?.avatar_url ? <AvatarImage src={selectedConv.contact.avatar_url} alt={selectedConv.contact.full_name || ''} /> : null}
                <AvatarFallback>{(selectedConv.contact?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-bold theme-text-main truncate leading-none">{selectedConv.contact?.full_name}</p>
                <p className="text-[10px] theme-text-muted truncate mt-1 leading-none font-mono">{selectedConv.contact?.whatsapp_number || selectedConv.contact?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.01] p-2.5 border theme-border">
                <p className="text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Channel</p>
                <ChannelBadge type={selectedConv.channel!.channel_type} />
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.01] p-2.5 border theme-border">
                <p className="text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Priority</p>
                <PriorityBadge priority={selectedConv.priority} />
              </div>
            </div>
            {selectedConv.sentiment_score != null && <SentimentMeter score={selectedConv.sentiment_score} />}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-wider theme-text-muted">Recent Messages</p>
          <div className="space-y-3">
            {messages.filter(m => m.sender_type !== 'system').slice(-5).map(msg => {
              const isOutgoing = msg.sender_type === 'agent' || msg.sender_type === 'bot';
              return (
                <div key={msg.id} className={`rounded-xl p-3 text-xs ${isOutgoing ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10' : 'bg-zinc-50 dark:bg-white/[0.01] border theme-border'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`text-[10px] font-bold uppercase ${isOutgoing ? 'text-emerald-600 dark:text-emerald-400' : 'theme-text-secondary'}`}>
                      {msg.sender_type === 'agent' ? '👤 Agent' : msg.sender_type === 'bot' ? '🤖 AI Bot' : '🧑 Customer'}
                    </span>
                    <span className="text-[9px] theme-text-muted font-mono">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="theme-text-secondary leading-relaxed line-clamp-3 select-text">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Copilot */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-md shadow-emerald-500/5"><Sparkles className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <h1 className="text-lg font-bold theme-text-main">AI Copilot</h1>
                <p className="text-xs theme-text-muted mt-0.5">Context-aware WhatsApp response optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.06] to-emerald-500/[0.02] px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Gemma 3 · Cloud LLM</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-white/[0.03] p-1 border theme-border">
            {([
              { id: 'rephrase' as const, label: 'Rephraser', icon: Sparkles },
              { id: 'intent' as const, label: 'Intent Analysis', icon: Brain },
              { id: 'context' as const, label: 'Context Summary', icon: MessageSquare },
            ]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-150 ${activeTab === id ? 'bg-white dark:bg-white/[0.06] text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/50 dark:border-none' : 'theme-text-muted hover:theme-text-secondary'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {activeTab === 'rephrase' && (
            <div className="space-y-4">
              <div className="glass-card p-5">
                <p className="mb-3.5 text-xs font-bold theme-text-main uppercase tracking-wider">Select Tone</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {toneOptions.map(t => (
                    <button key={t.value} onClick={() => setTone(t.value)}
                      className={`rounded-xl border-2 p-3 text-left transition-all duration-150 ${tone === t.value ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-white/[0.04] hover:border-zinc-300 dark:hover:border-white/[0.1] hover:bg-zinc-50 dark:hover:bg-white/[0.02]'}`}>
                      <div className="text-lg mb-1">{t.icon}</div>
                      <div className="text-xs font-bold theme-text-main">{t.label}</div>
                      <div className="text-[10px] theme-text-muted mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold theme-text-main uppercase tracking-wider">Agent Draft</p>
                  <div className="flex items-center gap-1.5">
                    {langOptions.map(l => (
                      <button key={l.value} onClick={() => setLanguage(l.value)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all duration-150 ${language === l.value ? 'btn-primary text-white py-[2px]' : 'bg-zinc-150 dark:bg-white/[0.04] theme-text-secondary hover:bg-zinc-200 dark:hover:bg-white/[0.08]'}`}>
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Type your draft WhatsApp response here..."
                  className="input-field resize-none select-text" />
                <button onClick={handleRephrase} disabled={loading || !draft.trim()}
                  className="btn-primary w-full h-10 text-xs shadow-none">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Optimizing...</> : <><Sparkles className="h-4 w-4" />Optimize response with AI</>}
                </button>
              </div>

              {result && (
                <div className="glass-card overflow-hidden animate-fade-in border-emerald-500/15">
                  <div className="border-b border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/[0.04] px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">AI-Optimized Response</span></div>
                    <div className="flex items-center gap-3">
                      {result.processing_time_ms && <span className="text-[10px] theme-text-muted font-mono uppercase font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{result.processing_time_ms}ms</span>}
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 capitalize">{result.tone_applied}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 select-text">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold theme-text-main uppercase tracking-wider">Primary Suggestion</p>
                        <div className="flex items-center gap-2">
                          <CopyButton text={result.rephrased ?? ''} />
                          <button onClick={() => setDraft(result.rephrased ?? draft)} className="btn-primary text-[10px] py-1 px-2.5 h-7 shadow-none select-none">Use this</button>
                        </div>
                      </div>
                      <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/[0.04] border border-emerald-500/10 px-4 py-3.5 text-sm theme-text-secondary leading-relaxed font-medium">{result.rephrased}</div>
                    </div>
                    {result.alternatives && result.alternatives.length > 0 && (
                      <div>
                        <p className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-2.5 select-none">Alternatives</p>
                        <div className="space-y-2">
                          {result.alternatives.map((alt: string, i: number) => (
                            <div key={i} className="group flex items-start gap-2.5 rounded-xl border theme-border bg-zinc-50/50 dark:bg-white/[0.01] p-3.5">
                              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-zinc-150 dark:bg-white/[0.06] flex items-center justify-center text-[10px] font-bold theme-text-muted select-none">{i + 1}</span>
                              <p className="flex-1 text-xs theme-text-secondary leading-relaxed">{alt}</p>
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                <CopyButton text={alt} />
                                <button onClick={() => setDraft(alt)} className="rounded px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold uppercase tracking-wider">Use</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'intent' && (
            <div className="glass-card p-5 space-y-5">
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/[0.05] border border-emerald-500/10">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Brain className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">Intent: Billing Inquiry</p>
                  <p className="text-[11px] theme-text-muted mt-0.5 font-medium">96% confidence · Analyzed from last 6 WhatsApp messages</p>
                </div>
                <div className="ml-auto shrink-0"><IntentBadge intent="billing_inquiry" /></div>
              </div>
              <div className="space-y-3.5">
                <p className="text-xs font-bold theme-text-main uppercase tracking-wider">Intent Confidence Distribution</p>
                <ConfidenceBar label="Billing Inquiry" value={0.96} color="bg-emerald-500" />
                <ConfidenceBar label="Complaint" value={0.71} color="bg-red-400" />
                <ConfidenceBar label="Refund Request" value={0.58} color="bg-orange-400" />
                <ConfidenceBar label="Account Management" value={0.23} color="bg-blue-400" />
                <ConfidenceBar label="General Query" value={0.08} color="bg-zinc-400 dark:bg-zinc-500" />
              </div>
              <div className="grid grid-cols-3 gap-3 select-none">
                {[
                  { label: 'Urgency Score', value: '94/100', color: 'text-red-650 dark:text-red-400 border-red-500/10', bg: 'bg-red-500/5', icon: AlertTriangle },
                  { label: 'Complexity', value: 'Medium', color: 'text-amber-700 dark:text-amber-400 border-amber-500/10', bg: 'bg-amber-500/5', icon: TrendingUp },
                  { label: 'Est. Resolution', value: '~2 hrs', color: 'text-blue-600 dark:text-blue-400 border-blue-500/10', bg: 'bg-blue-500/5', icon: Clock },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                  <div key={label} className={`rounded-xl ${bg} p-3 text-center border ${color.split(' ')[2] || 'border-zinc-200'}`}>
                    <Icon className={`h-4.5 w-4.5 ${color.split(' ')[0]} mx-auto mb-1`} />
                    <p className={`text-base font-bold ${color.split(' ')[0]} tracking-tight leading-tight`}>{value}</p>
                    <p className="text-[9px] theme-text-muted mt-0.5 uppercase tracking-wider font-bold">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border theme-border bg-zinc-50/50 dark:bg-white/[0.01] p-4 select-text">
                <div className="flex items-center gap-2 mb-2 select-none"><Info className="h-4 w-4 text-emerald-500" /><p className="text-xs font-bold theme-text-main uppercase tracking-wider">AI Recommendation</p></div>
                <p className="text-xs theme-text-secondary leading-relaxed font-medium">
                  This conversation shows a frustrated customer with an urgent billing issue. The customer has waited &gt;20 minutes without resolution.
                  <strong className="theme-text-main font-bold"> Recommended action: </strong>
                  Apply immediate credit hold prevention, escalate to Billing L2, offer proactive compensation to prevent churn.
                  Customer tier is <strong className="theme-text-main font-bold">Premium</strong> — high retention value.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold theme-text-main uppercase tracking-wider">AI-Generated Context Summary</p>
                <button className="btn-secondary text-[11px] py-1 px-3 h-8"><RefreshCw className="h-3 w-3" />Regenerate</button>
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.01] border theme-border p-4 space-y-3.5 select-text">
                <p className="text-[9px] font-bold theme-text-muted uppercase tracking-wider select-none">Summary</p>
                <p className="text-xs theme-text-secondary leading-relaxed font-medium">
                  Premium customer <strong>Rahul Gupta</strong> reports a failed subscription payment where ₹2,499 was deducted (card ending 4821, ~2:30 PM IST).
                  Initial response was provided 15 minutes ago but the customer has since sent two follow-up messages indicating mounting frustration.
                  No resolution has been offered yet. Escalation risk is <strong className="text-red-650 dark:text-red-400 font-bold">HIGH</strong>.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3.5 select-text">
                {[
                  { label: '🎯 Customer Goal', text: 'Immediate reversal of ₹2,499 duplicate charge and confirmation the subscription is active.' },
                  { label: '⚠️ Risk Factors', text: 'Second follow-up without resolution. Threatened escalation. Premium customer — high churn risk.' },
                  { label: '✅ Agent Action Needed', text: 'Provide specific timeline. Check with billing team. Offer compensation. Avoid generic responses.' },
                  { label: '📋 Missing Information', text: 'Agent has not confirmed the transaction was found. No reference number given. No resolution timeline set.' },
                ].map(({ label, text }) => (
                  <div key={label} className="rounded-xl border theme-border p-3.5">
                    <p className="text-xs font-bold theme-text-main mb-1.5 uppercase tracking-wider select-none">{label}</p>
                    <p className="text-xs theme-text-secondary leading-relaxed font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
