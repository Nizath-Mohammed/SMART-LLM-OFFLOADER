/**
 * hardwareDetector.ts
 *
 * Collects host hardware information using Node built-ins only (os, child_process).
 * Static metrics are gathered once during initHardwareDetector().
 * availableRamMB is re-queried fresh on every getHardwareInfo() call.
 *
 * Any individual metric failure results in { value: null, source: 'unavailable' }
 * and is never propagated to the Express error handler.
 */

import * as os from 'os';
import { spawn } from 'child_process';
import type { HardwareInfo, HardwareMetric } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a successfully collected value in a 'measured' metric. */
function measured<T>(value: T): HardwareMetric<T> {
  return { value, source: 'measured' };
}

/** Returns a safe 'unavailable' metric — used on any collection error. */
function unavailable<T>(): HardwareMetric<T> {
  return { value: null, source: 'unavailable' };
}

// ---------------------------------------------------------------------------
// GPU detection (Windows-only, wmic subprocess, 2-second timeout)
// ---------------------------------------------------------------------------

interface GpuInfo {
  gpuName: HardwareMetric<string>;
  gpuVramMB: HardwareMetric<number>;
}

function detectGpu(): Promise<GpuInfo> {
  return new Promise<GpuInfo>((resolve) => {
    const fallback: GpuInfo = {
      gpuName: unavailable<string>(),
      gpuVramMB: unavailable<number>(),
    };

    // Non-Windows: skip immediately
    if (process.platform !== 'win32') {
      resolve(fallback);
      return;
    }

    let settled = false;

    const child = spawn(
      'wmic',
      ['path', 'win32_VideoController', 'get', 'name,AdapterRAM', '/format:csv'],
      { windowsHide: true }
    );

    let stdout = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    // Kill after 2 seconds
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        resolve(fallback);
      }
    }, 2000);

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (settled) return; // already resolved via timeout
      settled = true;

      try {
        if (code !== 0) {
          resolve(fallback);
          return;
        }

        // wmic CSV format:
        //   Node,AdapterRAM,Name
        //   HOSTNAME,4294967296,NVIDIA GeForce RTX 3060
        //
        // Lines starting with the machine's node name carry the data.
        // We parse the header row to find column positions, then extract values.

        const lines = stdout
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          resolve(fallback);
          return;
        }

        // First non-empty line is the header
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const nameIdx = header.indexOf('name');
        const ramIdx = header.indexOf('adapterram');

        if (nameIdx === -1 || ramIdx === -1) {
          resolve(fallback);
          return;
        }

        // Find the first data row that has a non-empty Name
        let gpuName: HardwareMetric<string> = unavailable<string>();
        let gpuVramMB: HardwareMetric<number> = unavailable<number>();

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          if (cols.length <= Math.max(nameIdx, ramIdx)) continue;

          const name = cols[nameIdx];
          const ramRaw = cols[ramIdx];

          if (!name) continue; // skip rows without a GPU name

          gpuName = measured(name);

          const ramBytes = parseInt(ramRaw, 10);
          if (!isNaN(ramBytes) && ramBytes > 0) {
            gpuVramMB = measured(Math.round(ramBytes / (1024 * 1024)));
          }

          break; // use the first valid row
        }

        resolve({ gpuName, gpuVramMB });
      } catch {
        resolve(fallback);
      }
    });

    child.on('error', () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Module-level state (populated by initHardwareDetector)
// ---------------------------------------------------------------------------

interface StaticMetrics {
  totalRamMB: HardwareMetric<number>;
  cpuModel: HardwareMetric<string>;
  logicalCores: HardwareMetric<number>;
  osName: HardwareMetric<string>;
  osVersion: HardwareMetric<string>;
  gpuName: HardwareMetric<string>;
  gpuVramMB: HardwareMetric<number>;
}

let staticMetrics: StaticMetrics | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collects all static metrics once at startup.
 * Must be awaited before getHardwareInfo() is called.
 */
export async function initHardwareDetector(): Promise<void> {
  // --- totalRamMB ---
  let totalRamMB: HardwareMetric<number>;
  try {
    totalRamMB = measured(Math.round(os.totalmem() / (1024 * 1024)));
  } catch {
    totalRamMB = unavailable<number>();
  }

  // --- cpuModel ---
  let cpuModel: HardwareMetric<string>;
  try {
    const cpus = os.cpus();
    cpuModel = cpus.length > 0 ? measured(cpus[0].model) : unavailable<string>();
  } catch {
    cpuModel = unavailable<string>();
  }

  // --- logicalCores ---
  let logicalCores: HardwareMetric<number>;
  try {
    const cpus = os.cpus();
    logicalCores = measured(cpus.length);
  } catch {
    logicalCores = unavailable<number>();
  }

  // --- osName ---
  let osName: HardwareMetric<string>;
  try {
    osName = measured(os.type());
  } catch {
    osName = unavailable<string>();
  }

  // --- osVersion ---
  let osVersion: HardwareMetric<string>;
  try {
    osVersion = measured(os.release());
  } catch {
    osVersion = unavailable<string>();
  }

  // --- GPU (async, Windows-only) ---
  const { gpuName, gpuVramMB } = await detectGpu();

  staticMetrics = {
    totalRamMB,
    cpuModel,
    logicalCores,
    osName,
    osVersion,
    gpuName,
    gpuVramMB,
  };
}

/**
 * Returns the current HardwareInfo snapshot.
 * availableRamMB is re-queried fresh on every call.
 * Requires initHardwareDetector() to have been awaited first.
 */
export function getHardwareInfo(): HardwareInfo {
  // Fallback static metrics if init was somehow skipped
  const base: StaticMetrics = staticMetrics ?? {
    totalRamMB: unavailable<number>(),
    cpuModel: unavailable<string>(),
    logicalCores: unavailable<number>(),
    osName: unavailable<string>(),
    osVersion: unavailable<string>(),
    gpuName: unavailable<string>(),
    gpuVramMB: unavailable<number>(),
  };

  // availableRamMB is always fresh
  let availableRamMB: HardwareMetric<number>;
  try {
    availableRamMB = measured(Math.round(os.freemem() / (1024 * 1024)));
  } catch {
    availableRamMB = unavailable<number>();
  }

  return {
    totalRamMB: base.totalRamMB,
    availableRamMB,
    cpuModel: base.cpuModel,
    logicalCores: base.logicalCores,
    osName: base.osName,
    osVersion: base.osVersion,
    gpuName: base.gpuName,
    gpuVramMB: base.gpuVramMB,
  };
}
