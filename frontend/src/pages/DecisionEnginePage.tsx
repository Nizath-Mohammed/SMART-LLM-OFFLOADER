import React, { useState } from 'react';
import { useHardware } from '../hooks/useHardware';
import { useAgents } from '../hooks/useAgents';
import { useRecommendation } from '../hooks/useRecommendation';
import { HardwarePanel } from '../components/decision/HardwarePanel';
import { RecommendationForm } from '../components/decision/RecommendationForm';
import { RecommendationPanel } from '../components/decision/RecommendationPanel';
import { ErrorNotification } from '../components/ui/ErrorNotification';

export function DecisionEnginePage(): React.ReactElement {
  const { hardware, loading: hwLoading, error: hwError } = useHardware();
  const { agents } = useAgents();
  const {
    recommendation,
    loading: recLoading,
    error: recError,
    requestRecommendation,
  } = useRecommendation();

  const [dismissedHwError, setDismissedHwError] = useState<boolean>(false);
  const [dismissedRecError, setDismissedRecError] = useState<boolean>(false);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Intelligent Decision Engine</h1>
        <p className="text-sm text-gray-400 mt-1">
          Hardware-aware analysis and local LLM configuration recommendations
        </p>
      </div>

      {hwError && !dismissedHwError && (
        <ErrorNotification
          message={`Hardware detection warning: ${hwError}`}
          onDismiss={() => setDismissedHwError(true)}
        />
      )}

      {recError && !dismissedRecError && (
        <ErrorNotification
          message={`Recommendation error: ${recError}`}
          onDismiss={() => setDismissedRecError(true)}
        />
      )}

      {/* 1. Detected Hardware Environment */}
      <HardwarePanel
        hardware={hardware}
        loading={hwLoading}
        error={null}
      />

      {/* 2. Task Submission & Prompt Analyzer Form */}
      <RecommendationForm
        onSubmit={async (prompt, agentId) => {
          setDismissedRecError(false);
          await requestRecommendation(prompt, agentId);
        }}
        agents={agents}
        loading={recLoading}
      />

      {/* 3. Output Recommendation Panel */}
      <RecommendationPanel
        recommendation={recommendation}
        error={recError}
      />
    </div>
  );
}

export default DecisionEnginePage;
