import { apiClient } from './client';
import type { BenchmarkRecord, BenchmarkSummary } from '../types/index';

interface BenchmarkRecordsResponse { message: string; data: BenchmarkRecord[] }
interface BenchmarkSummaryResponse { message: string; data: BenchmarkSummary[] }

export const getBenchmarks = (modelName?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (modelName) params.set('modelName', modelName);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiClient<BenchmarkRecordsResponse>(`/benchmarks${qs ? `?${qs}` : ''}`);
};
export const getBenchmarkSummary = () => apiClient<BenchmarkSummaryResponse>('/benchmarks/summary');
