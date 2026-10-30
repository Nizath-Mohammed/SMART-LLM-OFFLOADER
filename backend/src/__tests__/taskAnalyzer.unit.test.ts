import { analyzeTask } from '../services/taskAnalyzer';

describe('TaskAnalyzer unit tests', () => {
  describe('Category detection', () => {
    it('classifies representative coding prompt as coding', () => {
      const res = analyzeTask('Write a Python script to parse JSON');
      expect(res.taskCategory).toBe('coding');
      expect(res.matchedRules.some((r) => r.includes('coding:'))).toBe(true);
    });

    it('classifies representative data analysis prompt as data_analysis', () => {
      const res = analyzeTask('Analyse this CSV dataset and compute mean values');
      expect(res.taskCategory).toBe('data_analysis');
      expect(res.matchedRules.some((r) => r.includes('data_analysis:'))).toBe(true);
    });

    it('classifies representative reasoning prompt as reasoning', () => {
      const res = analyzeTask('Step by step, prove that the sum of angles in a triangle is 180°');
      expect(res.taskCategory).toBe('reasoning');
      expect(res.matchedRules.some((r) => r.includes('reasoning:'))).toBe(true);
    });

    it('classifies representative summarization prompt as summarization', () => {
      const res = analyzeTask('Summarise the following article in three bullet points');
      expect(res.taskCategory).toBe('summarization');
      expect(res.matchedRules.some((r) => r.includes('summarization:'))).toBe(true);
    });

    it('classifies representative research prompt as research', () => {
      const res = analyzeTask('Research the latest developments in quantum computing');
      expect(res.taskCategory).toBe('research');
      expect(res.matchedRules.some((r) => r.includes('research:'))).toBe(true);
    });

    it('classifies conversational fallback prompt as general_conversation', () => {
      const res = analyzeTask('Hello, how are you today?');
      expect(res.taskCategory).toBe('general_conversation');
      expect(res.matchedRules.some((r) => r.includes('general_conversation:'))).toBe(true);
    });
  });

  describe('Priority overrides', () => {
    it('prioritizes coding over reasoning when both are present', () => {
      const prompt = '```python\ndef solve():\n    pass\n```\nStep by step, prove this works.';
      const res = analyzeTask(prompt);
      expect(res.taskCategory).toBe('coding');
    });

    it('prioritizes data_analysis over summarization when both are present', () => {
      const prompt = 'Summarize this dataset of sales statistics: 10, 20, 30, 40';
      const res = analyzeTask(prompt);
      expect(res.taskCategory).toBe('data_analysis');
    });
  });

  describe('Complexity detection', () => {
    it('classifies short 10-char prompt with no indicators as low', () => {
      const res = analyzeTask('Hello now!');
      expect(res.taskComplexity).toBe('low');
    });

    it('classifies 150-char prompt with no indicators as low', () => {
      const prompt = 'This is a straightforward message without any special keywords, code blocks, datasets, or complex logical instructions that exceeds twenty characters.';
      expect(prompt.length).toBeGreaterThanOrEqual(20);
      expect(prompt.length).toBeLessThanOrEqual(200);
      const res = analyzeTask(prompt);
      expect(res.taskComplexity).toBe('low');
    });

    it('classifies 350-char prompt as medium', () => {
      const prompt = 'a'.repeat(350);
      const res = analyzeTask(prompt);
      expect(res.taskComplexity).toBe('medium');
    });

    it('classifies 1200-char prompt as high', () => {
      const prompt = 'b'.repeat(1200);
      const res = analyzeTask(prompt);
      expect(res.taskComplexity).toBe('high');
    });

    it('classifies 80-char prompt with 3 reasoning keywords as high', () => {
      const prompt = 'Step by step, we must prove this because we can deduce it therefore it is true.';
      const res = analyzeTask(prompt);
      expect(res.taskComplexity).toBe('high');
    });
  });

  describe('Transparency', () => {
    it('populates matchedRules with specific rule names and indicator text', () => {
      const res = analyzeTask('Write a Python function to parse JSON');
      expect(res.matchedRules.length).toBeGreaterThan(0);
      expect(res.matchedRules.some((r) => r.includes('coding:'))).toBe(true);
      expect(res.matchedRules.some((r) => r.includes('complexity:'))).toBe(true);
    });
  });
});
