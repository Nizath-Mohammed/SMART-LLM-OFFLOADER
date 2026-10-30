import { Router, Request, Response } from 'express';
import { getAirllmStatus } from '../experimental/airllm/status';

const router = Router();

router.get('/airllm/status', (_req: Request, res: Response) => {
  if (process.env.AIRLLM_ENABLED !== 'true') {
    res.status(404).json({ message: 'Not found.' });
    return;
  }
  res.status(200).json({ message: 'AIRLLM feasibility report retrieved.', data: getAirllmStatus() });
});

export default router;
