import { initDatabase, resetDatabase } from '../db/database';
import { createAgent } from '../services/agentService';
import { createTask, listTasksForAgent, transitionTaskStatus } from '../services/taskService';
import { AppError } from '../types/index';

beforeEach(() => {
  resetDatabase();
  initDatabase(':memory:');
});

afterEach(() => {
  resetDatabase();
});

describe('createTask', () => {
  it('returns task with correct fields and null timestamps/response/errorMessage', () => {
    const agent = createAgent({ name: 'Tasker' });
    const task = createTask(agent.id, { prompt: 'Do something' });
    expect(task.id).toBeTruthy();
    expect(task.agentId).toBe(agent.id);
    expect(task.prompt).toBe('Do something');
    expect(task.status).toBe('pending');
    expect(task.createdAt).toBeTruthy();
    expect(task.response).toBeNull();
    expect(task.errorMessage).toBeNull();
    expect(task.startedAt).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  it('throws AppError(400) on empty prompt', () => {
    const agent = createAgent({ name: 'EmptyPrompt' });
    try {
      createTask(agent.id, { prompt: '' });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
    }
  });

  it('throws AppError(400) on whitespace-only prompt', () => {
    const agent = createAgent({ name: 'WhitespacePrompt' });
    try {
      createTask(agent.id, { prompt: '   ' });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
    }
  });

  it('throws AppError(409) if agent already has a pending task', () => {
    const agent = createAgent({ name: 'Busy' });
    createTask(agent.id, { prompt: 'First task' });
    try {
      createTask(agent.id, { prompt: 'Second task' });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(409);
    }
  });
});

describe('listTasksForAgent', () => {
  it('returns empty array for a new agent with no tasks', () => {
    const agent = createAgent({ name: 'Empty' });
    const tasks = listTasksForAgent(agent.id);
    expect(tasks).toEqual([]);
  });

  it('throws AppError(404) for a nonexistent agentId', () => {
    try {
      listTasksForAgent('no-such-agent');
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(404);
    }
  });
});

describe('transitionTaskStatus', () => {
  it('pending → running sets startedAt', () => {
    const agent = createAgent({ name: 'Runner' });
    const task = createTask(agent.id, { prompt: 'Run me' });
    const updated = transitionTaskStatus(task.id, { status: 'running' });
    expect(updated.status).toBe('running');
    expect(updated.startedAt).toBeTruthy();
  });

  it('running → completed sets completedAt and response', () => {
    const agent = createAgent({ name: 'Completer' });
    const task = createTask(agent.id, { prompt: 'Complete me' });
    transitionTaskStatus(task.id, { status: 'running' });
    const completed = transitionTaskStatus(task.id, { status: 'completed', response: 'All done' });
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeTruthy();
    expect(completed.response).toBe('All done');
  });

  it('running → failed sets completedAt and errorMessage', () => {
    const agent = createAgent({ name: 'Failer' });
    const task = createTask(agent.id, { prompt: 'Fail me' });
    transitionTaskStatus(task.id, { status: 'running' });
    const failed = transitionTaskStatus(task.id, { status: 'failed', errorMessage: 'Something went wrong' });
    expect(failed.status).toBe('failed');
    expect(failed.completedAt).toBeTruthy();
    expect(failed.errorMessage).toBe('Something went wrong');
  });

  it('throws AppError(400) on invalid transition (pending → completed)', () => {
    const agent = createAgent({ name: 'InvalidTransition' });
    const task = createTask(agent.id, { prompt: 'Skip running' });
    try {
      transitionTaskStatus(task.id, { status: 'completed', response: 'Nope' });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
    }
  });
});
