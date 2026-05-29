import { useState, useRef, useEffect } from 'react';
import {
  GraduationCap, Play, RotateCcw, Send,
  Loader2, Award,
  Target, BookOpen, AlertTriangle, CheckCircle, Zap,
  ThumbsUp, ThumbsDown, BarChart2
} from 'lucide-react';
import type { SimulatorScenario, SimulatorMessage, AgentFeedback } from '../types';
import { simulatorScenarios } from '../data/mockData';

// ─── Mock simulator responses ─────────────────────────────────

const SCENARIO_RESPONSES: Record<string, {
  good: string[];
  medium: string[];
  poor: string[];
  resolve: string;
}> = {
  'sim-001': {
    good: [
      "Okay, I can see you understand the gravity of this. Please tell me — what exactly is being done RIGHT NOW to reverse this charge? I need specifics, not just 'we're looking into it'.",
      "Alright, I appreciate that you're taking ownership. But I need to be clear — if this isn't resolved by 5 PM today, I'm calling my bank and disputing both charges. Is that understood?",
      "Fine. Reference number BIL-2847 noted. I'm holding you to that 2-hour timeline. And I expect a follow-up call, not just an email.",
    ],
    medium: [
      "I've been waiting 40 minutes already. How much longer is 'soon' going to be? I have a business to run.",
      "Look, I don't want excuses. I want my ₹4,999 back. Simple as that. Can you at least confirm you can see the duplicate charge?",
      "Okay. But I still think this whole situation has been handled very poorly. Your processes need fixing.",
    ],
    poor: [
      "This is absolutely unacceptable. I'm done with this. Cancelling everything and disputing with my bank. Goodbye.",
      "You have no idea what you're doing! Get me your manager NOW.",
      "I have been robbed by your company and now you're giving me the runaround? I'm posting about this on Twitter.",
    ],
    resolve: "Okay, I can see the refund has been initiated and the reference number checks out. I'll hold off on the bank dispute for now. But please make sure this never happens again. I've been a loyal customer for 3 years.",
  },
  'sim-002': {
    good: [
      "Oh thank goodness! Okay, I found the Integrations page. Now I can see 'WhatsApp Business' option. Should I click on it?",
      "Oh I see! So I should look for the green 'Connect' button? Let me check... yes I can see it! Is it safe to click?",
      "Okay I clicked it and now there's a QR code. My son told me about QR codes! Should I scan it with my phone?",
    ],
    medium: [
      "I'm sorry, I think I'm getting confused again. There are so many options on this page. Can you be more specific?",
      "Hmm, I don't see what you're describing. Maybe I'm in the wrong place? Where exactly should I look?",
      "Wait, now I accidentally closed that tab. Can we start from the beginning? I'm so sorry to be such trouble.",
    ],
    poor: [
      "I'm very confused. I don't know what you mean by 'dashboard'. Can you explain in simpler words?",
      "Oh dear, I think I clicked the wrong thing and now everything looks different. Did I break something?",
      "I'm going to have to call my son. This is too complicated. Maybe I'll try again tomorrow.",
    ],
    resolve: "Oh wonderful! The green light is showing and it says 'Connected'! I did it! Thank you so much for your patience with me. You've been such a dear!",
  },
  'sim-003': {
    good: [
      "Alright. I'm listening. But I need a concrete plan, not platitudes. What specifically are you doing to prevent this from happening during our next board presentation?",
      "The SLA credit is acknowledged. But my concern isn't the money — it's the reliability. What architectural changes are being made to your infrastructure?",
      "I appreciate the transparency. I'll hold off on the competitor demos for now. But I need this in writing and I need to speak with your CTO within 48 hours.",
    ],
    medium: [
      "This is slightly better than what I expected. But 'we're investigating' isn't a solution. When will you have root cause analysis?",
      "The credit helps but doesn't undo the damage to our board's confidence. What's your plan to make this right beyond the money?",
      "Fine. I'll give you one more chance. But understand — my board is watching our vendor reliability very carefully right now.",
    ],
    poor: [
      "That's a completely inadequate response. I'm scheduling demos with your three top competitors this week. We're done here.",
      "You're not hearing me. I don't want to be escalated. I want ANSWERS. Your CEO will be getting a call from our investors.",
      "This is exactly what I expected — corporate deflection. I'll be sharing this conversation with our industry network.",
    ],
    resolve: "Very well. The remediation plan is comprehensive and the credit is appropriate. I'll cancel the competitor demos. But I need that CTO call scheduled within 48 hours as promised. Send me the meeting invite now.",
  },
  'sim-004': {
    good: [
      "Theek hai, main samajh gaya. Toh agar unlimited storage nahi hai, toh kya mujhe upgrade karna padega? Kitna extra charge lagega?",
      "Okay bhai, tum explain kar rahe ho, lekin mere sales wale ne clearly bola tha unlimited. Koi proof hai is promise ka?",
      "Agar aap mujhe Pro+ plan upgrade karoge aur 50GB extra doge as compensation, toh main consider kar sakta hoon cancellation se pehle.",
    ],
    medium: [
      "Main confused hoon bhai. Sales wala ek cheez bola, ab tum alag bol rahe ho. Kaunsa true hai?",
      "Ek mahine refund toh milega? 12,000 bade paise hain mere liye. Koi discount de sakte ho next renewal pe?",
      "Tum dekho, main apna business move kar sakta hoon kisi aur platform pe. Par agar aap proper solution doge toh ruk sakta hoon.",
    ],
    poor: [
      "Nahin bhai, yeh acceptable nahin hai. Cheating hui hai mujhse. Main consumer forum mein complaint file karunga.",
      "Sirf sales team ko blame karna koi solution nahin hai. Mujhe mere paise chahiye. Full refund.",
      "Mujhe koi manager se baat karni hai. Tum log kuch nahi kar sakte. Yeh conversation waste of time hai.",
    ],
    resolve: "Bhai, theek hai. Agar tum 3 mahine extra storage free de rahe ho aur next renewal pe 20% discount, toh main rukne ke liye taiyaar hoon. Par please apne sales team ko train karo. Aur haan — ek written confirmation bhejna is deal ki.",
  },
};

