import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockedFs = vi.mocked(fs);

// Import after mock setup
import { readSummaries } from '../src/read-summaries';

describe('readSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter and aggregate full-coverage summaries', () => {
    mockedFs.readdirSync.mockReturnValue([
      'full-coverage-test-summary.json',
      'full-coverage-functionalTest-summary.json',
      'delta-coverage-test-summary.json',
    ] as any);

    const testSummary = { view: 'test', coverageInfo: [] };
    const funcSummary = { view: 'functionalTest', coverageInfo: [] };
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath).includes('full-coverage-test')) return JSON.stringify(testSummary);
      if (String(filePath).includes('full-coverage-functionalTest')) return JSON.stringify(funcSummary);
      throw new Error(`Unexpected file: ${filePath}`);
    });

    const result = readSummaries({
      isFullCoverageMode: true,
      baseSummariesPath: '/some/path',
    });

    expect(result).toBe('full-cov-summaries.json');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'full-cov-summaries.json',
      JSON.stringify([testSummary, funcSummary])
    );
  });

  it('should filter and aggregate delta-coverage summaries', () => {
    mockedFs.readdirSync.mockReturnValue([
      'full-coverage-test-summary.json',
      'delta-coverage-test-summary.json',
      'delta-coverage-functionalTest-summary.json',
    ] as any);

    const deltaSummary = { view: 'test', coverageInfo: [] };
    const deltaFuncSummary = { view: 'functionalTest', coverageInfo: [] };
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath).includes('delta-coverage-test')) return JSON.stringify(deltaSummary);
      if (String(filePath).includes('delta-coverage-functionalTest')) return JSON.stringify(deltaFuncSummary);
      throw new Error(`Unexpected file: ${filePath}`);
    });

    const result = readSummaries({
      isFullCoverageMode: false,
      baseSummariesPath: '/some/path',
    });

    expect(result).toBe('delta-cov-summaries.json');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'delta-cov-summaries.json',
      JSON.stringify([deltaSummary, deltaFuncSummary])
    );
  });

  it('should handle empty directory', () => {
    mockedFs.readdirSync.mockReturnValue([] as any);

    const result = readSummaries({
      isFullCoverageMode: true,
      baseSummariesPath: '/empty/dir',
    });

    expect(result).toBe('full-cov-summaries.json');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      'full-cov-summaries.json',
      '[]'
    );
  });

  it('should ignore non-summary files', () => {
    mockedFs.readdirSync.mockReturnValue([
      'full-coverage-test-summary.json',
      'some-other-file.txt',
      'report.json',
    ] as any);

    const testSummary = { view: 'test' };
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(testSummary) as any);

    readSummaries({
      isFullCoverageMode: true,
      baseSummariesPath: '/path',
    });

    expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
  });
});
