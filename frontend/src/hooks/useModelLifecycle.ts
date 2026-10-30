import { useState, useEffect, useCallback } from 'react';
import { getLifecycleEntries, getLifecycleEvents, unloadModel, updateLifecycleConfig } from '../api/lifecycleClient';
import type { ModelLifecycleEntry, LifecycleEvent, LifecycleConfig } from '../types/index';

export function useModelLifecycle() {
  const [entries, setEntries] = useState<ModelLifecycleEntry[]>([]);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, ev] = await Promise.all([getLifecycleEntries(), getLifecycleEvents()]);
      setEntries(e.data);
      setEvents(ev.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lifecycle data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const unload = useCallback(async (modelName: string) => {
    try {
      await unloadModel(modelName);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unload model.');
    }
  }, [refresh]);

  const updateConfig = useCallback(async (patch: Partial<LifecycleConfig>) => {
    try {
      await updateLifecycleConfig(patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config.');
    }
  }, []);

  return { entries, events, loading, error, refresh, unloadModel: unload, updateConfig };
}
