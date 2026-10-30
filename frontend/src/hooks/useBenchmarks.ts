import { useState, useEffect, useCallback } from 'react';
import { getBenchmarkSummary } from '../api/benchmarkClient';
import type { BenchmarkSummary } from '../types/index';

export function useBenchmarks() {
  const [summary, setSummary] = useState<BenchmarkSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBenchmarkSummary();
      setSummary(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { summary, loading, error, refresh };
}
