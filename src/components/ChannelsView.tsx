import { useState, useEffect } from 'react';
import { Radio, CheckCircle, XCircle, AlertTriangle, Settings, ExternalLink, MessageSquare, TrendingUp, Clock, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import type { ChannelIntegration, ChannelType } from '../types';

const CHANNEL_ICONS: Record<string, { icon: string; gradient: string; border: string; text: string }> = {
  whatsapp:   { icon: '💬', gradient: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/15', text: 'text-emerald-500 dark:text-emerald-400' },
  instagram:  { icon: '📸', gradient: 'from-pink-500/10 to-purple-500/10', border: 'border-pink-500/15', text: 'text-pink-500 dark:text-pink-400' },
  email:      { icon: '📧', gradient: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/15', text: 'text-blue-500 dark:text-blue-400' },
  web_widget: { icon: '🌐', gradient: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/15', text: 'text-violet-500 dark:text-violet-400' },
  api:        { icon: '⚡', gradient: 'from-zinc-500/10 to-zinc-650/10', border: 'border-zinc-500/15', text: 'text-zinc-650 dark:text-zinc-400' },
};

const CHANNEL_TEMPLATES: { channel_type: ChannelType; name: string; description: string; default_config: any }[] = [
  {
    channel_type: 'whatsapp', name: 'WhatsApp Business', description: 'Primary channel — customers reach you via WhatsApp and tickets are auto-created.',
    default_config: { phone_number_id: '—', waba_id: '—' }
  },
  {
    channel_type: 'email', name: 'Support Email', description: 'Forward support@letschat.com emails to your inbox.',
    default_config: { smtp_host: 'smtp.gmail.com', imap_host: 'imap.gmail.com', email_address: 'support@letschat.com' }
  },
  {
    channel_type: 'web_widget', name: 'Website Live Chat', description: 'Embed a live chat widget on your website.',
    default_config: { allowed_domains: ['letschat.com'], widget_color: '#25D366' }
  },
  {
    channel_type: 'instagram', name: 'Instagram DMs', description: 'Receive Instagram Direct Messages.',
    default_config: {}
  },
  {
    channel_type: 'api', name: 'Custom API', description: 'Integrate with any platform via REST API webhooks.',
    default_config: { webhook_url: '' }
  }
];

function ChannelCard({ channel, isPrimary }: { channel: ChannelIntegration; isPrimary?: boolean }) {
  const [showConfig, setShowConfig] = useState(false);
  const meta = CHANNEL_ICONS[channel.channel_type] || CHANNEL_ICONS.api;
  const isConnected = channel.status === 'connected';

  return (
    <div className={`glass-card p-5 transition-all duration-200 group ${isPrimary ? 'ring-1 ring-emerald-500/25 shadow-md shadow-emerald-500/5' : ''} ${showConfig ? 'ring-1 ring-zinc-200 dark:ring-zinc-800' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3.5">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} border ${meta.border} flex items-center justify-center text-xl shadow-sm`}>
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold theme-text-main leading-tight">{channel.name}</h3>
              {isPrimary && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border border-emerald-500/15">Primary</span>}
            </div>
            <p className="text-[11px] theme-text-muted mt-1 leading-normal">{channel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
            isConnected 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15' 
              : channel.status === 'error' 
                ? 'bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/15' 
                : 'bg-zinc-100 dark:bg-white/[0.02] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.04]'
          }`}>
            {isConnected ? <CheckCircle className="h-3 w-3" /> : channel.status === 'error' ? <AlertTriangle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {channel.status.charAt(0).toUpperCase() + channel.status.slice(1)}
          </span>
        </div>
      </div>

      {isConnected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 select-none">
          {[
            { label: 'Total Chats', value: channel.stats.total_conversations.toLocaleString(), icon: MessageSquare },
            { label: 'Active Now', value: channel.stats.active_conversations.toString(), icon: Zap },
            { label: 'Today', value: channel.stats.messages_today.toString(), icon: TrendingUp },
            { label: 'Avg Response', value: channel.stats.avg_response_time, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-zinc-50/50 dark:bg-white/[0.01] border theme-border p-3">
              <Icon className="h-3.5 w-3.5 theme-text-muted mb-1" />
              <p className="text-sm font-bold theme-text-main tracking-tight leading-tight">{value}</p>
              <p className="text-[9px] theme-text-muted mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowConfig(!showConfig)} className="btn-secondary text-[11px] py-1 px-3 h-8">
            <Settings className="h-3 w-3" />Configure
          </button>
          {!isConnected && (
            <button className="btn-primary text-[11px] py-1 px-3 h-8 shadow-none">
              <Zap className="h-3 w-3" />Connect Now
            </button>
          )}
        </div>
        {channel.last_synced_at && (
          <span className="text-[9px] theme-text-muted font-mono uppercase tracking-wider font-semibold">Last sync: {new Date(channel.last_synced_at).toLocaleTimeString()}</span>
        )}
      </div>

      {showConfig && (
        <div className="mt-4 pt-4 border-t theme-border space-y-3 animate-fade-in">
          <p className="text-xs font-bold theme-text-secondary uppercase tracking-wider">Channel Configuration</p>
          {Object.entries(channel.config || {}).filter(([, v]) => v).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs theme-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-xs theme-text-secondary font-mono bg-zinc-50 dark:bg-white/[0.01] border theme-border px-2 py-0.5 rounded">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button className="btn-secondary text-[11px] py-1 px-3 h-8 flex-1">
              Test Connection
            </button>
            <button className="btn-secondary text-[11px] py-1 px-3 h-8 text-zinc-400 dark:text-zinc-500">
              <ExternalLink className="h-3 w-3" />Docs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChannelsView() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelIntegration[]>([]);

  useEffect(() => {
    let isMounted = true;

    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: dbChannels } = await supabase
        .from('channels')
        .select('*');

      const { data: convs } = await supabase
        .from('conversations')
        .select('id, status, channel_id, created_at');

      const { data: messages } = await supabase
        .from('messages')
        .select('created_at, conversation_id')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // last 24h

      const integrations: ChannelIntegration[] = CHANNEL_TEMPLATES.map(tmpl => {
        const dbChan = dbChannels?.find(c => c.channel_type === tmpl.channel_type && c.is_active);

        if (dbChan) {
          const chanConvs = convs?.filter(c => c.channel_id === dbChan.id) || [];
          const activeConvs = chanConvs.filter(c => c.status === 'open' || c.status === 'pending').length;

          const chanConvIds = new Set(chanConvs.map(c => c.id));
          const todayMessagesCount = messages?.filter(m => chanConvIds.has(m.conversation_id)).length || 0;

          return {
            id: dbChan.id,
            channel_type: tmpl.channel_type,
            name: dbChan.name || tmpl.name,
            description: tmpl.description,
            status: 'connected',
            config: dbChan.config || tmpl.default_config,
            stats: {
              total_conversations: chanConvs.length,
              active_conversations: activeConvs,
              messages_today: todayMessagesCount,
              avg_response_time: '2m 15s'
            },
            last_synced_at: dbChan.updated_at || new Date().toISOString(),
            created_at: dbChan.created_at
          };
        } else {
          return {
            id: `tmpl-${tmpl.channel_type}`,
            channel_type: tmpl.channel_type,
            name: tmpl.name,
            description: tmpl.description,
            status: 'disconnected',
            config: tmpl.default_config,
            stats: {
              total_conversations: 0,
              active_conversations: 0,
              messages_today: 0,
              avg_response_time: '—'
            },
            last_synced_at: null,
            created_at: new Date().toISOString()
          };
        }
      });

      if (isMounted) {
        setChannels(integrations);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, []);

  const connectedCount = channels.filter(c => c.status === 'connected').length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary select-none">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-md shadow-emerald-500/5">
              <Radio className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold theme-text-main">Channels</h1>
              <p className="text-xs theme-text-muted mt-0.5">{connectedCount} of {channels.length} channels active</p>
            </div>
          </div>
          <button className="btn-primary text-xs py-1.5 px-3.5 h-9">
            <Zap className="h-4 w-4" />Add Channel
          </button>
        </div>

        {/* How WhatsApp Ticketing Works */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold theme-text-main mb-4 uppercase tracking-wider">How WhatsApp Ticketing Works</h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {[
              { icon: '📱', label: 'WhatsApp Message', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
              { icon: '🎫', label: 'Ticket Created', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
              { icon: '🤖', label: 'AI Classification', color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' },
              { icon: '👤', label: 'Agent Routing', color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
              { icon: '✅', label: 'Customer Reply', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className={`w-32 rounded-xl bg-gradient-to-br ${step.color.split(' ')[0]} ${step.color.split(' ')[1]} border ${step.color.split(' ')[2]} p-3.5 shadow-sm text-center`}>
                  <span className="text-xl">{step.icon}</span>
                  <p className={`text-[10px] font-bold mt-1.5 leading-tight ${step.color.split(' ')[3]} ${step.color.split(' ')[4] || ''}`}>{step.label}</p>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 theme-text-muted shrink-0 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 stagger-children">
          {channels.map(channel => (
            <ChannelCard key={channel.id} channel={channel} isPrimary={channel.channel_type === 'whatsapp'} />
          ))}
        </div>
      </div>
    </div>
  );
}

