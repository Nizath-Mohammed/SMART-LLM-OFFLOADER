import React, { useState } from 'react';

interface CreateAgentFormProps {
  onSubmit: (name: string, systemPrompt: string) => Promise<void>;
  onCancel?: () => void;
}

export function CreateAgentForm({ onSubmit, onCancel }: CreateAgentFormProps): React.ReactElement {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim(), systemPrompt);
      setName('');
      setSystemPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          placeholder="e.g. Research Bot"
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>
      <div>
        <label htmlFor="agent-system-prompt" className="block text-sm font-medium text-gray-300 mb-1">
          System Prompt <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          maxLength={50000}
          rows={4}
          placeholder="e.g. You are a research assistant..."
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating…' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
}

export default CreateAgentForm;
