import { apiClient } from './client';
import { HardwareInfo, ModelRecord, Recommendation } from '../types/index';

export interface HardwareResponse {
  message: string;
  data: HardwareInfo;
}

export interface ModelsResponse {
  message: string;
  data: ModelRecord[];
}

export interface RecommendationResponse {
  message: string;
  data: Recommendation;
}

export const getHardware = (): Promise<HardwareResponse> =>
  apiClient<HardwareResponse>('/hardware');

export const getModels = (): Promise<ModelsResponse> =>
  apiClient<ModelsResponse>('/models');

export const createRecommendation = (
  prompt: string,
  agentId?: string
): Promise<RecommendationResponse> =>
  apiClient<RecommendationResponse>('/recommendations', {
    method: 'POST',
    body: JSON.stringify({ prompt, ...(agentId ? { agentId } : {}) }),
  });

export const getRecommendation = (id: string): Promise<RecommendationResponse> =>
  apiClient<RecommendationResponse>(`/recommendations/${id}`);