// ─── Scenario Card ────────────────────────────────────────────

function ScenarioCard({ scenario, onSelect }: { scenario: SimulatorScenario; onSelect: () => void }) {
  const difficultyColors: Record<string, string> = {
    beginner:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15',
    intermediate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/15',
    advanced:     'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/15',
  };
  const moodEmoji: Record<string, string> = {
    frustrated: '😤', confused: '😕', angry: '😠', polite: '🙂', demanding: '💼',
  };

  return (
    <div className="group glass-card p-5 hover:scale-[1.005] transition-all duration-200 cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{moodEmoji[scenario.persona.mood]}</span>
          <div>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider ${difficultyColors[scenario.difficulty]}`}>
              {scenario.difficulty.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <Play className="h-3 w-3 fill-current" />
          <span className="text-xs font-bold uppercase tracking-wider">Start</span>
        </div>
      </div>

      <h3 className="text-sm font-bold theme-text-main mb-1 leading-tight">{scenario.title}</h3>
      <p className="text-xs theme-text-secondary leading-relaxed mb-3.5">{scenario.description}</p>

      <div className="border-t theme-border pt-3.5">
        <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted mb-2">Learning Objectives</p>
        <ul className="space-y-1.5">
          {scenario.learning_objectives.slice(0, 2).map((obj, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] theme-text-secondary leading-normal font-medium">
              <Target className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              {obj}
            </li>
          ))}
          {scenario.learning_objectives.length > 2 && (
            <li className="text-[10px] theme-text-muted font-medium pl-5">+{scenario.learning_objectives.length - 2} more...</li>
          )}
        </ul>
      </div>

      <div className="mt-3.5 flex gap-1.5 flex-wrap">
        {scenario.tags.map(tag => (
          <span key={tag} className="rounded-full bg-zinc-50 dark:bg-white/[0.02] px-2.5 py-0.5 text-[9px] font-semibold theme-text-secondary border theme-border">#{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg className="-rotate-90" width="52" height="52">
        <circle cx="26" cy="26" r={radius} fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={radius} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-xs font-bold theme-text-main font-mono">{score}</span>
      <span className="text-[9px] theme-text-muted uppercase tracking-wider font-bold">{label}</span>
    </div>
  );
}

// ─── Chat Session ─────────────────────────────────────────────

function SimulatorChat({
  scenario,
  onReset,
}: {
  scenario: SimulatorScenario;
  onReset: () => void;
}) {
  const [messages, setMessages] = useState<SimulatorMessage[]>([
    {
      id: 'init',
      role: 'customer',
      content: scenario.initial_message,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<AgentFeedback[]>([]);
  const [completed, setCompleted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const responses = SCENARIO_RESPONSES[scenario.id];

  const getCustomerReply = (agentMsg: string): { reply: string; feedback: AgentFeedback } => {
    const lower = agentMsg.toLowerCase();
    const hasEmpathy = lower.includes('understand') || lower.includes('sorry') || lower.includes('apologize') || lower.includes('frustrat') || lower.includes('samajh');
    const hasAction = lower.includes('escalat') || lower.includes('resolve') || lower.includes('refund') || lower.includes('check') || lower.includes('team') || lower.includes('karenge') || lower.includes('karte');
    const hasTimeline = /\d+\s*(hour|minute|min|hr|business|day|ghante|min)/.test(lower);
    const hasReference = lower.includes('ref') || lower.includes('#') || lower.includes('case') || lower.includes('ticket');
    const isLong = agentMsg.length > 150;

    const empathy = Math.min(100, (hasEmpathy ? 65 : 30) + (isLong ? 15 : 0) + Math.random() * 10);
    const clarity = Math.min(100, (hasAction ? 60 : 25) + (hasTimeline ? 20 : 0) + Math.random() * 10);
    const resolution = Math.min(100, (hasAction ? 50 : 20) + (hasReference ? 20 : 0) + (hasTimeline ? 20 : 0) + Math.random() * 10);
    const overall = (empathy + clarity + resolution) / 3;

    const isGood = overall > 65;
    const isMedium = overall > 40 && !isGood;
    const isResolve = messages.length > 4 && isGood;

    const replyArr = isResolve ? [responses.resolve] : isGood ? responses.good : isMedium ? responses.medium : responses.poor;
    const reply = replyArr[Math.floor(Math.random() * replyArr.length)];

    const strengths: string[] = [];
    const improvements: string[] = [];

    if (hasEmpathy) strengths.push('Excellent empathy — customer feels heard');
    else improvements.push('Acknowledge the customer\'s frustration explicitly');

    if (hasAction) strengths.push('Clear action taken — customer knows next steps');
    else improvements.push('State what specific action you are taking right now');

    if (hasTimeline) strengths.push('Timeline given — sets proper expectations');
    else improvements.push('Always provide a specific resolution timeline');

    if (!hasReference && messages.length > 2) improvements.push('Provide a reference/case number for accountability');

    return {
      reply: isResolve ? responses.resolve : reply,
      feedback: {
        score: Math.round(overall),
        empathy_score: Math.round(empathy),
        clarity_score: Math.round(clarity),
        resolution_effectiveness: Math.round(resolution),
        tone_match: Math.round(40 + Math.random() * 50),
        strengths: strengths.slice(0, 2),
        improvements: improvements.slice(0, 2),
      },
    };
  };

  const handleSend = async () => {
    if (!draft.trim() || loading || completed) return;
    const agentMsg = draft.trim();
    setDraft('');

    const agentMessage: SimulatorMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: agentMsg,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, agentMessage]);
    setLoading(true);

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    const { reply, feedback } = getCustomerReply(agentMsg);
    const isResolved = reply === responses.resolve;

    const updatedAgent = { ...agentMessage, feedback };

    const customerMsg: SimulatorMessage = {
      id: `customer-${Date.now()}`,
      role: 'customer',
      content: reply,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev =>
      [...prev.map(m => m.id === agentMessage.id ? updatedAgent : m), customerMsg]
    );
    setScores(prev => [...prev, feedback]);
    setLoading(false);

    if (isResolved || messages.length > 8) {
      setCompleted(true);
    }
  };

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
    : 0;

  return (
    <div className="flex h-full overflow-hidden select-none">
      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b theme-border theme-bg-secondary px-4">
          <button onClick={onReset} className="btn-secondary text-[11px] py-1 px-3 h-8">
            <RotateCcw className="h-3.5 w-3.5" />Back
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 ml-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm shrink-0 border border-amber-200">
              {scenario.persona.mood === 'frustrated' ? '😤' : scenario.persona.mood === 'angry' ? '😠' : scenario.persona.mood === 'confused' ? '😕' : '🧑'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold theme-text-main truncate leading-none">{scenario.persona.name}</p>
              <p className="text-[10px] theme-text-muted capitalize truncate mt-1 leading-none font-medium">{scenario.persona.mood} · {scenario.title}</p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {completed ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-3 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle className="h-3.5 w-3.5" />Scenario Complete
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 px-3 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />Simulation Active
              </span>
            )}
            {scores.length > 0 && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                avgScore >= 70 ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400' : avgScore >= 50 ? 'bg-amber-500/10 border-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-red-500/10 border-red-500/15 text-red-650 dark:text-red-400'
              }`}>
                {avgScore}/100
              </span>
            )}
          </div>
        </div>

        {/* Persona briefing */}
        <div className="border-b border-amber-500/15 bg-amber-500/[0.04] px-4 py-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-normal">
              <span className="font-bold">Persona Briefing: </span>
              {scenario.persona.backstory}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto theme-bg-primary px-4 py-4 space-y-4">
          {messages.map((msg) => {
            const isAgent = msg.role === 'agent';
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isAgent ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-850 border border-amber-250'
                }`}>
                  {isAgent ? 'A' : scenario.persona.name[0]}
                </div>
                <div className={`max-w-[75%] flex flex-col gap-1.5 ${isAgent ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm select-text ${
                    isAgent
                      ? 'gradient-accent text-white rounded-br-sm shadow-md shadow-emerald-500/10'
                      : 'theme-bg-secondary border theme-border theme-text-main rounded-bl-sm font-medium'
                  }`}>
                    {msg.content}
                  </div>
                  {/* Feedback for agent messages */}
                  {isAgent && msg.feedback && (
                    <div className="w-full rounded-xl border theme-border theme-bg-secondary p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-4">
                        <div className={`text-xl font-extrabold font-mono ${
                          msg.feedback.score >= 70 ? 'text-emerald-500' : msg.feedback.score >= 50 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {msg.feedback.score}/100
                        </div>
                        <div className="flex gap-4">
                          <ScoreRing score={msg.feedback.empathy_score}          label="Empathy"    color="#8b5cf6" />
                          <ScoreRing score={msg.feedback.clarity_score ?? 70}    label="Clarity"    color="#3b82f6" />
                          <ScoreRing score={msg.feedback.resolution_effectiveness} label="Resolution" color="#10b981" />
                        </div>
                      </div>
                      {msg.feedback.strengths.length > 0 && (
                        <div className="space-y-1">
                          {msg.feedback.strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <ThumbsUp className="h-3.5 w-3.5 shrink-0" />{s}
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.feedback.improvements.length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          {msg.feedback.improvements.map((imp, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-amber-705 dark:text-amber-450">
                              <ThumbsDown className="h-3.5 w-3.5 shrink-0" />{imp}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 border border-amber-200">
                {scenario.persona.name[0]}
              </div>
              <div className="rounded-2xl border theme-border theme-bg-secondary px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 theme-text-muted">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-650 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-xs italic font-medium">{scenario.persona.name} is typing...</span>
                </div>
              </div>
            </div>
          )}

          {completed && (
            <div className="rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 text-center space-y-3">
              <Award className="h-8 w-8 text-emerald-500 dark:text-emerald-400 mx-auto" />
              <div>
                <p className="font-bold text-emerald-600 dark:text-emerald-300 text-sm">Scenario Complete!</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">Final Score: {avgScore}/100</p>
              </div>
              <button onClick={onReset} className="btn-primary text-xs py-1.5 px-4 h-9 shadow-none">
                Try Another Scenario
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        {!completed && (
          <div className="shrink-0 border-t theme-border theme-bg-secondary p-3.5">
            <div className="flex gap-2.5">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your response as an agent... (Enter to send)"
                rows={2}
                disabled={loading || completed}
                className="flex-1 resize-none rounded-xl border theme-border theme-bg-secondary px-3 py-2 text-sm theme-text-main placeholder:theme-text-muted focus:border-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-50 transition-all select-text"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || loading || completed}
                className="btn-primary text-xs py-1.5 px-4 h-11 shadow-none shrink-0 self-end"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] theme-text-muted font-medium">
              💡 Tip: Show empathy, take ownership, give a specific timeline, and provide a reference number.
            </p>
          </div>
        )}
      </div>

      {/* Side: Learning objectives */}
      <div className="hidden xl:flex xl:w-72 flex-col border-l theme-border theme-bg-secondary overflow-y-auto shrink-0">
        <div className="border-b theme-border px-4 py-3.5">
          <h3 className="text-xs font-bold theme-text-main flex items-center gap-2 uppercase tracking-wider">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            Learning Guide
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted mb-2.5">Objectives</p>
            <ul className="space-y-2">
              {scenario.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-2.5">
                  <Target className="h-3.5 w-3.5 text-emerald-555 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-xs theme-text-secondary font-medium leading-normal">{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted mb-2.5">Customer Pain Points</p>
            <ul className="space-y-2">
              {scenario.persona.pain_points.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs theme-text-secondary leading-normal font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-500 shrink-0 mt-0.5" />{p}
                </li>
              ))}
            </ul>
          </div>

          {scores.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted mb-2.5">Session Progress</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Avg Empathy',   value: Math.round(scores.reduce((a, b) => a + b.empathy_score, 0) / scores.length), color: '#8b5cf6' },
                  { label: 'Avg Clarity',   value: Math.round(scores.reduce((a, b) => a + (b.clarity_score ?? 70), 0) / scores.length), color: '#3b82f6' },
                  { label: 'Avg Resolution',value: Math.round(scores.reduce((a, b) => a + b.resolution_effectiveness, 0) / scores.length), color: '#10b981' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-semibold theme-text-muted">{label}</span>
                      <span className="font-bold theme-text-secondary font-mono">{value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-150 dark:bg-white/[0.06] overflow-hidden p-[1px] border border-zinc-200/50 dark:border-white/[0.01]">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/[0.05] p-3.5">
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 fill-current" />Quick Tips
            </p>
            <ul className="space-y-1.5 text-[10px] text-emerald-600 dark:text-emerald-300 font-bold leading-normal">
              <li>✓ Acknowledge feelings before facts</li>
              <li>✓ Take personal ownership ("I will...")</li>
              <li>✓ Give specific timelines (not "soon")</li>
              <li>✓ Always provide a reference number</li>
              <li>✓ Offer proactive next steps</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Simulator View ──────────────────────────────────────

export function SimulatorView() {
  const [activeScenario, setActiveScenario] = useState<SimulatorScenario | null>(null);

  if (activeScenario) {
    return <SimulatorChat scenario={activeScenario} onReset={() => setActiveScenario(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary select-none">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold theme-text-main">Training Simulator</h1>
              <p className="text-xs theme-text-muted mt-0.5">Practice with AI-powered realistic customer scenarios</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Target,       label: 'Scenarios Available', value: `${simulatorScenarios.length}`, color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/15', bg: 'bg-emerald-500/10' },
              { icon: BarChart2,    label: 'Avg Agent Score',     value: '76/100',                       color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/15', bg: 'bg-emerald-500/10' },
              { icon: GraduationCap,label: 'Skills Covered',      value: '12',                           color: 'text-blue-650 dark:text-blue-400 border-blue-500/15',    bg: 'bg-blue-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`rounded-xl ${bg} p-4 flex items-center gap-3 border ${color.split(' ')[2]}`}>
                <Icon className={`h-6 w-6 ${color.split(' ')[0]}`} />
                <div>
                  <p className={`text-xl font-bold tracking-tight leading-tight ${color.split(' ')[0]}`}>{value}</p>
                  <p className="text-[10px] theme-text-muted mt-0.5 uppercase tracking-wider font-semibold">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LLM Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">Powered by Gemma 3 · Local LLM</p>
            <p className="text-xs theme-text-secondary mt-1 leading-relaxed font-medium">
              Each customer turn is generated in real-time by the local LLM. Customer responses dynamically adapt to your message quality —
              empathetic, actionable responses de-escalate the situation; poor responses escalate it further.
            </p>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="space-y-3.5">
          <h2 className="text-xs font-bold theme-text-main uppercase tracking-wider">Select a Scenario</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
            {simulatorScenarios.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} onSelect={() => setActiveScenario(scenario)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
