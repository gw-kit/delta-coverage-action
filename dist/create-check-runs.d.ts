import { CoverageSummary, CheckRunResult } from './types/coverage';
export interface GitHubClient {
    rest: {
        checks: {
            create(params: any): Promise<{
                data: {
                    html_url: string | null;
                };
            }>;
        };
    };
}
export interface GitHubContext {
    repo: {
        owner: string;
        repo: string;
    };
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
export declare function createCheckRuns(params: CreateCheckRunsParams): Promise<CheckRunResult[]>;
