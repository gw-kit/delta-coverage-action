module.exports = (ctx) => {

    const NO_VALUE = -1;
    const ENTITIES = ['INSTRUCTION', 'BRANCH', 'LINE'];
    const HEADERS = ['Check', 'Expected', 'Entity', 'Actual'];

    const NO_COVERAGE_TEXT = 'No%20diff';
    const SUCCESS_COLOR = '7AB56D';
    const FAILURE_COLOR = 'C4625A';
    const NO_COVERAGE_COLOR = '777777';

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
            const expectedPercents = entityToExpectedPercents.get(entity) || NO_VALUE;

            const actualPercents = entityToActualPercents.get(entity) !== undefined
                ? entityToActualPercents.get(entity)
                : NO_VALUE;

            const isFailed = shouldFailOnViolations
                && actualPercents > NO_VALUE
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
            if (entityData.actual > NO_VALUE ) {
                const color = entityData.actual < entityData.expected ? FAILURE_COLOR : SUCCESS_COLOR;
                const actualInteger = Math.round(entityData.actual);
                imageLink = `https://progress-bar.xyz/${actualInteger}/?progress_color=${color}`;
            } else {
                imageLink = `https://progress-bar.xyz/100/?show_text=false&width=38`
                    +`&title=${NO_COVERAGE_TEXT}&color=${NO_COVERAGE_COLOR}&progress_color=${NO_COVERAGE_COLOR}`;
            }
            return `<img src="${imageLink}" />`;
        }

        const buildExpectedValue = (entityData) => {
            return (entityData.expected > NO_VALUE) ? `🎯 ${entityData.expected}% 🎯` : '';
        }

        const buildCoverageValueColumnHtml = (entityData, entityIndex, shouldFold, valueProvider) => {
            if (shouldFold && entityIndex > 0) {
                return '';
            }
            const value = valueProvider(entityData);
            const rowSpanAttr = (shouldFold && entityIndex === 0) ? `rowspan=3` : '';
            return `<td ${rowSpanAttr}>${value}</td>`;
        }

        const obtainUniqueValuesSet = (viewSummaryData, valueProvider) => {
            const allExpected = viewSummaryData.map(it => valueProvider(it));
            return new Set(allExpected);
        }

        const viewSummaryData = buildViewSummaryData(checkRun);

        const hasFailure = viewSummaryData.some(it => it.isFailed);
        const statusSymbol = hasFailure ? '🔴' : '🟢';
        const viewCellValue = `
            <td rowspan=3>${statusSymbol} <a href="${checkRun.url}">${checkRun.viewName}</a></td>
        `.trim();

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
