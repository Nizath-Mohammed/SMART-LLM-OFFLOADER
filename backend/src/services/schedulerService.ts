import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { getHardwareInfo } from './hardwareDetector';
import { getModelRegistry } from '../data/modelRegistry';
import {
  ScheduledTask,
  QueuePriority,
  SchedulerConfig,
  AppError,
} from '../types/index';

export interface SubmitTaskPayload {
  modelName: string;
  priority?: QueuePriority;
  estimatedRamMB?: number;
}

const PRIORITY_WEIGHT: Record<QueuePriority, number> = {
  critical: 3, high: 2, normal: 1, low: 0,
};

let queue: ScheduledTask[] = [];
let config: SchedulerConfig = { ramBudgetMB: 6144, maxConcurrency: 1 };
let retryPending = false;

function compareTasks(a: ScheduledTask, b: ScheduledTask): number {
  const pd = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (pd !== 0) return pd;
  return a.submittedAt.localeCompare(b.submittedAt);
}

function resolveRamEstimate(modelName: string): number {
  const registry = getModelRegistry();
  const model = registry.find(
    m =>
      m.name.toLowerCase() === modelName.toLowerCase() ||
      m.name.toLowerCase().includes(modelName.toLowerCase().split(':')[0])
  );
  if (model) {
    const minVariant = model.quantVariants.reduce((min, q) =>
      q.estimatedMemoryMB < min.estimatedMemoryMB ? q : min
    );
    return minVariant.estimatedMemoryMB + model.kvCacheMemoryMB;
  }
  return 2048;
}

function getRunningRamMB(): number {
  return queue
    .filter(t => t.status === 'running')
    .reduce((sum, t) => sum + t.estimatedRamMB, 0);
}

function getRunningCount(): number {
  return queue.filter(t => t.status === 'running').length;
}

function persistTask(task: ScheduledTask): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO scheduled_tasks
      (id, priority, status, model_name, estimated_ram_mb, submitted_at,
       started_at, completed_at, execution_id, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id, task.priority, task.status, task.modelName, task.estimatedRamMB,
    task.submittedAt, task.startedAt, task.completedAt,
    task.executionId, task.errorMessage
  );
}

function scheduleRetry(): void {
  if (retryPending) return;
  retryPending = true;
  setTimeout(() => {
    retryPending = false;
    void recheckQueue();
  }, 5000);
}

async function recheckQueue(): Promise<void> {
  const waiting = queue
    .filter(t => t.status === 'queued')
    .sort(compareTasks);

  let anyPromoted = false;
  const hwInfo = getHardwareInfo();
  const availableRam = hwInfo.availableRamMB.value ?? 0;

  for (const candidate of waiting) {
    if (getRunningCount() >= config.maxConcurrency) break;
    const projectedRam = getRunningRamMB() + candidate.estimatedRamMB;
    if (projectedRam > config.ramBudgetMB) continue;
    if (projectedRam > availableRam) continue;
    candidate.status = 'running';
    candidate.startedAt = new Date().toISOString();
    persistTask(candidate);
    anyPromoted = true;
  }

  if (!anyPromoted && waiting.length > 0) {
    scheduleRetry();
  }
}

export async function initScheduler(): Promise<void> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM scheduler_config WHERE id = 1').get() as
    | { ram_budget_mb: number; max_concurrency: number }
    | undefined;

  if (row) {
    config = { ramBudgetMB: row.ram_budget_mb, maxConcurrency: row.max_concurrency };
  } else {
    db.prepare(
      'INSERT INTO scheduler_config (id, ram_budget_mb, max_concurrency, updated_at) VALUES (1, 6144, 1, ?)'
    ).run(new Date().toISOString());
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE scheduled_tasks SET status='failed', error_message='interrupted_by_restart', completed_at=?
     WHERE status='running'`
  ).run(now);
  db.prepare(
    `UPDATE scheduled_tasks SET status='cancelled', error_message='cancelled_by_restart', completed_at=?
     WHERE status='queued'`
  ).run(now);

  queue = [];
}

export function submitTask(payload: SubmitTaskPayload): ScheduledTask {
  const estimatedRamMB = payload.estimatedRamMB ?? resolveRamEstimate(payload.modelName);
  const priority: QueuePriority = payload.priority ?? 'normal';
  const now = new Date().toISOString();

  const task: ScheduledTask = {
    id: uuidv4(),
    priority,
    status: 'queued',
    modelName: payload.modelName,
    estimatedRamMB,
    submittedAt: now,
    startedAt: null,
    completedAt: null,
    executionId: null,
    errorMessage: null,
  };

  const canRunNow =
    getRunningCount() < config.maxConcurrency &&
    getRunningRamMB() + estimatedRamMB <= config.ramBudgetMB;

  if (canRunNow) {
    task.status = 'running';
    task.startedAt = now;
  }

  queue.push(task);
  queue.sort(compareTasks);
  persistTask(task);
  return task;
}

export function completeTask(taskId: string, executionId?: string): void {
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (executionId) task.executionId = executionId;
    persistTask(task);
    queue = queue.filter(t => t.id !== taskId);
  }
  void recheckQueue();
}

export function failTask(taskId: string, errorMessage: string): void {
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = 'failed';
    task.completedAt = new Date().toISOString();
    task.errorMessage = errorMessage;
    persistTask(task);
    queue = queue.filter(t => t.id !== taskId);
  }
  void recheckQueue();
}

export function cancelTask(taskId: string): ScheduledTask {
  const task = queue.find(t => t.id === taskId);
  if (!task) throw new AppError(404, 'Scheduled task not found.');
  if (task.status === 'running') {
    throw new AppError(409, 'Running tasks cannot be cancelled via this endpoint.');
  }
  if (task.status !== 'queued') {
    throw new AppError(409, 'Task is already in terminal status.');
  }
  task.status = 'cancelled';
  task.completedAt = new Date().toISOString();
  task.errorMessage = 'cancelled_by_user';
  persistTask(task);
  queue = queue.filter(t => t.id !== taskId);
  void recheckQueue();
  return task;
}

export function getQueue(): ScheduledTask[] {
  return queue.filter(t => t.status === 'queued' || t.status === 'running');
}

export function getConfig(): SchedulerConfig {
  return { ...config };
}

export function updateConfig(patch: Partial<SchedulerConfig>): SchedulerConfig {
  if (patch.ramBudgetMB !== undefined) {
    if (patch.ramBudgetMB < 512) throw new AppError(400, 'ramBudgetMB must be at least 512 MB.');
    config.ramBudgetMB = patch.ramBudgetMB;
  }
  if (patch.maxConcurrency !== undefined) {
    if (patch.maxConcurrency < 1) throw new AppError(400, 'maxConcurrency must be at least 1.');
    config.maxConcurrency = patch.maxConcurrency;
  }
  const db = getDatabase();
  db.prepare(
    `INSERT INTO scheduler_config (id, ram_budget_mb, max_concurrency, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET ram_budget_mb=excluded.ram_budget_mb,
       max_concurrency=excluded.max_concurrency, updated_at=excluded.updated_at`
  ).run(config.ramBudgetMB, config.maxConcurrency, new Date().toISOString());
  void recheckQueue();
  return getConfig();
}
