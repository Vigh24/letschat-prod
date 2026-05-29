import { supabase } from '../supabase';
import axios from 'axios';

const accessToken = () => process.env.WHATSAPP_ACCESS_TOKEN || '';
const phoneNumberId = () => process.env.WHATSAPP_PHONE_ID || '';

function graphUrl() {
  return `https://graph.facebook.com/v17.0/${phoneNumberId()}/messages`;
}

function headers() {
  return {
    'Authorization': `Bearer ${accessToken()}`,
    'Content-Type': 'application/json',
  };
}

export async function sendWhatsAppMessage(conversationId: string, recipientPhone: string, text: string) {
  if (!accessToken() || !phoneNumberId()) {
    console.error('WhatsApp credentials not configured');
    return;
  }

  try {
    const response = await axios({
      method: 'POST',
      url: graphUrl(),
      headers: headers(),
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: { body: text }
      }
    });

    const metaMessageId = response.data.messages[0].id;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: null,
        sender_type: 'bot',
        message_type: 'outgoing',
        content: text,
        status: 'sent',
        metadata: { whatsapp_message_id: metaMessageId, ai_generated: true }
      });

    if (error) {
      console.error('Failed to insert AI auto-reply message into Supabase:', error);
    }
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error.response?.data || error.message);
  }
}

export async function sendWhatsAppInteractiveCSAT(conversationId: string, recipientPhone: string) {
  if (!accessToken() || !phoneNumberId()) {
    console.error('WhatsApp credentials not configured for CSAT interactive message');
    return;
  }

  const crypto = await import('crypto');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const sig = crypto.createHmac('sha256', accessToken() || 'fallback_secret').update(conversationId).digest('hex').substring(0, 16);
  const csatLink = `${frontendUrl}/?csat=true&convId=${conversationId}&sig=${sig}`;

  try {
    const response = await axios({
      method: 'POST',
      url: graphUrl(),
      headers: headers(),
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: 'Lets Chat Feedback' },
          body: { text: 'We would love to hear your feedback! How would you rate your support experience today?' },
          footer: { text: 'Choose a rating below' },
          action: {
            button: 'Rate Support',
            sections: [{
              title: 'Select Rating',
              rows: [
                { id: 'csat_5', title: '⭐⭐⭐⭐⭐ Excellent' },
                { id: 'csat_4', title: '⭐⭐⭐⭐ Very Good' },
                { id: 'csat_3', title: '⭐⭐⭐ Good' },
                { id: 'csat_2', title: '⭐⭐ Fair' },
                { id: 'csat_1', title: '⭐ Poor' }
              ]
            }]
          }
        }
      }
    });

    const metaMessageId = response.data.messages[0].id;
    const bodyText = `Interactive Survey: Please rate your support experience today. (Choose from list options)`;

    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: null,
        sender_type: 'bot',
        message_type: 'outgoing',
        content: bodyText,
        status: 'sent',
        metadata: { whatsapp_message_id: metaMessageId, ai_generated: true }
      });

    console.log('CSAT interactive message sent and logged');
  } catch (error: any) {
    console.error('Failed to send CSAT interactive message:', error.response?.data || error.message);
    const csatText = `We'd love to hear your feedback! How would you rate your support experience today on a scale of 1 to 5?\n\nReply with a number (1=Poor, 5=Excellent), or click here: ${csatLink}`;
    await sendWhatsAppMessage(conversationId, recipientPhone, csatText);
  }
}

export async function getMediaUrl(mediaId: string): Promise<string | null> {
  if (!accessToken()) return null;
  try {
    const mediaRes = await axios({
      method: 'GET',
      url: `https://graph.facebook.com/v17.0/${mediaId}`,
      headers: { 'Authorization': `Bearer ${accessToken()}` }
    });
    return mediaRes.data.url || null;
  } catch (e: any) {
    console.error('Failed to resolve Meta media URL:', e.message);
    return null;
  }
}
