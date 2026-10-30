export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  modelRef: string | null;
  status: 'idle' | 'running' | 'error';
  createdAt: string;
}

export interface Task {
  id: string;
  agentId: string;
  prompt: string;
  response: string | null;
  errorMessage: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ── VS2 Decision Engine Types ─────────────────────────────────────────────────

export type MetricSource = 'measured' | 'estimated' | 'unavailable';

export interface HardwareMetric<T> {
  value: T | null;
  source: MetricSource;
}

export interface HardwareInfo {
  totalRamMB:     HardwareMetric<number>;
  availableRamMB: HardwareMetric<number>;
  cpuModel:       HardwareMetric<string>;
  logicalCores:   HardwareMetric<number>;
  osName:         HardwareMetric<string>;
  osVersion:      HardwareMetric<string>;
  gpuName:        HardwareMetric<string>;
  gpuVramMB:      HardwareMetric<number>;
}

export type TaskCategory =
  | 'coding'
  | 'data_analysis'
  | 'reasoning'
  | 'summarization'
  | 'research'
  | 'general_conversation';

export type TaskComplexity = 'low' | 'medium' | 'high';

export type ExecutionStrategy =
  | 'normal_local'
  | 'reduced_context'
  | 'model_unload_after_use'
  | 'sequential_agents'
  | 'cpu_only';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface QuantVariant {
  name: string;
  estimatedMemoryMB: number;
}

export interface ModelRecord {
  name: string;
  huggingFaceRepo: string;
  parametersBillions: number;
  format: 'GGUF';
  quantVariants: QuantVariant[];
  maxContextLength: number;
  kvCacheMemoryMB: number;
  runtime: 'ollama';
  license: string;
}

export interface Recommendation {
  id: string;
  taskCategory: TaskCategory;
  taskComplexity: TaskComplexity;
  recommendedModel: string;
  recommendedQuantization: string | null;
  estimatedMemoryMB: number;
  recommendedContextLength: number;
  executionStrategy: ExecutionStrategy;
  compatibilityWarnings: string[];
  explanation: string;
  confidenceLevel: ConfidenceLevel;
  prompt: string;
  agentId: string | null;
  createdAt: string;
}

// ── VS3 Model Manager & Local Execution Types ────────────────────────────────

export interface OllamaModelDetails {
  parentModel?: string;
  format: string;
  family: string;
  families?: string[];
  parameterSize: string;
  quantizationLevel: string;
  contextLength?: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  modifiedAt: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export interface OllamaStatus {
  available: boolean;
  version: string | null;
  host: string;
  error: string | null;
}

export interface PullProgress {
  id: string;
  model: string;
  status: 'starting' | 'pulling' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
  errorMessage?: string;
}

export interface HuggingFaceModel {
  id: string;
  name: string;
  author: string;
  description?: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipelineTag?: string;
  license?: string;
  isGguf: boolean;
  isCompatible: boolean;
  isDownloadable: boolean;
  isInstalled: boolean;
  compatibilityReason: string;
  ollamaModelTag?: string;
}

export interface ExecutionRecord {
  id: string;
  agentId: string | null;
  taskId: string | null;
  modelName: string;
  prompt: string;
  systemPrompt: string | null;
  response: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage: string | null;
  durationMs: number | null;
  promptTokens: number | null;
  evalTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateExecutionPayload {
  modelName: string;
  prompt: string;
  agentId?: string;
  taskId?: string;
  systemPrompt?: string;
}


// ── VS4 Edge Optimization Types ───────────────────────────────────────────────

export type QueuePriority = 'low' | 'normal' | 'high' | 'critical';
export type ScheduledTaskStatus = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface ScheduledTask {
  id: string;
  priority: QueuePriority;
  status: ScheduledTaskStatus;
  modelName: string;
  estimatedRamMB: number;
  submittedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  executionId: string | null;
  errorMessage: string | null;
}

export interface SchedulerConfig {
  ramBudgetMB: number;
  maxConcurrency: number;
}

export type LifecycleEventType = 'loaded' | 'unloaded' | 'auto_unloaded' | 'unload_blocked';

export interface LifecycleEvent {
  id: string;
  modelName: string;
  eventType: LifecycleEventType;
  reason: string;
  occurredAt: string;
}

export interface ModelLifecycleEntry {
  modelName: string;
  lastUsedAt: string | null;
  isLoaded: boolean;
  estimatedRamMB: number | null;
}

export interface LifecycleConfig {
  autoUnloadEnabled: boolean;
  idleTimeoutSeconds: number;
}

export type CollaborationStatus = 'active' | 'completed' | 'failed';

export interface CollaborationSession {
  id: string;
  title: string;
  parentAgentId: string;
  status: CollaborationStatus;
  createdAt: string;
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  sessionId: string;
  agentId: string;
  prompt: string;
  status: ScheduledTaskStatus;
  depth: number;
  dependsOn: string[];
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  subtaskId: string | null;
  sentAt: string;
}

export type DataSource = 'measured' | 'estimated' | 'unavailable';

export interface BenchmarkRecord {
  id: string;
  executionId: string;
  modelName: string;
  durationMs: number;
  tokensPerSecond: number | null;
  tpsDataSource: DataSource;
  estimatedRamMB: number | null;
  ramDataSource: DataSource;
  success: boolean;
  recordedAt: string;
}

export interface BenchmarkSummary {
  modelName: string;
  executionCount: number;
  successRate: number;
  avgDurationMs: number | null;
  avgTokensPerSecond: number | null;
  avgEstimatedRamMB: number | null;
  durationDataSource: DataSource;
  tpsDataSource: DataSource;
  ramDataSource: DataSource;
}

export interface KvCacheEstimate {
  modelName: string;
  contextLength: number;
  kvCacheEstimateMB: number;
  dataSource: DataSource;
  maxContextLength: number;
  budgetWarning: string | null;
}

export interface AirllmStatus {
  feasible: boolean;
  compatibleWithOllama: boolean;
  limitations: string[];
  proofOfConceptAvailable: boolean;
  notes: string;
}
