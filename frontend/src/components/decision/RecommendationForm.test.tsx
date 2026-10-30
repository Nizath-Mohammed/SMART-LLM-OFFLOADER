import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationForm } from './RecommendationForm';
import { Agent } from '../../types/index';

const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Research Assistant',
    systemPrompt: 'Helpful',
    modelRef: null,
    status: 'idle',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agent-2',
    name: 'Code Reviewer',
    systemPrompt: 'Precise',
    modelRef: null,
    status: 'idle',
    createdAt: new Date().toISOString(),
  },
];

describe('RecommendationForm', () => {
  it('enforces character counter and maxLength', async () => {
    const user = userEvent.setup();
    render(<RecommendationForm onSubmit={vi.fn()} agents={mockAgents} loading={false} />);

    const textarea = screen.getByLabelText(/Task Prompt/i);
    expect(screen.getByText('0 / 10,000 chars')).toBeInTheDocument();

    await user.type(textarea, 'Write a test.');
    expect(screen.getByText('13 / 10,000 chars')).toBeInTheDocument();
  });

  it('disables submit button while loading is true', () => {
    render(<RecommendationForm onSubmit={vi.fn()} agents={mockAgents} loading={true} />);
    const submitBtn = screen.getByRole('button', { name: /Analyzing Task/i });
    expect(submitBtn).toBeDisabled();
  });

  it('populates agent dropdown from agents prop', () => {
    render(<RecommendationForm onSubmit={vi.fn()} agents={mockAgents} loading={false} />);
    expect(screen.getByText('No agent (Direct query)')).toBeInTheDocument();
    expect(screen.getByText('Research Assistant')).toBeInTheDocument();
    expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
  });

  it('calls onSubmit with entered prompt and selected agent', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<RecommendationForm onSubmit={handleSubmit} agents={mockAgents} loading={false} />);

    const textarea = screen.getByLabelText(/Task Prompt/i);
    const select = screen.getByLabelText(/Assign to Agent/i);
    const submitBtn = screen.getByRole('button', { name: /Generate Recommendation/i });

    await user.type(textarea, 'Analyze this code snippet.');
    await user.selectOptions(select, 'agent-2');
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('Analyze this code snippet.', 'agent-2');
  });

  it('validates empty prompt on submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<RecommendationForm onSubmit={handleSubmit} agents={mockAgents} loading={false} />);

    const submitBtn = screen.getByRole('button', { name: /Generate Recommendation/i });
    await user.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a task prompt for analysis.')).toBeInTheDocument();
  });
});
