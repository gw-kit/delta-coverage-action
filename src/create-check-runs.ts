import * as fs from 'fs';
import { CoverageSummary, CheckRunResult } from './types/coverage';

export interface GitHubClient {
  rest: {
    checks: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create(params: any): Promise<{ data: { html_url: string | null } }>;
    };
  };
}

export interface GitHubContext {
  repo: { owner: string; repo: string };
}

export interface CoreLogger {
  error(message: string): void;
}

export interface CreateCheckRunsParams {
  summaryReportPath: string;
  ignoreCoverageFailure: boolean;
  core: CoreLogger;
  context: GitHubContext;
  github: GitHubClient;
  headSha: string;
  externalId: string;
  summaryExtraFun?: (view: CoverageSummary) => string;
}

function buildPathToReport(viewName: string): string {
  return `build/reports/coverage-reports/delta-coverage/${viewName}/report.md`;
}

function viewHasViolations(view: CoverageSummary): boolean {
  return view.verifications.length > 0;
}

function readViewMarkdownReport(view: CoverageSummary): string {
  const reportPath = buildPathToReport(view.view);
  try {
    return fs.readFileSync(reportPath, 'utf8');
  } catch {
    return `NO REPORT by path: ${reportPath}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeViewConclusion(view: CoverageSummary, ignoreCoverageFailure: boolean): 'success' | 'failure' {
  return !ignoreCoverageFailure && viewHasViolations(view) ? 'failure' : 'success';
}

async function createCheckRun(
  view: CoverageSummary,
  params: CreateCheckRunsParams,
): Promise<CheckRunResult> {
  const conclusion = computeViewConclusion(view, params.ignoreCoverageFailure);
  const viewName = capitalize(view.view);
  const summaryExtra = params.summaryExtraFun ? params.summaryExtraFun(view) : '';
  const summary = `${readViewMarkdownReport(view)}\n\n<!-- This is Delta Coverage CheckRun -->\n${summaryExtra}`;

  const response = await params.github.rest.checks.create({
    owner: params.context.repo.owner,
    repo: params.context.repo.repo,
    name: `📈${viewName} Coverage`,
    head_sha: params.headSha,
    status: 'completed',
    external_id: params.externalId,
    conclusion,
    output: {
      title: `${viewName} Coverage`,
      summary,
    },
  });

  return {
    viewName,
    verifications: view.verifications,
    coverageRules: view.coverageRulesConfig,
    url: response.data.html_url || '',
    conclusion,
    coverageInfo: view.coverageInfo,
  };
}

function createAnnotations(view: CoverageSummary, core: CoreLogger): void {
  if (viewHasViolations(view)) {
    const viewName = capitalize(view.view);
    const violations = view.verifications.map(it => it.violation).join(';\n');
    const msg = `[${viewName}]: Code Coverage check failed:\n${violations}`;
    core.error(msg);
  }
}

export async function createCheckRuns(params: CreateCheckRunsParams): Promise<CheckRunResult[]> {
  const reportContent = fs.readFileSync(params.summaryReportPath, 'utf8');
  const summaryArray: CoverageSummary[] = JSON.parse(reportContent);
  const checkRuns: CheckRunResult[] = [];

  for (const view of summaryArray) {
    createAnnotations(view, params.core);
    const checkRun = await createCheckRun(view, params);
    checkRuns.push(checkRun);
  }

  return checkRuns;
}
