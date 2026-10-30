import React from 'react';

interface EmptyStateProps {
  message: string;
  children?: React.ReactNode;
}

export function EmptyState({ message, children }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 max-w-sm w-full">
        <p className="text-gray-400 text-sm mb-4">{message}</p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

export default EmptyState;
