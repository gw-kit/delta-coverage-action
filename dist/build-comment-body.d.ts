interface SummaryBuilder {
    addHeading(text: string, level: string): SummaryBuilder;
    addRaw(text: string, addEOL?: boolean): SummaryBuilder;
    addEOL(): SummaryBuilder;
    stringify(): string;
}
export interface BuildCommentBodyParams {
    checkRunsContent: string;
    commentTitle: string;
    commentMarker: string;
    core: {
        summary: SummaryBuilder;
    };
    env?: Record<string, string | undefined>;
}
export declare function buildCommentBody(params: BuildCommentBodyParams): string;
export {};
