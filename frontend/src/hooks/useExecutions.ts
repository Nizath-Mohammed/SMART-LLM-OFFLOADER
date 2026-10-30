import { useState, useCallback } from 'react';
import { createExecution, listExecutions } from '../api/modelManagerClient';
import type { ExecutionRecord, CreateExecutionPayload } from '../types/index';

export function useExecutions(agentId?: string) {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [currentExecution, setCurrentExecution] = useState<ExecutionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listExecutions(agentId);
      setExecutions(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions.');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const execute = useCallback(async (payload: CreateExecutionPayload) => {
    setLoading(true);
    setError(null);
    setCurrentExecution(null);
    try {
      const res = await createExecution(payload);
      setCurrentExecution(res.data);
      await refresh();
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return { executions, currentExecution, loading, error, refresh, execute };
}
