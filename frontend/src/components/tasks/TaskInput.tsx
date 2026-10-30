import React, { useState } from 'react';

interface TaskInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  disabled?: boolean;
}

export function TaskInput({ onSubmit, disabled = false }: TaskInputProps): React.ReactElement {
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(prompt.trim());
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="task-prompt" className="block text-sm font-medium text-gray-300 mb-1">
          Task Prompt
        </label>
        <textarea
          id="task-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Describe the task for the agent…"
          disabled={disabled || submitting}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y disabled:opacity-50"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || submitting || !prompt.trim()}
          className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Run Task'}
        </button>
      </div>
    </form>
  );
}

export default TaskInput;
