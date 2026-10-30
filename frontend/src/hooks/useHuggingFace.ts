import { useState, useCallback } from 'react';
import { searchHuggingFace, getHFModelDetails } from '../api/modelManagerClient';
import type { HuggingFaceModel } from '../types/index';

export function useHuggingFace() {
  const [results, setResults] = useState<HuggingFaceModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<HuggingFaceModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await searchHuggingFace(query);
      setResults(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (modelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHFModelDetails(modelId);
      setSelectedModel(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model details.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, selectedModel, loading, error, search, loadDetails };
}
