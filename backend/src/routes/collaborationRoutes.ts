import { Router, Request, Response, NextFunction } from 'express';
import {
  createSession, getSession, createSubtask, sendMessage, getMessages
} from '../services/collaborationService';

const router = Router();

router.post('/sessions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = createSession(req.body as { parentAgentId: string; title: string });
    res.status(201).json({ message: 'Collaboration session created.', data: session });
  } catch (err) { next(err); }
});

router.get('/sessions/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = getSession(req.params.sessionId);
    res.status(200).json({ message: 'Collaboration session retrieved.', data: session });
  } catch (err) { next(err); }
});

router.post('/sessions/:sessionId/subtasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { agentId: string; prompt: string; depth: number; dependsOn?: string[] };
    const subtask = createSubtask(req.params.sessionId, body);
    res.status(201).json({ message: 'Subtask created.', data: subtask });
  } catch (err) { next(err); }
});

router.post('/sessions/:sessionId/messages', (req: Request, res: Response, next: NextFunction) => {
  try {
    const msg = sendMessage(req.params.sessionId, req.body as { fromAgentId: string; toAgentId: string; content: string; subtaskId?: string });
    res.status(201).json({ message: 'Message sent.', data: msg });
  } catch (err) { next(err); }
});

router.get('/sessions/:sessionId/messages', (req: Request, res: Response, next: NextFunction) => {
  try {
    const msgs = getMessages(req.params.sessionId);
    res.status(200).json({ message: 'Messages retrieved.', data: msgs });
  } catch (err) { next(err); }
});

export default router;
