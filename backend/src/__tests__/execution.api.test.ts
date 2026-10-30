process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import { initDatabase, resetDatabase } from '../db/database';
import * as ollamaService from '../services/ollamaService';
import { createAgent } from '../services/agentService';
import { createTask } from '../services/taskService';
import { AppError } from '../types/index';

jest.mock('../services/ollamaService');

describe('Executions API Routes', () => {
  beforeEach(() => {
    resetDatabase();
    initDatabase(':memory:');
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetDatabase();
  });

  describe('POST /api/v1/executions', () => {
    it('returns 400 when prompt is missing', async () => {
      const res = await request(app)
        .post('/api/v1/executions')
        .send({ model: 'qwen2.5:0.5b' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('prompt is required');
    });

    it('returns 400 when model is missing', async () => {
      const res = await request(app)
        .post('/api/v1/executions')
        .send({ prompt: 'Hello world' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('modelName is required');
    });

    it('successfully executes a task and saves execution record', async () => {
      const agent = createAgent({ name: 'Execution Agent' });
      const task = createTask(agent.id, {
        prompt: 'Write a python script',
      });

      (ollamaService.executeInference as jest.Mock).mockResolvedValue({
        response: 'Here is the python script...',
        durationMs: 1200,
        promptTokens: 24,
        evalTokens: 56,
        totalTokens: 80,
        tokensPerSecond: 46.7,
      });

      const res = await request(app)
        .post('/api/v1/executions')
        .send({
          agentId: agent.id,
          taskId: task.id,
          modelName: 'qwen2.5:0.5b',
          prompt: 'Write a python script',
          systemPrompt: 'You are an expert coder',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.response).toContain('Here is the python script');
      expect(res.body.data.durationMs).toBe(1200);
      expect(res.body.data.promptTokens).toBe(24);
      expect(res.body.data.evalTokens).toBe(56);
      expect(res.body.data.totalTokens).toBe(80);
    });

    it('records failed status when inference fails', async () => {
      (ollamaService.executeInference as jest.Mock).mockRejectedValue(
        new AppError(500, 'GPU memory allocation failed')
      );

      const res = await request(app)
        .post('/api/v1/executions')
        .send({
          modelName: 'qwen2.5:0.5b',
          prompt: 'Large calculation',
        });

      // The execution route creates the failed record and rethrows the AppError
      expect(res.status).toBe(500);
      expect(res.body.message).toContain('GPU memory allocation failed');

      // Check that the failed execution is saved in database history
      const historyRes = await request(app).get('/api/v1/executions');
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data).toHaveLength(1);
      expect(historyRes.body.data[0].status).toBe('failed');
      expect(historyRes.body.data[0].errorMessage).toContain('GPU memory allocation failed');
    });
  });

  describe('GET /api/v1/executions', () => {
    it('returns empty array initially', async () => {
      const res = await request(app).get('/api/v1/executions');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('filters executions by agentId and status', async () => {
      const agent = createAgent({ name: 'Agent A' });
      (ollamaService.executeInference as jest.Mock).mockResolvedValue({
        response: 'Done',
        durationMs: 500,
        promptTokens: 10,
        evalTokens: 10,
        totalTokens: 20,
        tokensPerSecond: 20,
      });

      await request(app)
        .post('/api/v1/executions')
        .send({ agentId: agent.id, modelName: 'llama3.2:1b', prompt: 'test' });

      const filtered = await request(app).get(`/api/v1/executions?agentId=${agent.id}`);
      expect(filtered.status).toBe(200);
      expect(filtered.body.data).toHaveLength(1);
      expect(filtered.body.data[0].agentId).toBe(agent.id);

      const emptyFilter = await request(app).get('/api/v1/executions?agentId=nonexistent');
      expect(emptyFilter.status).toBe(200);
      expect(emptyFilter.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('returns execution details by ID', async () => {
      (ollamaService.executeInference as jest.Mock).mockResolvedValue({
        response: 'Output text',
        durationMs: 800,
        promptTokens: 15,
        evalTokens: 25,
        totalTokens: 40,
        tokensPerSecond: 31.2,
      });

      const createRes = await request(app)
        .post('/api/v1/executions')
        .send({ modelName: 'tinyllama:latest', prompt: 'Summarize this' });

      expect(createRes.status).toBe(201);
      const execId = createRes.body.data.id;
      const getRes = await request(app).get(`/api/v1/executions/${execId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(execId);
      expect(getRes.body.data.response).toBe('Output text');
    });

    it('returns 404 for unknown execution ID', async () => {
      const res = await request(app).get('/api/v1/executions/unknown-exec-id');
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });
});
