import { Router, Request, Response, NextFunction } from 'express';
import {
  createAndRunExecution,
  listExecutions,
  getExecutionById,
} from '../services/executionService';

const router = Router();

// POST /executions — Execute inference task with selected model
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const execution = await createAndRunExecution(req.body);
    res.status(201).json({
      message: 'Execution completed successfully.',
      data: execution,
    });
  } catch (err) {
    next(err);
  }
});

// GET /executions — List execution history
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId, status, limit } = req.query;
    const executions = listExecutions({
      agentId: typeof agentId === 'string' ? agentId : undefined,
      status: typeof status === 'string' ? status : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    });
    res.status(200).json({
      message: 'Executions retrieved successfully.',
      data: executions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /executions/:id — Retrieve specific execution details
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const execution = getExecutionById(req.params.id);
    res.status(200).json({
      message: 'Execution retrieved successfully.',
      data: execution,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
