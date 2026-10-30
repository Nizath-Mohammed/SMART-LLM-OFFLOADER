process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import { initDatabase, resetDatabase } from '../db/database';
import * as hardwareDetector from '../services/hardwareDetector';
import { HardwareInfo } from '../types/index';

const mockHardware: HardwareInfo = {
  totalRamMB: { value: 8192, source: 'measured' },
  availableRamMB: { value: 6144, source: 'measured' },
  cpuModel: { value: 'Intel(R) Core(TM) i3', source: 'measured' },
  logicalCores: { value: 8, source: 'measured' },
  osName: { value: 'Windows_NT', source: 'measured' },
  osVersion: { value: '10.0.22631', source: 'measured' },
  gpuName: { value: null, source: 'unavailable' },
  gpuVramMB: { value: null, source: 'unavailable' },
};

beforeEach(() => {
  resetDatabase();
  initDatabase(':memory:');
  jest.spyOn(hardwareDetector, 'getHardwareInfo').mockReturnValue(mockHardware);
});

afterEach(() => {
  resetDatabase();
  jest.restoreAllMocks();
});

describe('GET /api/v1/hardware', () => {
  it('returns 200 with valid HardwareInfo shape', async () => {
    const res = await request(app).get('/api/v1/hardware');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hardware info retrieved successfully.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalRamMB.value).toBe(8192);
    expect(res.body.data.availableRamMB.value).toBe(6144);
    expect(res.body.data.cpuModel.value).toBe('Intel(R) Core(TM) i3');
  });
});

describe('GET /api/v1/models', () => {
  it('returns 200 with model array with ≥ 1 entry', async () => {
    const res = await request(app).get('/api/v1/models');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Model registry retrieved successfully.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(14);
    expect(res.body.data[0].name).toBeDefined();
    expect(res.body.data[0].quantVariants.length).toBeGreaterThanOrEqual(2);
  });
});

describe('POST /api/v1/recommendations', () => {
  it('returns 201 with all Recommendation fields present on valid prompt', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'Write a Python function to parse JSON.' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Recommendation created successfully.');
    const rec = res.body.data;
    expect(rec.id).toBeDefined();
    expect(rec.taskCategory).toBe('coding');
    expect(rec.taskComplexity).toBeDefined();
    expect(rec.recommendedModel).toBeDefined();
    expect(rec.recommendedQuantization).toBeDefined();
    expect(rec.estimatedMemoryMB).toBeGreaterThan(0);
    expect(rec.recommendedContextLength).toBeGreaterThan(0);
    expect(rec.executionStrategy).toBeDefined();
    expect(Array.isArray(rec.compatibilityWarnings)).toBe(true);
    expect(typeof rec.explanation).toBe('string');
    expect(['high', 'medium', 'low']).toContain(rec.confidenceLevel);
    expect(rec.prompt).toBe('Write a Python function to parse JSON.');
    expect(rec.agentId).toBeNull();
    expect(rec.createdAt).toBeDefined();
  });

  it('associates valid agentId with recommendation', async () => {
    const agentRes = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Coder Agent' });
    const agentId = agentRes.body.data.id;

    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'Write a Python function.', agentId });

    expect(res.status).toBe(201);
    expect(res.body.data.agentId).toBe(agentId);
  });

  it('returns 400 when prompt is missing', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('The prompt field is required.');
  });

  it('returns 400 when prompt is empty or whitespace-only', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Prompt must not be empty.');
  });

  it('returns 400 when prompt exceeds 10,000 characters', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'x'.repeat(10001) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Prompt must not exceed 10,000 characters.');
  });

  it('returns 400 when agentId format is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'Valid prompt', agentId: 'invalid-uuid-123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('agentId must be a valid UUID.');
  });

  it('returns 404 when valid UUID agentId references non-existent agent', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'Valid prompt', agentId: '12345678-1234-1234-1234-123456789abc' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Agent not found.');
  });
});

describe('GET /api/v1/recommendations/:id', () => {
  it('returns 200 with stored Recommendation for valid ID', async () => {
    const postRes = await request(app)
      .post('/api/v1/recommendations')
      .send({ prompt: 'Summarize the text.' });
    const recId = postRes.body.data.id;

    const res = await request(app).get(`/api/v1/recommendations/${recId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Recommendation retrieved successfully.');
    expect(res.body.data.id).toBe(recId);
    expect(res.body.data.prompt).toBe('Summarize the text.');
    expect(res.body.data.taskCategory).toBe('summarization');
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request(app).get('/api/v1/recommendations/unknown-id-123');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Recommendation not found.');
  });
});
