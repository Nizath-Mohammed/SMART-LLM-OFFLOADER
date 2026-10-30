import React from 'react';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import { EmptyState } from '../components/ui/EmptyState';
import type { DataSource } from '../types/index';

function MetricCell({ value, source }: { value: number | null; source: DataSource }) {
  if (value === null || source === 'unavailable') {
    return (
      <td className="py-2 pr-4 text-gray-500" title="No data available">—</td>
    );
  }
  return (
    <td className="py-2 pr-4 text-gray-200">
      {value.toFixed(1)}
      {source === 'estimated' && (
        <span className="ml-1 text-xs text-amber-400 border border-amber-600 rounded px-1">Est.</span>
      )}
    </td>
  );
}

export function BenchmarksPage(): React.ReactElement {
  const { summary, loading, error } = useBenchmarks();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Benchmarks</h1>
      {error && <ErrorNotification message={error} onDismiss={() => {}} />}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : summary.length === 0 ? (
        <EmptyState message="No benchmark data yet. Run some executions to collect metrics." />
      ) : (
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Runs</th>
                <th className="py-2 pr-4">Success</th>
                <th className="py-2 pr-4">Avg Duration (ms)</th>
                <th className="py-2 pr-4">Avg TPS</th>
                <th className="py-2">Avg RAM (MB)</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(s => (
                <tr key={s.modelName} className="border-b border-gray-700/50">
                  <td className="py-2 pr-4 text-gray-200 font-medium">{s.modelName}</td>
                  <td className="py-2 pr-4 text-gray-400">{s.executionCount}</td>
                  <td className="py-2 pr-4 text-gray-400">{(s.successRate * 100).toFixed(0)}%</td>
                  <MetricCell value={s.avgDurationMs} source={s.durationDataSource} />
                  <MetricCell value={s.avgTokensPerSecond} source={s.tpsDataSource} />
                  <MetricCell value={s.avgEstimatedRamMB} source={s.ramDataSource} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default BenchmarksPage;
