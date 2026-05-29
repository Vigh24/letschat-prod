import { Router } from 'express';
import { mergeOldDuplicateConversations } from '../services/conversation';
import { sendWhatsAppInteractiveCSAT } from '../services/whatsapp';
import axios from 'axios';

const router = Router();

router.post('/api/admin/merge-duplicates', async (req, res) => {
  try {
    await mergeOldDuplicateConversations();
    res.status(200).json({ success: true, message: 'Merge triggered and completed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/test-csat', async (req, res) => {
  const recipientPhone = req.query.phone as string || '917738691833';
  const conversationId = req.query.convId as string || '8cedfccd-a6cb-4ea7-b53a-14cf04517ef8';

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  try {
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

    res.status(200).json({ success: true, metaResponse: response.data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      metaError: error.response?.data || null
    });
  }
});

export default router;
