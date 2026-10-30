import React from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { TaskInput } from '../components/tasks/TaskInput';
import { TaskHistoryList } from '../components/tasks/TaskHistoryList';
import { ErrorNotification } from '../components/ui/ErrorNotification';

export function TaskExecutionPage(): React.ReactElement {
  const { agentId } = useParams<{ agentId?: string }>();
  const { tasks, loading, error, createTask } = useTasks(agentId ?? null);

  if (!agentId) {
    return <div className="p-8 text-gray-400 text-sm">Select an agent from My Agents to assign tasks.</div>;
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Task Execution</h1>
      <ErrorNotification message={error} onDismiss={() => {}} />
      <TaskInput onSubmit={createTask} disabled={loading} />
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Task History</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading tasks…</p>
        ) : (
          <TaskHistoryList tasks={tasks} />
        )}
      </div>
    </div>
  );
}

export default TaskExecutionPage;
