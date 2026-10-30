import React from 'react';
import { Agent } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
}

export function AgentCard({ agent, isSelected, onSelect }: AgentCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        isSelected
          ? 'bg-gray-700 border-indigo-500'
          : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
      }`}
      aria-pressed={isSelected}
      aria-label={`Agent: ${agent.name}, status: ${agent.status}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-100 truncate">{agent.name}</span>
        <StatusBadge status={agent.status} />
      </div>
    </button>
  );
}

export default AgentCard;
