import { useState, useCallback } from 'react';
import { estimateKvCache } from '../api/kvCacheClient';
import type { KvCacheEstimate } from '../types/index';

export function useKvCache() {
  const [estimate, setEstimate] = useState<KvCacheEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async (modelName: string, contextLength: number) => {
    setLoading(true);
    setError(null);
    setEstimate(null);
    try {
      const res = await estimateKvCache(modelName, contextLength);
      setEstimate(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate KV-cache.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { estimate, loading, error, compute };
}
