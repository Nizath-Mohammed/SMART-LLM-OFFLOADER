process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import * as ollamaService from '../services/ollamaService';
import * as huggingFaceService from '../services/huggingFaceService';
import { AppError } from '../types/index';

jest.mock('../services/ollamaService');
jest.mock('../services/huggingFaceService');

describe('Runtime & HuggingFace API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/runtime/status', () => {
    it('returns 200 with available: true when Ollama is online', async () => {
      (ollamaService.checkOllamaStatus as jest.Mock).mockResolvedValue({
        available: true,
        version: '0.4.0',
        host: 'http://127.0.0.1:11434',
        message: 'Ollama is online and responsive',
      });

      const res = await request(app).get('/api/v1/runtime/status');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.version).toBe('0.4.0');
    });

    it('returns 200 with available: false when Ollama is offline', async () => {
      (ollamaService.checkOllamaStatus as jest.Mock).mockResolvedValue({
        available: false,
        host: 'http://127.0.0.1:11434',
        message: 'Ollama daemon is unreachable',
        error: 'ECONNREFUSED',
      });

      const res = await request(app).get('/api/v1/runtime/status');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.error).toBe('ECONNREFUSED');
    });
  });

  describe('GET /api/v1/runtime/models', () => {
    it('returns 200 with list of installed models', async () => {
      (ollamaService.listInstalledModels as jest.Mock).mockResolvedValue([
        {
          name: 'qwen2.5:0.5b',
          size: 397000000,
          parameter_size: '0.5B',
          quantization_level: 'Q4_K_M',
          modified_at: '2026-01-01T00:00:00Z',
        },
      ]);

      const res = await request(app).get('/api/v1/runtime/models');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('qwen2.5:0.5b');
    });

    it('returns 503 when Ollama runtime is unreachable', async () => {
      (ollamaService.listInstalledModels as jest.Mock).mockRejectedValue(
        new AppError(503, 'Ollama runtime unreachable')
      );

      const res = await request(app).get('/api/v1/runtime/models');
      expect(res.status).toBe(503);
      expect(res.body.message).toContain('Ollama runtime unreachable');
    });
  });

  describe('POST /api/v1/runtime/models/pull', () => {
    it('returns 400 if model name is missing or invalid', async () => {
      const res = await request(app).post('/api/v1/runtime/models/pull').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('model name is required');
    });

    it('returns 202 accepted with pull ID on success', async () => {
      (ollamaService.startPullModel as jest.Mock).mockResolvedValue({
        id: 'pull-12345',
        model: 'llama3.2:1b',
        status: 'downloading',
      });

      const res = await request(app)
        .post('/api/v1/runtime/models/pull')
        .send({ model: 'llama3.2:1b' });

      expect(res.status).toBe(202);
      expect(res.body.data.id).toBe('pull-12345');
      expect(res.body.data.model).toBe('llama3.2:1b');
    });
  });

  describe('GET /api/v1/runtime/models/pull/:id', () => {
    it('returns pull progress object for active pull', async () => {
      (ollamaService.getPullProgress as jest.Mock).mockReturnValue({
        id: 'pull-12345',
        model: 'llama3.2:1b',
        status: 'downloading',
        completed: 500000,
        total: 1000000,
        percent: 50,
      });

      const res = await request(app).get('/api/v1/runtime/models/pull/pull-12345');
      expect(res.status).toBe(200);
      expect(res.body.data.percent).toBe(50);
      expect(res.body.data.status).toBe('downloading');
    });

    it('returns 404 for unknown pull ID', async () => {
      (ollamaService.getPullProgress as jest.Mock).mockImplementation(() => {
        throw new AppError(404, 'Download job not found');
      });

      const res = await request(app).get('/api/v1/runtime/models/pull/unknown-id');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/runtime/models/:name', () => {
    it('deletes model and returns 200', async () => {
      (ollamaService.deleteModel as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete('/api/v1/runtime/models/qwen2.5:0.5b');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });
  });

  describe('GET /api/v1/huggingface/search', () => {
    it('returns search results matching query', async () => {
      (huggingFaceService.searchHuggingFaceModels as jest.Mock).mockResolvedValue([
        {
          id: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
          name: 'Llama-3.2-1B-Instruct-GGUF',
          author: 'bartowski',
          isGguf: true,
          isCompatible: true,
          isDownloadable: true,
          isInstalled: false,
          ollamaModelTag: 'llama3.2:1b',
        },
      ]);

      const res = await request(app).get('/api/v1/huggingface/search?q=llama');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('bartowski/Llama-3.2-1B-Instruct-GGUF');
    });
  });

  describe('GET /api/v1/huggingface/models/:id', () => {
    it('returns model details for valid repo', async () => {
      (huggingFaceService.getHuggingFaceModelDetails as jest.Mock).mockResolvedValue({
        id: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
        name: 'Llama-3.2-1B-Instruct-GGUF',
        isGguf: true,
        isCompatible: true,
      });

      const res = await request(app).get(
        '/api/v1/huggingface/models/bartowski/Llama-3.2-1B-Instruct-GGUF'
      );
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('bartowski/Llama-3.2-1B-Instruct-GGUF');
    });
  });
});
