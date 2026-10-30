import { apiClient } from './client';
import type { ModelLifecycleEntry, LifecycleEvent, LifecycleConfig } from '../types/index';

interface LifecycleEntriesResponse { message: string; data: ModelLifecycleEntry[] }
interface LifecycleEventsResponse { message: string; data: LifecycleEvent[] }
interface LifecycleConfigResponse { message: string; data: LifecycleConfig }

export const getLifecycleEntries = () => apiClient<LifecycleEntriesResponse>('/models/lifecycle');
export const getLifecycleEvents = () => apiClient<LifecycleEventsResponse>('/models/lifecycle/events');
export const unloadModel = (modelName: string) =>
  apiClient<{ message: string }>(`/models/lifecycle/${encodeURIComponent(modelName)}`, { method: 'DELETE' });
export const updateLifecycleConfig = (patch: Partial<LifecycleConfig>) =>
  apiClient<LifecycleConfigResponse>('/models/lifecycle/config', { method: 'PATCH', body: JSON.stringify(patch) });
