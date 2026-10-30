import { apiClient } from './client';
import type {
  OllamaStatus, OllamaModel, PullProgress,
  HuggingFaceModel, ExecutionRecord, CreateExecutionPayload
} from '../types/index';

export interface RuntimeStatusResponse   { message: string; data: OllamaStatus }
export interface InstalledModelsResponse { message: string; data: OllamaModel[] }
export interface PullProgressResponse    { message: string; data: PullProgress }
export interface HFSearchResponse        { message: string; data: HuggingFaceModel[] }
export interface HFModelResponse         { message: string; data: HuggingFaceModel }
export interface ExecutionResponse       { message: string; data: ExecutionRecord }
export interface ExecutionsResponse      { message: string; data: ExecutionRecord[] }

export const getRuntimeStatus    = () => apiClient<RuntimeStatusResponse>('/runtime/status');
export const getInstalledModels  = () => apiClient<InstalledModelsResponse>('/runtime/models');
export const pullModel           = (model: string) =>
  apiClient<PullProgressResponse>('/runtime/models/pull', {
    method: 'POST', body: JSON.stringify({ model }),
  });
export const getPullProgress     = (id: string) =>
  apiClient<PullProgressResponse>(`/runtime/models/pull/${id}`);
export const cancelPull          = (id: string) =>
  apiClient<PullProgressResponse>(`/runtime/models/pull/${id}/cancel`, { method: 'POST' });
export const deleteInstalledModel = (name: string) =>
  apiClient<{ message: string }>(`/runtime/models/${encodeURIComponent(name)}`, { method: 'DELETE' });
export const searchHuggingFace   = (q: string, limit = 20) =>
  apiClient<HFSearchResponse>(`/huggingface/search?q=${encodeURIComponent(q)}&limit=${limit}`);
export const getHFModelDetails   = (id: string) =>
  apiClient<HFModelResponse>(`/huggingface/models/${id}`);
export const createExecution     = (payload: CreateExecutionPayload) =>
  apiClient<ExecutionResponse>('/executions', {
    method: 'POST', body: JSON.stringify(payload),
  });
export const listExecutions      = (agentId?: string) =>
  apiClient<ExecutionsResponse>(`/executions${agentId ? `?agentId=${agentId}` : ''}`);
export const getExecution        = (id: string) =>
  apiClient<ExecutionResponse>(`/executions/${id}`);
