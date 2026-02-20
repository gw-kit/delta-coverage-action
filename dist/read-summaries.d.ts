export interface ReadSummariesParams {
    isFullCoverageMode: boolean;
    baseSummariesPath: string;
}
export declare function readSummaries(params: ReadSummariesParams): string;
