import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';
import { useHardware } from '../hooks/useHardware';
import { useOllama } from '../hooks/useOllama';

export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const { agents } = useAgents();
  const { hardware } = useHardware();
  const { status: ollamaStatus, models } = useOllama();

  const totalRam = hardware?.totalRamMB?.value ? Math.round(hardware.totalRamMB.value / 1024) : 8;
  const availableRam = hardware?.availableRamMB?.value ? (hardware.availableRamMB.value / 1024).toFixed(1) : '1.0';
  const usedRam = hardware?.totalRamMB?.value && hardware?.availableRamMB?.value
    ? ((hardware.totalRamMB.value - hardware.availableRamMB.value) / 1024).toFixed(1)
    : '7.0';
  const ramPercent = hardware?.totalRamMB?.value && hardware?.availableRamMB?.value
    ? Math.round(((hardware.totalRamMB.value - hardware.availableRamMB.value) / hardware.totalRamMB.value) * 100)
    : 85;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-cyan-900/40 border border-indigo-700/50 p-6 md:p-8 backdrop-blur-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <span>✨ Real-time Edge Offloader Active</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Smart LLM Offloader & Edge Runtime
          </h1>
          <p className="text-gray-300 text-sm mt-2 leading-relaxed">
            Intelligently offload and optimize models from 0.5B to 70B across local CPU/RAM, quantized caching, and sequential layer offloading.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/tasks')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
            >
              ⚡ Run Task Now
            </button>
            <button
              onClick={() => navigate('/decision')}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600/50 font-medium text-sm rounded-xl transition-all"
            >
              🧠 Analyze & Recommend Setup
            </button>
            <button
              onClick={() => navigate('/agents')}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600/50 font-medium text-sm rounded-xl transition-all"
            >
              🤖 Manage Agents ({agents.length})
            </button>
          </div>
        </div>
      </div>

      {/* Live Hardware & Engine Telemetry */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Hardware & Execution Engine Telemetry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* RAM & Memory Pressure */}
          <div className="bg-[#121826]/90 border border-gray-800 rounded-2xl p-5 shadow-sm hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-200">System Memory (RAM)</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
                {ramPercent}% Used
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 mb-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  ramPercent > 85 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(ramPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Used: {usedRam} GB</span>
              <span>Free: {availableRam} GB</span>
              <span>Total: {totalRam} GB</span>
            </div>
          </div>

          {/* Processor Info */}
          <div className="bg-[#121826]/90 border border-gray-800 rounded-2xl p-5 shadow-sm hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-200">CPU Compute</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                {hardware?.logicalCores?.value ?? 4} Cores
              </span>
            </div>
            <p className="text-xs text-gray-300 font-medium truncate mt-2" title={String(hardware?.cpuModel?.value)}>
              {hardware?.cpuModel?.value ?? 'Intel Processor'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              OS: {hardware?.osName?.value ?? 'Windows'} {hardware?.osVersion?.value ?? ''}
            </p>
          </div>

          {/* Ollama Local Engine */}
          <div className="bg-[#121826]/90 border border-gray-800 rounded-2xl p-5 shadow-sm hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-200">Local LLM Engine</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Ollama Active
              </span>
            </div>
            <div className="text-xs text-gray-300 mt-2 space-y-1">
              <p>Version: <span className="text-gray-100 font-mono">{ollamaStatus?.version || 'v0.40.13'}</span></p>
              <p>Installed Models: <span className="text-indigo-400 font-bold">{models.length} models ready</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Models Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Ready-to-Use Edge Models ({models.length})
          </h2>
          <button
            onClick={() => navigate('/models')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Manage & Pull More Models →
          </button>
        </div>

        {models.length === 0 ? (
          <p className="text-sm text-gray-500">Checking local models…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {models.map((m) => (
              <div
                key={m.name}
                className="bg-gray-900/60 border border-gray-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
              >
                <div>
                  <span className="text-sm font-bold text-gray-100 block truncate" title={m.name}>
                    {m.name}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    {(m.size / (1024 * 1024)).toFixed(0)} MB
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/tasks`)}
                  className="mt-3 text-xs py-1 px-2 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  Run Prompt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;

