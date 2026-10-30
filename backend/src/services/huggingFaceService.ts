import { HuggingFaceModel, AppError } from '../types/index';
import { listInstalledModels } from './ollamaService';

// Known mappings from popular Hugging Face GGUF repos or model families to standard Ollama library tags
const HF_TO_OLLAMA_MAP: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /llama-?3\.2[-_]1b/i, tag: 'llama3.2:1b' },
  { pattern: /llama-?3\.2[-_]3b/i, tag: 'llama3.2:3b' },
  { pattern: /llama-?3\.1[-_]8b/i, tag: 'llama3.1:8b' },
  { pattern: /phi-?3\.5[-_]mini/i, tag: 'phi3.5:latest' },
  { pattern: /mistral[-_]7b/i, tag: 'mistral:7b' },
  { pattern: /qwen2\.5[-_]0\.5b/i, tag: 'qwen2.5:0.5b' },
  { pattern: /qwen2\.5[-_]1\.5b/i, tag: 'qwen2.5:1.5b' },
  { pattern: /qwen2\.5[-_]3b/i, tag: 'qwen2.5:3b' },
  { pattern: /qwen2\.5[-_]7b/i, tag: 'qwen2.5:7b' },
  { pattern: /gemma-?2[-_]2b/i, tag: 'gemma2:2b' },
  { pattern: /gemma-?2[-_]9b/i, tag: 'gemma2:9b' },
  { pattern: /deepseek-?r1.*1\.5b/i, tag: 'deepseek-r1:1.5b' },
  { pattern: /deepseek-?r1.*7b/i, tag: 'deepseek-r1:7b' },
  { pattern: /tinyllama/i, tag: 'tinyllama:latest' },
];

export function resolveOllamaTag(repoId: string, tags: string[] = []): string | null {
  for (const entry of HF_TO_OLLAMA_MAP) {
    if (entry.pattern.test(repoId) || tags.some((t) => entry.pattern.test(t))) {
      return entry.tag;
    }
  }

  // Fallback heuristic: check if repo name looks like a recognized model
  const parts = repoId.split('/');
  const modelPart = parts[parts.length - 1].toLowerCase();
  for (const entry of HF_TO_OLLAMA_MAP) {
    if (entry.pattern.test(modelPart)) {
      return entry.tag;
    }
  }

  return null;
}

export function determineCompatibility(
  id: string,
  tags: string[],
  siblings?: Array<{ rfilename: string }>
): {
  isGguf: boolean;
  isCompatible: boolean;
  isDownloadable: boolean;
  ollamaModelTag?: string;
  compatibilityReason: string;
} {
  const hasGgufTag = tags.some((t) => t.toLowerCase() === 'gguf');
  const hasGgufInName = id.toLowerCase().includes('gguf');
  const hasGgufFiles = siblings?.some((s) => s.rfilename.toLowerCase().endsWith('.gguf')) ?? false;

  const isGguf = hasGgufTag || hasGgufInName || hasGgufFiles;
  const ollamaModelTag = resolveOllamaTag(id, tags) || undefined;

  if (isGguf && ollamaModelTag) {
    return {
      isGguf: true,
      isCompatible: true,
      isDownloadable: true,
      ollamaModelTag,
      compatibilityReason: `Compatible GGUF architecture mapped to Ollama library model '${ollamaModelTag}'. Downloadable directly.`,
    };
  }

  if (isGguf && !ollamaModelTag) {
    return {
      isGguf: true,
      isCompatible: true,
      isDownloadable: false,
      compatibilityReason: 'GGUF model detected. Compatible with quantization standards, but requires custom Modelfile import or direct GGUF loader in current Ollama version.',
    };
  }

  return {
    isGguf: false,
    isCompatible: false,
    isDownloadable: false,
    compatibilityReason: 'Non-GGUF model (e.g. unquantized PyTorch/Safetensors). Incompatible with resource-constrained local edge runtime without GGUF conversion.',
  };
}

