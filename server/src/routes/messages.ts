import { Router } from 'express';
import { supabase } from '../supabase';
import axios from 'axios';

const router = Router();

router.post('/api/send-message', async (req, res) => {
  const { conversationId, content, recipientPhone, senderId, senderName, isInternal, metadata } = req.body;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  // Handle internal notes
  if (isInternal) {
    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId || null,
          sender_type: 'agent',
          message_type: 'outgoing',
          content: content,
          status: 'sent',
          is_internal_note: true,
          metadata: {
            is_internal: true,
            sender_name: senderName || 'Agent',
            ...(metadata || {})
          }
        })
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: newMessage });
    } catch (error: any) {
      console.error('Error saving internal note:', error.message);
      return res.status(500).json({ error: 'Failed to save internal note', details: error.message });
    }
  }

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({ error: 'WhatsApp credentials not configured' });
  }

  try {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const { data: lastIncoming } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'contact')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isOutsideWindow = !lastIncoming || (Date.now() - new Date(lastIncoming.created_at).getTime()) > TWENTY_FOUR_HOURS;

    if (isOutsideWindow) {
      return res.status(400).json({
        error: '24H_WINDOW_EXPIRED',
        message: 'Cannot send message. More than 24 hours have passed since the customer last replied. WhatsApp only allows free-form replies within the 24-hour customer service window. Ask the customer to send a message first, or use a pre-approved WhatsApp template.'
      });
    }

    const isImg = content.startsWith('data:image/') || (content.startsWith('http') && content.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i));
    let messagePayload: any;

    if (isImg) {
      if (content.startsWith('http')) {
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'image',
          image: { link: content }
        };
      } else {
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: { body: '📷 [Sent an Image]' }
        };
      }
    } else {
      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: { body: content }
      };
    }

    // Add reply context if this is a reply to a specific message
    const replyToId = metadata?.reply_to_message?.id;
    if (replyToId) {
      const { data: originalMsg } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', replyToId)
        .maybeSingle();
      const wamId = originalMsg?.metadata?.whatsapp_message_id;
      if (wamId) {
        messagePayload.context = { message_id: wamId };
      } else {
        console.log(`Reply context: original message ${replyToId} has no whatsapp_message_id`);
      }
    }

    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: messagePayload
    });

    const metaMessageId = response.data.messages[0].id;

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId || null,
        sender_type: 'agent',
        message_type: 'outgoing',
        content: content,
        status: 'sent',
        metadata: {
          whatsapp_message_id: metaMessageId,
          sender_name: senderName || 'Agent',
          ...(metadata || {})
        }
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Error sending message:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send message', details: error.response?.data });
  }
});

router.post('/api/send-template', async (req, res) => {
  const { recipientPhone, templateName, languageCode, variables, senderId, senderName } = req.body;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({ error: 'WhatsApp credentials not configured' });
  }

  try {
    let { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('whatsapp_number', recipientPhone)
      .maybeSingle();

    if (contactErr) throw contactErr;

    if (!contact) {
      const { data: newContact, error: createContactErr } = await supabase
        .from('contacts')
        .insert({
          organization_id: '00000000-0000-0000-0000-000000000001',
          whatsapp_number: recipientPhone,
          full_name: recipientPhone,
        })
        .select()
        .single();
      if (createContactErr) throw createContactErr;
      contact = newContact;
    }

    let { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('status', 'open')
      .maybeSingle();

    if (convErr) throw convErr;

    if (!conversation) {
      const { data: newConv, error: createConvErr } = await supabase
        .from('conversations')
        .insert({
          organization_id: '00000000-0000-0000-0000-000000000001',
          contact_id: contact.id,
          channel_id: '00000000-0000-0000-0000-000000000002',
          status: 'open',
          assigned_agent_id: senderId || null
        })
        .select()
        .single();
      if (createConvErr) throw createConvErr;
      conversation = newConv;
    }

    const parameters = Array.isArray(variables)
      ? variables.map(v => ({ type: 'text', text: String(v) }))
      : [];

    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode || 'en_US' },
          components: parameters.length > 0 ? [{ type: 'body', parameters }] : []
        }
      }
    });

    const metaMessageId = response.data.messages[0].id;

    let previewContent = `[WhatsApp Template: ${templateName}]`;
    if (parameters.length > 0) {
      previewContent += ` Variables: ${parameters.map(p => p.text).join(', ')}`;
    }

    const { data: newMessage, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: senderId || null,
        sender_type: 'agent',
        message_type: 'outgoing',
        content: previewContent,
        status: 'sent',
        metadata: {
          whatsapp_message_id: metaMessageId,
          is_template: true,
          template_name: templateName,
          sender_name: senderName || 'Agent'
        }
      })
      .select('*')
      .single();

    if (msgErr) throw msgErr;

    res.status(200).json({ success: true, message: newMessage, conversationId: conversation.id });
  } catch (error: any) {
    console.error('Error sending template:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send template message', details: error.response?.data || error.message });
  }
});

export default router;
