import React, { useState } from 'react';
import { useOllama } from '../hooks/useOllama';
import { useHuggingFace } from '../hooks/useHuggingFace';
import { useAgents } from '../hooks/useAgents';
import { useExecutions } from '../hooks/useExecutions';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import { EmptyState } from '../components/ui/EmptyState';
import type { OllamaModel, HuggingFaceModel } from '../types/index';

// Helper: format bytes to human-readable
function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function ModelManagerPage(): React.ReactElement {
  const {
    status, models, loading: ollamaLoading, error: ollamaError,
    activePull, refreshStatus, refreshModels, startPull, stopPull, removeModel,
  } = useOllama();

  const { results: hfResults, loading: hfLoading, error: hfError, search: hfSearch } = useHuggingFace();
  const { agents } = useAgents();
  const { currentExecution, loading: execLoading, error: execError, execute } = useExecutions();

  const [hfQuery, setHfQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [execPrompt, setExecPrompt] = useState('');
  const [execAgentId, setExecAgentId] = useState('');
  const [dismissedError, setDismissedError] = useState(false);

  const combinedError = ollamaError || execError || hfError;

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Model Manager</h1>

      {/* Error banner */}
      {!dismissedError && combinedError && (
        <ErrorNotification message={combinedError} onDismiss={() => setDismissedError(true)} />
      )}

      {/* ── Ollama Status ──────────────────────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Ollama Runtime</h2>
          <button
            onClick={() => { setDismissedError(false); refreshStatus(); refreshModels(); }}
            className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
        {status ? (
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${status.available ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-200">
              {status.available
                ? `Connected — Ollama ${status.version} at ${status.host}`
                : `Not available — ${status.error ?? 'Cannot reach Ollama'}`}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Checking Ollama status…</p>
        )}
      </section>

      {/* ── Installed Models ───────────────────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Installed Models</h2>

        {/* Pull model input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            placeholder="Model name (e.g. qwen2.5:0.5b)"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { if (selectedModel.trim()) startPull(selectedModel.trim()); }}
            disabled={!selectedModel.trim() || !!(activePull?.status.match(/^(starting|pulling|verifying)$/))}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            Download
          </button>
        </div>

        {/* Pull progress */}
        {activePull && (
          <div className="bg-gray-900 rounded-md p-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{activePull.model} — {activePull.status}</span>
              <span>{activePull.percent ?? 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full">
              <div
                className="h-1.5 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${activePull.percent ?? 0}%` }}
              />
            </div>
            {(activePull.status === 'pulling' || activePull.status === 'starting') && (
              <button
                onClick={() => stopPull(activePull.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            )}
            {activePull.errorMessage && (
              <p className="text-xs text-red-400">{activePull.errorMessage}</p>
            )}
          </div>
        )}

        {ollamaLoading ? (
          <p className="text-sm text-gray-500">Loading models…</p>
        ) : models.length === 0 ? (
          <EmptyState message="No models installed. Download one above or use the Hugging Face search." />
        ) : (
          <ul className="divide-y divide-gray-700">
            {models.map((m: OllamaModel) => (
              <li key={m.name} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-100">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.details.parameterSize} · {m.details.quantizationLevel.toUpperCase()} · {formatBytes(m.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeModel(m.name)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Hugging Face Search ────────────────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Discover Models on Hugging Face</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={hfQuery}
            onChange={e => setHfQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && hfSearch(hfQuery)}
            placeholder="Search GGUF models (e.g. Llama 3.2)"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => hfSearch(hfQuery)}
            disabled={hfLoading || !hfQuery.trim()}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {hfLoading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {hfResults.length > 0 && (
          <ul className="divide-y divide-gray-700 max-h-72 overflow-y-auto">
            {hfResults.map((m: HuggingFaceModel) => (
              <li key={m.id} className="py-2.5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.author} · {m.downloads.toLocaleString()} downloads</p>
                    {m.description && <p className="text-xs text-gray-400 line-clamp-2">{m.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${m.isCompatible ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {m.isCompatible ? 'Compatible' : 'Not compatible'}
                    </span>
                    {m.isInstalled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">Installed</span>
                    )}
                    {m.isDownloadable && m.ollamaModelTag && !m.isInstalled && (
                      <button
                        onClick={() => startPull(m.ollamaModelTag!)}
                        className="text-xs px-2 py-0.5 rounded bg-indigo-700 text-white hover:bg-indigo-600"
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
                {!m.isCompatible && (
                  <p className="text-xs text-amber-400">{m.compatibilityReason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Run Inference ──────────────────────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Run Inference</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a model…</option>
              {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Agent (optional)</label>
            <select
              value={execAgentId}
              onChange={e => setExecAgentId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No agent</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <textarea
          value={execPrompt}
          onChange={e => setExecPrompt(e.target.value)}
          maxLength={10000}
          rows={4}
          placeholder="Enter your prompt…"
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{execPrompt.length} / 10,000</span>
          <button
            onClick={async () => {
              if (!selectedModel || !execPrompt.trim()) return;
              setDismissedError(false);
              await execute({
                modelName: selectedModel,
                prompt: execPrompt.trim(),
                agentId: execAgentId || undefined,
              });
            }}
            disabled={execLoading || !selectedModel || !execPrompt.trim()}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {execLoading ? 'Running…' : 'Run'}
          </button>
        </div>

        {/* Execution result */}
        {currentExecution && (
          <div className={`rounded-md p-4 space-y-2 border ${
            currentExecution.status === 'completed'
              ? 'bg-gray-900 border-gray-700'
              : 'bg-red-950 border-red-800'
          }`}>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium text-gray-300">{currentExecution.modelName}</span>
              <span>
                {currentExecution.durationMs != null ? `${currentExecution.durationMs} ms` : ''}
                {currentExecution.totalTokens != null ? ` · ${currentExecution.totalTokens} tokens` : ''}
              </span>
            </div>
            {currentExecution.status === 'completed' && currentExecution.response ? (
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{currentExecution.response}</p>
            ) : (
              <p className="text-sm text-red-300">{currentExecution.errorMessage ?? 'Execution failed.'}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default ModelManagerPage;
