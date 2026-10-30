import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'My Agents', to: '/agents' },
  { label: 'Task Execution', to: '/tasks' },
  { label: 'Decision Engine', to: '/decision' },
  { label: 'Model Manager', to: '/models' },
  { label: 'Scheduler', to: '/scheduler' },
  { label: 'Benchmarks', to: '/benchmarks' },
  { label: 'Model Lifecycle', to: '/lifecycle' },
  { label: 'Collaboration', to: '/collaboration' },
];

export function Sidebar(): React.ReactElement {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight">EdgeLLM</span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-gray-800 text-white font-medium border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
