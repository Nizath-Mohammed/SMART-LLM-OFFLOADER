import React from 'react';
import { Agent } from '../../types/index';
import { AgentCard } from './AgentCard';

interface AgentListProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function AgentList({ agents, selectedAgentId, onSelectAgent }: AgentListProps): React.ReactElement {
  return (
    <div className="overflow-y-auto flex flex-col gap-1 p-2">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onSelect={onSelectAgent}
        />
      ))}
    </div>
  );
}

export default AgentList;
