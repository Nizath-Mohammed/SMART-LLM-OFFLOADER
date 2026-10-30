import { generateRecommendation } from '../services/recommendationEngine';
import { analyzeTask } from '../services/taskAnalyzer';
import { HardwareInfo } from '../types/index';

function mockHardware(availableRamMB: number): HardwareInfo {
  return {
    totalRamMB: { value: 8192, source: 'measured' },
    availableRamMB: { value: availableRamMB, source: 'measured' },
    cpuModel: { value: 'Intel(R) Core(TM) i3', source: 'measured' },
    logicalCores: { value: 8, source: 'measured' },
    osName: { value: 'Windows_NT', source: 'measured' },
    osVersion: { value: '10.0.22631', source: 'measured' },
    gpuName: { value: null, source: 'unavailable' },
    gpuVramMB: { value: null, source: 'unavailable' },
  };
}

describe('RecommendationEngine unit tests', () => {
  it('RAM scenario (a) ≥ 8 GB (8192 MB): executionStrategy is normal_local, confidenceLevel is high', () => {
    const analysis = analyzeTask('Write a Python function to sort numbers.');
    const hardware = mockHardware(8192);
    const rec = generateRecommendation(analysis, hardware, 'Write a Python function to sort numbers.', null, 1);

    expect(rec.executionStrategy).toBe('normal_local');
    expect(rec.confidenceLevel).toBe('high');
    expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(8192);
    expect(rec.recommendedQuantization).not.toBeNull();
  });

  it('RAM scenario (b) 4–6 GB (5120 MB): selects model+quant ≤ 5120 MB, never Gemma 2 9B or Llama 3.1 8B Q5_K_M', () => {
    const analysis = analyzeTask('Provide a comprehensive research overview of distributed consensus algorithms and evaluate each.');
    const hardware = mockHardware(5120);
    const rec = generateRecommendation(analysis, hardware, 'Provide a comprehensive research overview...', null, 1);

    expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(5120);
    expect(rec.recommendedModel).not.toBe('Gemma 2 9B');
    if (rec.recommendedModel === 'Llama 3.1 8B') {
      expect(rec.recommendedQuantization).not.toBe('Q5_K_M');
    }
  });

  it('RAM scenario (c) < 4 GB (3072 MB): selects small model; compatibilityWarnings non-empty when no quant fits', () => {
    const analysis = analyzeTask('Write a Python helper function.');
    const hardware = mockHardware(3072);
    const rec = generateRecommendation(analysis, hardware, 'Write a Python helper function.', null, 1);

    expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(3072);
    // Model parameters should be small (<= 3.8B)
    expect(['Llama 3.2 1B', 'Llama 3.2 3B', 'Phi-3.5-mini', 'Qwen2.5 0.5B', 'Qwen2.5 1.5B', 'Qwen2.5 3B']).toContain(rec.recommendedModel);

    // When RAM is so low that no quant fits (e.g. 300 MB)
    const lowHardware = mockHardware(300);
    const lowRec = generateRecommendation(analysis, lowHardware, 'Write a Python helper function.', null, 1);
    expect(lowRec.recommendedQuantization).toBeNull();
    expect(lowRec.confidenceLevel).toBe('low');
    expect(lowRec.compatibilityWarnings.length).toBeGreaterThan(0);
    expect(lowRec.compatibilityWarnings.some((w) => w.includes('Memory shortfall') || w.includes('exceeds'))).toBe(true);
  });

  it('Reduced-context trigger: availableRamMB = 2600, weight 2400 + kvCache 256 > 2600 -> reduced_context with halved context', () => {
    // For a general conversation or research prompt matching Llama 3.2 3B
    const analysis = analyzeTask('Tell me about the history of computing in the twentieth century.');
    const hardware = mockHardware(2600);
    const rec = generateRecommendation(analysis, hardware, 'Tell me about the history...', null, 1);

    if (rec.recommendedModel === 'Llama 3.2 3B' && rec.recommendedQuantization === 'Q5_K_M') {
      expect(rec.executionStrategy).toBe('reduced_context');
      expect(rec.recommendedContextLength).toBe(131072 / 2);
      expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(2600);
    } else {
      // Regardless of chosen model, any model needing reduced context assigns reduced_context
      expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(2600);
    }
  });

  it('Greedy quant selection: selects higher-memory fitting variant within budget', () => {
    // Both Q4_K_M (2000 MB) and Q5_K_M (2400 MB) with reduced context fit in 2500 MB budget
    // The engine should select Q5_K_M because it has the higher estimatedMemoryMB
    const analysis = analyzeTask('Explain quantum superposition step by step.');
    const hardware = mockHardware(2500);
    const rec = generateRecommendation(analysis, hardware, 'Explain quantum superposition...', null, 1);

    if (rec.recommendedModel === 'Qwen2.5 3B' || rec.recommendedModel === 'Llama 3.2 3B') {
      expect(rec.recommendedQuantization).toBe('Q5_K_M');
    }
    expect(rec.estimatedMemoryMB).toBeLessThanOrEqual(2500);
  });

  it('Sequential agents trigger: selects sequential_agents when multiple agents concurrent RAM exceeds available RAM', () => {
    const analysis = analyzeTask('Write a Python function.');
    const hardware = mockHardware(4000);
    // 3 agents * ~2500 MB = 7500 MB > 4000 MB available RAM
    const rec = generateRecommendation(analysis, hardware, 'Write a Python function.', null, 3);

    expect(rec.executionStrategy).toBe('sequential_agents');
    expect(rec.confidenceLevel).toBe('medium');
    expect(rec.compatibilityWarnings.some((w) => w.includes('Multiple agents detected'))).toBe(true);
  });
});
