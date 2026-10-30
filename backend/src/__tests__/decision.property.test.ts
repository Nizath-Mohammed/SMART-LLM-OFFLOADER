process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import fc from 'fast-check';
import request from 'supertest';
import { app } from '../index';
import { initDatabase, resetDatabase } from '../db/database';
import { analyzeTask } from '../services/taskAnalyzer';
import { generateRecommendation } from '../services/recommendationEngine';
import { MODEL_REGISTRY } from '../data/modelRegistry';
import { HardwareInfo, Recommendation } from '../types/index';
import * as hardwareDetector from '../services/hardwareDetector';

function buildMockHardwareInfo(availableRamMB: number): HardwareInfo {
  return {
    totalRamMB: { value: 32768, source: 'measured' },
    availableRamMB: { value: availableRamMB, source: 'measured' },
    cpuModel: { value: 'Intel(R) Core(TM) i3', source: 'measured' },
    logicalCores: { value: 8, source: 'measured' },
    osName: { value: 'Windows_NT', source: 'measured' },
    osVersion: { value: '10.0.22631', source: 'measured' },
    gpuName: { value: null, source: 'unavailable' },
    gpuVramMB: { value: null, source: 'unavailable' },
  };
}

describe('Decision Engine Property-Based Tests', () => {
  beforeEach(() => {
    resetDatabase();
    initDatabase(':memory:');
    jest.spyOn(hardwareDetector, 'getHardwareInfo').mockReturnValue(buildMockHardwareInfo(6144));
  });

  afterEach(() => {
    resetDatabase();
    jest.restoreAllMocks();
  });

  // Feature: edge-llm-vs2-decision-engine, Property 17: Task analysis always returns valid domain values
  it('Property 17: Task analysis always returns valid domain values', () => {
    const validCategories = [
      'coding',
      'data_analysis',
      'reasoning',
      'summarization',
      'research',
      'general_conversation',
    ];
    const validComplexities = ['low', 'medium', 'high'];

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10000 }).filter((s) => s.trim().length > 0),
        (prompt) => {
          const result = analyzeTask(prompt);
          const domainValid =
            validCategories.includes(result.taskCategory) &&
            validComplexities.includes(result.taskComplexity);

          if (!domainValid) return false;

          // If prompt length > 1000 chars, complexity must be 'high'
          if (prompt.length > 1000 && result.taskComplexity !== 'high') {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: edge-llm-vs2-decision-engine, Property 18: Recommendation memory never exceeds available RAM
  it('Property 18: Recommendation memory never exceeds available RAM', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 32768 }),
        fc.string({ minLength: 1, maxLength: 2000 }).filter((s) => s.trim().length > 0),
        (availableRamMB, prompt) => {
          const hasAnyFittingModel = MODEL_REGISTRY.some((m) =>
            m.quantVariants.some((q) => q.estimatedMemoryMB + m.kvCacheMemoryMB <= availableRamMB)
          );
          if (!hasAnyFittingModel) return true; // Precondition not met, skip

          const hardware = buildMockHardwareInfo(availableRamMB);
          const analysis = analyzeTask(prompt);
          const draft = generateRecommendation(analysis, hardware, prompt, null, 1);

          return draft.estimatedMemoryMB <= availableRamMB;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: edge-llm-vs2-decision-engine, Property 19: Recommendation persistence round-trip
  it('Property 19: Recommendation persistence round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }).filter((s) => s.trim().length > 0),
        async (prompt) => {
          const postRes = await request(app)
            .post('/api/v1/recommendations')
            .send({ prompt });

          if (postRes.status !== 201) return false;
          const created: Recommendation = postRes.body.data;
          if (!created.id) return false;

          const getRes = await request(app).get(`/api/v1/recommendations/${created.id}`);
          if (getRes.status !== 200) return false;
          const fetched: Recommendation = getRes.body.data;

          return (
            fetched.id === created.id &&
            fetched.taskCategory === created.taskCategory &&
            fetched.taskComplexity === created.taskComplexity &&
            fetched.recommendedModel === created.recommendedModel &&
            fetched.recommendedQuantization === created.recommendedQuantization &&
            fetched.estimatedMemoryMB === created.estimatedMemoryMB &&
            fetched.recommendedContextLength === created.recommendedContextLength &&
            fetched.executionStrategy === created.executionStrategy &&
            JSON.stringify(fetched.compatibilityWarnings) === JSON.stringify(created.compatibilityWarnings) &&
            fetched.explanation === created.explanation &&
            fetched.confidenceLevel === created.confidenceLevel &&
            fetched.prompt === created.prompt &&
            fetched.agentId === created.agentId &&
            fetched.createdAt === created.createdAt
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60s timeout for 100 async HTTP roundtrips
});
