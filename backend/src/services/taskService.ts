import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { Task, CreateTaskPayload, TaskTransition, AppError } from '../types/index';

// ── Internal DB row type ──────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  agent_id: string;
  prompt: string;
  response: string | null;
  error_message: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ── Mapping helper ────────────────────────────────────────────────────────────

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    agentId: row.agent_id,
    prompt: row.prompt,
    response: row.response,
    errorMessage: row.error_message,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ── Validation helpers ────────────────────────────────────────────────────────

function validatePrompt(prompt: string): void {
  if (prompt.trim().length === 0) {
    throw new AppError(400, 'Prompt must not be empty.');
  }
  if (prompt.length > 10_000) {
    throw new AppError(400, 'Prompt must not exceed 10,000 characters.');
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Creates a new task for the given agent.
 *
 * - Checks the agent exists (AppError 404 if not).
 * - Validates the prompt: non-empty, not whitespace-only, ≤10,000 chars.
 * - Rejects if the agent already has a pending or running task (AppError 409).
 * - Generates a UUID, sets status='pending', records createdAt, inserts into DB.
 */
export function createTask(agentId: string, payload: CreateTaskPayload): Task {
  const db = getDatabase();

  // Check agent exists.
  const agentExists = db
    .prepare('SELECT id FROM agents WHERE id = ?')
    .get(agentId) as { id: string } | undefined;

  if (!agentExists) {
    throw new AppError(404, 'Agent not found.');
  }

  // Validate prompt.
  validatePrompt(payload.prompt);

  // Check for existing pending or running task.
  const activeTask = db
    .prepare(
      "SELECT id FROM tasks WHERE agent_id = ? AND status IN ('pending', 'running') LIMIT 1"
    )
    .get(agentId) as { id: string } | undefined;

  if (activeTask) {
    throw new AppError(409, 'Agent already has a pending or running task.');
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, agent_id, prompt, response, error_message, status, created_at, started_at, completed_at)
    VALUES (?, ?, ?, NULL, NULL, 'pending', ?, NULL, NULL)
  `).run(id, agentId, payload.prompt, createdAt);

  return {
    id,
    agentId,
    prompt: payload.prompt,
    response: null,
    errorMessage: null,
    status: 'pending',
    createdAt,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Returns all tasks for the given agent ordered by created_at DESC.
 *
 * Throws AppError(404) if the agent does not exist.
 */
export function listTasksForAgent(agentId: string): Task[] {
  const db = getDatabase();

  // Check agent exists.
  const agentExists = db
    .prepare('SELECT id FROM agents WHERE id = ?')
    .get(agentId) as { id: string } | undefined;

  if (!agentExists) {
    throw new AppError(404, 'Agent not found.');
  }

  const rows = db
    .prepare(
      'SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC'
    )
    .all(agentId) as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Transitions a task to a new status, enforcing valid transitions only:
 *   pending  → running    (records startedAt)
 *   running  → completed  (records completedAt, stores response)
 *   running  → failed     (records completedAt, stores errorMessage ≤1000 chars)
 *
 * Throws AppError(404) if the task does not exist.
 * Throws AppError(400) if the transition is invalid.
 */
export function transitionTaskStatus(
  taskId: string,
  transition: TaskTransition
): Task {
  const db = getDatabase();

  // Fetch the current task.
  const row = db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(taskId) as TaskRow | undefined;

  if (!row) {
    throw new AppError(404, 'Task not found.');
  }

  const now = new Date().toISOString();

  if (transition.status === 'running') {
    // Only valid from 'pending'.
    if (row.status !== 'pending') {
      throw new AppError(400, 'Invalid task status transition.');
    }

    db.prepare(
      "UPDATE tasks SET status = 'running', started_at = ? WHERE id = ?"
    ).run(now, taskId);

    return rowToTask({ ...row, status: 'running', started_at: now });
  }

  if (transition.status === 'completed') {
    // Only valid from 'running'.
    if (row.status !== 'running') {
      throw new AppError(400, 'Invalid task status transition.');
    }

    db.prepare(
      "UPDATE tasks SET status = 'completed', completed_at = ?, response = ? WHERE id = ?"
    ).run(now, transition.response, taskId);

    return rowToTask({
      ...row,
      status: 'completed',
      completed_at: now,
      response: transition.response,
    });
  }

  if (transition.status === 'failed') {
    // Only valid from 'running'.
    if (row.status !== 'running') {
      throw new AppError(400, 'Invalid task status transition.');
    }

    // Validate errorMessage length.
    if (transition.errorMessage.length > 1_000) {
      throw new AppError(400, 'Error message must not exceed 1,000 characters.');
    }

    db.prepare(
      "UPDATE tasks SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?"
    ).run(now, transition.errorMessage, taskId);

    return rowToTask({
      ...row,
      status: 'failed',
      completed_at: now,
      error_message: transition.errorMessage,
    });
  }

  // Should be unreachable given the TaskTransition type, but guard anyway.
  throw new AppError(400, 'Invalid task status transition.');
}
