import { Router, Request, Response, NextFunction } from 'express';
import { createTask, listTasksForAgent } from '../services/taskService';

const router = Router();

// POST /agents/:agentId/tasks — Assign a task to an agent
router.post('/:agentId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = createTask(req.params.agentId, req.body);
    res.status(201).json({ message: 'Task created successfully.', data: task });
  } catch (err) {
    next(err);
  }
});

// GET /agents/:agentId/tasks — List task history for an agent
router.get('/:agentId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = listTasksForAgent(req.params.agentId);
    res.status(200).json({ message: 'Task history retrieved.', data: tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
