import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationPanel } from './RecommendationPanel';
import { Recommendation } from '../../types/index';

const sampleRec: Recommendation = {
  id: 'rec-123',
  taskCategory: 'coding',
  taskComplexity: 'medium',
  recommendedModel: 'Phi-3.5-mini',
  recommendedQuantization: 'Q5_K_M',
  estimatedMemoryMB: 3184,
  recommendedContextLength: 128000,
  executionStrategy: 'normal_local',
  compatibilityWarnings: [
    'Memory headroom is near limits; close background applications.',
  ],
  explanation: 'Selected Phi-3.5-mini Q5_K_M for coding task.',
  confidenceLevel: 'high',
  prompt: 'Write a Python function.',
  agentId: null,
  createdAt: new Date().toISOString(),
};

describe('RecommendationPanel', () => {
  it('shows EmptyState when recommendation is null', () => {
    render(<RecommendationPanel recommendation={null} />);
    expect(screen.getByText(/No recommendation generated yet/i)).toBeInTheDocument();
  });

  it('renders all key recommendation fields when provided', () => {
    render(<RecommendationPanel recommendation={sampleRec} />);

    expect(screen.getByText('Phi-3.5-mini')).toBeInTheDocument();
    expect(screen.getByText('Q5_K_M')).toBeInTheDocument();
    expect(screen.getByText(/3,184 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/128,000 tokens/i)).toBeInTheDocument();
    expect(screen.getByText('NORMAL LOCAL')).toBeInTheDocument();
    expect(screen.getByText('CODING')).toBeInTheDocument();
    expect(screen.getByText('Complexity: MEDIUM')).toBeInTheDocument();
    expect(screen.getByText(/Confidence: HIGH/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected Phi-3.5-mini Q5_K_M for coding task/i)).toBeInTheDocument();
  });

  it('renders compatibility warnings in amber-styled elements', () => {
    render(<RecommendationPanel recommendation={sampleRec} />);

    const warningText = screen.getByText(/Memory headroom is near limits/i);
    expect(warningText).toBeInTheDocument();
    const warningContainer = warningText.closest('div');
    expect(warningContainer?.className).toContain('border-amber-500');
    expect(warningContainer?.className).toContain('text-amber-200');
  });

  it('renders confidence badge in green tone for high confidence', () => {
    render(<RecommendationPanel recommendation={sampleRec} />);
    const badge = screen.getByText(/Confidence: HIGH/i);
    expect(badge.className).toContain('text-green-300');
  });

  it('renders confidence badge in red tone for low confidence', () => {
    const lowRec: Recommendation = {
      ...sampleRec,
      confidenceLevel: 'low',
    };
    render(<RecommendationPanel recommendation={lowRec} />);
    const badge = screen.getByText(/Confidence: LOW/i);
    expect(badge.className).toContain('text-red-300');
  });
});
