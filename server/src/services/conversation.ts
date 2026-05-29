import { supabase } from '../supabase';
import { sendWhatsAppMessage } from './whatsapp';
import { generateAIResponse } from './ai';

function isWithinBusinessHours(settings: any): boolean {
  try {
    const businessHours = settings?.business_hours;
    if (!businessHours) return true;

    const { start, end, timezone, days } = businessHours;
    const tz = timezone || 'Asia/Kolkata';
    const activeDays = Array.isArray(days) ? days.map((d: any) => Number(d)) : [1, 2, 3, 4, 5];

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false, weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    parts.forEach(p => { partMap[p.type] = p.value; });

    const dayName = partMap['weekday'];
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const currentDay = dayMap[dayName] !== undefined ? dayMap[dayName] : now.getDay();

    if (!activeDays.includes(currentDay)) return false;

    const hour = parseInt(partMap['hour'], 10);
    const minute = parseInt(partMap['minute'], 10);
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = (start || '09:00').split(':').map((s: string) => parseInt(s, 10));
    const [endH, endM] = (end || '18:00').split(':').map((s: string) => parseInt(s, 10));

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (err) {
    console.error('Error checking business hours:', err);
    return true;
  }
}

function parseCsatScore(msgBody: string): number {
  const starsCount = (msgBody.match(/⭐/g) || []).length;
  if (starsCount >= 1 && starsCount <= 5) return starsCount;

  const ratingMatch = msgBody.trim().match(/^[1-5]$/) || msgBody.match(/\(?([1-5])\/5\)?/);
  if (ratingMatch) return parseInt(ratingMatch[1] ? ratingMatch[1] : ratingMatch[0], 10);

  return 0;
}

async function recordCsatResponse(conversation: any, score: number, isFromResolved = false) {
  const currentMeta = conversation.metadata || {};
  const csatPending = currentMeta.csat_pending || {};
  const csatHistory = currentMeta.csat_history || [];

  csatHistory.push({
    score,
    requested_at: csatPending.requested_at,
    responded_at: new Date().toISOString(),
    resolved_by: csatPending.resolved_by || null,
    ticket_id: currentMeta.ticket_id || conversation.id
  });

  const updatedMetadata = {
    ...currentMeta,
    csat_history: csatHistory,
    ...(isFromResolved
      ? { csat_pending: { ...csatPending, resolved: true, responded_at: new Date().toISOString() } }
      : { csat_pending: { ...csatPending, resolved: true, responded_at: new Date().toISOString() } }
    )
  };

  await supabase
    .from('conversations')
    .update({ metadata: updatedMetadata })
    .eq('id', conversation.id);
}

export async function triggerAutoResponder(conversationId: string, from: string, msgBody: string) {
  console.log(`AI Auto-Responder triggered for conversation ${conversationId}`);

  try {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('organization_id, metadata, status, assigned_agent_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(`AI Auto-Responder: Conversation ${conversationId} not found.`, convError);
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', conversation.organization_id)
      .single();

    if (orgError || !org) {
      console.error(`AI Auto-Responder: Organization not found.`, orgError);
      return;
    }

    const settings = org.settings || {};

    // CSAT interception check
    const csatPending = conversation.metadata?.csat_pending as any;
    if (csatPending && csatPending.requested_at && !csatPending.resolved) {
      const score = parseCsatScore(msgBody);
      if (score >= 1 && score <= 5) {
        console.log(`CSAT response received: ${score} stars for conversation ${conversationId}`);
        await recordCsatResponse(conversation, score);
        const thankYouMsg = `Thank you for your feedback! Your rating of ${score}/5 helps us improve our service.`;
        await sendWhatsAppMessage(conversationId, from, thankYouMsg);
        return;
      }
    }

    const aiEnabled = settings.ai_enabled ?? true;
    const autoRespond = settings.auto_respond ?? true;
    const disableAiWhenAgentAssigned = settings.disable_ai_when_agent_assigned ?? true;

    if (!aiEnabled || !autoRespond) {
      console.log('AI Auto-Responder: AI responses or auto-responder disabled in settings.');
      return;
    }

    if (disableAiWhenAgentAssigned && conversation.assigned_agent_id) {
      console.log(`AI Auto-Responder: Agent is assigned (${conversation.assigned_agent_id}). Skipping.`);
      return;
    }

    if (!isWithinBusinessHours(settings)) {
      console.log('Outside business hours. Sending out-of-office message.');
      const oooMessage = settings.out_of_office_message || 'Thank you for contacting us. We are currently out of office. We will get back to you during our business hours.';
      await sendWhatsAppMessage(conversationId, from, oooMessage);
      return;
    }

    const { data: history } = await supabase
      .from('messages')
      .select('sender_type, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    const reply = await generateAIResponse(msgBody, history || []);
    if (!reply) {
      console.log('AI Auto-Responder: No response generated.');
      return;
    }

    console.log(`AI Auto-Responder generated reply: "${reply}"`);
    await sendWhatsAppMessage(conversationId, from, reply);

    const { error: resetError } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (resetError) {
      console.error('Failed to reset unread_count for AI auto-reply:', resetError);
    }
  } catch (err: any) {
    console.error('Error in triggerAutoResponder:', err.message);
  }
}

export async function mergeOldDuplicateConversations() {
  console.log('Starting cleanup/merge of old duplicate conversations for contacts...');
  try {
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: true });

    if (convError || !conversations || conversations.length === 0) {
      console.log('No conversations found or failed to fetch:', convError?.message);
      return;
    }

    const groups: Record<string, typeof conversations> = {};
    for (const conv of conversations) {
      if (!conv.contact_id) continue;
      if (!groups[conv.contact_id]) groups[conv.contact_id] = [];
      groups[conv.contact_id].push(conv);
    }

    for (const contactId in groups) {
      const contactConvs = groups[contactId];
      if (contactConvs.length <= 1) continue;

      console.log(`Found ${contactConvs.length} duplicate conversations for contact ${contactId}. Merging...`);

      const primaryConv = contactConvs[0];
      const otherConvs = contactConvs.slice(1);
      const ticketHistory = [...(primaryConv.metadata?.ticket_history || [])];

      if (primaryConv.status === 'resolved') {
        ticketHistory.push({
          ticket_id: primaryConv.ticket_id,
          resolved_at: primaryConv.metadata?.resolved_at || primaryConv.updated_at || new Date().toISOString(),
          disposition: primaryConv.metadata?.disposition || null,
          csat: primaryConv.metadata?.csat || null,
          ai_summary: primaryConv.metadata?.ai_summary || null
        });
      }

      let latestConv = primaryConv;

      for (const secConv of otherConvs) {
        if (new Date(secConv.created_at) > new Date(latestConv.created_at)) {
          latestConv = secConv;
        }

        const { error: msgUpdateError } = await supabase
          .from('messages')
          .update({ conversation_id: primaryConv.id })
          .eq('conversation_id', secConv.id);

        if (msgUpdateError) {
          console.error(`Failed to migrate messages from conversation ${secConv.id}:`, msgUpdateError.message);
          continue;
        }

        if (Array.isArray(secConv.metadata?.ticket_history)) {
          ticketHistory.push(...secConv.metadata.ticket_history);
        }

        if (secConv.status === 'resolved' || secConv.id !== latestConv.id) {
          ticketHistory.push({
            ticket_id: secConv.ticket_id,
            resolved_at: secConv.metadata?.resolved_at || secConv.updated_at || new Date().toISOString(),
            disposition: secConv.metadata?.disposition || null,
            csat: secConv.metadata?.csat || null,
            ai_summary: secConv.metadata?.ai_summary || null
          });
        }

        const { error: delError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', secConv.id);

        if (delError) {
          console.error(`Failed to delete secondary conversation ${secConv.id}:`, delError.message);
        }
      }

      const primaryMetadata = {
        ...(latestConv.metadata || {}),
        ticket_history: ticketHistory
      };

      if (latestConv.status === 'resolved') {
        primaryMetadata.disposition = latestConv.metadata?.disposition || null;
        primaryMetadata.csat = latestConv.metadata?.csat || null;
        primaryMetadata.ai_summary = latestConv.metadata?.ai_summary || null;
        primaryMetadata.resolved_at = latestConv.metadata?.resolved_at || latestConv.updated_at;
      } else {
        primaryMetadata.disposition = null;
        primaryMetadata.csat = null;
        primaryMetadata.ai_summary = null;
        primaryMetadata.resolved_at = null;
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          status: latestConv.status,
          ticket_id: latestConv.ticket_id,
          subject: latestConv.subject,
          priority: latestConv.priority,
          metadata: primaryMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', primaryConv.id);

      if (updateError) {
        console.error(`Failed to update primary conversation ${primaryConv.id}:`, updateError.message);
      } else {
        console.log(`Successfully merged duplicate conversations for contact ${contactId}`);
      }
    }
    console.log('Cleanup/merge of old duplicate conversations completed!');
  } catch (err: any) {
    console.error('Error during merge of duplicate conversations:', err.message);
  }
}

export { isWithinBusinessHours, parseCsatScore, recordCsatResponse };
