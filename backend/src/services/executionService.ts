import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { executeInference } from './ollamaService';
import {
  ExecutionRecord,
  CreateExecutionPayload,
  AppError,
} from '../types/index';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ExecutionRow {
  id: string;
  agent_id: string | null;
  task_id: string | null;
  model_name: string;
  prompt: string;
  system_prompt: string | null;
  response: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  duration_ms: number | null;
  prompt_tokens: number | null;
  eval_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
  completed_at: string | null;
}

function toExecutionRecord(row: ExecutionRow): ExecutionRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    taskId: row.task_id,
    modelName: row.model_name,
    prompt: row.prompt,
    systemPrompt: row.system_prompt,
    response: row.response,
    status: row.status,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    promptTokens: row.prompt_tokens,
    evalTokens: row.eval_tokens,
    totalTokens: row.total_tokens,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function createAndRunExecution(
  payload: CreateExecutionPayload
): Promise<ExecutionRecord> {
  const modelName = payload.modelName || (payload as any).model;
  const { prompt, agentId, taskId } = payload;

  if (!modelName || typeof modelName !== 'string' || !modelName.trim()) {
    throw new AppError(400, 'modelName is required and must not be empty.');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new AppError(400, 'prompt is required and must not be empty.');
  }

  if (prompt.length > 10000) {
    throw new AppError(400, 'prompt must not exceed 10,000 characters.');
  }

  const db = getDatabase();
  let effectiveSystemPrompt = payload.systemPrompt || null;

  if (agentId !== undefined && agentId !== null) {
    if (typeof agentId !== 'string' || !UUID_REGEX.test(agentId)) {
      throw new AppError(400, 'agentId must be a valid UUID.');
    }
    const agent = db.prepare('SELECT id, system_prompt FROM agents WHERE id = ?').get(agentId) as
      | { id: string; system_prompt: string }
      | undefined;
    if (!agent) {
      throw new AppError(404, 'Agent not found.');
    }
    if (!effectiveSystemPrompt && agent.system_prompt) {
      effectiveSystemPrompt = agent.system_prompt;
    }
  }

  if (taskId !== undefined && taskId !== null) {
    if (typeof taskId !== 'string' || !UUID_REGEX.test(taskId)) {
      throw new AppError(400, 'taskId must be a valid UUID.');
    }
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      throw new AppError(404, 'Task not found.');
    }
  }

  const executionId = uuidv4();
  const createdAt = new Date().toISOString();

  // Insert initial running execution record
  const insertStmt = db.prepare(`
    INSERT INTO executions (
      id,
      agent_id,
      task_id,
      model_name,
      prompt,
      system_prompt,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
  `);

  insertStmt.run(
    executionId,
    agentId ?? null,
    taskId ?? null,
    modelName.trim(),
    prompt,
    effectiveSystemPrompt,
    createdAt
  );

  // If taskId was linked, mark the task as running
  if (taskId) {
    db.prepare(`
      UPDATE tasks
      SET status = 'running', started_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(createdAt, taskId);
  }

  try {
    const result = await executeInference(
      modelName.trim(),
      prompt,
      effectiveSystemPrompt || undefined
    );

    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE executions
      SET response = ?,
          status = 'completed',
          duration_ms = ?,
          prompt_tokens = ?,
          eval_tokens = ?,
          total_tokens = ?,
          completed_at = ?
      WHERE id = ?
    `).run(
      result.response,
      result.durationMs,
      result.promptTokens,
      result.evalTokens,
      result.totalTokens,
      completedAt,
      executionId
    );

    if (taskId) {
      db.prepare(`
        UPDATE tasks
        SET status = 'completed', response = ?, completed_at = ?
        WHERE id = ?
      `).run(result.response, completedAt, taskId);
    }

    return getExecutionById(executionId);
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorMsg = err instanceof Error ? err.message : String(err);

    db.prepare(`
      UPDATE executions
      SET status = 'failed',
          error_message = ?,
          completed_at = ?
      WHERE id = ?
    `).run(errorMsg, completedAt, executionId);

    if (taskId) {
      db.prepare(`
        UPDATE tasks
        SET status = 'failed', error_message = ?, completed_at = ?
        WHERE id = ?
      `).run(errorMsg, completedAt, taskId);
    }

    throw err;
  }
}

export interface ExecutionFilter {
  agentId?: string;
  status?: string;
  limit?: number;
}

export function listExecutions(filter: ExecutionFilter = {}): ExecutionRecord[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.agentId) {
    conditions.push('agent_id = ?');
    params.push(filter.agentId);
  }

  if (filter.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(100, Math.max(1, filter.limit || 50));
  params.push(limit);

  const query = `
    SELECT * FROM executions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(...params) as ExecutionRow[];

  return rows.map(toExecutionRecord);
}

export function getExecutionById(id: string): ExecutionRecord {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM executions WHERE id = ?').get(id) as ExecutionRow | undefined;
  if (!row) {
    throw new AppError(404, 'Execution not found.');
  }
  return toExecutionRecord(row);
}
