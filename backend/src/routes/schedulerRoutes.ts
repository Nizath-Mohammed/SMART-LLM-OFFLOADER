import { Router, Request, Response, NextFunction } from 'express';
import { getQueue, getConfig, updateConfig, cancelTask } from '../services/schedulerService';

const router = Router();

router.get('/queue', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Scheduler queue retrieved.', data: getQueue() });
  } catch (err) { next(err); }
});

router.get('/config', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Scheduler config retrieved.', data: getConfig() });
  } catch (err) { next(err); }
});

router.patch('/config', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ramBudgetMB, maxConcurrency } = req.body as Record<string, unknown>;
    if (ramBudgetMB === undefined && maxConcurrency === undefined) {
      res.status(400).json({ message: 'At least one of ramBudgetMB or maxConcurrency is required.' });
      return;
    }
    const patch: Record<string, number> = {};
    if (ramBudgetMB !== undefined) patch.ramBudgetMB = Number(ramBudgetMB);
    if (maxConcurrency !== undefined) patch.maxConcurrency = Number(maxConcurrency);
    const updated = updateConfig(patch);
    res.status(200).json({ message: 'Scheduler configuration updated.', data: updated });
  } catch (err) { next(err); }
});

router.post('/queue/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = cancelTask(req.params.id);
    res.status(200).json({ message: 'Task cancelled successfully.', data: task });
  } catch (err) { next(err); }
});

export default router;
