import React from 'react';
import { HardwareInfo, HardwareMetric } from '../../types/index';
import { ErrorNotification } from '../ui/ErrorNotification';

interface HardwarePanelProps {
  hardware: HardwareInfo | null;
  loading: boolean;
  error: string | null;
  onDismissError?: () => void;
}

interface MetricItemProps {
  label: string;
  metric?: HardwareMetric<any>;
  formatValue?: (val: any) => string;
}

function MetricItem({ label, metric, formatValue }: MetricItemProps): React.ReactElement {
  if (!metric || metric.source === 'unavailable' || metric.value === null || metric.value === undefined) {
    return (
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-gray-900/60 border border-gray-700/50">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span className="text-sm font-normal text-gray-500">Not detected</span>
      </div>
    );
  }

  const displayVal = formatValue ? formatValue(metric.value) : String(metric.value);

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-gray-900/60 border border-gray-700/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        {metric.source === 'estimated' && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-900/40 border border-amber-600/40 text-amber-400">
            Estimated
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-100 truncate" title={displayVal}>
        {displayVal}
      </span>
    </div>
  );
}

export function HardwarePanel({
  hardware,
  loading,
  error,
  onDismissError,
}: HardwarePanelProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800 p-6 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-900/50 text-indigo-400 border border-indigo-700/40">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Host Hardware Environment</h2>
            <p className="text-xs text-gray-400">Detected system specifications and memory headroom</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNotification message={error} onDismiss={onDismissError ?? (() => {})} />
        </div>
      )}

      {loading ? (
        <div data-testid="hardware-loading" className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-700/40"></div>
          ))}
        </div>
      ) : hardware ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <MetricItem
            label="Total RAM"
            metric={hardware.totalRamMB}
            formatValue={(v) => `${(v / 1024).toFixed(1)} GB (${v} MB)`}
          />
          <MetricItem
            label="Available RAM"
            metric={hardware.availableRamMB}
            formatValue={(v) => `${(v / 1024).toFixed(1)} GB (${v} MB)`}
          />
          <MetricItem label="CPU Model" metric={hardware.cpuModel} />
          <MetricItem
            label="Logical Cores"
            metric={hardware.logicalCores}
            formatValue={(v) => `${v} Cores`}
          />
          <MetricItem
            label="Operating System"
            metric={hardware.osName}
            formatValue={(v) =>
              `${v} ${hardware.osVersion.value ? `(${hardware.osVersion.value})` : ''}`
            }
          />
          <MetricItem label="GPU" metric={hardware.gpuName} />
          <MetricItem
            label="GPU VRAM"
            metric={hardware.gpuVramMB}
            formatValue={(v) => `${v} MB`}
          />
        </div>
      ) : null}
    </div>
  );
}

export default HardwarePanel;
