import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useAgents } from '../hooks/useAgents';
import { useOllama } from '../hooks/useOllama';
import { TaskInput } from '../components/tasks/TaskInput';
import { TaskHistoryList } from '../components/tasks/TaskHistoryList';
import { ErrorNotification } from '../components/ui/ErrorNotification';

export function TaskExecutionPage(): React.ReactElement {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { agents } = useAgents();
  const { models } = useOllama();

  // If no agentId in URL, default to the first agent if available
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentId ?? null);

  useEffect(() => {
    if (agentId) {
      setSelectedAgentId(agentId);
    } else if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agentId, agents, selectedAgentId]);

  const { tasks, loading, error, createTask } = useTasks(selectedAgentId);

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedAgentId(newId);
    navigate(`/tasks/${newId}`);
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚡ Interactive Task Execution</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Dispatch tasks directly to an agent or run against local edge models
          </p>
        </div>

        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="agent-selector" className="text-xs text-gray-400 font-medium">
              Target Agent:
            </label>
            <select
              id="agent-selector"
              value={selectedAgentId ?? ''}
              onChange={handleAgentChange}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.modelRef || 'Auto-Model'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ErrorNotification message={error} onDismiss={() => {}} />

      {agents.length === 0 ? (
        <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl p-8 text-center space-y-4">
          <p className="text-gray-300 text-base">No agents found to receive tasks.</p>
          <button
            onClick={() => navigate('/agents')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Create Your First Agent
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-800/90 border border-gray-700/80 rounded-xl p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center justify-between">
              <span>Prompt Input</span>
              {models.length > 0 && (
                <span className="text-xs text-emerald-400 font-normal">
                  ● Ollama ready ({models.length} local models detected)
                </span>
              )}
            </h2>
            <TaskInput onSubmit={createTask} disabled={loading} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Agent Task & Response History
              </h2>
              {loading && <span className="text-xs text-indigo-400 animate-pulse">Processing inference…</span>}
            </div>
            <TaskHistoryList tasks={tasks} />
          </div>
        </>
      )}
    </div>
  );
}

export default TaskExecutionPage;

