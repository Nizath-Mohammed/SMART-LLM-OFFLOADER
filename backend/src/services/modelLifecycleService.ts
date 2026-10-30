import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { getOllamaHost } from './ollamaService';
import {
  ModelLifecycleEntry, LifecycleEvent, LifecycleEventType, LifecycleConfig, AppError
} from '../types/index';
import { getModelRegistry } from '../data/modelRegistry';

// In-memory caches
let loadedModels = new Set<string>();
let lastUsedCache = new Map<string, string>(); // modelName → ISO-8601
let lifecycleConfig: LifecycleConfig = { autoUnloadEnabled: false, idleTimeoutSeconds: 300 };
let pollInterval: NodeJS.Timeout | null = null;

// Import scheduler queue accessor lazily to avoid circular dependency
let getSchedulerQueueFn: (() => Array<{ modelName: string; status: string }>) | null = null;
export function setSchedulerQueueAccessor(fn: () => Array<{ modelName: string; status: string }>): void {
  getSchedulerQueueFn = fn;
}

function isModelInActiveUse(modelName: string): boolean {
  if (!getSchedulerQueueFn) return false;
  return getSchedulerQueueFn().some(
    t => t.status === 'running' && t.modelName.toLowerCase() === modelName.toLowerCase()
  );
}

function emitEvent(modelName: string, eventType: LifecycleEventType, reason: string): LifecycleEvent {
  const db = getDatabase();
  const event: LifecycleEvent = {
    id: uuidv4(),
    modelName,
    eventType,
    reason,
    occurredAt: new Date().toISOString(),
  };
  db.prepare(
    'INSERT INTO model_lifecycle_events (id, model_name, event_type, reason, occurred_at) VALUES (?, ?, ?, ?, ?)'
  ).run(event.id, event.modelName, event.eventType, event.reason, event.occurredAt);
  return event;
}

async function pollOllamaTags(): Promise<void> {
  const host = getOllamaHost();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return;
    const data = await res.json() as { models?: Array<{ name: string }> };
    const currentNames = new Set((data.models ?? []).map(m => m.name));

    // Detect newly loaded
    for (const name of currentNames) {
      if (!loadedModels.has(name)) {
        loadedModels.add(name);
        emitEvent(name, 'loaded', 'detected_in_ollama_tags');
      }
    }
    // Detect unloaded
    for (const name of loadedModels) {
      if (!currentNames.has(name)) {
        loadedModels.delete(name);
        emitEvent(name, 'unloaded', 'no_longer_in_ollama_tags');
      }
    }

    // Auto-unload check
    if (lifecycleConfig.autoUnloadEnabled) {
      const now = Date.now();
      for (const name of [...loadedModels]) {
        const lastUsed = lastUsedCache.get(name);
        if (!lastUsed) continue; // never used — skip per Requirement 6.6
        const idleMs = now - new Date(lastUsed).getTime();
        if (idleMs > lifecycleConfig.idleTimeoutSeconds * 1000 && !isModelInActiveUse(name)) {
          await performUnload(name, 'auto_unloaded', 'idle_timeout_exceeded');
        }
      }
    }
  } catch {
    // Silently skip failed poll cycles
  }
}

