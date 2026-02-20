import * as core from '@actions/core';
import * as github from '@actions/github';
import { readSummaries } from './read-summaries';
import { generateBadges } from './generate-badges';
import { checkSuppression } from './suppression';
import { createCheckRuns } from './create-check-runs';
import { buildCommentBody } from './build-comment-body';
import { buildCommentMarker, findExistingComment, upsertComment } from './pr-comments';
import { CoverageSummary } from './types/coverage';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    const summariesBasePath = core.getInput('summary-report-base-path');
    const title = core.getInput('title');
    const suppressInput = core.getInput('suppress-check-failures') === 'true';
    const externalId = core.getInput('external-id');
    const extraRenderScriptInput = core.getInput('check-run-extra-render-script');

    // Step 1: Read summaries
    const deltaSummariesFile = readSummaries({
      isFullCoverageMode: false,
      baseSummariesPath: summariesBasePath,
    });
    const fullCovSummariesFile = readSummaries({
      isFullCoverageMode: true,
      baseSummariesPath: summariesBasePath,
    });

    // Step 2: Generate badges (continue on error)
    try {
      generateBadges({
        summariesFile: fullCovSummariesFile,
        core,
      });
    } catch (e) {
      core.warning(`Badge generation failed: ${e}`);
    }

    // Step 3: Check suppression
    const pullNumber = context.payload.pull_request?.number ?? 0;
    const suppress = await checkSuppression({
      github: octokit,
      context,
      pullNumber,
      suppressByInput: suppressInput,
      core,
    });

    // Step 4: Create check runs
    const extraRenderScript = (view: CoverageSummary): string => {
      if (!extraRenderScriptInput) return '';
      try {
        const script = new Function('return ' + extraRenderScriptInput)();
        return script(view);
      } catch (e) {
        return `Error in custom script: ${e}`;
      }
    };

    const headSha = context.payload.pull_request?.head?.sha ?? context.sha;
    const checkRuns = await createCheckRuns({
      summaryReportPath: deltaSummariesFile,
      ignoreCoverageFailure: suppress,
      core,
      context,
      github: octokit,
      headSha,
      externalId,
      summaryExtraFun: extraRenderScript,
    });

    // Step 5: Post PR comment (only for pull requests)
    if (context.eventName === 'pull_request') {
      const marker = title ? buildCommentMarker(title) : '';
      const body = buildCommentBody({
        checkRunsContent: JSON.stringify(checkRuns),
        commentTitle: title,
        commentMarker: marker,
        core,
      });

      let existingCommentId: number | undefined;
      if (marker) {
        existingCommentId = await findExistingComment({
          github: octokit,
          context,
          marker,
        });
      }

      await upsertComment({
        github: octokit,
        context,
        existingCommentId,
        body,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
