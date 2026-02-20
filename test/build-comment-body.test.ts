import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCommentBody, BuildCommentBodyParams } from '../src/build-comment-body';
import { CheckRunResult } from '../src/types/coverage';

function createMockSummaryBuilder() {
  let buffer = '';
  const builder: any = {
    addHeading: vi.fn((text: string, _level: string) => { buffer += `<h2>${text}</h2>`; return builder; }),
    addRaw: vi.fn((text: string, _addEOL?: boolean) => { buffer += text; return builder; }),
    addEOL: vi.fn(() => { buffer += '\n'; return builder; }),
    stringify: vi.fn(() => buffer),
  };
  return builder;
}

function makeCheckRun(overrides: Partial<CheckRunResult> = {}): CheckRunResult {
  return {
    viewName: 'Test',
    verifications: [],
    coverageRules: { failOnViolation: false, entitiesRules: {} },
    url: 'https://github.com/owner/repo/runs/123',
    conclusion: 'success',
    coverageInfo: [
      { coverageEntity: 'INSTRUCTION', covered: 80, total: 100, percents: 80 },
      { coverageEntity: 'BRANCH', covered: 50, total: 100, percents: 50 },
      { coverageEntity: 'LINE', covered: 70, total: 100, percents: 70 },
    ],
    ...overrides,
  };
}

const defaultEnv = {
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'owner/repo',
  GITHUB_RUN_ID: '12345',
  GITHUB_RUN_NUMBER: '42',
  GITHUB_RUN_ATTEMPT: '1',
};

describe('buildCommentBody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with check run data', () => {
    const checkRun = makeCheckRun();
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Coverage Report',
      commentMarker: '<!-- marker -->',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('<table><tbody>');
    expect(result).toContain('</tbody></table>');
    expect(result).toContain('Test');
    expect(result).toContain('INSTRUCTION');
    expect(result).toContain('BRANCH');
    expect(result).toContain('LINE');
  });

  it('should include comment marker', () => {
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([makeCheckRun()]),
      commentTitle: 'Title',
      commentMarker: '<!-- delta-coverage -->',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('<!-- delta-coverage -->');
  });

  it('should show success status symbol for passing checks', () => {
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([makeCheckRun({ conclusion: 'success' })]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('🟢');
    expect(result).not.toContain('🔴');
  });

  it('should show failure status symbol when conclusion is failure', () => {
    const checkRun = makeCheckRun({
      conclusion: 'failure',
      coverageRules: {
        failOnViolation: true,
        entitiesRules: {
          INSTRUCTION: { minCoverageRatio: 0.9 },
          BRANCH: { minCoverageRatio: 0.9 },
          LINE: { minCoverageRatio: 0.9 },
        },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('🔴');
  });

  it('should show failure status when conclusion is failure even with failOnViolation disabled', () => {
    const checkRun = makeCheckRun({
      conclusion: 'failure',
      coverageRules: {
        failOnViolation: false,
        entitiesRules: {
          INSTRUCTION: { minCoverageRatio: 0.9 },
        },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('🔴');
    expect(result).not.toContain('🟢');
  });

  it('should show neutral status symbol when conclusion is neutral (suppressed failure)', () => {
    const checkRun = makeCheckRun({
      conclusion: 'neutral',
      coverageRules: {
        failOnViolation: true,
        entitiesRules: {
          INSTRUCTION: { minCoverageRatio: 0.99 },
          BRANCH: { minCoverageRatio: 0.99 },
          LINE: { minCoverageRatio: 0.99 },
        },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('🟡');
    expect(result).not.toContain('🟢');
    expect(result).not.toContain('🔴');
  });

  it('should use progress bar with success color when actual >= expected', () => {
    const checkRun = makeCheckRun({
      coverageRules: {
        failOnViolation: true,
        entitiesRules: { LINE: { minCoverageRatio: 0.5 } },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('progress_color=7AB56D');
  });

  it('should use progress bar with failure color when actual < expected', () => {
    const checkRun = makeCheckRun({
      coverageRules: {
        failOnViolation: true,
        entitiesRules: {
          INSTRUCTION: { minCoverageRatio: 0.99 },
        },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('progress_color=C4625A');
  });

  it('should show no-coverage indicator when total is 0', () => {
    const checkRun = makeCheckRun({
      coverageInfo: [
        { coverageEntity: 'INSTRUCTION', covered: 0, total: 0, percents: 0 },
        { coverageEntity: 'BRANCH', covered: 0, total: 0, percents: 0 },
        { coverageEntity: 'LINE', covered: 0, total: 0, percents: 0 },
      ],
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('No%20diff');
    expect(result).toContain('777777');
  });

  it('should fold expected column when all values are the same', () => {
    const checkRun = makeCheckRun({
      coverageRules: {
        failOnViolation: true,
        entitiesRules: {
          INSTRUCTION: { minCoverageRatio: 0.8 },
          BRANCH: { minCoverageRatio: 0.8 },
          LINE: { minCoverageRatio: 0.8 },
        },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('rowspan=3');
  });

  it('should include workflow metadata link', () => {
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([makeCheckRun()]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('Run 42.1');
    expect(result).toContain('https://github.com/owner/repo/actions/runs/12345');
  });

  it('should include entity tooltips', () => {
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([makeCheckRun()]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('title="The Java bytecode instructions executed during testing"');
    expect(result).toContain('title="The source code lines covered by the tests."');
  });

  it('should render multiple check runs', () => {
    const checkRuns = [
      makeCheckRun({ viewName: 'Test' }),
      makeCheckRun({ viewName: 'FunctionalTest' }),
    ];
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify(checkRuns),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('Test');
    expect(result).toContain('FunctionalTest');
  });

  it('should show expected percentage with target emoji', () => {
    const checkRun = makeCheckRun({
      coverageRules: {
        failOnViolation: true,
        entitiesRules: { LINE: { minCoverageRatio: 0.75 } },
      },
    });
    const mockBuilder = createMockSummaryBuilder();

    const result = buildCommentBody({
      checkRunsContent: JSON.stringify([checkRun]),
      commentTitle: 'Title',
      commentMarker: '',
      core: { summary: mockBuilder },
      env: defaultEnv,
    });

    expect(result).toContain('🎯 75% 🎯');
  });
});
