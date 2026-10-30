import { Router, Request, Response, NextFunction } from 'express';
import {
  searchHuggingFaceModels,
  getHuggingFaceModelDetails,
} from '../services/huggingFaceService';
import { AppError } from '../types/index';

const router = Router();

// GET /huggingface/search?q=...&limit=... — Search models on Hugging Face
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new AppError(400, 'Search query parameter "q" is required.');
    }

    const models = await searchHuggingFaceModels(query, limit);
    res.status(200).json({
      message: 'Hugging Face models retrieved successfully.',
      data: models,
    });
  } catch (err) {
    next(err);
  }
});

// GET /huggingface/models/* — Retrieve detailed model metadata by full repo ID
router.get('/models/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract the model ID from the wildcard path (e.g. /models/bartowski/Llama-3.2-1B-Instruct-GGUF)
    const modelId = req.params[0];
    if (!modelId || !modelId.trim()) {
      throw new AppError(400, 'Model ID is required.');
    }

    const details = await getHuggingFaceModelDetails(modelId);
    res.status(200).json({
      message: 'Hugging Face model details retrieved successfully.',
      data: details,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
