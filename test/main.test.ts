import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@actions/core');
vi.mock('@actions/github');
vi.mock('../src/read-summaries');
vi.mock('../src/generate-badges');
vi.mock('../src/suppression');
vi.mock('../src/create-check-runs');
vi.mock('../src/build-comment-body');
vi.mock('../src/pr-comments');

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readSummaries } from '../src/read-summaries';
import { generateBadges } from '../src/generate-badges';
import { checkSuppression } from '../src/suppression';
import { createCheckRuns } from '../src/create-check-runs';
import { buildCommentBody } from '../src/build-comment-body';
import { buildCommentMarker, findExistingComment, upsertComment } from '../src/pr-comments';

const mockedCore = vi.mocked(core);
const mockedGithub = vi.mocked(github);
const mockedReadSummaries = vi.mocked(readSummaries);
const mockedGenerateBadges = vi.mocked(generateBadges);
const mockedCheckSuppression = vi.mocked(checkSuppression);
const mockedCreateCheckRuns = vi.mocked(createCheckRuns);
const mockedBuildCommentBody = vi.mocked(buildCommentBody);
const mockedBuildCommentMarker = vi.mocked(buildCommentMarker);
const mockedFindExistingComment = vi.mocked(findExistingComment);
const mockedUpsertComment = vi.mocked(upsertComment);

describe('main', () => {
  const mockOctokit = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockedCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'github-token': 'test-token',
        'summary-report-base-path': 'test/data/',
        'title': 'Coverage Report',
        'suppress-check-failures': 'false',
        'external-id': 'delta-coverage',
        'check-run-extra-render-script': '',
      };
      return inputs[name] || '';
    });

    mockedGithub.getOctokit.mockReturnValue(mockOctokit);
    Object.defineProperty(mockedGithub, 'context', {
      value: {
        eventName: 'pull_request',
        sha: 'abc123',
        payload: {
          pull_request: { number: 42, head: { sha: 'pr-sha-456' } },
        },
        issue: { number: 42 },
        repo: { owner: 'testOwner', repo: 'testRepo' },
      },
      writable: true,
    });

    mockedReadSummaries.mockReturnValueOnce('delta-cov-summaries.json');
    mockedReadSummaries.mockReturnValueOnce('full-cov-summaries.json');
    mockedCheckSuppression.mockResolvedValue(false);
    mockedCreateCheckRuns.mockResolvedValue([]);
    mockedBuildCommentBody.mockReturnValue('<html>body</html>');
    mockedBuildCommentMarker.mockReturnValue('<!-- marker=Coverage Report -->');
    mockedFindExistingComment.mockResolvedValue(undefined);
    mockedUpsertComment.mockResolvedValue(undefined);
  });

  async function runMain() {
    // Dynamically import to trigger the run() call
    // We need to reset the module cache so it re-executes
    vi.resetModules();
    // Re-mock after resetModules
    vi.doMock('@actions/core', () => mockedCore);
    vi.doMock('@actions/github', () => mockedGithub);
    vi.doMock('../src/read-summaries', () => ({ readSummaries: mockedReadSummaries }));
    vi.doMock('../src/generate-badges', () => ({ generateBadges: mockedGenerateBadges }));
    vi.doMock('../src/suppression', () => ({ checkSuppression: mockedCheckSuppression }));
    vi.doMock('../src/create-check-runs', () => ({ createCheckRuns: mockedCreateCheckRuns }));
    vi.doMock('../src/build-comment-body', () => ({ buildCommentBody: mockedBuildCommentBody }));
    vi.doMock('../src/pr-comments', () => ({
      buildCommentMarker: mockedBuildCommentMarker,
      findExistingComment: mockedFindExistingComment,
      upsertComment: mockedUpsertComment,
    }));
    await import('../src/main');
    // Allow microtasks to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  it('should read both delta and full coverage summaries', async () => {
    await runMain();

    expect(mockedReadSummaries).toHaveBeenCalledWith({
      isFullCoverageMode: false,
      baseSummariesPath: 'test/data/',
    });
    expect(mockedReadSummaries).toHaveBeenCalledWith({
      isFullCoverageMode: true,
      baseSummariesPath: 'test/data/',
    });
  });

  it('should generate badges from full coverage summaries', async () => {
    await runMain();

    expect(mockedGenerateBadges).toHaveBeenCalledWith({
      summariesFile: 'full-cov-summaries.json',
      core: mockedCore,
    });
  });

  it('should check suppression with correct params', async () => {
    await runMain();

    expect(mockedCheckSuppression).toHaveBeenCalledWith({
      github: mockOctokit,
      context: expect.objectContaining({ repo: { owner: 'testOwner', repo: 'testRepo' } }),
      pullNumber: 42,
      suppressByInput: false,
      core: mockedCore,
    });
  });

  it('should create check runs with correct params', async () => {
    await runMain();

    expect(mockedCreateCheckRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        summaryReportPath: 'delta-cov-summaries.json',
        ignoreCoverageFailure: false,
        headSha: 'pr-sha-456',
        externalId: 'delta-coverage',
      })
    );
  });

  it('should build and post PR comment', async () => {
    await runMain();

    expect(mockedBuildCommentBody).toHaveBeenCalled();
    expect(mockedUpsertComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '<html>body</html>',
      })
    );
  });

  it('should find existing comment when marker exists', async () => {
    await runMain();

    expect(mockedFindExistingComment).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: '<!-- marker=Coverage Report -->',
      })
    );
  });

  it('should not post comment when not a pull request', async () => {
    Object.defineProperty(mockedGithub, 'context', {
      value: {
        eventName: 'push',
        sha: 'abc123',
        payload: {},
        repo: { owner: 'testOwner', repo: 'testRepo' },
      },
      writable: true,
    });

    await runMain();

    expect(mockedUpsertComment).not.toHaveBeenCalled();
  });

  it('should continue when badge generation fails', async () => {
    mockedGenerateBadges.mockImplementation(() => {
      throw new Error('badge error');
    });

    await runMain();

    expect(mockedCore.warning).toHaveBeenCalledWith(expect.stringContaining('badge error'));
    expect(mockedCheckSuppression).toHaveBeenCalled();
  });
});
