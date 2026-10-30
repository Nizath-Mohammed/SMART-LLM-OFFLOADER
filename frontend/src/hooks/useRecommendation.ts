import { useState, useCallback } from 'react';
import { createRecommendation } from '../api/decisionClient';
import { Recommendation } from '../types/index';

export interface UseRecommendationResult {
  recommendation: Recommendation | null;
  loading: boolean;
  error: string | null;
  requestRecommendation: (prompt: string, agentId?: string) => Promise<void>;
  clearRecommendation: () => void;
}

export function useRecommendation(): UseRecommendationResult {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestRecommendation = useCallback(
    async (prompt: string, agentId?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const response = await createRecommendation(prompt, agentId);
        setRecommendation(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearRecommendation = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    loading,
    error,
    requestRecommendation,
    clearRecommendation,
  };
}
