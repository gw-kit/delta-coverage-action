import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findExistingComment,
  upsertComment,
  buildCommentMarker,
  FindExistingCommentParams,
  UpsertCommentParams,
} from '../src/pr-comments';

const mockContext = {
  issue: { number: 42 },
  repo: { owner: 'testOwner', repo: 'testRepo' },
};

describe('findExistingComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return comment id when marker found', async () => {
    const params: FindExistingCommentParams = {
      github: {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({
              data: [
                { id: 1, body: 'some other comment' },
                { id: 2, body: 'has <!-- marker=test --> in it' },
              ],
            }),
            createComment: vi.fn(),
            updateComment: vi.fn(),
          },
        },
      },
      context: mockContext,
      marker: '<!-- marker=test -->',
    };

    const result = await findExistingComment(params);
    expect(result).toBe(2);
  });

  it('should return undefined when marker not found', async () => {
    const params: FindExistingCommentParams = {
      github: {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({
              data: [{ id: 1, body: 'no marker here' }],
            }),
            createComment: vi.fn(),
            updateComment: vi.fn(),
          },
        },
      },
      context: mockContext,
      marker: '<!-- marker=test -->',
    };

    const result = await findExistingComment(params);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty comments list', async () => {
    const params: FindExistingCommentParams = {
      github: {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: [] }),
            createComment: vi.fn(),
            updateComment: vi.fn(),
          },
        },
      },
      context: mockContext,
      marker: '<!-- marker=test -->',
    };

    const result = await findExistingComment(params);
    expect(result).toBeUndefined();
  });
});

describe('upsertComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update existing comment when id is provided', async () => {
    const updateComment = vi.fn();
    const createComment = vi.fn();
    const params: UpsertCommentParams = {
      github: {
        rest: {
          issues: {
            listComments: vi.fn(),
            updateComment,
            createComment,
          },
        },
      },
      context: mockContext,
      existingCommentId: 123,
      body: 'updated body',
    };

    await upsertComment(params);

    expect(updateComment).toHaveBeenCalledWith({
      issue_number: 42,
      owner: 'testOwner',
      repo: 'testRepo',
      comment_id: 123,
      body: 'updated body',
    });
    expect(createComment).not.toHaveBeenCalled();
  });

  it('should create new comment when no existing id', async () => {
    const updateComment = vi.fn();
    const createComment = vi.fn();
    const params: UpsertCommentParams = {
      github: {
        rest: {
          issues: {
            listComments: vi.fn(),
            updateComment,
            createComment,
          },
        },
      },
      context: mockContext,
      body: 'new comment body',
    };

    await upsertComment(params);

    expect(createComment).toHaveBeenCalledWith({
      issue_number: 42,
      owner: 'testOwner',
      repo: 'testRepo',
      body: 'new comment body',
    });
    expect(updateComment).not.toHaveBeenCalled();
  });
});

describe('buildCommentMarker', () => {
  it('should build marker from title', () => {
    expect(buildCommentMarker('My Title')).toBe('<!-- marker=My Title -->');
  });
});
