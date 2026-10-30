import {
  HardwareInfo,
  Recommendation,
  TaskCategory,
  ModelRecord,
  QuantVariant,
  ExecutionStrategy,
  ConfidenceLevel,
  AppError,
} from '../types/index';
import { TaskAnalysis } from './taskAnalyzer';
import { MODEL_REGISTRY, getModelRegistry } from '../data/modelRegistry';
import { getDatabase } from '../db/database';

export type RecommendationDraft = Omit<Recommendation, 'id' | 'createdAt'>;

// ── Model family category affinity map ───────────────────────────────────────

const FAMILY_CATEGORY_MAP: Record<string, TaskCategory[]> = {
  llama: ['general_conversation', 'summarization', 'research'],
  phi: ['coding', 'reasoning'],
  mistral: ['general_conversation', 'reasoning', 'summarization'],
  qwen: ['coding', 'data_analysis'],
  gemma: ['research', 'summarization', 'general_conversation'],
  deepseek: ['reasoning', 'data_analysis'],
};

export function getModelSupportedCategories(model: ModelRecord): TaskCategory[] {
  const lowerName = model.name.toLowerCase();
  for (const [family, categories] of Object.entries(FAMILY_CATEGORY_MAP)) {
    if (lowerName.includes(family)) {
      return categories;
    }
  }
  return ['general_conversation'];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLargestPowerOf2Context(
  maxContext: number,
  baseKvCacheMB: number,
  quantWeightMB: number,
  availableRamMB: number
): { contextLength: number; kvCacheMB: number } | null {
  // Find largest power of 2 <= maxContext that fits
  // Start from largest power of 2 <= maxContext
  let power = 1;
  while (power * 2 <= maxContext) {
    power *= 2;
  }
  // If maxContext itself is a power of 2, power will equal maxContext
  let candidate = power;

  while (candidate >= 512) {
    const scaledKv = Math.ceil(baseKvCacheMB * (candidate / maxContext));
    if (quantWeightMB + scaledKv <= availableRamMB) {
      return { contextLength: candidate, kvCacheMB: scaledKv };
    }
    candidate = Math.floor(candidate / 2);
  }

  return null;
}

// ── Recommendation Generator ──────────────────────────────────────────────────

export function generateRecommendation(
  analysis: TaskAnalysis,
  hardware: HardwareInfo,
  prompt: string,
  agentId: string | null,
  overrideAgentCount?: number
): RecommendationDraft {
  const registry = getModelRegistry();
  if (!registry || registry.length === 0) {
    throw new AppError(500, 'Model registry is empty.');
  }

  const availableRam = hardware.availableRamMB.value ?? 0;
  const compatibilityWarnings: string[] = [];

  // Check if any model in the registry fits with at least reduced context
  const modelsWithFittingVariant = registry.filter((m) =>
    m.quantVariants.some((q) => {
      // Check if it fits at max context OR reduced context (power of 2 >= 512)
      if (q.estimatedMemoryMB + m.kvCacheMemoryMB <= availableRam) return true;
      const reduced = getLargestPowerOf2Context(m.maxContextLength, m.kvCacheMemoryMB, q.estimatedMemoryMB, availableRam);
      return reduced !== null;
    })
  );

  let selectedModel: ModelRecord;

  if (modelsWithFittingVariant.length > 0) {
    // Score each fitting model
    const scoredModels = modelsWithFittingVariant.map((m) => {
      let score = 0;
      const categories = getModelSupportedCategories(m);
      if (categories.includes(analysis.taskCategory)) {
        score += 2;
      }

      if (analysis.taskComplexity === 'low' && m.parametersBillions <= 3) {
        score += 1;
      } else if (analysis.taskComplexity === 'medium' && m.parametersBillions >= 3 && m.parametersBillions <= 7) {
        score += 1;
      } else if (analysis.taskComplexity === 'high' && m.parametersBillions >= 7) {
        score += 1;
      }

      return { model: m, score };
    });

    // Sort by highest score first, tiebreak by larger parametersBillions
    scoredModels.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.model.parametersBillions - a.model.parametersBillions;
    });

    selectedModel = scoredModels[0].model;
  } else {
    // No model fits within available RAM — pick the smallest model overall
    const sortedSmallest = [...registry].sort((a, b) => {
      if (a.parametersBillions !== b.parametersBillions) {
        return a.parametersBillions - b.parametersBillions;
      }
      const minMemA = Math.min(...a.quantVariants.map((q) => q.estimatedMemoryMB));
      const minMemB = Math.min(...b.quantVariants.map((q) => q.estimatedMemoryMB));
      return minMemA - minMemB;
    });
    selectedModel = sortedSmallest[0];
  }

  // Quantization selection for selected model
  // First, find quants that fit with full context
  const fullContextFittingQuants = selectedModel.quantVariants.filter(
    (q) => q.estimatedMemoryMB + selectedModel.kvCacheMemoryMB <= availableRam
  );

  let selectedQuant: QuantVariant | null = null;
  let recommendedContextLength = selectedModel.maxContextLength;
  let estimatedMemoryMB = 0;
  let isReducedContext = false;

  if (fullContextFittingQuants.length > 0) {
    // Sort by highest estimatedMemoryMB; tie-break prefers lexicographically later
    fullContextFittingQuants.sort((a, b) => {
      if (b.estimatedMemoryMB !== a.estimatedMemoryMB) {
        return b.estimatedMemoryMB - a.estimatedMemoryMB;
      }
      return b.name.localeCompare(a.name);
    });
    selectedQuant = fullContextFittingQuants[0];
    estimatedMemoryMB = Math.ceil(selectedQuant.estimatedMemoryMB + selectedModel.kvCacheMemoryMB);
    recommendedContextLength = selectedModel.maxContextLength;
  } else {
    // Try reduced context for quants of this model
    const reducedContextFittingQuants = selectedModel.quantVariants
      .map((q) => {
        const reduced = getLargestPowerOf2Context(
          selectedModel.maxContextLength,
          selectedModel.kvCacheMemoryMB,
          q.estimatedMemoryMB,
          availableRam
        );
        return { quant: q, reduced };
      })
      .filter((item): item is { quant: QuantVariant; reduced: { contextLength: number; kvCacheMB: number } } => item.reduced !== null);

    if (reducedContextFittingQuants.length > 0) {
      // Pick highest estimatedMemoryMB (greedy); tiebreak lexicographic
      reducedContextFittingQuants.sort((a, b) => {
        if (b.quant.estimatedMemoryMB !== a.quant.estimatedMemoryMB) {
          return b.quant.estimatedMemoryMB - a.quant.estimatedMemoryMB;
        }
        return b.quant.name.localeCompare(a.quant.name);
      });

      const best = reducedContextFittingQuants[0];
      selectedQuant = best.quant;
      recommendedContextLength = best.reduced.contextLength;
      estimatedMemoryMB = Math.ceil(selectedQuant.estimatedMemoryMB + best.reduced.kvCacheMB);
      isReducedContext = true;
      compatibilityWarnings.push(
        `Context length has been reduced to ${recommendedContextLength} tokens to fit within available RAM.`
      );
    } else {
      // No quant fits in available RAM
      selectedQuant = null;
      const minQuant = [...selectedModel.quantVariants].sort((a, b) => a.estimatedMemoryMB - b.estimatedMemoryMB)[0];
      const minRequired = minQuant.estimatedMemoryMB + selectedModel.kvCacheMemoryMB;
      estimatedMemoryMB = minRequired;
      recommendedContextLength = selectedModel.maxContextLength;

      const shortfall = minRequired - availableRam;
      compatibilityWarnings.push(
        `Selected model ${selectedModel.name} does not fit in available RAM (${availableRam} MB). Memory shortfall is ${shortfall} MB. Consider selecting a smaller model or freeing system memory.`
      );
    }
  }

  // ── Strategy determination ──────────────────────────────────────────────────
  // Check category-matching models minimum RAM requirement (Requirement 6.4)
  const categoryMatchingModels = registry.filter((m) =>
    getModelSupportedCategories(m).includes(analysis.taskCategory)
  );
  const modelsToCheck = categoryMatchingModels.length > 0 ? categoryMatchingModels : registry;
  const minCategoryMemory = Math.min(
    ...modelsToCheck.flatMap((m) => m.quantVariants.map((q) => q.estimatedMemoryMB + m.kvCacheMemoryMB))
  );

  const isModelUnloadRequired = availableRam < minCategoryMemory || selectedQuant === null;

  // Multi-agent check (Requirement 6.3)
  let agentCount = overrideAgentCount;
  if (agentCount === undefined) {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number } | undefined;
      agentCount = row?.count ?? 0;
    } catch {
      agentCount = agentId ? 1 : 0;
    }
  }
  const isMultiAgentExceeded = agentCount >= 2 && agentCount * estimatedMemoryMB > availableRam;

  // Apply priority: model_unload_after_use > sequential_agents > reduced_context > normal_local
  let executionStrategy: ExecutionStrategy;

  if (isModelUnloadRequired) {
    executionStrategy = 'model_unload_after_use';
    compatibilityWarnings.push(
      'Available RAM is below model requirements. Model must be unloaded after each inference run to prevent out-of-memory errors.'
    );
  } else if (isMultiAgentExceeded) {
    executionStrategy = 'sequential_agents';
    compatibilityWarnings.push(
      `Multiple agents detected (${agentCount}). Running them concurrently would exceed available RAM. Execute agents sequentially.`
    );
  } else if (isReducedContext) {
    executionStrategy = 'reduced_context';
  } else {
    executionStrategy = 'normal_local';
  }

  // ── Confidence Level ────────────────────────────────────────────────────────
  let confidenceLevel: ConfidenceLevel;
  if (executionStrategy === 'normal_local' && selectedQuant !== null) {
    confidenceLevel = 'high';
  } else if (executionStrategy === 'reduced_context' || executionStrategy === 'sequential_agents') {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }

  // ── Explanation Builder ─────────────────────────────────────────────────────
  let quantExplanation = '';
  if (selectedQuant) {
    if (selectedQuant.name.startsWith('Q4')) {
      quantExplanation = 'Q4 variants use less memory with potentially reduced output quality compared to higher bit-depths.';
    } else if (selectedQuant.name.startsWith('Q5')) {
      quantExplanation = 'Q5 variants offer a middle ground between Q4 (lower quality, less memory) and Q8 (higher quality, more memory).';
    } else if (selectedQuant.name.startsWith('Q8')) {
      quantExplanation = 'Q8 variants use more memory and produce output closer to the original model\'s full precision.';
    } else {
      quantExplanation = `${selectedQuant.name} offers a balanced precision/memory trade-off.`;
    }
  } else {
    quantExplanation = 'No quantization variant fits within the available RAM.';
  }

  let strategyExplanation = '';
  switch (executionStrategy) {
    case 'normal_local':
      strategyExplanation = 'full context window supported at this RAM level.';
      break;
    case 'reduced_context':
      strategyExplanation = `context length reduced to ${recommendedContextLength} tokens so KV cache and model weight fit within available RAM.`;
      break;
    case 'sequential_agents':
      strategyExplanation = 'run one agent at a time to avoid exceeding available RAM.';
      break;
    case 'model_unload_after_use':
      strategyExplanation = 'unload model after each inference run to reclaim memory.';
      break;
    default:
      strategyExplanation = 'standard execution.';
      break;
  }

  const catRules = analysis.matchedRules.filter((r) => r.startsWith(analysis.taskCategory)).join('; ');
  const compRules = analysis.matchedRules.filter((r) => r.startsWith('complexity')).join('; ');

  let modelSelectionSummary = '';
  if (selectedQuant) {
    const kvMb = Math.max(0, estimatedMemoryMB - selectedQuant.estimatedMemoryMB);
    modelSelectionSummary = `Selected ${selectedModel.name} ${selectedQuant.name} (${selectedQuant.estimatedMemoryMB} MB + ${kvMb} MB KV cache = ${estimatedMemoryMB} MB): fits within ${availableRam} MB available RAM with headroom.`;
  } else {
    modelSelectionSummary = `Selected ${selectedModel.name} as closest match, but minimum requirements exceed available RAM (${availableRam} MB).`;
  }

  const explanation = `Category: ${analysis.taskCategory} — ${catRules || 'matched rules'}. Complexity: ${analysis.taskComplexity} — ${compRules || 'evaluated length/indicators'}. ${modelSelectionSummary} ${quantExplanation} Strategy: ${executionStrategy} — ${strategyExplanation}`;

  return {
    taskCategory: analysis.taskCategory,
    taskComplexity: analysis.taskComplexity,
    recommendedModel: selectedModel.name,
    recommendedQuantization: selectedQuant ? selectedQuant.name : null,
    estimatedMemoryMB,
    recommendedContextLength,
    executionStrategy,
    compatibilityWarnings,
    explanation,
    confidenceLevel,
    prompt,
    agentId,
  };
}
