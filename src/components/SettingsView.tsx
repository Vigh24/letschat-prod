import { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, User, Bell, Shield, Cpu, Globe, Save, CheckCircle, Smartphone, Loader, Phone, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useTwilioVoice } from '../hooks/useTwilioVoice';
import { currentAgent } from '../data/appConfig';

function Section({ title, desc, icon: Icon, children }: { title: string; desc: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border theme-border theme-bg-secondary p-6 mb-6 shadow-sm hover:border-white/[0.08] transition-all duration-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
          <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xs font-bold theme-text-main uppercase tracking-wider">{title}</h3>
          <p className="text-[11px] theme-text-muted mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-xs font-semibold theme-text-secondary">{label}</p>
        <p className="text-[10px] theme-text-muted mt-0.5">{desc}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)} 
        className={`relative h-5 w-9 shrink-0 rounded-full transition-all duration-300 focus:outline-none ${checked ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25' : 'bg-white/[0.08] hover:bg-white/[0.12]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">{label}</label>
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs theme-text-secondary placeholder:text-slate-650 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200" 
      />
    </div>
  );
}

const TIMEZONES = [
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - India)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - Singapore)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - Japan)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - Gulf)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - UK)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST - France/Germany)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - US Eastern)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT - US Central)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT - US Mountain)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - US Pacific)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT - Sydney)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT - Brazil)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST - South Africa)' }
];

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="mb-1 relative" ref={dropdownRef}>
      <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">{label}</label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs theme-text-secondary focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200 cursor-pointer flex items-center justify-between text-left"
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Custom Option Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border theme-border theme-bg-panel shadow-2xl p-1.5 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserRoleSelect({ 
  role, 
  disabled, 
  onChange 
}: { 
  role: 'admin' | 'agent' | 'supervisor'; 
  disabled: boolean; 
  onChange: (newRole: 'admin' | 'agent' | 'supervisor') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'admin', label: 'Admin' },
    { value: 'agent', label: 'Agent' },
    { value: 'supervisor', label: 'Supervisor' }
  ];

  const currentLabel = role === 'admin' ? 'Admin' : role === 'supervisor' ? 'Supervisor' : 'Agent';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold theme-text-secondary focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
      >
        <span>{currentLabel}</span>
        {!disabled && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 z-50 w-32 rounded-lg border theme-border theme-bg-panel shadow-2xl p-1 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === role;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value as 'admin' | 'agent' | 'supervisor');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserAccessScopeSelect({
  scope,
  disabled,
  onChange
}: {
  scope: 'all' | 'assigned';
  disabled: boolean;
  onChange: (newScope: 'all' | 'assigned') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'all', label: 'All Tickets' },
    { value: 'assigned', label: 'Assigned Only' }
  ];

  const currentLabel = scope === 'all' ? 'All Tickets' : 'Assigned Only';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold theme-text-secondary focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left min-w-[125px] justify-between uppercase"
      >
        <span className="flex items-center gap-1.5">
          {scope === 'all' ? <Eye className="h-3.5 w-3.5 text-slate-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
          <span>{currentLabel}</span>
        </span>
        {!disabled && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 z-50 w-36 rounded-lg border theme-border theme-bg-panel shadow-2xl p-1 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === scope;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value as 'all' | 'assigned');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {opt.value === 'all' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SettingsView() {
  const { twilioConfig, setTwilioConfig, simulateIncomingCall } = useTwilioVoice();
  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'ai' | 'canned' | 'templates' | 'phone'>('general');
  const [twilioEnabled, setTwilioEnabled] = useState(twilioConfig.isEnabled);
  const [twilioDemoMode, setTwilioDemoMode] = useState(twilioConfig.isDemoMode);
  const [twilioAccountSid, setTwilioAccountSid] = useState(twilioConfig.accountSid);
  const [twilioAuthToken, setTwilioAuthToken] = useState(twilioConfig.authToken);
  const [twilioApiKeySid, setTwilioApiKeySid] = useState(twilioConfig.apiKeySid);
  const [twilioApiKeySecret, setTwilioApiKeySecret] = useState(twilioConfig.apiKeySecret);
  const [twilioTwimlAppSid, setTwilioTwimlAppSid] = useState(twilioConfig.twimlAppSid);
  const [twilioCallerId, setTwilioCallerId] = useState(twilioConfig.callerId);
  const [simTimeRemaining, setSimTimeRemaining] = useState<number | null>(null);
  const [orgName, setOrgName] = useState('Lets Chat Support');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [hoursStart, setHoursStart] = useState('09:00');
  const [hoursEnd, setHoursEnd] = useState('18:00');
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('Thank you for contacting us. We are currently out of office. We will get back to you during our business hours.');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful, professional, and friendly AI support agent for "Lets Chat", a customer support service.\nYour goal is to answer the customer\'s query directly, politely, and concisely. Keep the response under 100 words.');
  const [rephrasePrompt, setRephrasePrompt] = useState('You are a helpful customer support communication specialist. Rephrase the following customer support agent\'s draft message to be more {{tone}}.\nKeep the facts, amounts, links, or dates exactly the same. Do not add any new facts or make promises the agent did not make. Respond with ONLY the rephrased message, with no other conversational filler, markdown formatting (like quotes), or introductions.');
  const [aiStatus, setAiStatus] = useState<any>({
    geminiConfigured: false,
    ollamaConfigured: false,
    defaultProvider: 'gemini',
    ollamaBaseUrl: 'https://ollama.com',
    ollamaModel: 'gemma4:31b-cloud'
  });
  const [autoAssign, setAutoAssign] = useState(true);
  const [autoRespond, setAutoRespond] = useState(true);
  const [disableAiWhenAgentAssigned, setDisableAiWhenAgentAssigned] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState('80');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [escalationNotifs, setEscalationNotifs] = useState(true);
  const [wabaId, setWabaId] = useState('1209158515605127');
  const [waPhoneId, setWaPhoneId] = useState('+1 555-644-0656');
  const [waWebhook, setWaWebhook] = useState('https://letschat-prod.onrender.com/webhook');
  const [supabaseMode, setSupabaseMode] = useState('LIVE');
  
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [accessScopes, setAccessScopes] = useState<Record<string, 'all' | 'assigned'>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [newShortcut, setNewShortcut] = useState('');
  const [newResponseText, setNewResponseText] = useState('');

  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [newTempName, setNewTempName] = useState('');
  const [newTempLang, setNewTempLang] = useState('en_US');
  const [newTempBody, setNewTempBody] = useState('');

  const timezoneOptions = useMemo(() => {
    const hasCurrent = TIMEZONES.some(tz => tz.value === timezone);
    if (!hasCurrent && timezone) {
      return [...TIMEZONES, { value: timezone, label: `${timezone} (Custom)` }];
    }
    return TIMEZONES;
  }, [timezone]);

  const timeOptions = useMemo(() => {
    const baseOptions = Array.from({ length: 48 }, (_, i) => {
      const hour = Math.floor(i / 2);
      const min = (i % 2) * 30;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const padHour = String(hour).padStart(2, '0');
      const padMin = String(min).padStart(2, '0');
      return {
        value: `${padHour}:${padMin}`,
        label: `${String(displayHour).padStart(2, '0')}:${padMin} ${period}`
      };
    });

    const formatCustomTime = (t: string) => {
      const parts = t.split(':');
      if (parts.length < 2) return t;
      const h = parseInt(parts[0], 10);
      const m = parts[1];
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${String(displayHour).padStart(2, '0')}:${m} ${period}`;
    };

    let result = [...baseOptions];
    if (hoursStart && !baseOptions.some(o => o.value === hoursStart)) {
      result.push({ value: hoursStart, label: formatCustomTime(hoursStart) });
    }
    if (hoursEnd && !baseOptions.some(o => o.value === hoursEnd)) {
      result.push({ value: hoursEnd, label: formatCustomTime(hoursEnd) });
    }
    return result.sort((a, b) => a.value.localeCompare(b.value));
  }, [hoursStart, hoursEnd]);

  useEffect(() => {
    let isMounted = true;
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isMounted) return;
      if (isSupabaseConfigured) {
        setSupabaseMode('LIVE');
        try {
          const { data } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();
          if (data && isMounted) {
            setOrgName(data.name);
            const settings = data.settings || {};
            setAiEnabled(settings.ai_enabled ?? true);
            setAiProvider(settings.ai_provider || 'gemini');
            setSystemPrompt(settings.system_prompt || 'You are a helpful, professional, and friendly AI support agent for "Lets Chat", a customer support service.\nYour goal is to answer the customer\'s query directly, politely, and concisely. Keep the response under 100 words.');
            setRephrasePrompt(settings.rephrase_prompt || 'You are a helpful customer support communication specialist. Rephrase the following customer support agent\'s draft message to be more {{tone}}.\nKeep the facts, amounts, links, or dates exactly the same. Do not add any new facts or make promises the agent did not make. Respond with ONLY the rephrased message, with no other conversational filler, markdown formatting (like quotes), or introductions.');
            setAutoAssign(settings.auto_assignment ?? true);
             setTimezone(settings.business_hours?.timezone ?? 'Asia/Kolkata');
            setHoursStart(settings.business_hours?.start ?? '09:00');
            setHoursEnd(settings.business_hours?.end ?? '18:00');
            setBusinessDays(settings.business_hours?.days ?? [1, 2, 3, 4, 5]);
            setOutOfOfficeMessage(settings.out_of_office_message ?? 'Thank you for contacting us. We are currently out of office. We will get back to you during our business hours.');
            setAutoRespond(settings.auto_respond ?? true);
            setDisableAiWhenAgentAssigned(settings.disable_ai_when_agent_assigned ?? true);
            setCannedResponses(settings.canned_responses || []);
            setWhatsappTemplates(settings.whatsapp_templates || []);
            setAccessScopes(settings.agent_access_scopes || {});

            const twilioDb = settings.twilio_calling || {};
            if (twilioDb.enabled !== undefined) setTwilioEnabled(twilioDb.enabled);
            if (twilioDb.demo_mode !== undefined) setTwilioDemoMode(twilioDb.demo_mode);
            if (twilioDb.account_sid) setTwilioAccountSid(twilioDb.account_sid);
            if (twilioDb.auth_token) setTwilioAuthToken(twilioDb.auth_token);
            if (twilioDb.api_key_sid) setTwilioApiKeySid(twilioDb.api_key_sid);
            if (twilioDb.api_key_secret) setTwilioApiKeySecret(twilioDb.api_key_secret);
            if (twilioDb.twiml_app_sid) setTwilioTwimlAppSid(twilioDb.twiml_app_sid);
            if (twilioDb.caller_id) setTwilioCallerId(twilioDb.caller_id);
          }

          // Fetch active environment config from backend
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          try {
            const res = await fetch(`${apiUrl}/api/ai-status`);
            const status = await res.json();
            if (isMounted) {
              setAiStatus(status);
            }
          } catch (err) {
            console.error('Failed to fetch AI status:', err);
          }

          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .order('full_name', { ascending: true });
          if (usersData && isMounted) {
            setUsers(usersData);
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        } finally {
          if (isMounted) {
            setLoading(false);
            setLoadingUsers(false);
          }
        }
      } else {
        if (isMounted) {
          setSupabaseMode('MOCK');
          setLoading(false);
          setUsers([
            { id: '1', email: 'priya.sharma@letschat.com', full_name: 'Priya Sharma', role: 'admin' },
            { id: '2', email: 'agent1@letschat.com', full_name: 'Rahul Kumar', role: 'agent' },
            { id: '3', email: 'supervisor1@letschat.com', full_name: 'Neha Singh', role: 'supervisor' }
          ]);
          setAccessScopes({
            '1': 'all',
            '2': 'assigned',
            '3': 'all'
          });
          setLoadingUsers(false);
          setCannedResponses([
            { shortcut: 'greet', text: 'Hello there! Welcome to Lets Chat. How can we help you today?' },
            { shortcut: 'pricing', text: 'Check our pricing page here: https://letschat.com/pricing' }
          ]);
          setWhatsappTemplates([
            { name: 'welcome_template', language: 'en_US', body: 'Hi {{1}}, welcome to Lets Chat! Feel free to ask any questions.' }
          ]);
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleSave = () => {
    setSaving(true);
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('organizations')
            .update({
              name: orgName,
              settings: {
                ai_enabled: aiEnabled,
                auto_respond: autoRespond,
                disable_ai_when_agent_assigned: disableAiWhenAgentAssigned,
                ai_provider: aiProvider,
                system_prompt: systemPrompt,
                rephrase_prompt: rephrasePrompt,
                auto_assignment: autoAssign,
                business_hours: {
                  timezone,
                  start: hoursStart,
                  end: hoursEnd,
                  days: businessDays
                },
                out_of_office_message: outOfOfficeMessage,
                canned_responses: cannedResponses,
                whatsapp_templates: whatsappTemplates,
                agent_access_scopes: accessScopes,
                twilio_calling: {
                  enabled: twilioEnabled,
                  demo_mode: twilioDemoMode,
                  account_sid: twilioAccountSid,
                  auth_token: twilioAuthToken,
                  api_key_sid: twilioApiKeySid,
                  api_key_secret: twilioApiKeySecret,
                  twiml_app_sid: twilioTwimlAppSid,
                  caller_id: twilioCallerId
                }
              }
            })
            .eq('id', '00000000-0000-0000-0000-000000000001');
          if (error) throw error;
          
          setTwilioConfig({
            isEnabled: twilioEnabled,
            isDemoMode: twilioDemoMode,
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            apiKeySid: twilioApiKeySid,
            apiKeySecret: twilioApiKeySecret,
            twimlAppSid: twilioTwimlAppSid,
            callerId: twilioCallerId
          });

          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error('Failed to save settings:', err);
        } finally {
          setSaving(false);
        }
      } else {
        setTwilioConfig({
          isEnabled: twilioEnabled,
          isDemoMode: twilioDemoMode,
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          apiKeySid: twilioApiKeySid,
          apiKeySecret: twilioApiKeySecret,
          twimlAppSid: twilioTwimlAppSid,
          callerId: twilioCallerId
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setSaving(false);
      }
    });
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'agent' | 'supervisor') => {
    if (userId === currentAgent.id && newRole === 'agent') {
      alert("You cannot demote yourself. There must be at least one active Admin.");
      return;
    }

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
          if (error) throw error;
          
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
          console.error('Failed to update user role:', err);
          alert('Failed to update user role. Please verify your database permissions.');
        }
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    });
  };

  const handleUpdateAccessScope = async (userId: string, newScope: 'all' | 'assigned') => {
    if (userId === currentAgent.id) {
      alert("You cannot restrict your own ticket access scope.");
      return;
    }

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      const updatedScopes = { ...accessScopes, [userId]: newScope };
      if (isSupabaseConfigured) {
        try {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .maybeSingle();

          const currentSettings = orgData?.settings || {};
          const { error } = await supabase
            .from('organizations')
            .update({
              settings: {
                ...currentSettings,
                agent_access_scopes: updatedScopes
              }
            })
            .eq('id', '00000000-0000-0000-0000-000000000001');

          if (error) throw error;
          setAccessScopes(updatedScopes);
        } catch (err) {
          console.error('Failed to update access scope:', err);
          alert('Failed to update access scope. Please verify database permissions.');
        }
      } else {
        setAccessScopes(updatedScopes);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <Loader className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold theme-text-main uppercase tracking-wider">Workspace Settings</h1>
              <p className="text-[11px] theme-text-muted mt-0.5">Manage and configure Lets Chat features</p>
            </div>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all shadow-md ${saved ? 'bg-emerald-600 shadow-emerald-500/15' : 'gradient-accent hover:opacity-95 shadow-emerald-500/15 disabled:opacity-50'}`}
          >
            {saving ? (
              <><Loader className="h-3.5 w-3.5 animate-spin" />Saving...</>
            ) : saved ? (
              <><CheckCircle className="h-3.5 w-3.5" />Saved!</>
            ) : (
              <><Save className="h-3.5 w-3.5" />Save Changes</>
            )}
          </button>
        </div>

        <div className="flex border-b border-white/[0.06] mb-8 gap-4 overflow-x-auto scrollbar-none">
          {[
            { id: 'general', label: 'General', icon: Globe },
            { id: 'channels', label: 'WhatsApp Channels', icon: Smartphone },
            { id: 'phone', label: 'Phone Calling', icon: Phone },
            { id: 'ai', label: 'AI Copilot Settings', icon: Cpu },
            { id: 'canned', label: 'Canned Replies', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 text-xs font-bold transition-all border-b-2 px-1 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-emerald-550 theme-text-main font-semibold'
                    : 'border-transparent theme-text-muted hover:theme-text-secondary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'general' && (
          <>
            <Section title="Database Connection" desc="Verify where application data is loaded and stored" icon={Globe}>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04] mb-3">
                <div>
                  <p className="text-xs font-bold theme-text-secondary">Supabase Integration Mode</p>
                  <p className="text-[10px] theme-text-muted mt-0.5">Confirming application database endpoint configurations.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${supabaseMode === 'LIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {supabaseMode} DATABASE
                  </span>
                </div>
              </div>
              <p className="text-[9px] theme-text-muted font-mono bg-white/[0.02] px-2.5 py-1.5 rounded border theme-border inline-block">
                Endpoint: <span className="theme-text-main">VITE_SUPABASE_URL</span>
              </p>
            </Section>

            <Section title="Organization Profile" desc="General workspace identity details" icon={Globe}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Organization Name" value={orgName} onChange={setOrgName} />
                <SelectField label="Business Timezone" value={timezone} onChange={setTimezone} options={timezoneOptions} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <SelectField label="Business Hours Start" value={hoursStart} onChange={setHoursStart} options={timeOptions} />
                <SelectField label="Business Hours End" value={hoursEnd} onChange={setHoursEnd} options={timeOptions} />
              </div>

              <div className="mt-4">
                <label className="block text-[9px] font-bold theme-text-muted mb-2 uppercase tracking-wider">Business Days</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Mon', value: 1 },
                    { label: 'Tue', value: 2 },
                    { label: 'Wed', value: 3 },
                    { label: 'Thu', value: 4 },
                    { label: 'Fri', value: 5 },
                    { label: 'Sat', value: 6 },
                    { label: 'Sun', value: 0 }
                  ].map((day) => {
                    const isActive = businessDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setBusinessDays(businessDays.filter(d => d !== day.value));
                          } else {
                            setBusinessDays([...businessDays, day.value]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isActive 
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold' 
                            : 'border-white/[0.06] bg-white/[0.01] theme-text-muted hover:bg-white/[0.03] hover:theme-text-secondary'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Out-Of-Office Auto-Reply Message</label>
                <textarea
                  value={outOfOfficeMessage}
                  onChange={e => setOutOfOfficeMessage(e.target.value)}
                  rows={3}
                  placeholder="Thank you for contacting us. We are currently out of office..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs theme-text-secondary placeholder:text-slate-650 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200"
                />
                <p className="text-[10px] theme-text-muted mt-1">This message will be automatically sent when a customer contacts outside business hours.</p>
              </div>
            </Section>
          </>
        )}

        {activeTab === 'channels' && (
          <Section title="WhatsApp Integration" desc="Meta developer platform webhook configurations" icon={Smartphone}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="WhatsApp Business Account (WABA) ID" value={wabaId} onChange={setWabaId} />
              <InputField label="Phone Number ID" value={waPhoneId} onChange={setWaPhoneId} />
            </div>
            <div className="mt-2">
              <InputField label="Incoming Webhook Endpoint" value={waWebhook} onChange={setWaWebhook} />
            </div>
            <div className="mt-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10 p-4">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">WhatsApp Webhook Sync Status</p>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-400">Webhook Active · Incoming messages synced instantly</span>
              </div>
            </div>
          </Section>
        )}
        {activeTab === 'phone' && (
          <Section title="Twilio Voice Calling Settings" desc="Configure Twilio accounts and test browser call simulation" icon={Phone}>
            <Toggle 
              label="Enable Phone Calling" 
              desc="Allow agents to make/receive telephone calls directly from the browser using Twilio Voice" 
              checked={twilioEnabled} 
              onChange={setTwilioEnabled} 
            />

            {twilioEnabled && (
              <>
                <div className="border-t border-white/[0.04] mt-4 pt-4">
                  <Toggle 
                    label="Call Simulation / Demo Mode" 
                    desc="Run calls in sandbox simulation mode to test layout and ringtones without a live Twilio integration" 
                    checked={twilioDemoMode} 
                    onChange={setTwilioDemoMode} 
                  />
                </div>

                <div className="border-t border-white/[0.04] mt-4 pt-4 space-y-4">
                  <h4 className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Twilio Credentials</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField 
                      label="Twilio Account SID" 
                      value={twilioAccountSid} 
                      onChange={setTwilioAccountSid} 
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                    />
                    <InputField 
                      label="Caller ID (Twilio Phone Number)" 
                      value={twilioCallerId} 
                      onChange={setTwilioCallerId} 
                      placeholder="+1234567890" 
                    />
                  </div>

                  {!twilioDemoMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <InputField 
                        label="Twilio Auth Token" 
                        value={twilioAuthToken} 
                        onChange={setTwilioAuthToken} 
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••" 
                      />
                      <InputField 
                        label="TwiML App SID" 
                        value={twilioTwimlAppSid} 
                        onChange={setTwilioTwimlAppSid} 
                        placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                      />
                      <InputField 
                        label="API Key SID" 
                        value={twilioApiKeySid} 
                        onChange={setTwilioApiKeySid} 
                        placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                      />
                      <InputField 
                        label="API Key Secret" 
                        value={twilioApiKeySecret} 
                        onChange={setTwilioApiKeySecret} 
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••••" 
                      />
                    </div>
                  )}
                </div>

                {twilioDemoMode && (
                  <div className="border-t border-white/[0.04] mt-4 pt-4 space-y-4">
                    <h4 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Simulate Calling Workflows</h4>
                    <p className="text-[11px] theme-text-muted">
                      Use the button below to test the softphone UI. It will trigger a simulated incoming call after a 5-second countdown.
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (simTimeRemaining !== null) return;
                          let count = 5;
                          setSimTimeRemaining(count);
                          const interval = setInterval(() => {
                            count -= 1;
                            if (count <= 0) {
                              clearInterval(interval);
                              setSimTimeRemaining(null);
                              simulateIncomingCall();
                            } else {
                              setSimTimeRemaining(count);
                            }
                          }, 1000);
                        }}
                        disabled={simTimeRemaining !== null}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {simTimeRemaining !== null 
                          ? `Simulating in ${simTimeRemaining}s...` 
                          : 'Trigger 5s Simulator Countdown'}
                      </button>
                      {simTimeRemaining !== null && (
                        <span className="text-[11px] text-rose-400 font-medium animate-pulse">
                          Make sure to minimize or keep the phone widget visible!
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>
        )}

        {activeTab === 'ai' && (
          <Section title="AI & Automation Config" desc="Customize AI model providers, thresholds and options" icon={Cpu}>
            <Toggle label="AI Suggested Answers" desc="Enable smart AI suggestions during support agent chat writing" checked={aiEnabled} onChange={setAiEnabled} />
            <Toggle label="Auto-Responder Bot" desc="Permit AI to automatically reply to simple WhatsApp queries" checked={autoRespond} onChange={setAutoRespond} />
            <Toggle label="Disable AI when Agent is Assigned" desc="Prevent the AI auto-responder from replying if the ticket has an assigned human agent" checked={disableAiWhenAgentAssigned} onChange={setDisableAiWhenAgentAssigned} />
            
            <div className="border-t border-white/[0.04] mt-4 pt-4">
              <label className="block text-[9px] font-bold theme-text-muted mb-2 uppercase tracking-wider">Active AI Provider</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setAiProvider('gemini')}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                    aiProvider === 'gemini'
                      ? 'border-emerald-500 bg-emerald-500/[0.03] shadow-md shadow-emerald-500/5'
                      : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1]'
                  }`}
                >
                  <span className="text-xs font-bold theme-text-secondary flex items-center gap-1.5">
                    Google Gemini
                    {aiStatus.geminiConfigured && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {aiStatus.geminiConfigured ? 'API Key Configured' : 'No Key Configured'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('ollama')}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                    aiProvider === 'ollama'
                      ? 'border-emerald-500 bg-emerald-500/[0.03] shadow-md shadow-emerald-500/5'
                      : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1]'
                  }`}
                >
                  <span className="text-xs font-bold theme-text-secondary flex items-center gap-1.5">
                    Ollama (Gemma 4)
                    {aiStatus.ollamaConfigured && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </span>
                  <span className="text-[10px] theme-text-muted">
                    {aiStatus.ollamaConfigured ? 'API Key Configured' : 'No Key Configured'}
                  </span>
                </button>
              </div>
            </div>

            {aiProvider === 'ollama' ? (
              <div className="rounded-xl bg-white/[0.01] border theme-border p-4 space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Ollama Model Details</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${aiStatus.ollamaConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'}`}>
                    {aiStatus.ollamaConfigured ? 'ACTIVE' : 'KEYS REQUIRED'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="block text-[8px] font-bold theme-text-muted uppercase tracking-wider">Model Tag</span>
                    <span className="text-xs font-semibold theme-text-secondary font-mono">{aiStatus.ollamaModel || 'gemma4:31b-cloud'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold theme-text-muted uppercase tracking-wider">Base URL</span>
                    <span className="text-xs font-semibold theme-text-secondary font-mono truncate block">{aiStatus.ollamaBaseUrl || 'https://ollama.com'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white/[0.01] border theme-border p-4 space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Gemini Model Details</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${aiStatus.geminiConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'}`}>
                    {aiStatus.geminiConfigured ? 'ACTIVE' : 'KEYS REQUIRED'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold theme-text-muted uppercase tracking-wider">Model</span>
                  <span className="text-xs font-semibold theme-text-secondary font-mono">gemini-2.5-flash</span>
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.04] mt-4 pt-4 space-y-4 mb-4">
              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Auto-Responder Bot System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="You are a helpful, professional AI support agent..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs theme-text-secondary placeholder:text-slate-650 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200 font-mono"
                />
                <p className="text-[10px] theme-text-muted mt-1">This prompt dictates the personality, instructions, and constraints for the AI bot when responding automatically to customer WhatsApp messages.</p>
              </div>

              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Draft Rephrase System Prompt</label>
                <textarea
                  value={rephrasePrompt}
                  onChange={e => setRephrasePrompt(e.target.value)}
                  rows={4}
                  placeholder="Rephrase the following customer support agent's draft message to be more {{tone}}..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-xs theme-text-secondary placeholder:text-zinc-400 dark:placeholder:text-zinc-550 focus:border-emerald-500/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200 font-mono"
                />
                <p className="text-[10px] theme-text-muted mt-1">
                  Dictates how draft rephrasing behaves. Use <code className="text-emerald-400 font-mono bg-white/[0.05] px-1 rounded">{"{{tone}}"}</code> as a placeholder for the selected tone.
                </p>
              </div>
            </div>

            <div className="border-t border-white/[0.04] mt-3 pt-3">
              <InputField label={`Confidence Threshold (${confidenceThreshold}%)`} value={confidenceThreshold} onChange={setConfidenceThreshold} placeholder="80" />
              <p className="text-[10px] theme-text-muted mt-1">The auto-responder bot will bypass responses when scoring below this confidence value</p>
            </div>
          </Section>
        )}

        {activeTab === 'general' && (
          <>
            <Section title="Routing & Assignment" desc="Control incoming message assignment settings" icon={User}>
              <Toggle label="Auto-Assignment" desc="Distribute new incoming tickets to available online agents immediately" checked={autoAssign} onChange={setAutoAssign} />
              <div className="mt-3 rounded-xl bg-white/[0.01] border theme-border p-4">
                <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-2">Assignment Routing Policy</p>
                <div className="flex flex-wrap gap-2">
                  {['Round Robin', 'Load Balanced', 'Manual Only'].map((s, i) => (
                    <button 
                      key={s} 
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 border ${i === 1 ? 'gradient-emerald-border text-emerald-400 bg-emerald-500/[0.02]' : 'theme-border bg-white/[0.02] theme-text-secondary hover:bg-white/[0.05]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Notification System" desc="Select system alert preferences for agents" icon={Bell}>
              <Toggle label="Email Alerts" desc="Send automated digests for priority unassigned tickets" checked={emailNotifs} onChange={setEmailNotifs} />
              <Toggle label="Auditory Alerts" desc="Play a notification sound on incoming WhatsApp messages" checked={soundNotifs} onChange={setSoundNotifs} />
              <Toggle label="Sentiment Alerts" desc="Highlight red warnings when customer mood is highly negative" checked={escalationNotifs} onChange={setEscalationNotifs} />
            </Section>
          </>
        )}

        {activeTab === 'canned' && (
          <Section title="Canned Responses" desc="Create quick shortcuts (starting with /) for commonly used agent messages" icon={Cpu}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Shortcut Name (without /)" value={newShortcut} onChange={setNewShortcut} placeholder="greet" />
                <InputField label="Response Text" value={newResponseText} onChange={setNewResponseText} placeholder="Hello! Welcome to Lets Chat..." />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newShortcut.trim() || !newResponseText.trim()) return;
                  const cleanShortcut = newShortcut.replace(/^\//, '').trim();
                  setCannedResponses(prev => [...prev, { shortcut: cleanShortcut, text: newResponseText.trim() }]);
                  setNewShortcut('');
                  setNewResponseText('');
                }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Add Canned Response
              </button>

              {cannedResponses.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/[0.04] divide-y divide-white/[0.04] bg-white/[0.01] overflow-hidden">
                  {cannedResponses.map((cr, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">/{cr.shortcut}</span>
                        <span className="theme-text-secondary truncate">{cr.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCannedResponses(prev => prev.filter((_, i) => i !== idx))}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold shrink-0 ml-2 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {activeTab === 'channels' && (
          <Section title="WhatsApp Templates" desc="Meta pre-approved message templates to initiate new conversations" icon={Smartphone}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="Template Name" value={newTempName} onChange={setNewTempName} placeholder="welcome_user" />
                <InputField label="Language Code" value={newTempLang} onChange={setNewTempLang} placeholder="en_US" />
                <InputField label="Template Text (use {{1}}, {{2}} for variables)" value={newTempBody} onChange={setNewTempBody} placeholder="Hi {{1}}, welcome!" />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newTempName.trim() || !newTempBody.trim()) return;
                  setWhatsappTemplates(prev => [...prev, { name: newTempName.trim(), language: newTempLang.trim(), body: newTempBody.trim() }]);
                  setNewTempName('');
                  setNewTempBody('');
                }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Add Template
              </button>

              {whatsappTemplates.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/[0.04] divide-y divide-white/[0.04] bg-white/[0.01] overflow-hidden">
                  {whatsappTemplates.map((t, idx) => (
                    <div key={idx} className="flex flex-col p-3 gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold theme-text-secondary uppercase">{t.name} ({t.language})</span>
                        <button
                          type="button"
                          onClick={() => setWhatsappTemplates(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="theme-text-muted">{t.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {activeTab === 'general' && (
          <>
            <Section title="Team Management" desc="Configure roles and access control for registered workspace users" icon={Shield}>
              {loadingUsers ? (
                <div className="flex justify-center py-4">
                  <Loader className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-xs theme-text-muted py-2">No users registered yet.</p>
              ) : (
                <div className="divide-y divide-white/[0.04] space-y-1">
                  {users.map(u => {
                    const isSelf = u.id === currentAgent.id;
                    return (
                      <div key={u.id} className="flex items-center justify-between py-3 hover:bg-white/[0.01] px-2.5 rounded-xl transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400 uppercase">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold theme-text-secondary truncate flex items-center gap-1.5">
                              {u.full_name}
                              {isSelf && <span className="text-[8px] font-bold bg-white/[0.08] theme-text-muted px-1.5 py-0.5 rounded uppercase">You</span>}
                            </p>
                            <p className="text-[10px] theme-text-muted truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <UserRoleSelect
                            role={u.role}
                            disabled={isSelf}
                            onChange={(newRole) => handleUpdateRole(u.id, newRole)}
                          />
                          <UserAccessScopeSelect
                            scope={accessScopes[u.id] || 'all'}
                            disabled={isSelf}
                            onChange={(newScope) => handleUpdateAccessScope(u.id, newScope)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <Section title="Security Credentials" desc="Access control secrets and tokens" icon={Shield}>
              <div className="rounded-xl bg-white/[0.01] border theme-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold theme-text-secondary">API Client Token</p>
                    <p className="text-[10px] theme-text-muted mt-0.5">Authorization bearer token for local widget embeds</p>
                  </div>
                  <code className="text-xs theme-text-secondary bg-white/[0.04] px-2.5 py-1 rounded font-mono border theme-border select-all">lc_live_83k9c104kd</code>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                  <div>
                    <p className="text-xs font-semibold theme-text-secondary">Webhook HMAC Secret</p>
                    <p className="text-[10px] theme-text-muted mt-0.5">For cryptographically verifying WhatsApp request payload signatures</p>
                  </div>
                  <code className="text-xs theme-text-secondary bg-white/[0.04] px-2.5 py-1 rounded font-mono border theme-border select-all">whsec_j4982k4902</code>
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
