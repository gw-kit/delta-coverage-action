export interface SuppressionGitHubClient {
  rest: {
    pulls: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(params: any): Promise<{ data: { labels: Array<{ name: string }> } }>;
    };
  };
}

export interface CheckSuppressionParams {
  github: SuppressionGitHubClient;
  context: {
    repo: { owner: string; repo: string };
  };
  pullNumber: number;
  suppressByInput: boolean;
  core: { info(message: string): void };
}

export async function checkSuppression(params: CheckSuppressionParams): Promise<boolean> {
  const { github, context, pullNumber, suppressByInput, core } = params;

  let suppressedByLabel = false;
  if (pullNumber > 0) {
    const response = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pullNumber,
    });
    const labels = response.data.labels.map(l => l.name);
    suppressedByLabel = labels.includes('suppress-coverage');
  }

  const resolution = suppressedByLabel || suppressByInput;
  core.info(`Is suppress=${resolution} : by label=${suppressedByLabel}, by input=${suppressByInput}`);
  return resolution;
}
