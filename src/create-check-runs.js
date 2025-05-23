module.exports = async (ctx) => {
    const fs = require('fs');

    const buildPathToReport = (viewName) => {
        return `build/reports/coverage-reports/delta-coverage/${viewName}/report.md`;
    };

    const viewHasViolations = (view) => {
        return view.verifications.length > 0;
    };

    const readViewMarkdownReport = (view) => {
        const reportPath = buildPathToReport(view.view);
        try {
            return fs.readFileSync(reportPath, 'utf8');
        } catch (e) {
            return `NO REPORT by path: ${reportPath}`;
        }
    }

    const capitalize = (s) => {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    const computeViewConclusion = (view) => {
        return !ctx.ignoreCoverageFailure && viewHasViolations(view)
            ? 'failure'
            : 'success';
    }

    const createCheckRun = async (view) => {
        const conclusion = computeViewConclusion(view);
        const viewName = capitalize(view.view);
        const summary = `${readViewMarkdownReport(view)}\n\n<!-- This is Delta Coverage CheckRun -->`;

        const response = await ctx.github.rest.checks.create({
            owner: ctx.context.repo.owner,
            repo: ctx.context.repo.repo,
            name: `📈${viewName} Coverage`,
            head_sha: ctx.headSha,
            status: 'completed',
            external_id: ctx.externalId,
            conclusion: conclusion,
            output: {
                title: `${viewName} Coverage`,
                summary: summary,
            }
        });
        return {
            viewName: viewName,
            verifications: view.verifications,
            coverageRules: view.coverageRulesConfig,
            url: response.data.html_url,
            conclusion: conclusion,
            coverageInfo: view.coverageInfo
        }
    }

    const createAnnotations = (view) => {
        const hasViolations = viewHasViolations(view);
        if (hasViolations) {
            const viewName = capitalize(view.view);
            const violations = view.verifications.map(it => it.violation).join(';\n');
            const msg = `[${viewName}]: Code Coverage check failed:\n${violations}`;
            ctx.core.error(msg);
        }
    }

    const reportContent = fs.readFileSync(ctx.summaryReportPath);
    const summaryArray = JSON.parse(reportContent);
    const checkRuns = [];
    for (const view of summaryArray) {
        createAnnotations(view);
        const checkRun = await createCheckRun(view);
        checkRuns.push(checkRun);
    }
    return checkRuns;
};
