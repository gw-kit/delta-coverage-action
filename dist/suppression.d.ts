export interface SuppressionGitHubClient {
    rest: {
        pulls: {
            get(params: any): Promise<{
                data: {
                    labels: Array<{
                        name: string;
                    }>;
                };
            }>;
        };
    };
}
export interface CheckSuppressionParams {
    github: SuppressionGitHubClient;
    context: {
        repo: {
            owner: string;
            repo: string;
        };
    };
    pullNumber: number;
    suppressByInput: boolean;
    core: {
        info(message: string): void;
    };
}
export declare function checkSuppression(params: CheckSuppressionParams): Promise<boolean>;
