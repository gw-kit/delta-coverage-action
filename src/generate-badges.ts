import * as fs from 'fs';
import * as path from 'path';
import { CoverageSummary } from './types/coverage';

const BADGES_OUTPUT_DIR = 'badges/';

const SECOND_COLOR = '#117efa'; // blue
const FIRST_COLORS = [
  '#ea00ff', // purple
  '#16a41f', // green
  '#16019f', // dark blue
  '#ff1500', // red
  '#ffcc00', // yellow
];

export interface GenerateBadgesParams {
  summariesFile: string;
  core: {
    info(message: string): void;
    setOutput(name: string, value: string): void;
  };
  outputDir?: string;
}

interface BadgeInputs {
  subject: string;
  status: string;
  gradient: [string, string];
}

const normalizeColor = (color: string): string => color.replace('#', '');

function mapToBadgeInputs(index: number, summary: CoverageSummary): BadgeInputs {
  const lineCoverage = summary.coverageInfo.find(c => c.coverageEntity === 'LINE');
  const firstColor = FIRST_COLORS[index % FIRST_COLORS.length];
  return {
    subject: summary.view,
    status: `${lineCoverage!.percents}%`,
    gradient: [normalizeColor(firstColor), normalizeColor(SECOND_COLOR)],
  };
}

export function generateBadges(params: GenerateBadgesParams): void {
  const { core, summariesFile, outputDir = BADGES_OUTPUT_DIR } = params;
  const gradientBadge = require('gradient-badge');

  fs.mkdirSync(outputDir, { recursive: true });

  const summaries: CoverageSummary[] = JSON.parse(fs.readFileSync(summariesFile, 'utf8'));
  summaries
    .sort((a, b) => a.view.localeCompare(b.view))
    .map((summary, index) => ({
      view: summary.view,
      badgeInputs: mapToBadgeInputs(index, summary),
    }))
    .map(viewBadgeData => ({
      view: viewBadgeData.view,
      file: path.join(outputDir, `${viewBadgeData.view}.svg`),
      badgeContent: gradientBadge(viewBadgeData.badgeInputs),
    }))
    .forEach(badge => {
      fs.writeFileSync(badge.file, badge.badgeContent);
      core.info(`Generated badge for ${badge.view} at ${badge.file}`);
      core.setOutput(badge.view, badge.file);
    });

  core.setOutput('badges-dir', outputDir);
}
