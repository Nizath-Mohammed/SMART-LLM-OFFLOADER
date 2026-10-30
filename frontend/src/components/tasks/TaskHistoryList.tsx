import React from 'react';
import { Task } from '../../types/index';
import { StatusBadge } from '../ui/StatusBadge';

interface TaskHistoryListProps {
  tasks: Task[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function TaskHistoryList({ tasks }: TaskHistoryListProps): React.ReactElement {
  if (tasks.length === 0) {
    return <p className="text-gray-500 text-sm">No tasks yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-100 font-medium break-words flex-1">{task.prompt}</p>
            <StatusBadge status={task.status} />
          </div>

          {task.response && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.response}</p>
          )}

          {task.errorMessage && (
            <p className="text-sm text-red-400 whitespace-pre-wrap">{task.errorMessage}</p>
          )}

          <p className="text-xs text-gray-500">{formatDate(task.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

export default TaskHistoryList;
