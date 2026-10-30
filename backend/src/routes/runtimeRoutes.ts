import { Router, Request, Response, NextFunction } from 'express';
import {
  checkOllamaStatus,
  listInstalledModels,
  deleteModel,
  startPullModel,
  getPullProgress,
  cancelPull,
} from '../services/ollamaService';
import { AppError } from '../types/index';

const router = Router();

// GET /runtime/status — Check Ollama connection status
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await checkOllamaStatus();
    res.status(200).json({
      message: 'Runtime status retrieved successfully.',
      data: status,
    });
  } catch (err) {
    next(err);
  }
});

// GET /runtime/models — List installed models in Ollama
router.get('/models', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await listInstalledModels();
    res.status(200).json({
      message: 'Installed models retrieved successfully.',
      data: models,
    });
  } catch (err) {
    next(err);
  }
});

// POST /runtime/models/pull — Start pulling a model
router.post('/models/pull', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model } = req.body;
    if (!model || typeof model !== 'string' || !model.trim()) {
      throw new AppError(400, 'model name is required.');
    }

    const progress = await startPullModel(model.trim());
    res.status(202).json({
      message: 'Model download started successfully.',
      data: progress,
    });
  } catch (err) {
    next(err);
  }
});

// GET /runtime/models/pull/:id — Get download progress
router.get('/models/pull/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = getPullProgress(req.params.id);
    res.status(200).json({
      message: 'Pull progress retrieved successfully.',
      data: progress,
    });
  } catch (err) {
    next(err);
  }
});

// POST /runtime/models/pull/:id/cancel — Cancel an ongoing download
router.post('/models/pull/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = cancelPull(req.params.id);
    res.status(200).json({
      message: 'Download cancelled successfully.',
      data: progress,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /runtime/models/:name — Delete an installed model
router.delete('/models/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = req.params.name;
    if (!modelName) {
      throw new AppError(400, 'Model name is required.');
    }
    await deleteModel(modelName);
    res.status(200).json({
      message: `Model '${modelName}' deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
