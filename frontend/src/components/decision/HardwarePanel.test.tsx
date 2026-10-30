import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HardwarePanel } from './HardwarePanel';
import { HardwareInfo } from '../../types/index';

const sampleHardware: HardwareInfo = {
  totalRamMB: { value: 8192, source: 'measured' },
  availableRamMB: { value: 5120, source: 'estimated' },
  cpuModel: { value: 'Intel Core i3', source: 'measured' },
  logicalCores: { value: 8, source: 'measured' },
  osName: { value: 'Windows_NT', source: 'measured' },
  osVersion: { value: '10.0.22631', source: 'measured' },
  gpuName: { value: null, source: 'unavailable' },
  gpuVramMB: { value: null, source: 'unavailable' },
};

describe('HardwarePanel', () => {
  it('renders "Not detected" when metric source is unavailable', () => {
    render(<HardwarePanel hardware={sampleHardware} loading={false} error={null} />);
    const notDetectedBadges = screen.getAllByText('Not detected');
    expect(notDetectedBadges.length).toBeGreaterThanOrEqual(2); // GPU and GPU VRAM
  });

  it('renders value and "Estimated" badge when metric source is estimated', () => {
    render(<HardwarePanel hardware={sampleHardware} loading={false} error={null} />);
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('renders measured values without Estimated badge', () => {
    render(<HardwarePanel hardware={sampleHardware} loading={false} error={null} />);
    expect(screen.getByText('Intel Core i3')).toBeInTheDocument();
  });

  it('shows loading indicator while loading is true', () => {
    render(<HardwarePanel hardware={null} loading={true} error={null} />);
    expect(screen.getByTestId('hardware-loading')).toBeInTheDocument();
  });

  it('does not crash when hardware is null', () => {
    const { container } = render(
      <HardwarePanel hardware={null} loading={false} error={null} />
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Host Hardware Environment')).toBeInTheDocument();
  });
});
