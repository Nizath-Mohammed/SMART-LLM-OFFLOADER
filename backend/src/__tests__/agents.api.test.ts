// Must be set before any imports so index.ts uses :memory: at module load
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import request from 'supertest';
import { app } from '../index';
import { initDatabase, resetDatabase } from '../db/database';

beforeEach(() => {
  resetDatabase();
  initDatabase(':memory:');
});

afterEach(() => {
  resetDatabase();
});

describe('POST /api/v1/agents', () => {
  it('creates an agent and returns 201 with id, name, status=idle', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Test Agent' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.name).toBe('Test Agent');
    expect(res.body.data.status).toBe('idle');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('returns 400 for name longer than 100 characters', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/agents', () => {
  it('returns 200 with an array of agents', async () => {
    const res = await request(app).get('/api/v1/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/agents/:id', () => {
  it('returns 200 with the agent after creation', async () => {
    const create = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Fetchable' });
    const id = create.body.data.id;

    const res = await request(app).get(`/api/v1/agents/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('returns 404 after deleting the agent', async () => {
    const create = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Temporary' });
    const id = create.body.data.id;

    await request(app).delete(`/api/v1/agents/${id}`);

    const res = await request(app).get(`/api/v1/agents/${id}`);
    expect(res.status).toBe(404);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});

describe('PATCH /api/v1/agents/:id/name', () => {
  it('returns 200 with the updated name', async () => {
    const create = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'OriginalName' });
    const id = create.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/agents/${id}/name`)
      .send({ name: 'UpdatedName' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('UpdatedName');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});

describe('PATCH /api/v1/agents/:id/system-prompt', () => {
  it('returns 200 with the updated systemPrompt', async () => {
    const create = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'PromptAgent' });
    const id = create.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/agents/${id}/system-prompt`)
      .send({ systemPrompt: 'You are a helpful assistant.' });
    expect(res.status).toBe(200);
    expect(res.body.data.systemPrompt).toBe('You are a helpful assistant.');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});

describe('DELETE /api/v1/agents/:id', () => {
  it('returns 200 after deletion', async () => {
    const create = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'ToDelete' });
    const id = create.body.data.id;

    const res = await request(app).delete(`/api/v1/agents/${id}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });
});
