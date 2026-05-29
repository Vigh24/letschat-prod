import { useState } from 'react';
import { Brain, Plus, Trash2, Zap, Shield, ArrowRight, Sparkles, Send, Target } from 'lucide-react';
import type { IntentCategory, Priority } from '../types';

interface TagRuleLocal {
  id: string;
  tag: string;
  keywords: string[];
  intent: IntentCategory;
  auto_response: string;
  escalation: boolean;
  priority: Priority | null;
  team: string | null;
  confidence: number;
  samples: string[];
}

const INITIAL_RULES: TagRuleLocal[] = [
  { id: '1', tag: 'refund', keywords: ['refund', 'money back', 'return', 'cancel order'], intent: 'refund_request', auto_response: "I understand you'd like a refund. Let me look into your order details right away. Could you share your order ID?", escalation: false, priority: 'high', team: 'Billing', confidence: 0.85, samples: ['I want my money back', 'Please refund my order', 'How do I return this?'] },
  { id: '2', tag: 'billing-issue', keywords: ['charged twice', 'wrong amount', 'billing error', 'overcharged'], intent: 'billing_inquiry', auto_response: "I'm sorry about the billing issue. Let me check your recent transactions. Could you provide the last 4 digits of your card?", escalation: true, priority: 'urgent', team: 'Billing', confidence: 0.92, samples: ['I was charged twice', 'Wrong amount on my bill', 'You overcharged me'] },
  { id: '3', tag: 'technical-help', keywords: ['not working', 'error', 'bug', 'broken', 'crash'], intent: 'technical_support', auto_response: "I see you're experiencing a technical issue. Could you describe what's happening and share any error messages?", escalation: false, priority: 'medium', team: 'Tech Support', confidence: 0.88, samples: ['App is not working', 'I keep getting an error', 'Website crashed'] },
  { id: '4', tag: 'angry-customer', keywords: ['terrible', 'worst', 'lawsuit', 'lawyer', 'scam', 'fraud', 'unacceptable'], intent: 'complaint', auto_response: '', escalation: true, priority: 'urgent', team: null, confidence: 0.95, samples: ['This is a scam!', 'I will contact my lawyer', 'Worst service ever'] },
  { id: '5', tag: 'upgrade', keywords: ['upgrade', 'enterprise', 'premium', 'pricing', 'plan'], intent: 'sales_inquiry', auto_response: "Great to hear you're interested in upgrading! Our Enterprise plan includes unlimited seats, priority support, and custom integrations. Shall I connect you with our sales team?", escalation: false, priority: 'medium', team: 'Sales', confidence: 0.80, samples: ['How much is Enterprise?', 'I want to upgrade my plan', 'What does Premium include?'] },
];

