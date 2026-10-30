import React from 'react';
import { Task } from '../../types/index';
import { StatusBadge } from '../ui/StatusBadge';

interface TaskCardProps {
  task: Task;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function TaskCard({ task }: TaskCardProps): React.ReactElement {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-200 line-clamp-3 flex-1">{task.prompt}</p>
        <StatusBadge status={task.status} />
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <span>Created: {formatDate(task.createdAt)}</span>
        {task.startedAt && <span>Started: {formatDate(task.startedAt)}</span>}
        {task.completedAt && <span>Completed: {formatDate(task.completedAt)}</span>}
      </div>

      {task.status === 'completed' && task.response && (
        <div className="bg-gray-900 border border-gray-700 rounded-md p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Response</p>
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{task.response}</p>
        </div>
      )}

      {task.status === 'failed' && task.errorMessage && (
        <div className="bg-red-950 border border-red-800 rounded-md p-3">
          <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Error</p>
          <p className="text-sm text-red-300">{task.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
