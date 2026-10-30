import React from 'react';
import { Agent } from '../../types/index';
import { StatusBadge } from '../ui/StatusBadge';

interface AgentDetailProps {
  agent: Agent;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AgentDetail({ agent }: AgentDetailProps): React.ReactElement {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{agent.name}</h2>
        <StatusBadge status={agent.status} />
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm">
        <div>
          <dt className="text-gray-500 uppercase tracking-wide text-xs mb-1">Agent ID</dt>
          <dd className="text-gray-300 font-mono break-all">{agent.id}</dd>
        </div>
        <div>
          <dt className="text-gray-500 uppercase tracking-wide text-xs mb-1">Model</dt>
          <dd className="text-gray-300">{agent.modelRef ?? 'None'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 uppercase tracking-wide text-xs mb-1">System Prompt</dt>
          <dd className="text-gray-300 whitespace-pre-wrap">
            {agent.systemPrompt || <span className="italic text-gray-500">No system prompt set.</span>}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 uppercase tracking-wide text-xs mb-1">Created</dt>
          <dd className="text-gray-300">{formatDate(agent.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default AgentDetail;
