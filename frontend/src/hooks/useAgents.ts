import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Agent } from '../types/index';

interface AgentListResponse {
  message: string;
  data: Agent[];
}

interface AgentResponse {
  message: string;
  data: Agent;
}

interface UseAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  createAgent: (name: string, systemPrompt?: string) => Promise<void>;
  renameAgent: (agentId: string, name: string) => Promise<void>;
  updateSystemPrompt: (agentId: string, systemPrompt: string) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient<AgentListResponse>('/agents');
      setAgents(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createAgent = useCallback(async (name: string, systemPrompt?: string): Promise<void> => {
    try {
      await apiClient<AgentResponse>('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, ...(systemPrompt !== undefined ? { systemPrompt } : {}) }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [refresh]);

  const renameAgent = useCallback(async (agentId: string, name: string): Promise<void> => {
    try {
      await apiClient<AgentResponse>(`/agents/${agentId}/name`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [refresh]);

  const updateSystemPrompt = useCallback(async (agentId: string, systemPrompt: string): Promise<void> => {
    try {
      await apiClient<AgentResponse>(`/agents/${agentId}/system-prompt`, {
        method: 'PATCH',
        body: JSON.stringify({ systemPrompt }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [refresh]);

  const deleteAgent = useCallback(async (agentId: string): Promise<void> => {
    try {
      await apiClient<{ message: string }>(`/agents/${agentId}`, {
        method: 'DELETE',
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [refresh]);

  return { agents, loading, error, createAgent, renameAgent, updateSystemPrompt, deleteAgent, refresh };
}
