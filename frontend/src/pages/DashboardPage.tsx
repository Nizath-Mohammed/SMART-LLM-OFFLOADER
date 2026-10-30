import React from 'react';
import { useAgents } from '../hooks/useAgents';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DashboardPage(): React.ReactElement {
  const { agents, loading: agentsLoading } = useAgents();

  // Gather all tasks across all agents is not in scope for VS1 dashboard.
  // Dashboard shows agent count and a placeholder for task counts.
  const taskStatusCounts = { pending: 0, running: 0, completed: 0, failed: 0 };

  if (agentsLoading) {
    return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {agents.length === 0 ? (
        <EmptyState message="No agents yet. Create your first agent in My Agents." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Agents</p>
            <p className="text-3xl font-bold text-white">{agents.length}</p>
          </div>
          {(Object.keys(taskStatusCounts) as Array<keyof typeof taskStatusCounts>).map((status) => (
            <div key={status} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="mb-2"><StatusBadge status={status} /></div>
              <p className="text-3xl font-bold text-white">{taskStatusCounts[status]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