export async function searchHuggingFaceModels(
  query: string,
  limit: number = 20
): Promise<HuggingFaceModel[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://huggingface.co/api/models?search=${encodedQuery}&limit=${Math.min(50, Math.max(1, limit))}&full=true`;

  let installedModelNames: string[] = [];
  try {
    const installed = await listInstalledModels();
    installedModelNames = installed.map((m) => m.name.toLowerCase());
  } catch {
    installedModelNames = [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EdgeLLM-ModelManager/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new AppError(res.status, `Hugging Face API returned HTTP status ${res.status}`);
    }

    const data = (await res.json()) as Array<{
      id: string;
      author?: string;
      description?: string;
      downloads?: number;
      likes?: number;
      tags?: string[];
      pipeline_tag?: string;
      cardData?: { license?: string };
      siblings?: Array<{ rfilename: string }>;
    }>;

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const compat = determineCompatibility(item.id, tags, item.siblings);

      const isInstalled = Boolean(
        compat.ollamaModelTag &&
          installedModelNames.some((installed) =>
            installed === compat.ollamaModelTag!.toLowerCase() ||
            installed.startsWith(`${compat.ollamaModelTag!.toLowerCase()}:`) ||
            compat.ollamaModelTag!.toLowerCase().startsWith(`${installed}:`)
          )
      );

      const parts = item.id.split('/');
      const author = item.author || (parts.length > 1 ? parts[0] : 'Community');
      const name = parts.length > 1 ? parts[1] : parts[0];

      return {
        id: item.id,
        name,
        author,
        description: item.description,
        downloads: item.downloads || 0,
        likes: item.likes || 0,
        tags,
        pipelineTag: item.pipeline_tag,
        license: item.cardData?.license,
        isGguf: compat.isGguf,
        isCompatible: compat.isCompatible,
        isDownloadable: compat.isDownloadable,
        isInstalled,
        compatibilityReason: compat.compatibilityReason,
        ollamaModelTag: compat.ollamaModelTag,
      };
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, `Failed to query Hugging Face API: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getHuggingFaceModelDetails(
  modelId: string
): Promise<HuggingFaceModel> {
  if (!modelId || !modelId.trim()) {
    throw new AppError(400, 'Model ID is required.');
  }

  const url = `https://huggingface.co/api/models/${encodeURIComponent(modelId.trim())}`;

  let installedModelNames: string[] = [];
  try {
    const installed = await listInstalledModels();
    installedModelNames = installed.map((m) => m.name.toLowerCase());
  } catch {
    installedModelNames = [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EdgeLLM-ModelManager/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      throw new AppError(404, `Model '${modelId}' not found on Hugging Face.`);
    }

    if (!res.ok) {
      throw new AppError(res.status, `Hugging Face API error: HTTP ${res.status}`);
    }

    const item = (await res.json()) as {
      id: string;
      author?: string;
      description?: string;
      downloads?: number;
      likes?: number;
      tags?: string[];
      pipeline_tag?: string;
      cardData?: { license?: string };
      siblings?: Array<{ rfilename: string }>;
    };

    const tags = Array.isArray(item.tags) ? item.tags : [];
    const compat = determineCompatibility(item.id, tags, item.siblings);

    const isInstalled = Boolean(
      compat.ollamaModelTag &&
        installedModelNames.some((installed) =>
          installed === compat.ollamaModelTag!.toLowerCase() ||
          installed.startsWith(`${compat.ollamaModelTag!.toLowerCase()}:`)
        )
    );

    const parts = item.id.split('/');
    const author = item.author || (parts.length > 1 ? parts[0] : 'Community');
    const name = parts.length > 1 ? parts[1] : parts[0];

    return {
      id: item.id,
      name,
      author,
      description: item.description,
      downloads: item.downloads || 0,
      likes: item.likes || 0,
      tags,
      pipelineTag: item.pipeline_tag,
      license: item.cardData?.license,
      isGguf: compat.isGguf,
      isCompatible: compat.isCompatible,
      isDownloadable: compat.isDownloadable,
      isInstalled,
      compatibilityReason: compat.compatibilityReason,
      ollamaModelTag: compat.ollamaModelTag,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, `Failed to fetch Hugging Face model details: ${err instanceof Error ? err.message : String(err)}`);
  }
}
