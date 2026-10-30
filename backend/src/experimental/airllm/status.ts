import { AirllmStatus } from '../../types/index';

export function getAirllmStatus(): AirllmStatus {
  return {
    feasible: false,
    compatibleWithOllama: false,
    limitations: [
      'AIRLLM requires PyTorch/HuggingFace weights; Ollama uses GGUF format — no runtime conversion is available.',
      'AIRLLM requires a Python 3.x runtime with torch and accelerate packages, which are absent from this Node.js backend.',
      "AIRLLM's layer-by-layer GPU VRAM offloading provides no benefit on the target hardware (no discrete GPU, Intel Core i3).",
    ],
    proofOfConceptAvailable: false,
    notes: 'AIRLLM integration is not viable for this platform. The recommended approach for RAM-constrained inference remains smaller quantized GGUF models via Ollama.',
  };
}
