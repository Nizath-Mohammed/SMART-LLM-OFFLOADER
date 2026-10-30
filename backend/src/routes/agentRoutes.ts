import { Router, Request, Response, NextFunction } from 'express';
import {
  createAgent,
  listAgents,
  getAgentById,
  renameAgent,
  updateSystemPrompt,
  deleteAgent,
} from '../services/agentService';

const router = Router();

// POST /agents — Create a new agent
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = createAgent(req.body);
    res.status(201).json({ message: 'Agent created successfully.', data: agent });
  } catch (err) {
    next(err);
  }
});

// GET /agents — List all agents
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = listAgents();
    res.status(200).json({ message: 'Agents retrieved successfully.', data: agents });
  } catch (err) {
    next(err);
  }
});

// GET /agents/:agentId — Get agent by ID
router.get('/:agentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = getAgentById(req.params.agentId);
    res.status(200).json({ message: 'Agent retrieved successfully.', data: agent });
  } catch (err) {
    next(err);
  }
});

// PATCH /agents/:agentId/name — Rename an agent
router.patch('/:agentId/name', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = renameAgent(req.params.agentId, req.body.name);
    res.status(200).json({ message: 'Agent renamed successfully.', data: agent });
  } catch (err) {
    next(err);
  }
});

// PATCH /agents/:agentId/system-prompt — Update system prompt
router.patch('/:agentId/system-prompt', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = updateSystemPrompt(req.params.agentId, req.body.systemPrompt);
    res.status(200).json({ message: 'System prompt updated.', data: agent });
  } catch (err) {
    next(err);
  }
});

// PATCH /agents/:agentId/config — Update agent model, quantization & optimizations
router.patch('/:agentId/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updateAgentConfig } = await import('../services/agentService');
    const agent = updateAgentConfig(req.params.agentId, req.body);
    res.status(200).json({ message: 'Agent configuration updated.', data: agent });
  } catch (err) {
    next(err);
  }
});

// DELETE /agents/:agentId — Delete agent and all its tasks
router.delete('/:agentId', (req: Request, res: Response, next: NextFunction) => {
  try {
    deleteAgent(req.params.agentId);
    res.status(200).json({ message: 'Agent deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
