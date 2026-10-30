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

/** Helper: create an agent and return its id */
async function createAgent(name = 'Task Agent'): Promise<string> {
  const res = await request(app)
    .post('/api/v1/agents')
    .send({ name });
  return res.body.data.id as string;
}

describe('POST /api/v1/agents/:agentId/tasks', () => {
  it('returns 201 with task data when prompt is valid', async () => {
    const agentId = await createAgent();
    const res = await request(app)
      .post(`/api/v1/agents/${agentId}/tasks`)
      .send({ prompt: 'Hello, world!' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.agentId).toBe(agentId);
    expect(res.body.data.prompt).toBe('Hello, world!');
    expect(res.body.data.status).toBe('pending');
  });

  it('returns 404 for a nonexistent agentId', async () => {
    const res = await request(app)
      .post('/api/v1/agents/nonexistent-agent/tasks')
      .send({ prompt: 'Some task' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an empty prompt', async () => {
    const agentId = await createAgent();
    const res = await request(app)
      .post(`/api/v1/agents/${agentId}/tasks`)
      .send({ prompt: '' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when agent already has a pending task', async () => {
    const agentId = await createAgent();
    await request(app)
      .post(`/api/v1/agents/${agentId}/tasks`)
      .send({ prompt: 'First task' });

    const res = await request(app)
      .post(`/api/v1/agents/${agentId}/tasks`)
      .send({ prompt: 'Second task' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/agents/:agentId/tasks', () => {
  it('returns 200 with an array containing the created task', async () => {
    const agentId = await createAgent();
    await request(app)
      .post(`/api/v1/agents/${agentId}/tasks`)
      .send({ prompt: 'A task' });

    const res = await request(app).get(`/api/v1/agents/${agentId}/tasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].prompt).toBe('A task');
  });

  it('returns 200 with an empty array for a new agent with no tasks', async () => {
    const agentId = await createAgent('Fresh Agent');
    const res = await request(app).get(`/api/v1/agents/${agentId}/tasks`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});
