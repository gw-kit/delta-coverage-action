module.exports = (ctx) => {

    const NO_EXPECTED = -1;
    const NO_COVERAGE = -1;
    const ENTITIES = ['INSTRUCTION', 'BRANCH', 'LINE'];
    const HEADERS = ['Check', 'Expected', 'Entity', 'Actual'];

    const NO_COVERAGE_TEXT = 'No%20diff';
    const SUCCESS_COLOR = '7AB56D';
    const ALMOST_SUCCESS_COLOR = 'B6743B';
    const FAILURE_COLOR = 'C4625A';
    const NO_COVERAGE_COLOR = '498BC4';

    const TOOLTIPS = new Map([
        ['INSTRUCTION', 'The Java bytecode instructions executed during testing'],
        ['BRANCH', 'The branches in conditional statements like if, switch, or loops that are executed.'],
        ['LINE', 'The source code lines covered by the tests.']
    ])

    const buildViewSummaryData = (checkRun) => {
        const entitiesRules = checkRun.coverageRules?.entitiesRules || [];
        const entityToExpectedPercents = new Map();
        for (const [entityName, entityConfig] of Object.entries(entitiesRules)) {
            const percents = entityConfig.minCoverageRatio * 100;
            entityToExpectedPercents.set(entityName, percents);
        }

        const entityToActualPercents = checkRun.coverageInfo.reduce((acc, it) => {
            if (it.total !== 0) {
                acc.set(it.coverageEntity, it.percents);
            }
            return acc;
        }, new Map());

        const shouldFailOnViolations = checkRun.coverageRules?.failOnViolation || false;
        return ENTITIES.map((entity) => {
            const expectedPercents = entityToExpectedPercents.get(entity) || NO_EXPECTED;

            const actualPercents = entityToActualPercents.get(entity) !== undefined
                ? entityToActualPercents.get(entity)
                : NO_COVERAGE;

            const isFailed = shouldFailOnViolations
                && actualPercents > NO_COVERAGE
                && actualPercents < expectedPercents;
            return {
                entity,
                isFailed,
                expected: expectedPercents,
                actual: actualPercents
            }
        });
    };

    const buildCheckRunForViewText = (checkRun) => {
        const buildProgressImg = (entityData) => {
            let imageLink;
            if (entityData.actual > NO_COVERAGE ) {
                const actualToExpectedDiff = entityData.actual - entityData.expected
                let color ;
                if (actualToExpectedDiff < 0 && actualToExpectedDiff > -10) {
                    color = ALMOST_SUCCESS_COLOR;
                } else if (actualToExpectedDiff < 0) {
                    color = FAILURE_COLOR;
                } else if (actualToExpectedDiff >= 0) {
                    color = SUCCESS_COLOR
                }
                const actualInteger = Math.round(entityData.actual);
                imageLink = `https://progress-bar.xyz/${actualInteger}/?progress_color=${color}`;
            } else {
                imageLink = `https://progress-bar.xyz/100/?show_text=false&width=38` +
                    `&progress_color=${NO_COVERAGE_COLOR}&title=${NO_COVERAGE_TEXT}`;
            }
            return `<img src="${imageLink}" />`;
        }

        const isSameExpectedForAllEntities = (viewSummaryData) => {
            const allExpected = viewSummaryData.map(it => it.expected);
            return new Set(allExpected).size === 1;
        }

        const buildRuleValueColumnHtml = (entityData, entityIndex, shouldFoldExpectedColumn) => {
            if (shouldFoldExpectedColumn && entityIndex > 0) {
                return '';
            }
            const rowSpanAttr = (shouldFoldExpectedColumn && entityIndex === 0) ? `rowspan=3` : '';
            const expectedText = (entityData.expected > NO_EXPECTED) ? `🎯 ${entityData.expected}% 🎯` : '';
            return `<td ${rowSpanAttr}>${expectedText}</td>`;
        }

        const viewSummaryData = buildViewSummaryData(checkRun);
        const hasFailure = viewSummaryData.some(it => it.isFailed);
        const shouldFoldExpectedColumn = isSameExpectedForAllEntities(viewSummaryData);

        const statusSymbol = hasFailure ? '🔴' : '🟢';
        const viewCellValue = `
            <td rowspan=3>${statusSymbol} <a href="${checkRun.url}">${checkRun.viewName}</a></td>
        `.trim();

        return viewSummaryData.map((entityData, index) => {
            const viewCellInRow = (index === 0) ? viewCellValue : '';

            const ruleColumnHtml = buildRuleValueColumnHtml(entityData, index, shouldFoldExpectedColumn);

            const actualValue = buildProgressImg(entityData);
            const toolTipText = TOOLTIPS.get(entityData.entity) || '';

            return `<tr>
                ${viewCellInRow}
                ${ruleColumnHtml}
                <td><span title="${toolTipText}">${entityData.entity}</span></td>
                <td>${actualValue}</td>
            </tr>`.trim().replace(/^ +/gm, '');
        }).join('\n');
    }

    const renderHeaders = () => {
        return '<tr>' + HEADERS.map(it => `<th>${it}</th>`).join('\n') + '</tr>';
    }

    const checkRuns = JSON.parse(ctx.checkRunsContent);
    let summaryBuffer = ctx.core.summary
        .addHeading(ctx.commentTitle, '2')
        .addRaw(ctx.commentMarker, true)
        .addEOL()
        .addRaw(`<table><tbody>`)
        .addRaw(renderHeaders());

    checkRuns.forEach(checkRun => {
        const runText = buildCheckRunForViewText(checkRun);
        summaryBuffer = summaryBuffer.addRaw(runText, true);
    });
    return summaryBuffer
        .addRaw(`</tbody></table>`)
        .stringify()
};
