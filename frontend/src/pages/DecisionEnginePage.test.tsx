import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecisionEnginePage } from './DecisionEnginePage';
import * as hardwareHook from '../hooks/useHardware';
import * as agentsHook from '../hooks/useAgents';
import * as recommendationHook from '../hooks/useRecommendation';
import { HardwareInfo, Recommendation } from '../types/index';

const sampleHardware: HardwareInfo = {
  totalRamMB: { value: 8192, source: 'measured' },
  availableRamMB: { value: 5120, source: 'measured' },
  cpuModel: { value: 'Intel Core i3', source: 'measured' },
  logicalCores: { value: 8, source: 'measured' },
  osName: { value: 'Windows_NT', source: 'measured' },
  osVersion: { value: '10.0.22631', source: 'measured' },
  gpuName: { value: null, source: 'unavailable' },
  gpuVramMB: { value: null, source: 'unavailable' },
};

const sampleRecommendation: Recommendation = {
  id: 'rec-test-1',
  taskCategory: 'coding',
  taskComplexity: 'medium',
  recommendedModel: 'Phi-3.5-mini',
  recommendedQuantization: 'Q5_K_M',
  estimatedMemoryMB: 3184,
  recommendedContextLength: 128000,
  executionStrategy: 'normal_local',
  compatibilityWarnings: [],
  explanation: 'Selected Phi-3.5-mini for Python coding task.',
  confidenceLevel: 'high',
  prompt: 'Write a Python function to sort numbers.',
  agentId: null,
  createdAt: new Date().toISOString(),
};

describe('DecisionEnginePage', () => {
  const requestRecommendationMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(hardwareHook, 'useHardware').mockReturnValue({
      hardware: sampleHardware,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    vi.spyOn(agentsHook, 'useAgents').mockReturnValue({
      agents: [],
      loading: false,
      error: null,
      createAgent: vi.fn(),
      renameAgent: vi.fn(),
      updateSystemPrompt: vi.fn(),
      updateAgentConfig: vi.fn(),
      deleteAgent: vi.fn(),
      refresh: vi.fn(),
    });

    vi.spyOn(recommendationHook, 'useRecommendation').mockReturnValue({
      recommendation: null,
      loading: false,
      error: null,
      requestRecommendation: requestRecommendationMock,
      clearRecommendation: vi.fn(),
    });
  });

  it('renders hardware panel, task submission form, and results panel on load', () => {
    render(<DecisionEnginePage />);

    expect(screen.getByText('Intelligent Decision Engine')).toBeInTheDocument();
    expect(screen.getByText('Host Hardware Environment')).toBeInTheDocument();
    expect(screen.getByText('Task Analysis & Model Recommendation')).toBeInTheDocument();
    expect(screen.getByText(/No recommendation generated yet/i)).toBeInTheDocument();
  });

  it('submitting the form calls requestRecommendation with prompt and agent', async () => {
    const user = userEvent.setup();
    render(<DecisionEnginePage />);

    const textarea = screen.getByLabelText(/Task Prompt/i);
    const submitBtn = screen.getByRole('button', { name: /Generate Recommendation/i });

    await user.type(textarea, 'Write a quicksort algorithm in Python.');
    await user.click(submitBtn);

    expect(requestRecommendationMock).toHaveBeenCalledWith(
      'Write a quicksort algorithm in Python.',
      undefined
    );
  });

  it('renders ErrorNotification when hardware fetch returns an error', () => {
    vi.spyOn(hardwareHook, 'useHardware').mockReturnValue({
      hardware: null,
      loading: false,
      error: 'Network error communicating with daemon',
      refresh: vi.fn(),
    });

    render(<DecisionEnginePage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Network error communicating with daemon/i)).toBeInTheDocument();
  });

  it('displays recommendation result when recommendation is present', () => {
    vi.spyOn(recommendationHook, 'useRecommendation').mockReturnValue({
      recommendation: sampleRecommendation,
      loading: false,
      error: null,
      requestRecommendation: requestRecommendationMock,
      clearRecommendation: vi.fn(),
    });

    render(<DecisionEnginePage />);
    expect(screen.getByText('Recommended Inference Configuration')).toBeInTheDocument();
    expect(screen.getByText('Phi-3.5-mini')).toBeInTheDocument();
    expect(screen.getByText('Q5_K_M')).toBeInTheDocument();
    expect(screen.getByText(/Selected Phi-3.5-mini for Python coding task/i)).toBeInTheDocument();
  });
});
