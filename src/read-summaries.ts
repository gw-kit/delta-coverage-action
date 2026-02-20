import * as fs from 'fs';
import * as path from 'path';
import { CoverageSummary } from './types/coverage';

export interface ReadSummariesParams {
  isFullCoverageMode: boolean;
  baseSummariesPath: string;
}

export function readSummaries(params: ReadSummariesParams): string {
  const { isFullCoverageMode, baseSummariesPath } = params;

  const fullCoverageFilter = (file: string) => file.includes('full-coverage-');
  const deltaCoverageFilter = (file: string) => !fullCoverageFilter(file);

  const allSummariesFile = isFullCoverageMode ? 'full-cov-summaries.json' : 'delta-cov-summaries.json';
  const chosenFilter = isFullCoverageMode ? fullCoverageFilter : deltaCoverageFilter;

  const files = fs.readdirSync(baseSummariesPath);
  const summaryFiles = files
    .filter(file => file.includes('-summary.json'))
    .filter(chosenFilter);
  console.log(`Reading summaries from ${baseSummariesPath}: ${JSON.stringify(summaryFiles, null, 2)}`);

  const summaries: CoverageSummary[] = summaryFiles.map(file =>
    JSON.parse(fs.readFileSync(path.join(baseSummariesPath, file), 'utf8'))
  );
  fs.writeFileSync(allSummariesFile, JSON.stringify(summaries));

  return allSummariesFile;
}

