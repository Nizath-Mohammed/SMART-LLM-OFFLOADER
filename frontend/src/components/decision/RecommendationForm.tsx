import React, { useState } from 'react';
import { Agent } from '../../types/index';

interface RecommendationFormProps {
  onSubmit: (prompt: string, agentId?: string) => Promise<void> | void;
  agents: Agent[];
  loading: boolean;
}

const MAX_PROMPT_LENGTH = 10000;

export function RecommendationForm({
  onSubmit,
  agents,
  loading,
}: RecommendationFormProps): React.ReactElement {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!prompt.trim()) {
      setValidationError('Please enter a task prompt for analysis.');
      return;
    }

    setValidationError(null);
    await onSubmit(prompt, selectedAgentId ? selectedAgentId : undefined);
  };

  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800 p-6 shadow-lg">
      <div className="pb-4 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-100">Task Analysis & Model Recommendation</h2>
        <p className="text-xs text-gray-400">
          Describe the workload to analyze its computational complexity and receive tailored local LLM parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="task-prompt" className="block text-xs font-medium text-gray-300 mb-1.5">
            Task Prompt <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="task-prompt"
            name="prompt"
            rows={4}
            maxLength={MAX_PROMPT_LENGTH}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Write a Python function that parses CSV data, computes moving averages, and outputs summary statistics..."
            className="w-full rounded-lg border border-gray-600 bg-gray-900/80 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
            <span>
              {validationError && <span className="text-rose-400 font-medium">{validationError}</span>}
            </span>
            <span>
              {prompt.length.toLocaleString('en-US')} / {MAX_PROMPT_LENGTH.toLocaleString('en-US')} chars
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
          <div className="w-full sm:w-72">
            <label htmlFor="agent-select" className="block text-xs font-medium text-gray-300 mb-1.5">
              Assign to Agent (Optional)
            </label>
            <select
              id="agent-select"
              name="agentId"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-900/80 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">No agent (Direct query)</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analyzing Task...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Recommendation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RecommendationForm;