async function performUnload(modelName: string, eventType: LifecycleEventType, reason: string): Promise<void> {
  const host = getOllamaHost();
  const res = await fetch(`${host}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName }),
  });
  if (res.status === 404) throw new AppError(404, `Model '${modelName}' not found in Ollama.`);
  if (!res.ok) throw new AppError(500, `Ollama unload request failed for model '${modelName}'.`);
  loadedModels.delete(modelName);
  emitEvent(modelName, eventType, reason);
}

export function initModelLifecycle(): void {
  const db = getDatabase();

  // Load lifecycle config
  const row = db.prepare('SELECT * FROM lifecycle_config WHERE id = 1').get() as
    | { auto_unload_enabled: number; idle_timeout_seconds: number } | undefined;
  if (row) {
    lifecycleConfig = {
      autoUnloadEnabled: row.auto_unload_enabled === 1,
      idleTimeoutSeconds: row.idle_timeout_seconds,
    };
  } else {
    db.prepare(
      'INSERT INTO lifecycle_config (id, auto_unload_enabled, idle_timeout_seconds, updated_at) VALUES (1, 0, 300, ?)'
    ).run(new Date().toISOString());
  }

  // Load last-used cache from DB
  const rows = db.prepare('SELECT model_name, last_used_at FROM model_last_used').all() as
    Array<{ model_name: string; last_used_at: string }>;
  for (const r of rows) {
    lastUsedCache.set(r.model_name, r.last_used_at);
  }

  // Start polling
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => { void pollOllamaTags(); }, 30_000);
  // Initial poll
  void pollOllamaTags();
}

export function updateLastUsed(modelName: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO model_last_used (model_name, last_used_at) VALUES (?, ?)
     ON CONFLICT(model_name) DO UPDATE SET last_used_at = excluded.last_used_at`
  ).run(modelName, now);
  lastUsedCache.set(modelName, now);
}

export async function explicitUnload(modelName: string): Promise<void> {
  if (isModelInActiveUse(modelName)) {
    emitEvent(modelName, 'unload_blocked', 'model_in_active_use');
    throw new AppError(409, `Model '${modelName}' is currently in active use by a running task.`);
  }
  await performUnload(modelName, 'unloaded', 'explicit_unload');
}

export function getLifecycleEntries(): ModelLifecycleEntry[] {
  const registry = getModelRegistry();
  const db = getDatabase();
  const lastUsedRows = db.prepare('SELECT model_name, last_used_at FROM model_last_used').all() as
    Array<{ model_name: string; last_used_at: string }>;
  const lastUsedMap = new Map(lastUsedRows.map(r => [r.model_name, r.last_used_at]));

  // Union of loaded models and registry models
  const allNames = new Set([...loadedModels, ...registry.map(m => m.name)]);
  return [...allNames].map(name => {
    const regEntry = registry.find(m => m.name === name);
    const estRam = regEntry
      ? regEntry.quantVariants.reduce((min, q) => Math.min(min, q.estimatedMemoryMB), Infinity) + regEntry.kvCacheMemoryMB
      : null;
    return {
      modelName: name,
      lastUsedAt: lastUsedMap.get(name) ?? null,
      isLoaded: loadedModels.has(name),
      estimatedRamMB: estRam === Infinity ? null : estRam,
    };
  });
}

export function getRecentEvents(limit = 100): LifecycleEvent[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM model_lifecycle_events ORDER BY occurred_at DESC LIMIT ?'
  ).all(limit) as Array<{
    id: string; model_name: string; event_type: string; reason: string; occurred_at: string;
  }>;
  return rows.map(r => ({
    id: r.id, modelName: r.model_name,
    eventType: r.event_type as LifecycleEventType,
    reason: r.reason, occurredAt: r.occurred_at,
  }));
}

export function getLifecycleConfig(): LifecycleConfig {
  return { ...lifecycleConfig };
}

export function updateLifecycleConfig(patch: Partial<LifecycleConfig>): LifecycleConfig {
  if (patch.idleTimeoutSeconds !== undefined) {
    if (patch.idleTimeoutSeconds < 60) {
      throw new AppError(400, 'idleTimeoutSeconds must be at least 60.');
    }
    lifecycleConfig.idleTimeoutSeconds = patch.idleTimeoutSeconds;
  }
  if (patch.autoUnloadEnabled !== undefined) {
    lifecycleConfig.autoUnloadEnabled = patch.autoUnloadEnabled;
  }
  const db = getDatabase();
  db.prepare(
    `INSERT INTO lifecycle_config (id, auto_unload_enabled, idle_timeout_seconds, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET auto_unload_enabled=excluded.auto_unload_enabled,
       idle_timeout_seconds=excluded.idle_timeout_seconds, updated_at=excluded.updated_at`
  ).run(
    lifecycleConfig.autoUnloadEnabled ? 1 : 0,
    lifecycleConfig.idleTimeoutSeconds,
    new Date().toISOString()
  );
  return getLifecycleConfig();
}

export function stopPolling(): void {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}
