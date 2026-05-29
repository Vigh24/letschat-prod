import { Router } from 'express';
import { rephraseText } from '../services/ai';

const router = Router();

router.post('/api/rephrase', async (req, res) => {
  const { draft, tone } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Missing draft text' });
  }

  try {
    const rephrased = await rephraseText(draft, tone || 'professional');

    if (rephrased) {
      res.status(200).json({ rephrased });
    } else {
      res.status(500).json({ error: 'Failed to generate rephrased message' });
    }
  } catch (error: any) {
    console.error('Rephrase error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Rephrase request failed', details: error.response?.data || error.message });
  }
});

export default router;
