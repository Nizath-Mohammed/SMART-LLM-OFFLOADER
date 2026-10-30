import { initDatabase, resetDatabase } from '../db/database';
import {
  createAgent,
  getAgentById,
  renameAgent,
  updateSystemPrompt,
  deleteAgent,
} from '../services/agentService';
import { AppError } from '../types/index';

beforeEach(() => {
  resetDatabase();
  initDatabase(':memory:');
});

afterEach(() => {
  resetDatabase();
});

describe('createAgent', () => {
  it('returns agent with id, name, empty systemPrompt, and idle status', () => {
    const agent = createAgent({ name: 'My Agent' });
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe('My Agent');
    expect(agent.systemPrompt).toBe('');
    expect(agent.status).toBe('idle');
  });

  it('stores a provided systemPrompt correctly', () => {
    const agent = createAgent({ name: 'Bot', systemPrompt: 'You are helpful.' });
    expect(agent.systemPrompt).toBe('You are helpful.');
  });

  it('throws AppError(400) on empty name', () => {
    expect(() => createAgent({ name: '' })).toThrow(AppError);
    try {
      createAgent({ name: '' });
    } catch (e) {
      expect(e instanceof AppError && e.statusCode).toBe(400);
    }
  });

  it('throws AppError(400) on whitespace-only name', () => {
    try {
      createAgent({ name: '   ' });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
    }
  });

  it('throws AppError(400) on name longer than 100 characters', () => {
    const longName = 'a'.repeat(101);
    try {
      createAgent({ name: longName });
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
    }
  });
});

describe('getAgentById', () => {
  it('returns the agent after creation', () => {
    const created = createAgent({ name: 'Finder' });
    const found = getAgentById(created.id);
    expect(found.id).toBe(created.id);
    expect(found.name).toBe('Finder');
  });

  it('throws AppError(404) for a missing id', () => {
    try {
      getAgentById('non-existent-id');
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(404);
    }
  });
});

describe('renameAgent', () => {
  it('updates the name while leaving other fields unchanged', () => {
    const agent = createAgent({ name: 'OldName', systemPrompt: 'hello' });
    const updated = renameAgent(agent.id, 'NewName');
    expect(updated.name).toBe('NewName');
    expect(updated.systemPrompt).toBe('hello');
    expect(updated.status).toBe('idle');
    expect(updated.id).toBe(agent.id);
  });

  it('throws AppError(404) for a missing id', () => {
    try {
      renameAgent('no-such-id', 'Name');
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(404);
    }
  });
});

describe('updateSystemPrompt', () => {
  it('stores a new system prompt value', () => {
    const agent = createAgent({ name: 'Prompter' });
    const updated = updateSystemPrompt(agent.id, 'New system prompt');
    expect(updated.systemPrompt).toBe('New system prompt');
  });

  it('stores an empty string (clearing the prompt)', () => {
    const agent = createAgent({ name: 'Prompter', systemPrompt: 'old' });
    const updated = updateSystemPrompt(agent.id, '');
    expect(updated.systemPrompt).toBe('');
  });
});

describe('deleteAgent', () => {
  it('removes the agent so subsequent getAgentById throws AppError(404)', () => {
    const agent = createAgent({ name: 'Deletable' });
    deleteAgent(agent.id);
    try {
      getAgentById(agent.id);
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(404);
    }
  });

  it('throws AppError(404) for a missing id', () => {
    try {
      deleteAgent('ghost-id');
      fail('Expected AppError');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(404);
    }
  });
});
