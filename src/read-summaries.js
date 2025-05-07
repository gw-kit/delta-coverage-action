module.exports = async (ctx) => {
    const fs = require('fs');


    const fullCoverageFilter = file => file.includes('full-coverage-');
    const deltaCoverageFilter = file => !fullCoverageFilter(file);

    const allSummariesFile = ctx.isFullCoverageMode ? 'full-cov-summaries.json' : 'delta-cov-summaries.json';

    const chosenFilter = ctx.isFullCoverageMode ? fullCoverageFilter : deltaCoverageFilter;

    const files = fs.readdirSync(ctx.baseSummariesPath);
    const summaryFiles = files.filter(file => file.includes('-summary.json')).filter(chosenFilter);
    console.log(`Reading summaries from ${ctx.baseSummariesPath}: ${summaryFiles}`);

    const summaries = summaryFiles.map(file =>
        JSON.parse(fs.readFileSync(`${ctx.baseSummariesPath}/${file}`, 'utf8'))
    );
    fs.writeFileSync(allSummariesFile, JSON.stringify(summaries));

    return allSummariesFile;
};
