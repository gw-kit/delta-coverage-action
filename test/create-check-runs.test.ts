import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { CoverageSummary } from '../src/types/coverage';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

const mockedFs = vi.mocked(fs);

import { createCheckRuns, CreateCheckRunsParams } from '../src/create-check-runs';

function makeSummary(overrides: Partial<CoverageSummary> = {}): CoverageSummary {
  return {
    view: 'test',
    reportBound: 'DELTA_REPORT',
    coverageRulesConfig: { failOnViolation: false, entitiesRules: {} },
    verifications: [],
    coverageInfo: [
      { coverageEntity: 'INSTRUCTION', covered: 80, total: 100, percents: 80 },
      { coverageEntity: 'BRANCH', covered: 50, total: 100, percents: 50 },
      { coverageEntity: 'LINE', covered: 70, total: 100, percents: 70 },
    ],
    ...overrides,
  };
}

function makeParams(overrides: Partial<CreateCheckRunsParams> = {}): CreateCheckRunsParams {
  return {
    summaryReportPath: 'delta-cov-summaries.json',
    ignoreCoverageFailure: false,
    core: { error: vi.fn() },
    context: { repo: { owner: 'testOwner', repo: 'testRepo' } },
    github: {
      rest: {
        checks: {
          create: vi.fn().mockResolvedValue({
            data: { html_url: 'https://github.com/testOwner/testRepo/runs/456' },
          }),
        },
      },
    },
    headSha: 'abc123',
    externalId: 'delta-coverage',
    ...overrides,
  };
}

describe('createCheckRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a check run for each view', async () => {
    const summaries = [makeSummary({ view: 'test' }), makeSummary({ view: 'functionalTest' })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams();
    const result = await createCheckRuns(params);

    expect(result).toHaveLength(2);
    expect(result[0].viewName).toBe('Test');
    expect(result[1].viewName).toBe('FunctionalTest');
    expect(params.github.rest.checks.create).toHaveBeenCalledTimes(2);
  });

  it('should set conclusion to success when no violations', async () => {
    const summaries = [makeSummary({ verifications: [] })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams();
    const result = await createCheckRuns(params);

    expect(result[0].conclusion).toBe('success');
  });

  it('should set conclusion to failure when violations exist', async () => {
    const summaries = [makeSummary({ verifications: [{ violation: 'LINE: min=80%, actual=50%' }] })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams({ ignoreCoverageFailure: false });
    const result = await createCheckRuns(params);

    expect(result[0].conclusion).toBe('failure');
  });

  it('should suppress failures when ignoreCoverageFailure is true', async () => {
    const summaries = [makeSummary({ verifications: [{ violation: 'LINE: min=80%, actual=50%' }] })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams({ ignoreCoverageFailure: true });
    const result = await createCheckRuns(params);

    expect(result[0].conclusion).toBe('neutral');
  });

  it('should log error annotations for violations', async () => {
    const summaries = [makeSummary({
      view: 'test',
      verifications: [{ violation: 'LINE: min=80%, actual=50%' }],
    })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams();
    await createCheckRuns(params);

    expect(params.core.error).toHaveBeenCalledWith(
      expect.stringContaining('[Test]: Code Coverage check failed:')
    );
  });

  it('should handle missing report file gracefully', async () => {
    const summaries = [makeSummary({ view: 'test' })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      throw new Error('ENOENT');
    });

    const params = makeParams();
    const result = await createCheckRuns(params);

    expect(result[0]).toBeDefined();
    expect(params.github.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({
          summary: expect.stringContaining('NO REPORT by path:'),
        }),
      })
    );
  });

  it('should pass correct parameters to checks.create', async () => {
    const summaries = [makeSummary({ view: 'test' })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams();
    await createCheckRuns(params);

    expect(params.github.rest.checks.create).toHaveBeenCalledWith({
      owner: 'testOwner',
      repo: 'testRepo',
      name: '📈Test Coverage',
      head_sha: 'abc123',
      status: 'completed',
      external_id: 'delta-coverage',
      conclusion: 'success',
      output: {
        title: 'Test Coverage',
        summary: expect.stringContaining('Report content'),
      },
    });
  });

  it('should include summaryExtraFun output in check run', async () => {
    const summaries = [makeSummary({ view: 'test' })];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const extraFun = vi.fn().mockReturnValue('<extra>data</extra>');
    const params = makeParams({ summaryExtraFun: extraFun });
    await createCheckRuns(params);

    expect(extraFun).toHaveBeenCalledWith(summaries[0]);
    expect(params.github.rest.checks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({
          summary: expect.stringContaining('<extra>data</extra>'),
        }),
      })
    );
  });

  it('should return check run URL from API response', async () => {
    const summaries = [makeSummary()];
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (String(filePath) === 'delta-cov-summaries.json') return JSON.stringify(summaries);
      return 'Report content';
    });

    const params = makeParams();
    const result = await createCheckRuns(params);

    expect(result[0].url).toBe('https://github.com/testOwner/testRepo/runs/456');
  });
});
