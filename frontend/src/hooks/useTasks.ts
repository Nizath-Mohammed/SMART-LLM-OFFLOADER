import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Task } from '../types/index';

interface TasksResponse {
  message: string;
  data: Task[];
}

interface CreateTaskResponse {
  message: string;
  data: Task;
}

export function useTasks(agentId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (agentId === null) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<TasksResponse>(`/agents/${agentId}/tasks`);
      setTasks(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTask = async (prompt: string): Promise<void> => {
    if (agentId === null) {
      setError('No agent selected.');
      return;
    }

    setError(null);

    try {
      await apiClient<CreateTaskResponse>(`/agents/${agentId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  return { tasks, loading, error, createTask, refresh };
}
