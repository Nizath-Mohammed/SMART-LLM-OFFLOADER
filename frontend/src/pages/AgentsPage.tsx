import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';
import { useTasks } from '../hooks/useTasks';
import { AgentList } from '../components/agents/AgentList';
import { AgentDetail } from '../components/agents/AgentDetail';
import { CreateAgentForm } from '../components/agents/CreateAgentForm';
import { RenameAgentModal } from '../components/agents/RenameAgentModal';
import { EditSystemPromptModal } from '../components/agents/EditSystemPromptModal';
import { DeleteAgentDialog } from '../components/agents/DeleteAgentDialog';
import { TaskInput } from '../components/tasks/TaskInput';
import { TaskHistoryList } from '../components/tasks/TaskHistoryList';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import { EmptyState } from '../components/ui/EmptyState';

export function AgentsPage(): React.ReactElement {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const { agents, loading, error, createAgent, renameAgent, updateSystemPrompt, deleteAgent } = useAgents();
  const { tasks, loading: tasksLoading, createTask } = useTasks(agentId ?? null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [renamingAgentId, setRenamingAgentId] = useState<string | null>(null);
  const [editingPromptAgentId, setEditingPromptAgentId] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null;
  const renamingAgent = agents.find((a) => a.id === renamingAgentId) ?? null;
  const editingPromptAgent = agents.find((a) => a.id === editingPromptAgentId) ?? null;
  const deletingAgent = agents.find((a) => a.id === deletingAgentId) ?? null;

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading agents…</div>;

  return (
    <div className="flex h-full">
      {/* Sidebar: agent list */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">My Agents</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
        </div>

        {agents.length === 0 ? (
          <EmptyState message="No agents yet." />
        ) : (
          <AgentList
            agents={agents}
            selectedAgentId={agentId ?? null}
            onSelectAgent={(id) => navigate(`/agents/${id}`)}
          />
        )}
      </div>

      {/* Main: agent detail or create form */}
      <div className="flex-1 p-6 overflow-auto">
        <ErrorNotification message={error ?? localError} onDismiss={() => setLocalError(null)} />

        {showCreateForm ? (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Agent</h2>
            <CreateAgentForm
              onSubmit={async (name, systemPrompt) => {
                await createAgent(name, systemPrompt);
                setShowCreateForm(false);
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : selectedAgent ? (
          <div className="max-w-3xl space-y-6">
            <AgentDetail agent={selectedAgent} />
            <div className="flex gap-3">
              <button onClick={() => setRenamingAgentId(selectedAgent.id)} className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Rename</button>
              <button onClick={() => setEditingPromptAgentId(selectedAgent.id)} className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Edit Prompt</button>
              <button onClick={() => setDeletingAgentId(selectedAgent.id)} className="px-3 py-1.5 text-sm rounded bg-red-800 text-red-100 hover:bg-red-700 transition-colors">Delete</button>
            </div>

            {/* Direct Task Execution & History Panel */}
            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-white flex items-center gap-2">
                  <span>⚡ Assign Task to {selectedAgent.name}</span>
                </h3>
              </div>
              <TaskInput onSubmit={createTask} disabled={tasksLoading} />

              <div className="pt-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Task Execution & Outputs History
                </h4>
                {tasksLoading && tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">Loading tasks…</p>
                ) : (
                  <TaskHistoryList tasks={tasks} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select an agent from the list or create a new one.</p>
        )}
      </div>

      {/* Modals */}
      {renamingAgent && (
        <RenameAgentModal
          agent={renamingAgent}
          isOpen={true}
          onConfirm={async (name) => { await renameAgent(renamingAgent.id, name); setRenamingAgentId(null); }}
          onCancel={() => setRenamingAgentId(null)}
        />
      )}
      {editingPromptAgent && (
        <EditSystemPromptModal
          agent={editingPromptAgent}
          isOpen={true}
          onConfirm={async (prompt) => { await updateSystemPrompt(editingPromptAgent.id, prompt); setEditingPromptAgentId(null); }}
          onCancel={() => setEditingPromptAgentId(null)}
        />
      )}
      {deletingAgent && (
        <DeleteAgentDialog
          agent={deletingAgent}
          isOpen={true}
          onConfirm={async () => { await deleteAgent(deletingAgent.id); setDeletingAgentId(null); navigate('/agents'); }}
          onCancel={() => setDeletingAgentId(null)}
        />
      )}
    </div>
  );
}

export default AgentsPage;
