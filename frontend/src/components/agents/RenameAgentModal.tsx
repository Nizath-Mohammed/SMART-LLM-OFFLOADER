import React, { useState, useEffect } from 'react';
import { Agent } from '../../types/index';

interface RenameAgentModalProps {
  agent: Agent;
  isOpen: boolean;
  onConfirm: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameAgentModal({ agent, isOpen, onConfirm, onCancel }: RenameAgentModalProps): React.ReactElement | null {
  const [name, setName] = useState(agent.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(agent.name);
      setError(null);
    }
  }, [isOpen, agent.name]);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(name.trim());
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
        aria-labelledby="rename-title"
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rename-title" className="text-lg font-semibold text-white mb-4">Rename Agent</h2>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label htmlFor="rename-input" className="block text-sm font-medium text-gray-300 mb-1">New Name</label>
            <input
              id="rename-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {submitting ? 'Renaming…' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RenameAgentModal;
