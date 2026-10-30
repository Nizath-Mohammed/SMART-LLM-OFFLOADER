import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/', icon: '📊' },
  { label: 'My Agents', to: '/agents', icon: '🤖' },
  { label: 'Task Execution', to: '/tasks', icon: '⚡' },
  { label: 'Decision Engine', to: '/decision', icon: '🧠' },
  { label: 'Model Manager', to: '/models', icon: '📦' },
  { label: 'Scheduler', to: '/scheduler', icon: '⏱️' },
  { label: 'Benchmarks', to: '/benchmarks', icon: '📈' },
  { label: 'Model Lifecycle', to: '/lifecycle', icon: '🔄' },
  { label: 'Collaboration', to: '/collaboration', icon: '👥' },
];

export function Sidebar(): React.ReactElement {
  return (
    <aside className="w-64 min-h-screen bg-[#0E131F]/90 border-r border-gray-800/80 flex flex-col backdrop-blur-md">
      <div className="px-5 py-5 border-b border-gray-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-white text-base">
          ⚡
        </div>
        <div>
          <span className="text-white font-bold text-base tracking-tight block">Smart Offloader</span>
          <span className="text-[11px] text-cyan-400 font-medium tracking-wider uppercase block">Edge AI Studio</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, to, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/20 text-white border border-indigo-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50',
              ].join(' ')
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800/60 m-3 rounded-xl bg-gray-900/60 border border-gray-800/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-gray-300 font-medium">Ollama Connected</span>
        </div>
        <span className="text-[10px] text-gray-500 mt-1 block">Local Inference Ready</span>
      </div>
    </aside>
  );
}

export default Sidebar;

