import { useState, useEffect, useCallback } from 'react';
import { getSchedulerQueue, getSchedulerConfig, updateSchedulerConfig, cancelScheduledTask } from '../api/schedulerClient';
import type { ScheduledTask, SchedulerConfig } from '../types/index';

export function useScheduler() {
  const [queue, setQueue] = useState<ScheduledTask[]>([]);
  const [config, setConfig] = useState<SchedulerConfig>({ ramBudgetMB: 6144, maxConcurrency: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, c] = await Promise.all([getSchedulerQueue(), getSchedulerConfig()]);
      setQueue(q.data);
      setConfig(c.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduler data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const cancelTask = useCallback(async (id: string) => {
    try {
      await cancelScheduledTask(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel task.');
    }
  }, [refresh]);

  const updateConfig = useCallback(async (patch: Partial<SchedulerConfig>) => {
    try {
      const res = await updateSchedulerConfig(patch);
      setConfig(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config.');
    }
  }, []);

  return { queue, config, loading, error, refresh, cancelTask, updateConfig };
}
