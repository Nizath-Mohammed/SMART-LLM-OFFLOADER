import React, { useState } from 'react';
import { Agent } from '../../types/index';
import { StatusBadge } from '../ui/StatusBadge';

interface AgentDetailProps {
  agent: Agent;
  onUpdateConfig?: (config: { modelRef: string }) => Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const AVAILABLE_MODELS = [
  { name: 'qwen2.5:1.5b', label: 'Qwen 2.5 1.5B (Local Fast Edge)', size: '986 MB', defaultQuant: 'Q4_K_M', is70b: false },
  { name: 'llama3.2:1b', label: 'Llama 3.2 1B (Lightweight Local)', size: '1.3 GB', defaultQuant: 'Q4_K_M', is70b: false },
  { name: 'tinyllama:latest', label: 'TinyLlama 1.1B (Ultra Compact)', size: '637 MB', defaultQuant: 'Q4_0', is70b: false },
  { name: 'qwen2.5:0.5b', label: 'Qwen 2.5 0.5B (Instant Memory Saving)', size: '397 MB', defaultQuant: 'Q4_K_M', is70b: false },
  { name: 'qwen2.5:14b', label: 'Qwen 2.5 14B (Layer Offload Recommended)', size: '9.0 GB', defaultQuant: 'Q4_K_M', is70b: false },
  { name: 'llama3.3:70b', label: 'Llama 3.3 70B (Sequential AirLLM / Disk-RAM Offload)', size: '40.0 GB', defaultQuant: 'Q4_K_M', is70b: true },
  { name: 'qwen2.5:72b', label: 'Qwen 2.5 72B (Extreme Scale Sequential)', size: '41.5 GB', defaultQuant: 'Q4_K_M', is70b: true },
];

export function AgentDetail({ agent, onUpdateConfig }: AgentDetailProps): React.ReactElement {
  const [selectedModel, setSelectedModel] = useState<string>(agent.modelRef || 'qwen2.5:1.5b');
  const [selectedQuant, setSelectedQuant] = useState<string>('Q4_K_M');
  const [layerOffloading, setLayerOffloading] = useState<boolean>(
    selectedModel.includes('70b') || selectedModel.includes('72b') || selectedModel.includes('14b')
  );
  const [kvCacheOptimization, setKvCacheOptimization] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    if (modelName.includes('70b') || modelName.includes('72b') || modelName.includes('14b')) {
      setLayerOffloading(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!onUpdateConfig) return;
    setSaving(true);
    try {
      await onUpdateConfig({ modelRef: selectedModel });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const isExtremeScale = selectedModel.includes('70b') || selectedModel.includes('72b');

  return (
    <div className="bg-[#121826]/90 rounded-2xl border border-gray-800 p-6 space-y-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{agent.name}</h2>
            <StatusBadge status={agent.status} />
          </div>
          <span className="text-xs text-gray-500 font-mono mt-0.5 block">{agent.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Active Engine:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
            {agent.modelRef || 'Auto-fallback'}
          </span>
        </div>
      </div>

      {/* System Prompt View */}
      <div className="rounded-xl bg-gray-900/60 border border-gray-800/80 p-4">
        <dt className="text-gray-400 uppercase tracking-wider text-xs font-semibold mb-1">Agent System Persona / Prompt</dt>
        <dd className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {agent.systemPrompt || <span className="italic text-gray-500">No custom system prompt specified.</span>}
        </dd>
      </div>

      {/* Model & Edge Optimization Tuning Panel */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-gray-900/80 border border-indigo-700/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Model & Hardware Offloading Configuration
            </h3>
          </div>
          {isExtremeScale && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
              ⚡ 70B Extreme Scale Mode
            </span>
          )}
        </div>

        {/* 1. Model Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Select Active Model Engine
          </label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <optgroup label="Local Installed Models">
              {AVAILABLE_MODELS.filter((m) => !m.is70b).map((m) => (
                <option key={m.name} value={m.name}>
                  {m.label} — {m.size}
                </option>
              ))}
            </optgroup>
            <optgroup label="Extreme Scale Offloaded Models (70B+)">
              {AVAILABLE_MODELS.filter((m) => m.is70b).map((m) => (
                <option key={m.name} value={m.name}>
                  {m.label} — {m.size}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* 2. Quantization Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Quantization Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'Q4_K_M', title: 'Q4_K_M (Recommended)', desc: 'Optimal balanced precision & RAM' },
              { id: 'Q5_K_M', title: 'Q5_K_M (Higher Quality)', desc: 'Slightly higher memory for accuracy' },
              { id: 'Q8_0', title: 'Q8_0 (Near FP16)', desc: 'Maximum precision benchmark' },
              { id: 'Q2_K', title: 'Q2_K (Extreme Compression)', desc: 'Smallest footprint for 70B' },
            ].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuant(q.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedQuant === q.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="text-xs font-bold text-gray-200">{q.id}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{q.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Layer-by-Layer and KV Cache Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Layer-by-Layer Offload */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-200 block">
                Sequential Layer Offloading
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block leading-tight">
                Streams layers sequentially from SSD/RAM to enable running 14B–70B on 8GB systems.
              </span>
            </div>
            <input
              type="checkbox"
              checked={layerOffloading}
              onChange={(e) => setLayerOffloading(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* KV Cache Optimization */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-gray-200 block">
                Quantized KV-Cache Memory
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block leading-tight">
                Saves up to 75% memory on long contexts with FP8 / Q4 cache quantization.
              </span>
            </div>
            <input
              type="checkbox"
              checked={kvCacheOptimization}
              onChange={(e) => setKvCacheOptimization(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400">
            {isExtremeScale
              ? '✨ 70B sequential offload pipeline activated'
              : '⚡ Local high-speed inference pipeline configured'}
          </span>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {saving ? 'Applying...' : savedSuccess ? '✓ Applied & Saved' : 'Apply Configuration to Agent'}
          </button>
        </div>
      </div>

      <div className="text-[11px] text-gray-500">
        Created on: {formatDate(agent.createdAt)}
      </div>
    </div>
  );
}

export default AgentDetail;

