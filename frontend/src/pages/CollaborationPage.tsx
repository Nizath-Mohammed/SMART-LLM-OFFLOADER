import React, { useState } from 'react';
import { useAgents } from '../hooks/useAgents';
import {
  createCollabSession, getMessages, sendMessage,
} from '../api/collaborationClient';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import { EmptyState } from '../components/ui/EmptyState';
import type { CollaborationSession, AgentMessage, Subtask } from '../types/index';

export function CollaborationPage(): React.ReactElement {
  const { agents } = useAgents();
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parentAgentId, setParentAgentId] = useState('');
  const [title, setTitle] = useState('');
  const [msgFrom, setMsgFrom] = useState('');
  const [msgTo, setMsgTo] = useState('');
  const [msgContent, setMsgContent] = useState('');

  const handleCreateSession = async () => {
    try {
      const res = await createCollabSession({ parentAgentId, title });
      setSession(res.data);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session.');
    }
  };

  const handleSendMessage = async () => {
    if (!session) return;
    try {
      await sendMessage(session.id, { fromAgentId: msgFrom, toAgentId: msgTo, content: msgContent });
      const res = await getMessages(session.id);
      setMessages(res.data);
      setMsgContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'text-indigo-300',
    completed: 'text-green-300',
    failed: 'text-red-300',
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Agent Collaboration</h1>
      {error && <ErrorNotification message={error} onDismiss={() => setError(null)} />}

      {!session ? (
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">New Collaboration Session</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Parent Agent</label>
              <select
                value={parentAgentId}
                onChange={e => setParentAgentId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100"
              >
                <option value="">Select…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>
          <button
            onClick={() => void handleCreateSession()}
            disabled={!parentAgentId || !title.trim()}
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            Create Session
          </button>
        </section>
      ) : (
        <>
          <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-white">{session.title}</h2>
                <p className={`text-sm font-medium ${STATUS_COLORS[session.status] ?? 'text-gray-400'}`}>
                  {session.status}
                </p>
              </div>
              <button onClick={() => setSession(null)} className="text-xs text-gray-500 hover:text-gray-300">
                ← Back
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Subtasks</p>
              {session.subtasks.length === 0 ? (
                <EmptyState message="No subtasks yet." />
              ) : (
                session.subtasks.map((st: Subtask) => (
                  <div key={st.id} className="bg-gray-900 rounded p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Depth {st.depth}</span>
                      <span className="text-xs text-gray-500">{st.status}</span>
                    </div>
                    <p className="text-gray-400 mt-1 line-clamp-2">{st.prompt}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Agent Messages</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {messages.map((m: AgentMessage) => (
                <div key={m.id} className="text-xs text-gray-400 border-b border-gray-700/50 pb-1">
                  <span className="text-gray-300">{m.fromAgentId.slice(0, 8)}…</span>
                  {' → '}
                  <span className="text-gray-300">{m.toAgentId.slice(0, 8)}…</span>
                  {': '}{m.content.slice(0, 100)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={msgFrom} onChange={e => setMsgFrom(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-100"
              >
                <option value="">From…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select
                value={msgTo} onChange={e => setMsgTo(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-100"
              >
                <option value="">To…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input
                value={msgContent} onChange={e => setMsgContent(e.target.value)}
                placeholder="Message…"
                className="col-span-2 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100"
              />
              <button
                onClick={() => void handleSendMessage()}
                disabled={!msgFrom || !msgTo || !msgContent.trim()}
                className="col-span-2 px-4 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default CollaborationPage;