const FLOW_STEPS = [
  { id: 1, label: 'WhatsApp Message', icon: '📱', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', desc: 'Customer messages WhatsApp' },
  { id: 2, label: 'AI Classification', icon: '🤖', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400', desc: 'AI analyzes query & sentiment' },
  { id: 3, label: 'Rule Validation', icon: '🎫', color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400', desc: 'If confidence > 80%, trigger response' },
  { id: 4, label: 'Auto-Respond/Route', icon: '⚡', color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400', desc: 'Send reply or route to team' },
  { id: 5, label: 'Agent Handover', icon: '👤', color: 'from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-650 dark:text-rose-400', desc: 'Complex queries assigned to agent' },
];

function FlowVisualizer() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Zap className="h-4 w-4 text-emerald-500" /></div>
        <div>
          <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">AI Escalation Flow</h3>
          <p className="text-[10px] theme-text-muted mt-0.5 font-medium">How incoming messages are processed and routed</p>
        </div>
      </div>
      <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-none">
        {FLOW_STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 shrink-0">
            <div className="w-40 space-y-2">
              <div className={`rounded-xl bg-gradient-to-br ${step.color.split(' ')[0]} ${step.color.split(' ')[1]} border ${step.color.split(' ')[2]} p-3.5 shadow-sm`}>
                <span className="text-xl">{step.icon}</span>
                <p className={`text-[10px] font-bold mt-1.5 leading-tight ${step.color.split(' ')[3]} ${step.color.split(' ')[4] || ''}`}>{step.label}</p>
              </div>
              <p className="text-[10px] theme-text-muted leading-normal font-medium px-1">{step.desc}</p>
            </div>
            {i < FLOW_STEPS.length - 1 && <ArrowRight className="h-4 w-4 theme-text-muted shrink-0 mt-8 animate-pulse" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TagRuleCard({ rule, onDelete }: { rule: TagRuleLocal; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  const priorityColors = {
    urgent: 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400',
    high:   'border-orange-500/20 bg-orange-500/5 text-orange-650 dark:text-orange-450',
    medium: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400',
    low:    'border-zinc-500/20 bg-zinc-500/5 text-zinc-500 dark:text-zinc-400',
  };

  return (
    <div className="glass-card p-4 hover:scale-[1.005] transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">#{rule.tag}</span>
          <span className="rounded-full bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/50 dark:border-white/[0.02] px-2 py-0.5 text-[9px] font-semibold text-zinc-650 dark:text-zinc-450 capitalize">{rule.intent.replace(/_/g, ' ')}</span>
          {rule.escalation && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-red-500/15 px-2 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
              <Shield className="h-3 w-3" />Auto-escalate
            </span>
          )}
          {rule.priority && (
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityColors[rule.priority]}`}>
              {rule.priority}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] theme-text-muted font-mono uppercase tracking-wider font-semibold">{Math.round(rule.confidence * 100)}% threshold</span>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-zinc-400 hover:text-red-550 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3.5">
        {rule.keywords.map(kw => (
          <span key={kw} className="rounded-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.04] px-2.5 py-0.5 text-[9px] font-medium theme-text-secondary">{kw}</span>
        ))}
      </div>

      {rule.team && <p className="text-[10px] theme-text-muted mb-3 font-medium">Routes to: <span className="theme-text-main font-bold">{rule.team}</span></p>}

      <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-emerald-650 dark:text-emerald-400 hover:text-emerald-500 font-bold transition-colors uppercase tracking-wider">
        {expanded ? 'Hide details ▲' : 'Show details ▼'}
      </button>

      {expanded && (
        <div className="mt-3.5 pt-3.5 border-t theme-border space-y-3 animate-fade-in">
          {rule.auto_response && (
            <div>
              <p className="text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Auto-Response Template</p>
              <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/[0.04] border border-emerald-500/15 p-3 text-xs text-emerald-650 dark:text-emerald-300 leading-relaxed font-medium">{rule.auto_response}</div>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Sample Queries</p>
            <div className="space-y-1.5">
              {rule.samples.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs theme-text-secondary font-medium">
                  <Target className="h-3 w-3 theme-text-muted shrink-0" />"{s}"
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AITestPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ intent: string; confidence: number; tags: string[]; auto_response: string; escalate: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const testQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
    const lower = query.toLowerCase();
    let intent = 'general_query', confidence = 0.65, tags: string[] = [], auto_response = '', escalate = false;

    if (lower.match(/refund|money back|return/)) { intent = 'refund_request'; confidence = 0.92; tags = ['refund']; auto_response = INITIAL_RULES[0].auto_response; }
    else if (lower.match(/charged|billing|overcharged/)) { intent = 'billing_inquiry'; confidence = 0.89; tags = ['billing-issue']; auto_response = INITIAL_RULES[1].auto_response; escalate = true; }
    else if (lower.match(/not working|error|broken|crash/)) { intent = 'technical_support'; confidence = 0.87; tags = ['technical-help']; auto_response = INITIAL_RULES[2].auto_response; }
    else if (lower.match(/terrible|worst|scam|lawyer|fraud/)) { intent = 'complaint'; confidence = 0.96; tags = ['angry-customer']; escalate = true; }
    else if (lower.match(/upgrade|premium|enterprise|pricing/)) { intent = 'sales_inquiry'; confidence = 0.84; tags = ['upgrade']; auto_response = INITIAL_RULES[4].auto_response; }

    setResult({ intent, confidence, tags, auto_response, escalate });
    setLoading(false);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-emerald-500" /></div>
        <div>
          <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">Test Your AI</h3>
          <p className="text-[10px] theme-text-muted mt-0.5 font-medium">Type a customer query to see how AI classifies it</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && testQuery()}
          placeholder="Type a customer message to test..."
          className="input-field"
        />
        <button onClick={testQuery} disabled={loading || !query.trim()} className="btn-primary text-xs py-1.5 px-4 h-10 shrink-0 shadow-none">
          {loading ? '...' : <><Send className="h-3.5 w-3.5 inline mr-1" />Test</>}
        </button>
      </div>

      {result && (
        <div className="rounded-xl border theme-border bg-zinc-50/50 dark:bg-white/[0.01] p-4 space-y-3.5 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-3">
              <p className="text-[9px] theme-text-muted mb-1 uppercase tracking-wider font-bold">Intent</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 capitalize">{result.intent.replace(/_/g, ' ')}</p>
            </div>
            <div className="rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 p-3">
              <p className="text-[9px] theme-text-muted mb-1 uppercase tracking-wider font-bold">Confidence</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-300 font-mono">{Math.round(result.confidence * 100)}%</p>
            </div>
            <div className={`rounded-lg p-3 border ${result.escalate ? 'bg-red-500/5 border-red-500/10 text-red-650 dark:text-red-400 dark:text-red-400' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              <p className="text-[9px] theme-text-muted mb-1 uppercase tracking-wider font-bold">Action</p>
              <p className="text-xs font-bold leading-tight">
                {result.escalate ? '🚨 Escalate' : '✅ Respond'}
              </p>
            </div>
          </div>
          {result.tags.length > 0 && (
            <div className="flex gap-1">
              {result.tags.map(t => (
                <span key={t} className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  #{t}
                </span>
              ))}
            </div>
          )}
          {result.auto_response && (
            <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/[0.04] border border-emerald-500/15 p-3">
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mb-1.5 uppercase tracking-wider">AI Response:</p>
              <p className="text-xs text-emerald-650 dark:text-emerald-300 leading-relaxed font-medium">{result.auto_response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AITrainingView() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  const addRule = () => {
    if (!newTag.trim()) return;
    setRules(prev => [...prev, {
      id: `r-${Date.now()}`, tag: newTag.trim(), keywords: newKeywords.split(',').map(k => k.trim()).filter(Boolean),
      intent: 'general_query', auto_response: '', escalation: false, priority: null, team: null, confidence: 0.80, samples: [],
    }]);
    setNewTag(''); setNewKeywords(''); setShowAdd(false);
  };

  return (
    <div className="h-full overflow-y-auto theme-bg-primary select-none">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-md shadow-emerald-500/5">
              <Brain className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold theme-text-main">AI Training & Flows</h1>
              <p className="text-xs theme-text-muted mt-0.5">Define tags, auto-responses, and routing rules</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs py-1.5 px-3.5 h-9 shadow-none">
            <Plus className="h-4 w-4" />Add Rule
          </button>
        </div>

        <FlowVisualizer />

        {showAdd && (
          <div className="glass-card p-5 space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">New Tag Rule</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag name (e.g. shipping-delay)" className="input-field" />
              <input value={newKeywords} onChange={e => setNewKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className="input-field" />
            </div>
            <div className="flex gap-2">
              <button onClick={addRule} className="btn-primary text-[11px] py-1 px-3 h-8 shadow-none">Create Rule</button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-[11px] py-1 px-3 h-8">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid gap-4 stagger-children">
          {rules.map(rule => (
            <TagRuleCard key={rule.id} rule={rule} onDelete={() => setRules(prev => prev.filter(r => r.id !== rule.id))} />
          ))}
        </div>

        <AITestPanel />
      </div>
    </div>
  );
}
