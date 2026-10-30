import { useState, useEffect, useCallback } from 'react';
import { getHardware } from '../api/decisionClient';
import { HardwareInfo } from '../types/index';

export interface UseHardwareResult {
  hardware: HardwareInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHardware(): UseHardwareResult {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await getHardware();
      setHardware(response.data);
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

  return { hardware, loading, error, refresh };
}
