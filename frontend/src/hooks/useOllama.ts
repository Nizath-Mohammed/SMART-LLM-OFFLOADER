import { useState, useEffect, useCallback } from 'react';
import {
  getRuntimeStatus, getInstalledModels, pullModel,
  getPullProgress, cancelPull, deleteInstalledModel,
} from '../api/modelManagerClient';
import type { OllamaStatus, OllamaModel, PullProgress } from '../types/index';

export function useOllama() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePull, setActivePull] = useState<PullProgress | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await getRuntimeStatus();
      setStatus(res.data);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Failed to check Ollama status.');
    }
  }, []);

  const refreshModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInstalledModels();
      setModels(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshModels();
  }, [refreshStatus, refreshModels]);

  const startPull = useCallback(async (modelName: string) => {
    setError(null);
    try {
      const res = await pullModel(modelName);
      setActivePull(res.data);
      // Poll for progress
      const interval = setInterval(async () => {
        try {
          const prog = await getPullProgress(res.data.id);
          setActivePull(prog.data);
          if (
            prog.data.status === 'completed' ||
            prog.data.status === 'failed' ||
            prog.data.status === 'cancelled'
          ) {
            clearInterval(interval);
            if (prog.data.status === 'completed') refreshModels();
          }
        } catch {
          clearInterval(interval);
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download.');
    }
  }, [refreshModels]);

  const stopPull = useCallback(async (id: string) => {
    try {
      const res = await cancelPull(id);
      setActivePull(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel download.');
    }
  }, []);

  const removeModel = useCallback(async (name: string) => {
    setError(null);
    try {
      await deleteInstalledModel(name);
      await refreshModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model.');
    }
  }, [refreshModels]);

  return {
    status, models, loading, error, activePull,
    refreshStatus, refreshModels, startPull, stopPull, removeModel,
  };
}
