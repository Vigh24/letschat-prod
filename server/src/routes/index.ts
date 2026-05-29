import { Router } from 'express';
import healthRouter from './health';
import webhookRouter from './webhook';
import conversationsRouter from './conversations';
import messagesRouter from './messages';
import tagsRouter from './tags';
import voiceRouter from './voice';
import aiRouter from './ai';
import adminRouter from './admin';

const router = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(tagsRouter);
router.use(voiceRouter);
router.use(aiRouter);
router.use(adminRouter);

export default router;
