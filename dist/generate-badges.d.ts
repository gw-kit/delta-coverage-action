export interface GenerateBadgesParams {
    summariesFile: string;
    core: {
        info(message: string): void;
        setOutput(name: string, value: string): void;
    };
    outputDir?: string;
}
export declare function generateBadges(params: GenerateBadgesParams): void;
