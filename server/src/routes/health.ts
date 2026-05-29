import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'letschat-backend' });
});

router.get('/api/ai-status', (req, res) => {
  res.status(200).json({
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    ollamaConfigured: !!process.env.OLLAMA_API_KEY,
    defaultProvider: process.env.AI_PROVIDER || (process.env.OLLAMA_API_KEY ? 'ollama' : 'gemini'),
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'https://ollama.com',
    ollamaModel: process.env.OLLAMA_MODEL || 'gemma4:31b-cloud'
  });
});

export default router;
