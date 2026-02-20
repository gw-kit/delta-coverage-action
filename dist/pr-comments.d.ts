export interface PrCommentsGitHubClient {
    rest: {
        issues: {
            listComments(params: any): Promise<{
                data: Array<{
                    id: number;
                    body?: string;
                }>;
            }>;
            createComment(params: any): Promise<unknown>;
            updateComment(params: any): Promise<unknown>;
        };
    };
}
export interface FindExistingCommentParams {
    github: PrCommentsGitHubClient;
    context: {
        issue: {
            number: number;
        };
        repo: {
            owner: string;
            repo: string;
        };
    };
    marker: string;
}
export declare function findExistingComment(params: FindExistingCommentParams): Promise<number | undefined>;
export interface UpsertCommentParams {
    github: PrCommentsGitHubClient;
    context: {
        issue: {
            number: number;
        };
        repo: {
            owner: string;
            repo: string;
        };
    };
    existingCommentId?: number;
    body: string;
}
export declare function upsertComment(params: UpsertCommentParams): Promise<void>;
export declare function buildCommentMarker(title: string): string;
