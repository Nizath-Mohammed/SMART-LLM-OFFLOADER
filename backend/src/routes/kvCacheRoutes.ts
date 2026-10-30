import { Router, Request, Response, NextFunction } from 'express';
import { estimateKvCache } from '../services/kvCacheService';
import { AppError } from '../types/index';

const router = Router();

router.get('/estimate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = req.query.modelName as string | undefined;
    if (!modelName) throw new AppError(400, 'modelName query parameter is required.');
    const clRaw = req.query.contextLength as string | undefined;
    if (!clRaw) throw new AppError(400, 'contextLength must be a positive integer.');
    const contextLength = parseInt(clRaw, 10);
    if (isNaN(contextLength) || contextLength <= 0) {
      throw new AppError(400, 'contextLength must be a positive integer.');
    }
    const estimate = estimateKvCache(modelName, contextLength);
    res.status(200).json({ message: 'KV-cache estimate computed.', data: estimate });
  } catch (err) { next(err); }
});

export default router;
