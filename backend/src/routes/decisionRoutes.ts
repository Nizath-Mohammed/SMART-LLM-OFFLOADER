import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getHardwareInfo } from '../services/hardwareDetector';
import { getModelRegistry } from '../data/modelRegistry';
import { analyzeTask } from '../services/taskAnalyzer';
import { generateRecommendation } from '../services/recommendationEngine';
import { getDatabase } from '../db/database';
import {
  AppError,
  Recommendation,
  TaskCategory,
  TaskComplexity,
  ExecutionStrategy,
  ConfidenceLevel,
} from '../types/index';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RecommendationRow {
  id: string;
  task_category: string;
  task_complexity: string;
  recommended_model: string;
  recommended_quantization: string | null;
  estimated_memory_mb: number;
  recommended_context_length: number;
  execution_strategy: string;
  compatibility_warnings: string;
  explanation: string;
  confidence_level: string;
  prompt: string;
  agent_id: string | null;
  created_at: string;
}

function toRecommendation(row: RecommendationRow): Recommendation {
  let compatibilityWarnings: string[] = [];
  try {
    compatibilityWarnings = JSON.parse(row.compatibility_warnings);
  } catch {
    compatibilityWarnings = [];
  }

  return {
    id: row.id,
    taskCategory: row.task_category as TaskCategory,
    taskComplexity: row.task_complexity as TaskComplexity,
    recommendedModel: row.recommended_model,
    recommendedQuantization: row.recommended_quantization,
    estimatedMemoryMB: row.estimated_memory_mb,
    recommendedContextLength: row.recommended_context_length,
    executionStrategy: row.execution_strategy as ExecutionStrategy,
    compatibilityWarnings,
    explanation: row.explanation,
    confidenceLevel: row.confidence_level as ConfidenceLevel,
    prompt: row.prompt,
    agentId: row.agent_id,
    createdAt: row.created_at,
  };
}

// GET /hardware — Retrieve detected hardware info
router.get('/hardware', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hardware = getHardwareInfo();
    res.status(200).json({
      message: 'Hardware info retrieved successfully.',
      data: hardware,
    });
  } catch (err) {
    next(err);
  }
});

// GET /models — Retrieve candidate model registry
router.get('/models', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const models = getModelRegistry();
    res.status(200).json({
      message: 'Model registry retrieved successfully.',
      data: models,
    });
  } catch (err) {
    next(err);
  }
});

// POST /recommendations — Analyze prompt and generate recommendation
router.post('/recommendations', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, agentId } = req.body;

    if (prompt === undefined || prompt === null || typeof prompt !== 'string') {
      throw new AppError(400, 'The prompt field is required.');
    }

    if (prompt.trim().length === 0) {
      throw new AppError(400, 'Prompt must not be empty.');
    }

    if (prompt.length > 10000) {
      throw new AppError(400, 'Prompt must not exceed 10,000 characters.');
    }

    const db = getDatabase();

    if (agentId !== undefined && agentId !== null) {
      if (typeof agentId !== 'string' || !UUID_REGEX.test(agentId)) {
        throw new AppError(400, 'agentId must be a valid UUID.');
      }

      const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);
      if (!agent) {
        throw new AppError(404, 'Agent not found.');
      }
    }

    const analysis = analyzeTask(prompt);
    const hardware = getHardwareInfo();
    const draft = generateRecommendation(analysis, hardware, prompt, agentId ?? null);

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO recommendations (
        id,
        task_category,
        task_complexity,
        recommended_model,
        recommended_quantization,
        estimated_memory_mb,
        recommended_context_length,
        execution_strategy,
        compatibility_warnings,
        explanation,
        confidence_level,
        prompt,
        agent_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      draft.taskCategory,
      draft.taskComplexity,
      draft.recommendedModel,
      draft.recommendedQuantization,
      draft.estimatedMemoryMB,
      draft.recommendedContextLength,
      draft.executionStrategy,
      JSON.stringify(draft.compatibilityWarnings),
      draft.explanation,
      draft.confidenceLevel,
      draft.prompt,
      draft.agentId,
      createdAt
    );

    const recommendation: Recommendation = {
      ...draft,
      id,
      createdAt,
    };

    res.status(201).json({
      message: 'Recommendation created successfully.',
      data: recommendation,
    });
  } catch (err) {
    next(err);
  }
});

// GET /recommendations/:id — Retrieve stored recommendation by ID
router.get('/recommendations/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id) as RecommendationRow | undefined;

    if (!row) {
      throw new AppError(404, 'Recommendation not found.');
    }

    res.status(200).json({
      message: 'Recommendation retrieved successfully.',
      data: toRecommendation(row),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
