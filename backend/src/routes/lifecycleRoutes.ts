import { Router, Request, Response, NextFunction } from 'express';
import {
  getLifecycleEntries, getRecentEvents, explicitUnload,
  getLifecycleConfig, updateLifecycleConfig
} from '../services/modelLifecycleService';

const router = Router();

router.get('/lifecycle', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Model lifecycle entries retrieved.', data: getLifecycleEntries() });
  } catch (err) { next(err); }
});

router.get('/lifecycle/events', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Lifecycle events retrieved.', data: getRecentEvents(100) });
  } catch (err) { next(err); }
});

router.delete('/lifecycle/:modelName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await explicitUnload(req.params.modelName);
    res.status(200).json({ message: 'Model unloaded successfully.' });
  } catch (err) { next(err); }
});

router.patch('/lifecycle/config', (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = updateLifecycleConfig(req.body as Record<string, unknown>);
    res.status(200).json({ message: 'Lifecycle configuration updated.', data: updated });
  } catch (err) { next(err); }
});

export default router;
