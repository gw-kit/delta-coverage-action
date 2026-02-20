import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSuppression, CheckSuppressionParams } from '../src/suppression';

function makeParams(overrides: Partial<CheckSuppressionParams> = {}): CheckSuppressionParams {
  return {
    github: {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: { labels: [] },
          }),
        },
      },
    },
    context: { repo: { owner: 'testOwner', repo: 'testRepo' } },
    pullNumber: 42,
    suppressByInput: false,
    core: { info: vi.fn() },
    ...overrides,
  };
}

describe('checkSuppression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when no suppression conditions met', async () => {
    const params = makeParams();
    const result = await checkSuppression(params);
    expect(result).toBe(false);
  });

  it('should return true when suppress-coverage label is present', async () => {
    const params = makeParams({
      github: {
        rest: {
          pulls: {
            get: vi.fn().mockResolvedValue({
              data: { labels: [{ name: 'suppress-coverage' }, { name: 'other' }] },
            }),
          },
        },
      },
    });

    const result = await checkSuppression(params);
    expect(result).toBe(true);
  });

  it('should return true when suppressByInput is true', async () => {
    const params = makeParams({ suppressByInput: true });
    const result = await checkSuppression(params);
    expect(result).toBe(true);
  });

  it('should return true when both label and input are true', async () => {
    const params = makeParams({
      suppressByInput: true,
      github: {
        rest: {
          pulls: {
            get: vi.fn().mockResolvedValue({
              data: { labels: [{ name: 'suppress-coverage' }] },
            }),
          },
        },
      },
    });

    const result = await checkSuppression(params);
    expect(result).toBe(true);
  });

  it('should skip label check when pullNumber is 0', async () => {
    const params = makeParams({ pullNumber: 0 });
    const result = await checkSuppression(params);
    expect(result).toBe(false);
    expect(params.github.rest.pulls.get).not.toHaveBeenCalled();
  });

  it('should call pulls.get with correct parameters', async () => {
    const params = makeParams();
    await checkSuppression(params);

    expect(params.github.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'testOwner',
      repo: 'testRepo',
      pull_number: 42,
    });
  });

  it('should log suppression status', async () => {
    const params = makeParams();
    await checkSuppression(params);

    expect(params.core.info).toHaveBeenCalledWith(
      'Is suppress=false : by label=false, by input=false'
    );
  });
});
