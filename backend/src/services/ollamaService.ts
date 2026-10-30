import { v4 as uuidv4 } from 'uuid';
import {
  OllamaStatus,
  OllamaModel,
  PullProgress,
  AppError,
} from '../types/index';

export function getOllamaHost(): string {
  let host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }
  return host.replace(/\/+$/, '');
}

export interface InferenceResult {
  response: string;
  durationMs: number;
  promptTokens: number | null;
  evalTokens: number | null;
  totalTokens: number | null;
}

interface ActivePullRecord {
  progress: PullProgress;
  controller: AbortController;
}

const activePulls = new Map<string, ActivePullRecord>();

/**
 * Checks whether Ollama is reachable and returns its version.
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const host = getOllamaHost();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${host}/api/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      return {
        available: true,
        version: data.version || 'unknown',
        host,
        error: null,
      };
    }

    return {
      available: false,
      version: null,
      host,
      error: `Ollama returned HTTP status ${res.status}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      available: false,
      version: null,
      host,
      error: `Cannot reach Ollama at ${host}: ${msg}`,
    };
  }
}

/**
 * Lists all locally installed models confirmed by Ollama.
 */
export async function listInstalledModels(): Promise<OllamaModel[]> {
  const host = getOllamaHost();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${host}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new AppError(res.status, `Ollama error: HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        model: string;
        modified_at: string;
        size: number;
        digest: string;
        details?: {
          parent_model?: string;
          format?: string;
          family?: string;
          families?: string[];
          parameter_size?: string;
          quantization_level?: string;
          context_length?: number;
        };
      }>;
    };

    if (!data.models || !Array.isArray(data.models)) {
      return [];
    }

    return data.models.map((m) => ({
      name: m.name,
      model: m.model || m.name,
      modifiedAt: m.modified_at,
      size: m.size,
      digest: m.digest,
      details: {
        parentModel: m.details?.parent_model,
        format: m.details?.format || 'gguf',
        family: m.details?.family || 'unknown',
        families: m.details?.families || [],
        parameterSize: m.details?.parameter_size || 'unknown',
        quantizationLevel: m.details?.quantization_level || 'unknown',
        contextLength: m.details?.context_length,
      },
    }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(503, 'Ollama is unreachable. Please ensure the Ollama service is running.');
  }
}

/**
 * Deletes a local model from Ollama.
 */
export async function deleteModel(modelName: string): Promise<void> {
  const host = getOllamaHost();
  try {
    const res = await fetch(`${host}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
    });

    if (res.status === 404) {
      throw new AppError(404, `Model '${modelName}' not found in Ollama.`);
    }

    if (!res.ok) {
      throw new AppError(res.status, `Failed to delete model '${modelName}'.`);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(503, 'Ollama is unreachable.');
  }
}

/**
 * Initiates pulling a model through Ollama with streaming progress updates.
 */
export async function startPullModel(modelName: string): Promise<PullProgress> {
  const host = getOllamaHost();
  const id = uuidv4();
  const controller = new AbortController();

  const progress: PullProgress = {
    id,
    model: modelName,
    status: 'starting',
    percent: 0,
  };

  activePulls.set(id, { progress, controller });

  // Start asynchronous stream consumption
  (async () => {
    try {
      const res = await fetch(`${host}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        progress.status = 'failed';
        progress.errorMessage = `Ollama pull failed with HTTP status ${res.status}`;
        return;
      }

      if (!res.body) {
        progress.status = 'failed';
        progress.errorMessage = 'No response body stream received from Ollama.';
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as {
              status?: string;
              digest?: string;
              total?: number;
              completed?: number;
              error?: string;
            };

            if (data.error) {
              progress.status = 'failed';
              progress.errorMessage = data.error;
              return;
            }

            if (data.status) {
              if (data.status.toLowerCase().includes('verifying')) {
                progress.status = 'verifying';
              } else if (data.status.toLowerCase().includes('pulling')) {
                progress.status = 'pulling';
              } else if (data.status === 'success') {
                progress.status = 'completed';
                progress.percent = 100;
              }
            }

            if (data.digest) {
              progress.digest = data.digest;
            }

            if (typeof data.total === 'number' && typeof data.completed === 'number' && data.total > 0) {
              progress.total = data.total;
              progress.completed = data.completed;
              progress.percent = Math.min(100, Math.round((data.completed / data.total) * 100));
            }
          } catch {
            // Ignore single malformed NDJSON line
          }
        }
      }

      if (progress.status !== 'failed' && progress.status !== 'cancelled') {
        progress.status = 'completed';
        progress.percent = 100;
      }
    } catch (err) {
      if (controller.signal.aborted) {
        progress.status = 'cancelled';
        progress.errorMessage = 'Download was cancelled.';
      } else {
        progress.status = 'failed';
        progress.errorMessage = err instanceof Error ? err.message : String(err);
      }
    }
  })();

  return progress;
}

/**
 * Retrieves the download progress of an active or recent pull job.
 */
export function getPullProgress(pullId: string): PullProgress {
  const record = activePulls.get(pullId);
  if (!record) {
    throw new AppError(404, 'Download job not found.');
  }
  return record.progress;
}

/**
 * Cancels an ongoing pull job.
 */
export function cancelPull(pullId: string): PullProgress {
  const record = activePulls.get(pullId);
  if (!record) {
    throw new AppError(404, 'Download job not found.');
  }

  if (record.progress.status === 'pulling' || record.progress.status === 'starting' || record.progress.status === 'verifying') {
    record.controller.abort();
    record.progress.status = 'cancelled';
    record.progress.errorMessage = 'Download was cancelled by user.';
  }

  return record.progress;
}

/**
 * Runs real inference against the local Ollama instance using the given model and prompt.
 */
export async function executeInference(
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<InferenceResult> {
  const host = getOllamaHost();
  const startTime = Date.now();

  try {
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt || undefined,
        stream: false,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (res.status === 404) {
      throw new AppError(404, `Model '${model}' not found in Ollama runtime. Please install it first.`);
    }

    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const parsed = JSON.parse(errText) as { error?: string };
        if (parsed.error) parsedMsg = parsed.error;
      } catch {
        // use raw text
      }
      throw new AppError(res.status, `Ollama inference error: ${parsedMsg}`);
    }

    const data = (await res.json()) as {
      response?: string;
      total_duration?: number;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const finalDurationMs = typeof data.total_duration === 'number'
      ? Math.round(data.total_duration / 1e6)
      : durationMs;

    const promptTokens = typeof data.prompt_eval_count === 'number' ? data.prompt_eval_count : null;
    const evalTokens = typeof data.eval_count === 'number' ? data.eval_count : null;
    const totalTokens = promptTokens !== null && evalTokens !== null ? promptTokens + evalTokens : null;

    return {
      response: data.response || '',
      durationMs: finalDurationMs,
      promptTokens,
      evalTokens,
      totalTokens,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(503, `Inference failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
