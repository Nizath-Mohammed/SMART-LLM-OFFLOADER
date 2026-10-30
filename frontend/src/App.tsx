import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AgentsPage } from './pages/AgentsPage';
import { TaskExecutionPage } from './pages/TaskExecutionPage';
import { DecisionEnginePage } from './pages/DecisionEnginePage';
import { ModelManagerPage } from './pages/ModelManagerPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { ModelLifecyclePage } from './pages/ModelLifecyclePage';
import { CollaborationPage } from './pages/CollaborationPage';

export function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:agentId" element={<AgentsPage />} />
        <Route path="/tasks" element={<TaskExecutionPage />} />
        <Route path="/tasks/:agentId" element={<TaskExecutionPage />} />
        <Route path="/decision" element={<DecisionEnginePage />} />
        <Route path="/models" element={<ModelManagerPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/benchmarks" element={<BenchmarksPage />} />
        <Route path="/lifecycle" element={<ModelLifecyclePage />} />
        <Route path="/collaboration" element={<CollaborationPage />} />
      </Route>
    </Routes>
  );
}

export default App;
