import React from 'react';

interface ErrorNotificationProps {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorNotification({
  message,
  onDismiss,
}: ErrorNotificationProps): React.ReactElement | null {
  if (message === null) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start justify-between gap-3 rounded-md bg-rose-900 px-4 py-3 text-rose-100 shadow-md"
    >
      <span className="text-sm leading-5">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="flex-shrink-0 rounded p-0.5 text-rose-300 hover:bg-rose-800 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
      >
        {/* Multiplication sign — cleaner than × entity in JSX */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

export default ErrorNotification;
