import { CheckRunResult, CoverageEntity } from './types/coverage';

const NO_VALUE = -1;
const ENTITIES: CoverageEntity[] = ['INSTRUCTION', 'BRANCH', 'LINE'];
const HEADERS = ['Check', 'Expected', 'Entity', 'Actual'];

const NO_COVERAGE_TEXT = 'No%20diff';
const SUCCESS_COLOR = '7AB56D';
const FAILURE_COLOR = 'C4625A';
const NO_COVERAGE_COLOR = '777777';

const TOOLTIPS = new Map<string, string>([
  ['INSTRUCTION', 'The Java bytecode instructions executed during testing'],
  ['BRANCH', 'The branches in conditional statements like if, switch, or loops that are executed.'],
  ['LINE', 'The source code lines covered by the tests.'],
]);

interface EntityData {
  entity: CoverageEntity;
  expected: number;
  actual: number;
}

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
  core: { summary: SummaryBuilder };
  env?: Record<string, string | undefined>;
}

function buildViewSummaryData(checkRun: CheckRunResult): EntityData[] {
  const entitiesRules = checkRun.coverageRules?.entitiesRules || {};
  const entityToExpectedPercents = new Map<string, number>();
  for (const [entityName, entityConfig] of Object.entries(entitiesRules)) {
    const percents = entityConfig.minCoverageRatio * 100;
    entityToExpectedPercents.set(entityName, percents);
  }

  const entityToActualPercents = checkRun.coverageInfo.reduce((acc, it) => {
    if (it.total !== 0) {
      acc.set(it.coverageEntity, it.percents);
    }
    return acc;
  }, new Map<string, number>());

  return ENTITIES.map((entity) => {
    const expectedPercents = entityToExpectedPercents.get(entity) || NO_VALUE;
    const actualPercents = entityToActualPercents.get(entity) !== undefined
      ? entityToActualPercents.get(entity)!
      : NO_VALUE;

    return { entity, expected: expectedPercents, actual: actualPercents };
  });
}

function buildProgressImg(entityData: EntityData): string {
  let imageLink: string;
  if (entityData.actual > NO_VALUE) {
    const color = entityData.actual < entityData.expected ? FAILURE_COLOR : SUCCESS_COLOR;
    const actualInteger = Math.floor(entityData.actual);
    imageLink = `https://progress-bar.xyz/${actualInteger}/?progress_color=${color}`;
  } else {
    imageLink = `https://progress-bar.xyz/100/?show_text=false&width=38`
      + `&title=${NO_COVERAGE_TEXT}&color=${NO_COVERAGE_COLOR}&progress_color=${NO_COVERAGE_COLOR}`;
  }
  return `<img src="${imageLink}" />`;
}

function buildExpectedValue(entityData: EntityData): string {
  return (entityData.expected > NO_VALUE) ? `🎯 ${entityData.expected}% 🎯` : '';
}

function buildCoverageValueColumnHtml(
  entityData: EntityData,
  entityIndex: number,
  shouldFold: boolean,
  valueProvider: (data: EntityData) => string,
): string {
  if (shouldFold && entityIndex > 0) {
    return '';
  }
  const value = valueProvider(entityData);
  const rowSpanAttr = (shouldFold && entityIndex === 0) ? 'rowspan=3' : '';
  return `<td ${rowSpanAttr}>${value}</td>`;
}

function obtainUniqueValuesSet<T>(viewSummaryData: EntityData[], valueProvider: (data: EntityData) => T): Set<T> {
  const allValues = viewSummaryData.map(it => valueProvider(it));
  return new Set(allValues);
}

function buildCheckRunForViewText(checkRun: CheckRunResult): string {
  const viewSummaryData = buildViewSummaryData(checkRun);

  const STATUS_SYMBOLS: Record<string, string> = { failure: '🔴', neutral: '🟡' };
  const statusSymbol = STATUS_SYMBOLS[checkRun.conclusion] || '🟢';
  const viewCellValue = `<td rowspan=3>${statusSymbol} <a href="${checkRun.url}">${checkRun.viewName}</a></td>`;

  const foldExpectedColumn = obtainUniqueValuesSet(viewSummaryData, it => it.expected).size === 1;
  const actualUniqueValues = obtainUniqueValuesSet(viewSummaryData, it => it.actual);
  const foldActualColumn = actualUniqueValues.size === 1
    && (foldExpectedColumn || actualUniqueValues.has(NO_VALUE));

  return viewSummaryData.map((entityData, index) => {
    const viewCellInRow = (index === 0) ? viewCellValue : '';
    const actualColumnHtml = buildCoverageValueColumnHtml(entityData, index, foldActualColumn, buildProgressImg);
    const ruleColumnHtml = buildCoverageValueColumnHtml(entityData, index, foldExpectedColumn, buildExpectedValue);
    const toolTipText = TOOLTIPS.get(entityData.entity) || '';

    return `<tr>
${viewCellInRow}
${ruleColumnHtml}
<td><span title="${toolTipText}">${entityData.entity}</span></td>
${actualColumnHtml}
</tr>`.trim().replace(/^ +/gm, '');
  }).join('\n');
}

function renderHeaders(): string {
  return '<tr>' + HEADERS.map(it => `<th>${it}</th>`).join('\n') + '</tr>';
}

export function buildCommentBody(params: BuildCommentBodyParams): string {
  const env = params.env || process.env;
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_NUMBER, GITHUB_RUN_ATTEMPT } = env;

  const workflowUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  const workflowNum = `${GITHUB_RUN_NUMBER}.${GITHUB_RUN_ATTEMPT}`;

  const buildRunMetaText = (): string => {
    const workflowRunDate = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const workflowRunLink = `[Run ${workflowNum}](${workflowUrl})`;
    const formattedDate = workflowRunDate.toLocaleString('en-US', options);
    return `${workflowRunLink} | \`${formattedDate}\``;
  };

  const checkRuns: CheckRunResult[] = JSON.parse(params.checkRunsContent);
  let summaryBuffer = params.core.summary
    .addHeading(params.commentTitle, '2')
    .addRaw(params.commentMarker, true)
    .addEOL()
    .addRaw('<table><tbody>')
    .addRaw(renderHeaders());

  checkRuns.forEach(checkRun => {
    const runText = buildCheckRunForViewText(checkRun);
    summaryBuffer = summaryBuffer.addRaw(runText, true);
  });

  return summaryBuffer
    .addRaw('</tbody></table>')
    .addEOL()
    .addEOL()
    .addRaw(buildRunMetaText())
    .stringify();
}
