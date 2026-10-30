import React, { useState } from 'react';
import { useModelLifecycle } from '../hooks/useModelLifecycle';
import { ErrorNotification } from '../components/ui/ErrorNotification';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function ModelLifecyclePage(): React.ReactElement {
  const { entries, events, loading, error, unloadModel, updateConfig } = useModelLifecycle();
  const [dismissed, setDismissed] = useState(false);
  const [confirmModel, setConfirmModel] = useState<string | null>(null);
  const [autoUnload, setAutoUnload] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState('300');
  const [showEvents, setShowEvents] = useState(false);

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Model Lifecycle</h1>
      {!dismissed && error && <ErrorNotification message={error} onDismiss={() => setDismissed(true)} />}

      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Installed Models</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Last Used</th>
                <th className="py-2 pr-4">Loaded</th>
                <th className="py-2 pr-4">Est. RAM</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.modelName} className="border-b border-gray-700/50">
                  <td className="py-2 pr-4 text-gray-200">{e.modelName}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {e.lastUsedAt ? new Date(e.lastUsedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${e.isLoaded ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {e.isLoaded ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {e.estimatedRamMB != null ? `${e.estimatedRamMB} MB` : '—'}
                  </td>
                  <td className="py-2">
                    {e.isLoaded && (
                      <button
                        onClick={() => setConfirmModel(e.modelName)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Unload
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Auto-Unload Settings</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox" checked={autoUnload}
              onChange={e => setAutoUnload(e.target.checked)}
              className="w-4 h-4"
            />
            Enable auto-unload on idle
          </label>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Idle timeout (seconds)</label>
            <input
              type="number" min={60} value={idleTimeout}
              onChange={e => setIdleTimeout(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDismissed(false);
                void updateConfig({ autoUnloadEnabled: autoUnload, idleTimeoutSeconds: parseInt(idleTimeout, 10) });
              }}
              className="px-4 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          {showEvents ? '▲' : '▼'} Lifecycle Events ({events.length})
        </button>
        {showEvents && (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {events.map(ev => (
              <li key={ev.id} className="text-xs text-gray-400">
                <span className="text-gray-300">{ev.modelName}</span> — {ev.eventType} ({ev.reason}) at {new Date(ev.occurredAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!confirmModel}
        title="Unload Model"
        description={`Unload "${confirmModel}" from Ollama to free RAM?`}
        confirmLabel="Unload"
        onCancel={() => setConfirmModel(null)}
        onConfirm={() => {
          if (confirmModel) {
            setDismissed(false);
            void unloadModel(confirmModel);
          }
          setConfirmModel(null);
        }}
      />
    </div>
  );
}

export default ModelLifecyclePage;
