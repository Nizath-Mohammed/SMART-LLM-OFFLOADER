import React from 'react';

export type StatusBadgeStatus =
  | 'idle'
  | 'running'
  | 'error'
  | 'pending'
  | 'completed'
  | 'failed';

interface StatusBadgeProps {
  status: StatusBadgeStatus;
}

const STATUS_CONFIG: Record<StatusBadgeStatus, { label: string; className: string }> = {
  idle: {
    label: 'Idle',
    // Grey — sufficient contrast on dark backgrounds
    className: 'bg-gray-600 text-gray-100',
  },
  running: {
    label: 'Running',
    // Indigo — WCAG AA contrast on dark
    className: 'bg-indigo-600 text-indigo-100',
  },
  error: {
    label: 'Error',
    // Red
    className: 'bg-red-700 text-red-100',
  },
  pending: {
    label: 'Pending',
    // Amber — dark text for contrast on yellow tones
    className: 'bg-amber-500 text-amber-950',
  },
  completed: {
    label: 'Completed',
    // Green
    className: 'bg-green-700 text-green-100',
  },
  failed: {
    label: 'Failed',
    // Orange-red — visually distinct from both 'error' (red) and 'pending' (amber)
    className: 'bg-orange-600 text-orange-100',
  },
};

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { label, className } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
