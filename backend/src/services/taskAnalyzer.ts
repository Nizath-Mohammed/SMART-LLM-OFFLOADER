import { TaskCategory, TaskComplexity } from '../types/index';

export interface TaskAnalysis {
  taskCategory: TaskCategory;
  taskComplexity: TaskComplexity;
  matchedRules: string[];
}

// ── Category detection helpers ────────────────────────────────────────────────

const WORD_LANGUAGES = [
  'Python', 'JavaScript', 'TypeScript', 'Java',
  'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'MATLAB',
  'SQL', 'HTML', 'CSS', 'Bash', 'Shell',
];

function matchProgrammingLanguage(prompt: string): string | null {
  const cSpecialMatch = prompt.match(/(?:^|[^a-zA-Z0-9_])(C\+\+|C#)(?:[^a-zA-Z0-9_]|$)/i);
  if (cSpecialMatch) return cSpecialMatch[1];

  if (/\bGolang\b/i.test(prompt)) return 'Golang';
  if (/\bGo\b/.test(prompt)) return 'Go';
  if (/\bR\b/.test(prompt)) return 'R';

  const regex = new RegExp(`\\b(${WORD_LANGUAGES.join('|')})\\b`, 'i');
  const match = prompt.match(regex);
  if (match) return match[1];

  return null;
}

const TABLE_SYNTAX_REGEX = /\|[-]+\|/;
const CSV_NUMBERS_REGEX = /(\d+\s*,\s*){2,}\d+/;

const DATA_ANALYSIS_WORDS = [
  'dataset', 'dataframe', 'csv', 'numerical analysis',
  'statistics', 'regression', 'correlation',
];

const REASONING_PHRASES = [
  'step by step', 'step-by-step', 'first...then', 'first\\.\\.\\.then',
  'prove', 'deduce', 'therefore', 'if and only if', 'because',
  'chain of thought',
];

const SUMMARIZATION_PHRASES = [
  'summarize', 'summarise', 'summary', 'brief', 'condense',
  'tldr', 'tl;dr', 'in short', 'overview of', 'recap',
];

const RESEARCH_PHRASES = [
  'research', 'find information', 'literature review',
  'fact-check', 'fact check', 'what is known about',
  'gather information', 'investigate',
];

// ── Complexity indicator sets ─────────────────────────────────────────────────

const DATA_REF_INDICATORS = ['dataset', 'csv', 'dataframe'];
const REASONING_INDICATORS = [
  'step by step', 'prove', 'deduce', 'therefore', 'if and only if',
];

// ── Utility ───────────────────────────────────────────────────────────────────

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:[^a-zA-Z0-9_]|$)`, 'i').test(text);
}

// ── Category detection ────────────────────────────────────────────────────────

function detectCategory(
  prompt: string,
  matchedRules: string[]
): TaskCategory {
  // Priority 1: coding
  if (/```/.test(prompt)) {
    matchedRules.push('coding: code block detected (triple backtick)');
    return 'coding';
  }
  if (/^(    |\t).+/m.test(prompt)) {
    matchedRules.push('coding: code block detected (4-space indent)');
    return 'coding';
  }
  const langMatch = matchProgrammingLanguage(prompt);
  if (langMatch) {
    matchedRules.push(`coding: programming language detected (${langMatch})`);
    return 'coding';
  }

  // Priority 2: data_analysis
  if (TABLE_SYNTAX_REGEX.test(prompt)) {
    matchedRules.push('data_analysis: table syntax detected (|---|)');
    return 'data_analysis';
  }
  if (CSV_NUMBERS_REGEX.test(prompt)) {
    matchedRules.push('data_analysis: CSV-like pattern detected (comma-separated numbers)');
    return 'data_analysis';
  }
  for (const word of DATA_ANALYSIS_WORDS) {
    if (containsPhrase(prompt, word)) {
      matchedRules.push(`data_analysis: keyword detected ("${word}")`);
      return 'data_analysis';
    }
  }

  // Priority 3: reasoning
  for (const phrase of REASONING_PHRASES) {
    if (containsPhrase(prompt, phrase)) {
      matchedRules.push(`reasoning: phrase detected ("${phrase}")`);
      return 'reasoning';
    }
  }

  // Priority 4: summarization
  for (const phrase of SUMMARIZATION_PHRASES) {
    if (containsPhrase(prompt, phrase)) {
      matchedRules.push(`summarization: phrase detected ("${phrase}")`);
      return 'summarization';
    }
  }

  // Priority 5: research
  for (const phrase of RESEARCH_PHRASES) {
    if (containsPhrase(prompt, phrase)) {
      matchedRules.push(`research: phrase detected ("${phrase}")`);
      return 'research';
    }
  }

  // Priority 6: fallback
  matchedRules.push('general_conversation: no specific category matched (fallback)');
  return 'general_conversation';
}

// ── Complexity detection ──────────────────────────────────────────────────────

function countIndicators(prompt: string): number {
  let count = 0;

  // Code block indicators
  if (/```/.test(prompt)) count++;
  if (/^(    |\t).+/m.test(prompt)) count++;

  // Data ref indicators — each distinct word counts
  for (const word of DATA_REF_INDICATORS) {
    if (containsPhrase(prompt, word)) count++;
  }

  // Reasoning indicators — each distinct phrase counts
  for (const phrase of REASONING_INDICATORS) {
    if (containsPhrase(prompt, phrase)) count++;
  }

  return count;
}

function detectComplexity(
  prompt: string,
  matchedRules: string[]
): TaskComplexity {
  const len = prompt.length;
  const indicatorCount = countIndicators(prompt);

  matchedRules.push(`complexity: indicator count = ${indicatorCount}`);

  if (indicatorCount >= 3) {
    matchedRules.push(`complexity: indicator count ${indicatorCount} ≥ 3 → high`);
    return 'high';
  }

  if (len > 1000) {
    matchedRules.push(`complexity: prompt length ${len} chars > 1000 → high`);
    return 'high';
  }

  if (len > 200) {
    matchedRules.push(`complexity: prompt length ${len} chars → medium`);
    return 'medium';
  }

  // len <= 200
  if (len < 20 && indicatorCount < 1) {
    matchedRules.push(`complexity: prompt length ${len} chars < 20, no indicators → low`);
    return 'low';
  }

  if (len >= 20 && len <= 200 && indicatorCount === 0) {
    matchedRules.push(`complexity: prompt length ${len} chars (20–200), no indicators → low`);
    return 'low';
  }

  // len < 20 with indicatorCount >= 1, or len 20-200 with indicators
  // The spec says len > 200 && <= 1000 → medium, and > 1000 or indicatorCount >= 3 → high
  // For short prompts (< 20) with indicators, no explicit rule covers this
  // except the fallback: treat as medium if indicators present
  if (len < 20 && indicatorCount >= 1) {
    matchedRules.push(`complexity: prompt length ${len} chars < 20 with ${indicatorCount} indicator(s) → medium`);
    return 'medium';
  }

  // len 20-200 with at least one indicator — not explicitly high, default to medium
  matchedRules.push(`complexity: prompt length ${len} chars (20–200) with ${indicatorCount} indicator(s) → medium`);
  return 'medium';
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeTask(prompt: string): TaskAnalysis {
  const matchedRules: string[] = [];

  const taskCategory = detectCategory(prompt, matchedRules);
  const taskComplexity = detectComplexity(prompt, matchedRules);

  return { taskCategory, taskComplexity, matchedRules };
}
