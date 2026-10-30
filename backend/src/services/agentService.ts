import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { Agent, CreateAgentPayload, AppError } from '../types/index';

// ── Internal DB row type ──────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  name: string;
  system_prompt: string;
  model_ref: string | null;
  status: 'idle' | 'running' | 'error';
  created_at: string;
}

interface TaskStatusRow {
  status: string;
}

// ── Mapping helper ────────────────────────────────────────────────────────────

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    modelRef: row.model_ref,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ── Validation helpers ────────────────────────────────────────────────────────

function validateName(name: string): void {
  if (name.trim().length === 0) {
    throw new AppError(400, 'Agent name must not be empty.');
  }
  if (name.length > 100) {
    throw new AppError(400, 'Agent name must not exceed 100 characters.');
  }
}

function validateSystemPromptOnCreate(systemPrompt: string | undefined): void {
  if (systemPrompt !== undefined && systemPrompt.length > 50_000) {
    throw new AppError(400, 'System prompt must not exceed 50,000 characters.');
  }
}

function validateSystemPromptOnUpdate(systemPrompt: unknown): void {
  if (systemPrompt === undefined) {
    throw new AppError(400, 'The systemPrompt field is required.');
  }
  if (typeof systemPrompt === 'string' && systemPrompt.length > 50_000) {
    throw new AppError(400, 'System prompt must not exceed 50,000 characters.');
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Creates a new agent record in the database.
 *
 * Validates the name (non-empty, ≤100 chars, not whitespace-only) and the
 * optional systemPrompt (≤50,000 chars). Generates a UUID for the new agent,
 * sets status to 'idle', and records the creation timestamp.
 */
export function createAgent(payload: CreateAgentPayload): Agent {
  validateName(payload.name);
  validateSystemPromptOnCreate(payload.systemPrompt);

  const db = getDatabase();
  const id = uuidv4();
  const systemPrompt = payload.systemPrompt ?? '';
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO agents (id, name, system_prompt, model_ref, status, created_at)
    VALUES (?, ?, ?, NULL, 'idle', ?)
  `);

  stmt.run(id, payload.name, systemPrompt, createdAt);

  return {
    id,
    name: payload.name,
    systemPrompt,
    modelRef: null,
    status: 'idle',
    createdAt,
  };
}

/**
 * Returns all agent records from the database.
 */
export function listAgents(): Agent[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM agents').all() as AgentRow[];
  return rows.map(rowToAgent);
}

/**
 * Returns a single agent by ID, or throws AppError(404) if not found.
 */
export function getAgentById(agentId: string): Agent {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM agents WHERE id = ?')
    .get(agentId) as AgentRow | undefined;

  if (!row) {
    throw new AppError(404, 'Agent not found.');
  }

  return rowToAgent(row);
}

/**
 * Renames an existing agent.
 *
 * Validates the new name, checks the agent exists (throws 404 if not), updates
 * the name in the DB, and returns the full updated Agent.
 */
export function renameAgent(agentId: string, name: string): Agent {
  validateName(name);

  const db = getDatabase();

  // Ensure the agent exists before updating.
  const existing = db
    .prepare('SELECT * FROM agents WHERE id = ?')
    .get(agentId) as AgentRow | undefined;

  if (!existing) {
    throw new AppError(404, 'Agent not found.');
  }

  db.prepare('UPDATE agents SET name = ? WHERE id = ?').run(name, agentId);

  return rowToAgent({ ...existing, name });
}

/**
 * Updates the system prompt of an existing agent.
 *
 * The systemPrompt field must be present (not undefined) and ≤50,000 chars.
 * An empty string is valid — it clears the system prompt.
 * Throws 404 if the agent does not exist.
 */
export function updateSystemPrompt(
  agentId: string,
  systemPrompt: unknown
): Agent {
  validateSystemPromptOnUpdate(systemPrompt);

  // At this point we know systemPrompt is defined; narrow the type.
  const prompt = systemPrompt as string;

  const db = getDatabase();

  const existing = db
    .prepare('SELECT * FROM agents WHERE id = ?')
    .get(agentId) as AgentRow | undefined;

  if (!existing) {
    throw new AppError(404, 'Agent not found.');
  }

  db.prepare('UPDATE agents SET system_prompt = ? WHERE id = ?').run(
    prompt,
    agentId
  );

  return rowToAgent({ ...existing, system_prompt: prompt });
}

export interface AgentOptimizationConfig {
  modelRef?: string | null;
  quantization?: string | null;
  layerOffload?: boolean;
  kvCacheOpt?: boolean;
}

/**
 * Updates an agent's model and edge optimization configuration (quantization, layer offload, KV cache).
 */
export function updateAgentConfig(
  agentId: string,
  config: AgentOptimizationConfig
): Agent {
  const db = getDatabase();

  const existing = db
    .prepare('SELECT * FROM agents WHERE id = ?')
    .get(agentId) as AgentRow | undefined;

  if (!existing) {
    throw new AppError(404, 'Agent not found.');
  }

  const modelRef = config.modelRef !== undefined ? config.modelRef : existing.model_ref;

  db.prepare('UPDATE agents SET model_ref = ? WHERE id = ?').run(
    modelRef,
    agentId
  );

  return rowToAgent({ ...existing, model_ref: modelRef });
}

/**
 * Deletes an agent and all its associated tasks atomically.

 *
 * Throws 404 if the agent does not exist.
 * Throws 409 if the agent has any task with status 'running'.
 * Uses a better-sqlite3 transaction so both deletes are rolled back on failure.
 */
export function deleteAgent(agentId: string): void {
  const db = getDatabase();

  // Check agent exists.
  const existing = db
    .prepare('SELECT id FROM agents WHERE id = ?')
    .get(agentId) as { id: string } | undefined;

  if (!existing) {
    throw new AppError(404, 'Agent not found.');
  }

  // Check for any running task.
  const runningTask = db
    .prepare(
      "SELECT status FROM tasks WHERE agent_id = ? AND status = 'running' LIMIT 1"
    )
    .get(agentId) as TaskStatusRow | undefined;

  if (runningTask) {
    throw new AppError(409, 'Agent has a task currently running.');
  }

  // Atomically delete tasks then agent.
  const deleteBoth = db.transaction(() => {
    db.prepare('DELETE FROM tasks WHERE agent_id = ?').run(agentId);
    db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);
  });

  deleteBoth();
}
