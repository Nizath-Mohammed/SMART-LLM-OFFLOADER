import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import {
  CollaborationSession, CollaborationStatus, Subtask, AgentMessage, ScheduledTaskStatus, AppError
} from '../types/index';

interface SessionRow {
  id: string; title: string; parent_agent_id: string; status: string; created_at: string;
}
interface SubtaskRow {
  id: string; session_id: string; agent_id: string; prompt: string; status: string;
  depth: number; depends_on: string; created_at: string;
  completed_at: string | null; error_message: string | null;
}
interface MessageRow {
  id: string; session_id: string; from_agent_id: string; to_agent_id: string;
  content: string; subtask_id: string | null; sent_at: string;
}

function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id, sessionId: row.session_id, agentId: row.agent_id,
    prompt: row.prompt, status: row.status as ScheduledTaskStatus,
    depth: row.depth, dependsOn: JSON.parse(row.depends_on) as string[],
    createdAt: row.created_at, completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

function computeStatus(subtasks: Subtask[]): CollaborationStatus {
  if (subtasks.length === 0) return 'active';
  if (subtasks.some(s => s.status === 'queued' || s.status === 'running')) return 'active';
  if (subtasks.some(s => s.status === 'failed')) return 'failed';
  return 'completed';
}

function loadSessionWithSubtasks(sessionId: string): CollaborationSession {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM collaboration_sessions WHERE id = ?').get(sessionId) as SessionRow | undefined;
  if (!row) throw new AppError(404, 'Collaboration session not found.');
  const rows = db.prepare('SELECT * FROM subtasks WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as SubtaskRow[];
  const subtasks = rows.map(rowToSubtask);
  return {
    id: row.id, title: row.title, parentAgentId: row.parent_agent_id,
    status: computeStatus(subtasks), createdAt: row.created_at, subtasks,
  };
}

export function createSession(payload: { parentAgentId: string; title: string }): CollaborationSession {
  const db = getDatabase();
  const { parentAgentId, title } = payload;
  if (!title || !title.trim()) throw new AppError(400, 'title is required.');
  if (title.length > 200) throw new AppError(400, 'title must not exceed 200 characters.');
  if (!db.prepare('SELECT id FROM agents WHERE id = ?').get(parentAgentId)) {
    throw new AppError(404, 'Agent not found.');
  }
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO collaboration_sessions (id, title, parent_agent_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title.trim(), parentAgentId, 'active', createdAt);
  return { id, title: title.trim(), parentAgentId, status: 'active', createdAt, subtasks: [] };
}

export function getSession(sessionId: string): CollaborationSession {
  return loadSessionWithSubtasks(sessionId);
}

export function createSubtask(
  sessionId: string,
  payload: { agentId: string; prompt: string; depth: number; dependsOn?: string[] }
): Subtask {
  const db = getDatabase();
  if (!db.prepare('SELECT id FROM collaboration_sessions WHERE id = ?').get(sessionId)) {
    throw new AppError(404, 'Collaboration session not found.');
  }
  const { agentId, prompt, depth, dependsOn = [] } = payload;
  if (!prompt || !prompt.trim()) throw new AppError(400, 'prompt is required.');
  if (prompt.length > 10000) throw new AppError(400, 'prompt must not exceed 10,000 characters.');
  if (depth < 1 || depth > 3) throw new AppError(422, 'Maximum subtask depth of 3 has been reached.');
  if (!db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId)) {
    throw new AppError(404, 'Agent not found.');
  }
  const { n } = db.prepare('SELECT COUNT(*) as n FROM subtasks WHERE session_id = ?').get(sessionId) as { n: number };
  if (n >= 10) throw new AppError(422, 'Maximum of 10 subtasks per session has been reached.');
  for (const depId of dependsOn) {
    if (!db.prepare('SELECT id FROM subtasks WHERE id = ? AND session_id = ?').get(depId, sessionId)) {
      throw new AppError(400, 'One or more dependency IDs do not belong to this session.');
    }
  }
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO subtasks (id, session_id, agent_id, prompt, status, depth, depends_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, sessionId, agentId, prompt.trim(), 'queued', depth, JSON.stringify(dependsOn), createdAt);
  return { id, sessionId, agentId, prompt: prompt.trim(), status: 'queued', depth, dependsOn, createdAt, completedAt: null, errorMessage: null };
}

export function onSubtaskCompleted(subtaskId: string): void {
  const db = getDatabase();
  db.prepare("UPDATE subtasks SET status='completed', completed_at=? WHERE id=?")
    .run(new Date().toISOString(), subtaskId);
}

export function onSubtaskFailed(subtaskId: string): void {
  const db = getDatabase();
  db.prepare("UPDATE subtasks SET status='failed', completed_at=? WHERE id=?")
    .run(new Date().toISOString(), subtaskId);
  const sessionRow = db.prepare('SELECT session_id FROM subtasks WHERE id=?').get(subtaskId) as { session_id: string } | undefined;
  if (!sessionRow) return;
  const allRows = db.prepare('SELECT * FROM subtasks WHERE session_id=?').all(sessionRow.session_id) as SubtaskRow[];

  function cancelDependents(failedId: string): void {
    for (const row of allRows) {
      const deps: string[] = JSON.parse(row.depends_on);
      if (deps.includes(failedId) && row.status === 'queued') {
        db.prepare("UPDATE subtasks SET status='cancelled', completed_at=?, error_message=? WHERE id=?")
          .run(new Date().toISOString(), 'dependency_failed_or_cancelled', row.id);
        row.status = 'cancelled';
        cancelDependents(row.id);
      }
    }
  }
  cancelDependents(subtaskId);
}

export function sendMessage(
  sessionId: string,
  payload: { fromAgentId: string; toAgentId: string; content: string; subtaskId?: string }
): AgentMessage {
  const db = getDatabase();
  if (!db.prepare('SELECT id FROM collaboration_sessions WHERE id=?').get(sessionId)) {
    throw new AppError(404, 'Collaboration session not found.');
  }
  if (!payload.content || !payload.content.trim()) throw new AppError(400, 'content is required.');
  if (payload.content.length > 50000) throw new AppError(400, 'content must not exceed 50,000 characters.');
  if (!db.prepare('SELECT id FROM agents WHERE id=?').get(payload.fromAgentId)) {
    throw new AppError(404, `Agent ${payload.fromAgentId} not found.`);
  }
  if (!db.prepare('SELECT id FROM agents WHERE id=?').get(payload.toAgentId)) {
    throw new AppError(404, `Agent ${payload.toAgentId} not found.`);
  }
  const id = uuidv4();
  const sentAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO agent_messages (id, session_id, from_agent_id, to_agent_id, content, subtask_id, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, sessionId, payload.fromAgentId, payload.toAgentId, payload.content, payload.subtaskId ?? null, sentAt);
  return { id, sessionId, fromAgentId: payload.fromAgentId, toAgentId: payload.toAgentId, content: payload.content, subtaskId: payload.subtaskId ?? null, sentAt };
}

export function getMessages(sessionId: string): AgentMessage[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM agent_messages WHERE session_id=? ORDER BY sent_at ASC').all(sessionId) as MessageRow[];
  return rows.map(r => ({ id: r.id, sessionId: r.session_id, fromAgentId: r.from_agent_id, toAgentId: r.to_agent_id, content: r.content, subtaskId: r.subtask_id, sentAt: r.sent_at }));
}
