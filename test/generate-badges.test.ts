import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { CoverageSummary } from '../src/types/coverage';

vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('gradient-badge', () => ({
  default: vi.fn((inputs: any) => `<svg>${inputs.subject}: ${inputs.status}</svg>`),
}));

const mockedFs = vi.mocked(fs);

import { generateBadges } from '../src/generate-badges';

describe('generateBadges', () => {
  const mockCore = {
    info: vi.fn(),
    setOutput: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeSummary = (view: string, linePercent: number): CoverageSummary => ({
    view,
    reportBound: 'DELTA_REPORT',
    coverageRulesConfig: { failOnViolation: false, entitiesRules: {} },
    verifications: [],
    coverageInfo: [
      { coverageEntity: 'INSTRUCTION', covered: 80, total: 100, percents: 80 },
      { coverageEntity: 'BRANCH', covered: 50, total: 100, percents: 50 },
      { coverageEntity: 'LINE', covered: 70, total: 100, percents: linePercent },
    ],
  });

  it('should create badges directory', () => {
    mockedFs.readFileSync.mockReturnValue('[]' as any);

    generateBadges({ summariesFile: 'test.json', core: mockCore });

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith('badges/', { recursive: true });
  });

  it('should generate badges for each view sorted alphabetically', () => {
    const summaries = [
      makeSummary('test', 82.3),
      makeSummary('aggregated', 87.96),
    ];
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(summaries) as any);

    generateBadges({ summariesFile: 'full-cov-summaries.json', core: mockCore });

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    // Sorted alphabetically: aggregated first, then test
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'badges/aggregated.svg',
      expect.stringContaining('aggregated')
    );
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'badges/test.svg',
      expect.stringContaining('test')
    );
  });

  it('should set output for each badge and badges-dir', () => {
    const summaries = [makeSummary('test', 82.3)];
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(summaries) as any);

    generateBadges({ summariesFile: 'test.json', core: mockCore });

    expect(mockCore.setOutput).toHaveBeenCalledWith('test', 'badges/test.svg');
    expect(mockCore.setOutput).toHaveBeenCalledWith('badges-dir', 'badges/');
  });

  it('should use custom output directory', () => {
    mockedFs.readFileSync.mockReturnValue('[]' as any);

    generateBadges({ summariesFile: 'test.json', core: mockCore, outputDir: 'custom/' });

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith('custom/', { recursive: true });
    expect(mockCore.setOutput).toHaveBeenCalledWith('badges-dir', 'custom/');
  });

  it('should cycle through colors for many views', () => {
    const summaries = [
      makeSummary('a', 80),
      makeSummary('b', 70),
      makeSummary('c', 60),
      makeSummary('d', 50),
      makeSummary('e', 40),
      makeSummary('f', 30), // cycles back to first color
    ];
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(summaries) as any);

    generateBadges({ summariesFile: 'test.json', core: mockCore });

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(6);
  });

  it('should handle empty summaries', () => {
    mockedFs.readFileSync.mockReturnValue('[]' as any);

    generateBadges({ summariesFile: 'test.json', core: mockCore });

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockCore.setOutput).toHaveBeenCalledWith('badges-dir', 'badges/');
  });
});
