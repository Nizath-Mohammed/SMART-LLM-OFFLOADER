import React, { useState, useEffect } from 'react';
import { Agent } from '../../types/index';

interface EditSystemPromptModalProps {
  agent: Agent;
  isOpen: boolean;
  onConfirm: (systemPrompt: string) => Promise<void>;
  onCancel: () => void;
}

export function EditSystemPromptModal({ agent, isOpen, onConfirm, onCancel }: EditSystemPromptModalProps): React.ReactElement | null {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt(agent.systemPrompt);
      setError(null);
    }
  }, [isOpen, agent.systemPrompt]);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-prompt-title"
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-prompt-title" className="text-lg font-semibold text-white mb-4">Edit System Prompt</h2>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label htmlFor="edit-prompt-input" className="block text-sm font-medium text-gray-300 mb-1">
              System Prompt <span className="text-gray-500">(empty string is valid)</span>
            </label>
            <textarea
              id="edit-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={50000}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-y"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSystemPromptModal;
