import { Router } from 'express';
import { supabase } from '../supabase';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { getMediaUrl } from '../services/whatsapp';
import { triggerAutoResponder } from '../services/conversation';
import { parseCsatScore, recordCsatResponse } from '../services/conversation';
import { resolveOrgFromPhoneNumberId, OrgRequest } from '../middleware/orgContext';

const router = Router();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'letschat_secret_token';

router.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified by Meta');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

router.post('/webhook/whatsapp', resolveOrgFromPhoneNumberId, async (req: OrgRequest, res) => {
  const body = req.body;

  if (!body.object) {
    return res.sendStatus(404);
  }

  const orgId = req.orgId!;
  const channelId = req.channelId!;

  const hasMessages =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const hasStatuses =
    body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];

  if (hasMessages) {
    await handleIncomingMessage(body, orgId, channelId);
  } else if (hasStatuses) {
    await handleStatusUpdate(body);
  }

  res.sendStatus(200);
});

async function handleIncomingMessage(body: any, orgId: string, channelId: string) {
  const rawMessage = body.entry[0].changes[0].value.messages[0];
  const from = rawMessage.from;

  let msgBody = '';
  let msgAttachments: any[] = [];

  if (rawMessage.type === 'interactive') {
    if (rawMessage.interactive?.list_reply) {
      msgBody = rawMessage.interactive.list_reply.title || '';
    } else if (rawMessage.interactive?.button_reply) {
      msgBody = rawMessage.interactive.button_reply.title || '';
    }
  } else if (rawMessage.type === 'image') {
    const mediaId = rawMessage.image.id;
    const caption = rawMessage.image.caption || '';
    msgBody = caption || '📷 [Received an Image]';

    const mediaUrl = await getMediaUrl(mediaId);
    if (mediaUrl) {
      msgAttachments.push({
        id: mediaId,
        url: mediaUrl,
        content_type: rawMessage.image.mime_type || 'image/jpeg',
        file_name: 'whatsapp_image.jpg'
      });
    }
  } else {
    msgBody = rawMessage.text?.body || '';
  }

  const msgId = rawMessage.id;
  const contactName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'Unknown';

  console.log(`Message from ${from}: ${msgBody}`);

  try {
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', orgId)
      .eq('whatsapp_number', from)
      .single();

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          organization_id: orgId,
          full_name: contactName,
          whatsapp_number: from,
          metadata: { created_via: 'whatsapp_webhook' }
        })
        .select('id')
        .single();

      if (contactError) throw contactError;
      contact = newContact;
    }

    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .in('status', ['open', 'pending', 'awaiting_response'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: resolvedConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('status', 'resolved')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resolvedConv) {
        const csatPending = resolvedConv.metadata?.csat_pending as any;
        const isCsatRequest = csatPending && !csatPending.resolved;
        const score = parseCsatScore(msgBody);
        const isValidRating = isCsatRequest && score >= 1 && score <= 5;

        if (isValidRating) {
          await recordCsatResponse(resolvedConv, score);
          const thankYouMsg = `Thank you for your feedback! Your rating of ${score}/5 helps us improve our service.`;
          await sendWhatsAppMessage(resolvedConv.id, from, thankYouMsg);
          console.log(`CSAT response detected for conversation ${resolvedConv.id} — keeping resolved`);
          conversation = resolvedConv;
        } else {
          const oldTicketId = resolvedConv.ticket_id;
          const newTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
          const oldDisposition = resolvedConv.metadata?.disposition;
          const oldSummary = resolvedConv.metadata?.ai_summary;

          const ticketHistory = resolvedConv.metadata?.ticket_history || [];
          ticketHistory.push({
            ticket_id: oldTicketId,
            resolved_at: resolvedConv.metadata?.resolved_at || resolvedConv.updated_at || new Date().toISOString(),
            disposition: oldDisposition || null,
            csat_pending: csatPending ? { ...csatPending } : null,
            ai_summary: oldSummary || null,
            resolved_by: resolvedConv.metadata?.resolved_by || null
          });

          const updatedMetadata = {
            ...(resolvedConv.metadata || {}),
            ticket_history: ticketHistory,
            disposition: null,
            csat_pending: null,
            ai_summary: null,
            resolved_at: null,
            resolved_by: null
          };

          const { data: reopenedConv, error: reopenError } = await supabase
            .from('conversations')
            .update({
              status: 'pending',
              ticket_id: newTicketId,
              assigned_agent_id: null,
              subject: msgBody.substring(0, 50) + (msgBody.length > 50 ? '...' : ''),
              metadata: updatedMetadata
            })
            .eq('id', resolvedConv.id)
            .select('*')
            .single();

          if (reopenError) throw reopenError;
          conversation = reopenedConv;
          console.log(`Reopened resolved conversation ${conversation.id} as pending with new ticket ${newTicketId}`);
        }
      }
    }

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          organization_id: orgId,
          contact_id: contact.id,
          channel_id: channelId,
          status: 'open',
          priority: 'medium',
          ticket_id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
          subject: msgBody.substring(0, 50) + (msgBody.length > 50 ? '...' : ''),
        })
        .select('*')
        .single();

      if (convError) throw convError;
      conversation = newConv;
      console.log(`Created brand new conversation ${conversation.id} with ticket ${conversation.ticket_id}`);
    }

    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'contact',
        message_type: 'incoming',
        content: msgBody,
        status: 'delivered',
        attachments: msgAttachments,
        metadata: { whatsapp_message_id: msgId }
      });

    if (msgError) throw msgError;

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
      unread_count: (await supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversation.id)
        .single()
        .then(r => (r.data?.unread_count ?? 0) + 1))
    };

    if (conversation.status === 'awaiting_response') {
      updateFields.status = 'open';
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(updateFields)
      .eq('id', conversation.id);

    if (updateError) console.error('Failed to update conversation:', updateError);

    console.log('Message successfully inserted into Supabase');

    const hasAI = process.env.GEMINI_API_KEY || process.env.OLLAMA_API_KEY;
    if (hasAI) {
      triggerAutoResponder(conversation.id, from, msgBody).catch(err => {
        console.error('Auto-responder error:', err);
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}

async function handleStatusUpdate(body: any) {
  const statusObj = body.entry[0].changes[0].value.statuses[0];
  const whatsappMessageId = statusObj.id;
  const status = statusObj.status;
  const errors = statusObj.errors;

  console.log(`Message status update received: ${whatsappMessageId} -> ${status}`);
  if (errors) {
    console.error('Status update errors:', JSON.stringify(errors, null, 2));
  }

  try {
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id, metadata')
      .contains('metadata', { whatsapp_message_id: whatsappMessageId })
      .limit(1)
      .maybeSingle();

    if (existingMsg) {
      const updatedMetadata = { ...existingMsg.metadata, status_errors: errors || null };
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status: status === 'failed' ? 'failed' : status === 'delivered' ? 'delivered' : 'sent',
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMsg.id);

      if (updateError) {
        console.error('Failed to update message status in DB:', updateError);
      }
    }
  } catch (err) {
    console.error('Error updating message status:', err);
  }
}

export default router;
