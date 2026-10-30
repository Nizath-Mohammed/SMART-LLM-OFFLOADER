import * as os from 'os';

jest.mock('os', () => {
  const actualOs = jest.requireActual('os');
  return {
    ...actualOs,
    cpus: jest.fn((...args: unknown[]) => actualOs.cpus(...args)),
    freemem: jest.fn((...args: unknown[]) => actualOs.freemem(...args)),
    totalmem: jest.fn((...args: unknown[]) => actualOs.totalmem(...args)),
    type: jest.fn((...args: unknown[]) => actualOs.type(...args)),
    release: jest.fn((...args: unknown[]) => actualOs.release(...args)),
  };
});

import { initHardwareDetector, getHardwareInfo } from '../services/hardwareDetector';

describe('HardwareDetector unit tests', () => {
  const mockedOs = os as jest.Mocked<typeof os>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await initHardwareDetector();
  });

  it('all non-GPU fields have source: "measured" and non-null values when OS APIs succeed', () => {
    const info = getHardwareInfo();

    expect(info.totalRamMB.source).toBe('measured');
    expect(typeof info.totalRamMB.value).toBe('number');
    expect(info.totalRamMB.value).toBeGreaterThan(0);

    expect(info.availableRamMB.source).toBe('measured');
    expect(typeof info.availableRamMB.value).toBe('number');
    expect(info.availableRamMB.value).toBeGreaterThan(0);

    expect(info.cpuModel.source).toBe('measured');
    expect(typeof info.cpuModel.value).toBe('string');
    expect(info.cpuModel.value!.length).toBeGreaterThan(0);

    expect(info.logicalCores.source).toBe('measured');
    expect(typeof info.logicalCores.value).toBe('number');
    expect(info.logicalCores.value).toBeGreaterThan(0);

    expect(info.osName.source).toBe('measured');
    expect(typeof info.osName.value).toBe('string');

    expect(info.osVersion.source).toBe('measured');
    expect(typeof info.osVersion.value).toBe('string');
  });

  it('GPU fields return source: "unavailable" when not on Windows or when detection fails', async () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      await initHardwareDetector();
      const info = getHardwareInfo();
      expect(info.gpuName.source).toBe('unavailable');
      expect(info.gpuName.value).toBeNull();
      expect(info.gpuVramMB.source).toBe('unavailable');
      expect(info.gpuVramMB.value).toBeNull();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      await initHardwareDetector();
    }
  });

  it('any single metric failure returns unavailable for that field while remaining fields are unaffected', async () => {
    mockedOs.cpus.mockImplementation(() => {
      throw new Error('CPUs unavailable');
    });

    await initHardwareDetector();
    const info = getHardwareInfo();

    expect(info.cpuModel.source).toBe('unavailable');
    expect(info.cpuModel.value).toBeNull();
    expect(info.logicalCores.source).toBe('unavailable');
    expect(info.logicalCores.value).toBeNull();

    // Remaining fields unaffected
    expect(info.totalRamMB.source).toBe('measured');
    expect(info.totalRamMB.value).toBeGreaterThan(0);
    expect(info.availableRamMB.source).toBe('measured');
    expect(info.osName.source).toBe('measured');
  });

  it('availableRamMB value changes between two consecutive getHardwareInfo() calls after simulating memory change', () => {
    mockedOs.freemem.mockReturnValueOnce(4 * 1024 * 1024 * 1024); // 4096 MB
    const firstCall = getHardwareInfo();
    expect(firstCall.availableRamMB.value).toBe(4096);

    mockedOs.freemem.mockReturnValueOnce(2 * 1024 * 1024 * 1024); // 2048 MB
    const secondCall = getHardwareInfo();
    expect(secondCall.availableRamMB.value).toBe(2048);

    expect(firstCall.availableRamMB.value).not.toBe(secondCall.availableRamMB.value);
  });
});
