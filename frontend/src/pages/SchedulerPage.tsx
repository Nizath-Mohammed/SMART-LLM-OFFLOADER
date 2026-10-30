import React, { useState } from 'react';
import { useScheduler } from '../hooks/useScheduler';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import type { ScheduledTask } from '../types/index';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-700 text-red-100',
  high: 'bg-orange-600 text-orange-100',
  normal: 'bg-indigo-700 text-indigo-100',
  low: 'bg-gray-600 text-gray-100',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[priority] ?? 'bg-gray-700 text-gray-200'}`}>
      {priority}
    </span>
  );
}

export function SchedulerPage(): React.ReactElement {
  const { queue, config, loading, error, cancelTask, updateConfig } = useScheduler();
  const [ramInput, setRamInput] = useState('');
  const [concurrencyInput, setConcurrencyInput] = useState('');
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Execution Scheduler</h1>
      {!dismissed && error && <ErrorNotification message={error} onDismiss={() => setDismissed(true)} />}

      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Active Queue</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-500 text-sm">No queued or running tasks.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                <th className="py-2 pr-4">Priority</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Est. RAM</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((t: ScheduledTask) => (
                <tr key={t.id} className="border-b border-gray-700/50">
                  <td className="py-2 pr-4"><PriorityBadge priority={t.priority} /></td>
                  <td className="py-2 pr-4 text-gray-200">{t.modelName}</td>
                  <td className="py-2 pr-4 text-gray-400">{t.estimatedRamMB} MB</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'running' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {t.status === 'queued' && (
                      <button
                        onClick={() => { setDismissed(false); void cancelTask(t.id); }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Configuration</h2>
        <p className="text-xs text-gray-500">
          Current: RAM budget {config.ramBudgetMB} MB · Max concurrency {config.maxConcurrency}
        </p>
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-400 mb-1">RAM Budget (MB)</label>
            <input
              type="number" min={512} value={ramInput}
              onChange={e => setRamInput(e.target.value)}
              placeholder={String(config.ramBudgetMB)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Concurrency</label>
            <input
              type="number" min={1} value={concurrencyInput}
              onChange={e => setConcurrencyInput(e.target.value)}
              placeholder={String(config.maxConcurrency)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDismissed(false);
                const patch: Record<string, number> = {};
                if (ramInput) patch.ramBudgetMB = parseInt(ramInput, 10);
                if (concurrencyInput) patch.maxConcurrency = parseInt(concurrencyInput, 10);
                if (Object.keys(patch).length > 0) void updateConfig(patch);
              }}
              className="px-4 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SchedulerPage;
