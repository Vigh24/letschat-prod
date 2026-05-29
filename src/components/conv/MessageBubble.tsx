import { formatDistanceToNow } from 'date-fns';
import {
  Sparkles, Check, CheckCheck, Clock, AlertCircle,
  StickyNote, CornerUpLeft, Paperclip, Lock
} from 'lucide-react';
import type { Message } from '@/types';
import { currentAgent } from '@/data/appConfig';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';

export function MessageBubble({
  msg, contact, agents = [], onReply
}: {
  msg: Message; contact?: any; agents?: any[]; onReply?: () => void;
}) {
  const isOutgoing = msg.sender_type === 'agent' || msg.sender_type === 'bot';
  const isSystem = msg.sender_type === 'system';
  const isInternal = msg.is_internal_note || msg.metadata?.is_internal === true;

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-400 border border-emerald-500/10">
          <Sparkles className="h-3 w-3" />
          <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      </div>
    );
  }

  if (isInternal) {
    const senderName = msg.sender_id === currentAgent.id
      ? 'You'
      : (msg.metadata?.sender_name || agents.find(a => a.id === msg.sender_id)?.full_name || 'Agent');
    return (
    <div className="flex justify-center my-3 px-4">
      <div className="w-full max-w-[85%] md:max-w-[600px] note-card px-4 py-3 group">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5" style={{ backgroundColor: 'var(--note-icon-bg)' }}>
              <StickyNote className="h-4 w-4" style={{ color: 'var(--note-icon)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--note-label)' }}>Internal Note</span>
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--note-by)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--note-by)' }}>{senderName}</span>
                <span className="ml-auto text-[9px] font-medium" style={{ color: 'var(--note-by)' }}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--note-text)' }}>{msg.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const senderName = (() => {
    if (msg.sender_type === 'agent') {
      if (msg.sender_id === currentAgent.id) return 'You';
      return msg.metadata?.sender_name || agents.find(a => a.id === msg.sender_id)?.full_name || 'Agent';
    }
    return null;
  })();

  const statusIcon = {
    sending:   <span title="Sending..."><Clock className="h-3 w-3 text-slate-600 animate-pulse" /></span>,
    sent:      <span title="Sent"><Check className="h-3 w-3 text-slate-500" /></span>,
    delivered: <span title="Delivered"><CheckCheck className="h-3 w-3 text-slate-400" /></span>,
    read:      <span title="Read"><CheckCheck className="h-3 w-3 text-blue-400" /></span>,
    failed:    (
      <span
        title={
          Array.isArray(msg.metadata?.status_errors) && msg.metadata.status_errors[0]
            ? `Failed to send: ${msg.metadata.status_errors[0].message} (Code: ${msg.metadata.status_errors[0].code})`
            : "Failed to send"
        }
      >
        <AlertCircle className="h-3 w-3 text-red-400 cursor-help" />
      </span>
    ),
  }[msg.status];

  return (
    <div className={`flex items-end gap-2 mb-3 animate-fade-in group/msg ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
      {onReply && (
        <button
          onClick={onReply}
          className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 cursor-pointer rounded bg-white/[0.02] border border-white/[0.04] shrink-0 self-center"
          title="Reply to message"
        >
          <CornerUpLeft className="h-3 w-3" />
        </button>
      )}
      {!isOutgoing && (
        <div className="shrink-0 mb-0.5">
          <Avatar size="sm">
            {contact?.avatar_url ? <AvatarImage src={contact.avatar_url} alt={contact.full_name || ''} /> : null}
            <AvatarFallback>{(contact?.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {isOutgoing && (
        <div className="shrink-0 mb-0.5">
          {(() => {
            if (msg.sender_type === 'bot') {
              return (
                <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center text-[9px] font-bold text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-sm" title="AI Bot">
                  AI
                </div>
              );
            }
            const msgAgent = agents.find(a => a.id === msg.sender_id) || (msg.sender_id === currentAgent.id ? currentAgent : null);
            if (msgAgent) {
              return <span title={msgAgent.full_name}><Avatar size="sm"><AvatarFallback>{msgAgent.full_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar></span>;
            }
            return (
              <div className="h-6 w-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/[0.06]" title={msg.metadata?.sender_name || 'Agent'}>
                {((msg.metadata?.sender_name || 'Agent').charAt(0)).toUpperCase()}
              </div>
            );
          })()}
        </div>
      )}
      <div className={`max-w-[72%] md:max-w-[560px] ${isOutgoing ? 'items-end' : 'items-start'} flex flex-col gap-1 transition-transform duration-200 hover:translate-y-[-1px]`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm overflow-hidden transition-all duration-200 ${
          msg.metadata?.is_internal
            ? 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25 rounded-br-sm shadow-[0_0_12px_rgba(245,158,11,0.03)] dark:shadow-[0_0_12px_rgba(245,158,11,0.06)]'
            : msg.sender_type === 'bot'
              ? 'wa-bubble-ai rounded-br-sm shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.18)]'
              : isOutgoing
                ? 'wa-bubble-out rounded-br-sm hover:shadow-md'
                : 'wa-bubble-in rounded-bl-sm hover:shadow-md'
        }`}>
          {msg.sender_type === 'bot' && (
            <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-violet-500/10 select-none">
              <Sparkles className="h-3.5 w-3.5 text-violet-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-display">AI Assistant</span>
            </div>
          )}
          {msg.metadata?.reply_to_message && (
            <div className="mb-1.5 rounded-lg bg-black/25 border-l-4 border-emerald-500/60 p-2 text-xs text-slate-700 dark:text-zinc-200 select-none text-left max-w-full">
              <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                {msg.metadata.reply_to_message.sender_type === 'agent' ? 'Agent' : 'Customer'}
              </span>
              <span className="truncate block mt-0.5 text-white/80">{msg.metadata.reply_to_message.content}</span>
            </div>
          )}
          {(() => {
            const trimmed = msg.content.trim();
            const isImg = trimmed.startsWith('data:image/') || (() => {
              try { const u = new URL(trimmed); return u.pathname.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) !== null; } catch { return false; }
            })();
            const isVid = (() => {
              try { const u = new URL(trimmed); return u.pathname.match(/\.(mp4|webm|ogg)$/i) !== null; } catch { return false; }
            })();
            if (isImg) {
              return (
                <div className="flex flex-col gap-1">
                  <img src={trimmed} alt="Uploaded media" className="max-w-xs max-h-60 rounded-lg object-cover cursor-zoom-in border border-slate-200/60 dark:border-white/[0.06] shadow-sm" onClick={() => window.open(trimmed, '_blank')} />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 select-all truncate max-w-xs">{trimmed}</span>
                </div>
              );
            }
            if (isVid) {
              return (
                <div className="flex flex-col gap-1">
                  <video src={trimmed} controls className="max-w-xs max-h-60 rounded-lg border border-slate-200/60 dark:border-white/[0.06] shadow-sm" />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 select-all truncate max-w-xs">{trimmed}</span>
                </div>
              );
            }
            let displayContent = msg.content;
            if (displayContent.includes('csat=true') && displayContent.includes('convId=')) {
              displayContent = displayContent.replace(/https?:\/\/[^\s]+csat=true[^\s]+/gi, '[Redacted CSAT Web Link]');
            }
            return displayContent;
          })()}

          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-2.5 space-y-2 border-t border-white/[0.04] pt-2">
              {msg.attachments.map((att) => {
                const url = att.url || '';
                const isImg = att.content_type?.startsWith('image/') || (() => {
                  try { const u = new URL(url); return u.pathname.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) !== null; } catch { return false; }
                })();
                const isVid = att.content_type?.startsWith('video/') || (() => {
                  try { const u = new URL(url); return u.pathname.match(/\.(mp4|webm|ogg)$/i) !== null; } catch { return false; }
                })();
                if (isImg) {
                  return <img key={att.id} src={url} alt={att.file_name || 'image'} className="max-w-xs max-h-48 rounded-lg object-cover border border-slate-200/60 dark:border-white/[0.06] shadow-sm cursor-zoom-in mt-1 block" onClick={() => window.open(url, '_blank')} />;
                }
                if (isVid) {
                  return <video key={att.id} src={url} controls className="max-w-xs rounded-lg border border-slate-200/60 dark:border-white/[0.06] shadow-sm mt-1 block" />;
                }
                return (
                  <a key={att.id} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-black/10 hover:bg-black/20 px-3 py-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="truncate">{att.file_name || 'Download attachment'}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 ${isOutgoing ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          {isOutgoing && !msg.metadata?.is_internal && statusIcon}
          {msg.sender_type === 'bot' && (
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10 select-none animate-pulse">AI</span>
          )}
          {senderName && <span className="text-[9px] font-medium text-slate-500 dark:text-zinc-500 select-none">by {senderName}</span>}
          {msg.metadata?.is_internal ? (
            <span className="text-[9px] font-bold text-amber-450 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10 select-none flex items-center gap-1">
              <Lock className="h-2 w-2" />Internal Note
            </span>
          ) : msg.metadata?.whatsapp_message_id ? (
            <span className="text-[9px] text-emerald-600/50">via WhatsApp</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
