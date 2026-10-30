import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { getModelRegistry } from '../data/modelRegistry';
import {
  BenchmarkRecord, BenchmarkSummary, DataSource, ExecutionRecord
} from '../types/index';

interface BenchmarkRow {
  id: string; execution_id: string; model_name: string; duration_ms: number;
  tokens_per_second: number | null; tps_data_source: string;
  estimated_ram_mb: number | null; ram_data_source: string;
  success: number; recorded_at: string;
}

function rowToRecord(row: BenchmarkRow): BenchmarkRecord {
  return {
    id: row.id, executionId: row.execution_id, modelName: row.model_name,
    durationMs: row.duration_ms, tokensPerSecond: row.tokens_per_second,
    tpsDataSource: row.tps_data_source as DataSource,
    estimatedRamMB: row.estimated_ram_mb,
    ramDataSource: row.ram_data_source as DataSource,
    success: row.success === 1, recordedAt: row.recorded_at,
  };
}

export function recordFromExecution(exec: ExecutionRecord): BenchmarkRecord {
  const db = getDatabase();
  const registry = getModelRegistry();

  // Tokens per second
  let tokensPerSecond: number | null = null;
  let tpsDataSource: DataSource = 'unavailable';
  if (exec.evalTokens != null && exec.durationMs != null && exec.durationMs > 0) {
    tokensPerSecond = exec.evalTokens / (exec.durationMs / 1000);
    tpsDataSource = 'measured';
  }

  // Estimated RAM — use lowest quant variant from registry
  let estimatedRamMB: number | null = null;
  let ramDataSource: DataSource = 'unavailable';
  const model = registry.find(m =>
    m.name.toLowerCase() === exec.modelName.toLowerCase() ||
    exec.modelName.toLowerCase().includes(m.name.toLowerCase().split(' ')[0].toLowerCase())
  );
  if (model) {
    const minVariant = model.quantVariants.reduce((min, q) =>
      q.estimatedMemoryMB < min.estimatedMemoryMB ? q : min
    );
    estimatedRamMB = minVariant.estimatedMemoryMB + model.kvCacheMemoryMB;
    ramDataSource = 'estimated';
  }

  const id = uuidv4();
  const recordedAt = new Date().toISOString();
  const success = exec.status === 'completed';
  const durationMs = exec.durationMs ?? 0;

  db.prepare(`
    INSERT INTO benchmark_records
      (id, execution_id, model_name, duration_ms, tokens_per_second, tps_data_source,
       estimated_ram_mb, ram_data_source, success, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, exec.id, exec.modelName, durationMs, tokensPerSecond, tpsDataSource,
         estimatedRamMB, ramDataSource, success ? 1 : 0, recordedAt);

  return {
    id, executionId: exec.id, modelName: exec.modelName, durationMs,
    tokensPerSecond, tpsDataSource, estimatedRamMB, ramDataSource,
    success, recordedAt,
  };
}

export function getRecords(filter?: { modelName?: string; limit?: number }): BenchmarkRecord[] {
  const db = getDatabase();
  const limit = Math.min(200, Math.max(1, filter?.limit ?? 50));
  const params: (string | number)[] = [];
  let where = '';
  if (filter?.modelName) {
    where = 'WHERE model_name = ?';
    params.push(filter.modelName);
  }
  params.push(limit);
  const rows = db.prepare(`SELECT * FROM benchmark_records ${where} ORDER BY recorded_at DESC LIMIT ?`).all(...params) as BenchmarkRow[];
  return rows.map(rowToRecord);
}

export function getSummary(): BenchmarkSummary[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT model_name FROM benchmark_records').all() as Array<{ model_name: string }>;
  return rows.map(({ model_name }) => {
    const all = db.prepare('SELECT * FROM benchmark_records WHERE model_name = ?').all(model_name) as BenchmarkRow[];
    const total = all.length;
    const successes = all.filter(r => r.success === 1).length;
    const successRate = total > 0 ? successes / total : 0;

    // Duration — always available
    const avgDurationMs = total > 0
      ? Math.round(all.reduce((s, r) => s + r.duration_ms, 0) / total)
      : null;

    // TPS — only from measured rows
    const measuredTps = all.filter(r => r.tps_data_source === 'measured' && r.tokens_per_second != null);
    const avgTokensPerSecond = measuredTps.length > 0
      ? measuredTps.reduce((s, r) => s + (r.tokens_per_second ?? 0), 0) / measuredTps.length
      : null;

    // RAM — only from estimated rows
    const estimatedRam = all.filter(r => r.ram_data_source === 'estimated' && r.estimated_ram_mb != null);
    const avgEstimatedRamMB = estimatedRam.length > 0
      ? Math.round(estimatedRam.reduce((s, r) => s + (r.estimated_ram_mb ?? 0), 0) / estimatedRam.length)
      : null;

    return {
      modelName: model_name,
      executionCount: total, successRate,
      avgDurationMs, avgTokensPerSecond, avgEstimatedRamMB,
      durationDataSource: (total > 0 ? 'measured' : 'unavailable') as DataSource,
      tpsDataSource: (measuredTps.length > 0 ? 'measured' : 'unavailable') as DataSource,
      ramDataSource: (estimatedRam.length > 0 ? 'estimated' : 'unavailable') as DataSource,
    };
  });
}
