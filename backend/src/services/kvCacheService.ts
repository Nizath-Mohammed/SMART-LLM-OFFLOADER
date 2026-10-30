import { getModelRegistry } from '../data/modelRegistry';
import { getHardwareInfo } from './hardwareDetector';
import { KvCacheEstimate, AppError } from '../types/index';

export function estimateKvCache(modelName: string, contextLength: number): KvCacheEstimate {
  if (!Number.isInteger(contextLength) || contextLength <= 0) {
    throw new AppError(400, 'contextLength must be a positive integer.');
  }
  const registry = getModelRegistry();
  const model = registry.find(m => m.name === modelName);
  if (!model) throw new AppError(404, 'Model not in registry.');
  if (contextLength > model.maxContextLength) {
    throw new AppError(400, `Context length exceeds model maximum of ${model.maxContextLength} tokens.`);
  }

  const kvCacheEstimateMB = Math.ceil(model.kvCacheMemoryMB * contextLength / model.maxContextLength);

  // Budget warning
  let budgetWarning: string | null = null;
  try {
    const hwInfo = getHardwareInfo();
    const availableRam = hwInfo.availableRamMB.value;
    if (availableRam != null) {
      const minQuant = model.quantVariants.reduce((min, q) =>
        q.estimatedMemoryMB < min.estimatedMemoryMB ? q : min
      );
      const totalEstimate = minQuant.estimatedMemoryMB + kvCacheEstimateMB;
      if (totalEstimate > availableRam) {
        const shortfall = totalEstimate - availableRam;
        budgetWarning = `Combined model and KV-cache estimate (${totalEstimate} MB) exceeds available RAM (${availableRam} MB) by ${shortfall} MB.`;
      }
    }
  } catch {
    // Hardware info unavailable — skip warning
  }

  return {
    modelName,
    contextLength,
    kvCacheEstimateMB,
    dataSource: 'estimated',
    maxContextLength: model.maxContextLength,
    budgetWarning,
  };
}
