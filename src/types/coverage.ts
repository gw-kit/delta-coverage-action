export type CoverageEntity = 'INSTRUCTION' | 'BRANCH' | 'LINE';

export interface CoverageInfo {
  coverageEntity: CoverageEntity;
  covered: number;
  total: number;
  percents: number;
}

export interface EntityRule {
  minCoverageRatio: number;
}

export interface CoverageRulesConfig {
  failOnViolation: boolean;
  entitiesRules: Record<string, EntityRule>;
}

export interface Verification {
  violation: string;
}

export interface CoverageSummary {
  view: string;
  reportBound: string;
  coverageRulesConfig: CoverageRulesConfig;
  verifications: Verification[];
  coverageInfo: CoverageInfo[];
}

export interface CheckRunResult {
  viewName: string;
  verifications: Verification[];
  coverageRules: CoverageRulesConfig;
  url: string;
  conclusion: 'success' | 'failure';
  coverageInfo: CoverageInfo[];
}
