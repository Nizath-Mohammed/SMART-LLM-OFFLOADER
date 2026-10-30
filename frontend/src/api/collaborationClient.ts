import { apiClient } from './client';
import type { CollaborationSession, Subtask, AgentMessage } from '../types/index';

interface SessionResponse { message: string; data: CollaborationSession }
interface SubtaskResponse { message: string; data: Subtask }
interface MessageResponse { message: string; data: AgentMessage }
interface MessagesResponse { message: string; data: AgentMessage[] }

export const createCollabSession = (payload: { parentAgentId: string; title: string }) =>
  apiClient<SessionResponse>('/collaboration/sessions', { method: 'POST', body: JSON.stringify(payload) });
export const getCollabSession = (sessionId: string) =>
  apiClient<SessionResponse>(`/collaboration/sessions/${sessionId}`);
export const createSubtask = (sessionId: string, payload: { agentId: string; prompt: string; depth: number; dependsOn?: string[] }) =>
  apiClient<SubtaskResponse>(`/collaboration/sessions/${sessionId}/subtasks`, { method: 'POST', body: JSON.stringify(payload) });
export const sendMessage = (sessionId: string, payload: { fromAgentId: string; toAgentId: string; content: string; subtaskId?: string }) =>
  apiClient<MessageResponse>(`/collaboration/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify(payload) });
export const getMessages = (sessionId: string) =>
  apiClient<MessagesResponse>(`/collaboration/sessions/${sessionId}/messages`);
