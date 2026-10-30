import { Router, Request, Response, NextFunction } from 'express';
import { getRecords, getSummary } from '../services/benchmarkService';
import { AppError } from '../types/index';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = typeof req.query.modelName === 'string' ? req.query.modelName : undefined;
    const limitRaw = req.query.limit;
    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = parseInt(String(limitRaw), 10);
      if (isNaN(limit) || limit < 1 || limit > 200) {
        throw new AppError(400, 'limit must be an integer between 1 and 200.');
      }
    }
    const records = getRecords({ modelName, limit });
    res.status(200).json({ message: 'Benchmark records retrieved.', data: records });
  } catch (err) { next(err); }
});

router.get('/summary', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Benchmark summary retrieved.', data: getSummary() });
  } catch (err) { next(err); }
});

export default router;
