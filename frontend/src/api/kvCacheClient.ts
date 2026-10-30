import { apiClient } from './client';
import type { KvCacheEstimate } from '../types/index';

interface KvCacheResponse { message: string; data: KvCacheEstimate }

export const estimateKvCache = (modelName: string, contextLength: number) =>
  apiClient<KvCacheResponse>(`/kvcache/estimate?modelName=${encodeURIComponent(modelName)}&contextLength=${contextLength}`);
