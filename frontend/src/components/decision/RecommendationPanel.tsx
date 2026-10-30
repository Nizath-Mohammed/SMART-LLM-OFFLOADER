import React from 'react';
import { Recommendation, ConfidenceLevel } from '../../types/index';
import { EmptyState } from '../ui/EmptyState';

interface RecommendationPanelProps {
  recommendation: Recommendation | null;
  error?: string | null;
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }): React.ReactElement {
  let badgeColor = '';
  switch (level) {
    case 'high':
      badgeColor = 'bg-green-900/50 border-green-500/50 text-green-300';
      break;
    case 'medium':
      badgeColor = 'bg-yellow-900/50 border-yellow-500/50 text-yellow-300';
      break;
    case 'low':
      badgeColor = 'bg-red-900/50 border-red-500/50 text-red-300';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeColor}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          level === 'high' ? 'bg-green-400' : level === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
        }`}
      />
      Confidence: {level.toUpperCase()}
    </span>
  );
}

function CategoryPill({ category }: { category: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-900/50 border border-indigo-600/40 text-indigo-300">
      {category.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function ComplexityPill({ complexity }: { complexity: string }): React.ReactElement {
  let color = 'bg-gray-800 border-gray-600 text-gray-300';
  if (complexity === 'low') {
    color = 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300';
  } else if (complexity === 'medium') {
    color = 'bg-sky-950/60 border-sky-600/40 text-sky-300';
  } else if (complexity === 'high') {
    color = 'bg-purple-950/60 border-purple-600/40 text-purple-300';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${color}`}>
      Complexity: {complexity.toUpperCase()}
    </span>
  );
}

export function RecommendationPanel({
  recommendation,
}: RecommendationPanelProps): React.ReactElement {
  if (!recommendation) {
    return (
      <EmptyState message="No recommendation generated yet. Submit a task prompt above to analyze requirements and receive model suggestions." />
    );
  }

  return (
    <div className="rounded-xl border border-gray-700/80 bg-gray-800 p-6 shadow-lg flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-700/50">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Recommended Inference Configuration</h2>
          <p className="text-xs text-gray-400">
            Optimized for detected hardware and task characteristics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPill category={recommendation.taskCategory} />
          <ComplexityPill complexity={recommendation.taskComplexity} />
          <ConfidenceBadge level={recommendation.confidenceLevel} />
        </div>
      </div>

      {/* Compatibility Warnings */}
      {recommendation.compatibilityWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Compatibility Warnings
          </h3>
          {recommendation.compatibilityWarnings.map((warning, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg border border-amber-500 bg-amber-900/30 px-3.5 py-2.5 text-xs text-amber-200"
            >
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid of Key Recommendation Specifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Recommended Model */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-4">
          <span className="text-xs font-medium text-gray-400">Recommended Model</span>
          <p className="text-lg font-bold text-gray-100 mt-1">
            {recommendation.recommendedModel}
          </p>
        </div>

        {/* Quantization Variant */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-4">
          <span className="text-xs font-medium text-gray-400">Quantization Variant</span>
          <p className="text-lg font-bold text-gray-100 mt-1">
            {recommendation.recommendedQuantization ?? (
              <span className="text-rose-400 font-semibold text-sm">None (Exceeds RAM)</span>
            )}
          </p>
        </div>

        {/* Estimated Memory */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-4">
          <span className="text-xs font-medium text-gray-400">Estimated Total Memory</span>
          <p className="text-lg font-bold text-gray-100 mt-1">
            {recommendation.estimatedMemoryMB.toLocaleString('en-US')} MB{' '}
            <span className="text-xs font-normal text-gray-400">
              ({(recommendation.estimatedMemoryMB / 1024).toFixed(2)} GB)
            </span>
          </p>
        </div>

        {/* Context Window */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-4">
          <span className="text-xs font-medium text-gray-400">Recommended Context</span>
          <p className="text-lg font-bold text-gray-100 mt-1">
            {recommendation.recommendedContextLength.toLocaleString('en-US')} tokens
          </p>
        </div>

        {/* Execution Strategy */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-4 sm:col-span-2">
          <span className="text-xs font-medium text-gray-400">Execution Strategy</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold bg-gray-800 border border-gray-600 text-indigo-300">
              {recommendation.executionStrategy.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation Text */}
      <div className="rounded-lg bg-gray-900/40 border border-gray-700/40 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Recommendation Rationale & Decision Details
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed">
          {recommendation.explanation}
        </p>
      </div>
    </div>
  );
}

export default RecommendationPanel;
