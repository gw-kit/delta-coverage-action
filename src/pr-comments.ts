export interface PrCommentsGitHubClient {
  rest: {
    issues: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listComments(params: any): Promise<{ data: Array<{ id: number; body?: string }> }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createComment(params: any): Promise<unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateComment(params: any): Promise<unknown>;
    };
  };
}

export interface FindExistingCommentParams {
  github: PrCommentsGitHubClient;
  context: {
    issue: { number: number };
    repo: { owner: string; repo: string };
  };
  marker: string;
}

export async function findExistingComment(params: FindExistingCommentParams): Promise<number | undefined> {
  const { github, context, marker } = params;

  const response = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  const comment = response.data.find(it => it.body?.includes(marker));
  if (comment) {
    console.log(`Comment found: ${comment.id}`);
    return comment.id;
  }
  return undefined;
}

export interface UpsertCommentParams {
  github: PrCommentsGitHubClient;
  context: {
    issue: { number: number };
    repo: { owner: string; repo: string };
  };
  existingCommentId?: number;
  body: string;
}

export async function upsertComment(params: UpsertCommentParams): Promise<void> {
  const { github, context, existingCommentId, body } = params;

  if (existingCommentId) {
    await github.rest.issues.updateComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existingCommentId,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body,
    });
  }
}

export function buildCommentMarker(title: string): string {
  return `<!-- marker=${title} -->`;
}
