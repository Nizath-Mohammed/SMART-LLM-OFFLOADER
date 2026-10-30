import { apiClient } from './client';
import type { ScheduledTask, SchedulerConfig } from '../types/index';

interface SchedulerQueueResponse { message: string; data: ScheduledTask[] }
interface SchedulerConfigResponse { message: string; data: SchedulerConfig }
interface SchedulerTaskResponse { message: string; data: ScheduledTask }

export const getSchedulerQueue = () => apiClient<SchedulerQueueResponse>('/scheduler/queue');
export const getSchedulerConfig = () => apiClient<SchedulerConfigResponse>('/scheduler/config');
export const updateSchedulerConfig = (patch: Partial<SchedulerConfig>) =>
  apiClient<SchedulerConfigResponse>('/scheduler/config', { method: 'PATCH', body: JSON.stringify(patch) });
export const cancelScheduledTask = (id: string) =>
  apiClient<SchedulerTaskResponse>(`/scheduler/queue/${id}/cancel`, { method: 'POST' });
