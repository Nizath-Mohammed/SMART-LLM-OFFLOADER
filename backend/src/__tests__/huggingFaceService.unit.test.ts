import {
  determineCompatibility,
  resolveOllamaTag,
  searchHuggingFaceModels,
  getHuggingFaceModelDetails,
} from '../services/huggingFaceService';
import * as ollamaService from '../services/ollamaService';
import { AppError } from '../types/index';

// Mock ollamaService.listInstalledModels
jest.mock('../services/ollamaService', () => ({
  listInstalledModels: jest.fn(),
}));

describe('huggingFaceService unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ollamaService.listInstalledModels as jest.Mock).mockResolvedValue([
      { name: 'llama3.2:1b', size: 1300000000, modified_at: '2026-01-01' },
      { name: 'qwen2.5:0.5b', size: 500000000, modified_at: '2026-01-01' },
    ]);
  });

  describe('resolveOllamaTag', () => {
    it('resolves standard Llama-3.2-1B pattern', () => {
      const tag = resolveOllamaTag('meta-llama/Llama-3.2-1B-Instruct-GGUF', ['gguf']);
      expect(tag).toBe('llama3.2:1b');
    });

    it('resolves Qwen2.5-0.5B pattern', () => {
      const tag = resolveOllamaTag('Qwen/Qwen2.5-0.5B-Instruct-GGUF', ['gguf']);
      expect(tag).toBe('qwen2.5:0.5b');
    });

    it('returns null for unmapped models', () => {
      const tag = resolveOllamaTag('random-author/completely-custom-model', ['custom']);
      expect(tag).toBeNull();
    });
  });

  describe('determineCompatibility', () => {
    it('marks GGUF model with known Ollama tag as compatible and downloadable', () => {
      const result = determineCompatibility('bartowski/Llama-3.2-1B-Instruct-GGUF', ['gguf']);
      expect(result.isGguf).toBe(true);
      expect(result.isCompatible).toBe(true);
      expect(result.isDownloadable).toBe(true);
      expect(result.ollamaModelTag).toBe('llama3.2:1b');
      expect(result.compatibilityReason).toContain("mapped to Ollama library model 'llama3.2:1b'");
    });

    it('marks GGUF model without Ollama mapping as compatible but not directly downloadable', () => {
      const result = determineCompatibility('TheBloke/some-obscure-finetune-GGUF', ['gguf']);
      expect(result.isGguf).toBe(true);
      expect(result.isCompatible).toBe(true);
      expect(result.isDownloadable).toBe(false);
      expect(result.compatibilityReason).toContain('requires custom Modelfile import');
    });

    it('detects GGUF from siblings if not in tags', () => {
      const result = determineCompatibility(
        'author/model-repo',
        ['nlp'],
        [{ rfilename: 'model-Q4_K_M.gguf' }]
      );
      expect(result.isGguf).toBe(true);
      expect(result.isCompatible).toBe(true);
    });

    it('marks non-GGUF repository as incompatible and not downloadable', () => {
      const result = determineCompatibility(
        'meta-llama/Llama-2-70b-hf',
        ['pytorch', 'safetensors'],
        [{ rfilename: 'model-00001-of-00003.safetensors' }]
      );
      expect(result.isGguf).toBe(false);
      expect(result.isCompatible).toBe(false);
      expect(result.isDownloadable).toBe(false);
      expect(result.compatibilityReason).toContain('Non-GGUF model');
    });
  });

  describe('searchHuggingFaceModels', () => {
    it('returns empty array when query is empty', async () => {
      const results = await searchHuggingFaceModels('');
      expect(results).toEqual([]);
    });

    it('fetches and maps search results correctly', async () => {
      const mockHfData = [
        {
          id: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
          author: 'bartowski',
          description: 'Quantized Llama 3.2 1B',
          downloads: 12500,
          likes: 320,
          tags: ['gguf', 'text-generation'],
          cardData: { license: 'llama3.2' },
          siblings: [{ rfilename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf' }],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHfData,
      } as any);

      const results = await searchHuggingFaceModels('llama 3.2');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('bartowski/Llama-3.2-1B-Instruct-GGUF');
      expect(results[0].isGguf).toBe(true);
      expect(results[0].isCompatible).toBe(true);
      expect(results[0].isDownloadable).toBe(true);
      expect(results[0].isInstalled).toBe(true); // matches llama3.2:1b from mock
    });

    it('throws AppError when HF API returns non-200', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      await expect(searchHuggingFaceModels('test')).rejects.toThrow(AppError);
    });
  });

  describe('getHuggingFaceModelDetails', () => {
    it('fetches model details and parses tags and license', async () => {
      const mockDetail = {
        id: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
        author: 'Qwen',
        description: 'Qwen 2.5 0.5B Instruct model in GGUF',
        downloads: 45000,
        likes: 850,
        tags: ['gguf', 'conversational'],
        cardData: { license: 'apache-2.0' },
        siblings: [{ rfilename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf' }],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockDetail,
      } as any);

      const result = await getHuggingFaceModelDetails('Qwen/Qwen2.5-0.5B-Instruct-GGUF');
      expect(result.id).toBe('Qwen/Qwen2.5-0.5B-Instruct-GGUF');
      expect(result.license).toBe('apache-2.0');
      expect(result.isCompatible).toBe(true);
      expect(result.ollamaModelTag).toBe('qwen2.5:0.5b');
    });

    it('throws 404 AppError when model not found on HF Hub', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(getHuggingFaceModelDetails('nonexistent/repo')).rejects.toThrow(AppError);
    });
  });
});
