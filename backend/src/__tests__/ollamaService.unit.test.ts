import {
  checkOllamaStatus,
  listInstalledModels,
  deleteModel,
  startPullModel,
  getPullProgress,
  cancelPull,
  executeInference,
} from '../services/ollamaService';
import { AppError } from '../types/index';

describe('ollamaService unit tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('checkOllamaStatus', () => {
    it('returns available: true and version when Ollama responds', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.40.12' }),
      } as Response);

      const status = await checkOllamaStatus();
      expect(status.available).toBe(true);
      expect(status.version).toBe('0.40.12');
      expect(status.error).toBeNull();
    });

    it('returns available: false when connection fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const status = await checkOllamaStatus();
      expect(status.available).toBe(false);
      expect(status.version).toBeNull();
      expect(status.error).toContain('Connection refused');
    });
  });

  describe('listInstalledModels', () => {
    it('returns formatted list of models', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'llama3.2:1b',
              model: 'llama3.2:1b',
              modified_at: '2026-09-12T00:30:08Z',
              size: 1321098329,
              digest: 'baf6a787',
              details: {
                format: 'gguf',
                family: 'llama',
                parameter_size: '1.2B',
                quantization_level: 'Q8_0',
              },
            },
          ],
        }),
      } as Response);

      const models = await listInstalledModels();
      expect(models.length).toBe(1);
      expect(models[0].name).toBe('llama3.2:1b');
      expect(models[0].details.parameterSize).toBe('1.2B');
      expect(models[0].details.quantizationLevel).toBe('Q8_0');
    });

    it('throws AppError(503) when Ollama fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      await expect(listInstalledModels()).rejects.toThrow(AppError);
    });
  });

  describe('deleteModel', () => {
    it('deletes model successfully on 200', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await expect(deleteModel('qwen2.5:0.5b')).resolves.toBeUndefined();
    });

    it('throws AppError(404) when model is not found in runtime', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(deleteModel('non-existent:model')).rejects.toThrow(AppError);
    });
  });

  describe('pullModel and progress', () => {
    it('starts pull and creates tracking entry', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  JSON.stringify({ status: 'pulling manifest', completed: 50, total: 100 }) + '\n'
                ),
              })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      } as unknown as Response);

      const progress = await startPullModel('tinyllama');
      expect(progress.id).toBeDefined();
      expect(progress.model).toBe('tinyllama');

      const fetched = getPullProgress(progress.id);
      expect(fetched.id).toBe(progress.id);

      const cancelled = cancelPull(progress.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('throws AppError(404) when checking non-existent pull', () => {
      expect(() => getPullProgress('invalid-id')).toThrow(AppError);
    });
  });

  describe('executeInference', () => {
    it('executes inference and parses response with token metrics', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: 'Hello world!',
          total_duration: 150000000, // 150ms
          prompt_eval_count: 5,
          eval_count: 10,
        }),
      } as Response);

      const result = await executeInference('qwen2.5:0.5b', 'Hi');
      expect(result.response).toBe('Hello world!');
      expect(result.durationMs).toBe(150);
      expect(result.promptTokens).toBe(5);
      expect(result.evalTokens).toBe(10);
      expect(result.totalTokens).toBe(15);
    });

    it('throws AppError(404) if model is not installed', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'model not found',
      } as Response);

      await expect(executeInference('missing:model', 'Hello')).rejects.toThrow(AppError);
    });
  });
});
