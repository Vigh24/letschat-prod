import { Router } from 'express';
import { supabase } from '../supabase';
import { sendWhatsAppMessage, sendWhatsAppInteractiveCSAT } from '../services/whatsapp';
import { generateAIConversationSummary } from '../services/ai';
import crypto from 'crypto';

const router = Router();

// Resolve conversation with disposition & CSAT triggering
router.post('/api/conversations/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { disposition, sendCsat } = req.body;

  try {
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', id)
      .single();

    if (fetchError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const contact = conversation.contact;
    const recipientPhone = contact?.whatsapp_number;
    const resolvedByAgentId = conversation.assigned_agent_id;

    const updatedMetadata = {
      ...(conversation.metadata || {}),
      disposition: disposition || null,
      resolved_by: resolvedByAgentId || null
    };

    if (sendCsat && recipientPhone) {
      updatedMetadata.csat_pending = {
        requested_at: new Date().toISOString(),
        resolved_by: resolvedByAgentId
      };
    }

    const { data: updatedConv, error: updateError } = await supabase
      .from('conversations')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        assigned_agent_id: null,
        metadata: updatedMetadata
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Trigger AI summary in background
    generateAIConversationSummary(id).then(async (summary) => {
      const { data: latestConv } = await supabase.from('conversations').select('metadata').eq('id', id).single();
      const nextMetadata = { ...(latestConv?.metadata || {}), ai_summary: summary };
      await supabase.from('conversations').update({ metadata: nextMetadata }).eq('id', id);
      console.log('Background AI summary completed and logged');
    }).catch(err => {
      console.error('Background AI summary failed:', err.message);
    });

    if (sendCsat && recipientPhone) {
      try {
        await sendWhatsAppInteractiveCSAT(id, recipientPhone);
      } catch (err: any) {
        console.error('Failed to send CSAT survey message:', err.message);
      }
    }

    res.status(200).json({ success: true, conversation: updatedConv });
  } catch (error: any) {
    console.error('Error resolving conversation:', error.message);
    res.status(500).json({ error: 'Failed to resolve conversation', details: error.message });
  }
});

// Generate AI summary manually
router.post('/api/conversations/:id/summarize', async (req, res) => {
  const { id } = req.params;

  try {
    const summary = await generateAIConversationSummary(id);

    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updatedMetadata = { ...(conversation.metadata || {}), ai_summary: summary };

    const { data: updatedConv, error: updateError } = await supabase
      .from('conversations')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ success: true, summary, conversation: updatedConv });
  } catch (error: any) {
    console.error('Error generating summary:', error.message);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

// Public endpoint for submitting CSAT form feedback
router.post('/api/conversations/:id/csat', async (req, res) => {
  const { id } = req.params;
  const { score, feedback, sig } = req.body;

  const expectedSig = crypto.createHmac('sha256', process.env.WHATSAPP_ACCESS_TOKEN || 'fallback_secret').update(id).digest('hex').substring(0, 16);
  if (!sig || sig !== expectedSig) {
    return res.status(403).json({ error: 'Tampering detected. CSAT submission rejected.' });
  }

  const numericScore = parseInt(score, 10);
  if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
    return res.status(400).json({ error: 'Invalid score. Must be between 1 and 5.' });
  }

  try {
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', id)
      .single();

    if (fetchError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentMetadata = conversation.metadata || {};
    const csatPending = currentMetadata.csat_pending;
    const csatHistory = currentMetadata.csat_history || [];

    csatHistory.push({
      score: numericScore,
      feedback: feedback || '',
      requested_at: csatPending?.requested_at || new Date().toISOString(),
      responded_at: new Date().toISOString(),
      resolved_by: csatPending?.resolved_by || null,
      ticket_id: conversation.ticket_id
    });

    const updatedMetadata = {
      ...currentMetadata,
      csat_history: csatHistory,
      csat_pending: null
    };

    const { data: updatedConv, error: updateError } = await supabase
      .from('conversations')
      .update({ metadata: updatedMetadata })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const recipientPhone = conversation.contact?.whatsapp_number;
    if (recipientPhone) {
      const thankYouText = `Thank you for your feedback! You rated us ${numericScore}/5 stars. ${feedback ? 'We appreciate your comments.' : ''}`;
      try {
        await sendWhatsAppMessage(id, recipientPhone, thankYouText);
      } catch (err: any) {
        console.error('Failed to send thank you WhatsApp message:', err.message);
      }
    }

    res.status(200).json({ success: true, conversation: updatedConv });
  } catch (error: any) {
    console.error('Error updating CSAT feedback:', error.message);
    res.status(500).json({ error: 'Failed to submit CSAT feedback', details: error.message });
  }
});

// Set tags on conversation
router.post('/api/conversations/:id/tags', async (req, res) => {
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) return res.status(400).json({ error: 'tagIds must be an array' });
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ tags: tagIds })
      .eq('id', req.params.id)
      .select('tags')
      .single();
    if (error) throw error;
    res.json({ tags: data.tags });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
