module.exports = async (ctx) => {
    const fs = require('fs');
    const path = require('path');
    const gradientBadge = require('gradient-badge');

    const badgesOutputDir = 'badges/';
    fs.mkdirSync(badgesOutputDir, { recursive: true });

    const secondColor = '#11cbfa'; // blue
    const firstColors = [
        '#ea00ff', // purple
        '#00ff0d', // green
        '#2200ff', // blue
        '#ff1500', // red
        '#ffcc00', // yellow
    ];

    const normalizeColor = (color) => color.replace('#', '');

    const mapToBadgeInputs = (index, summary) => {
        const lineCoverage = summary.coverageInfo.find(coverage => coverage.coverageEntity === 'LINE');
        const firstColor = firstColors[index % firstColors.length];
        return {
            subject: summary.view,
            status: `${lineCoverage.percents}%`,
            gradient: [normalizeColor(firstColor), normalizeColor(secondColor)],
        };
    };

    const summaries = JSON.parse(fs.readFileSync(ctx.summariesFile, 'utf8'));
    const badgeData = summaries
        .sort((a, b) => a.view.localeCompare(b.view))
        .map((summary, index) => {
            return {
                view: summary.view,
                badgeInputs: mapToBadgeInputs(index, summary),
            }
        })
        .map(viewBadgeData => {
            return {
                view: viewBadgeData.view,
                file: path.join(badgesOutputDir, `${viewBadgeData.view}.svg`),
                badgeContent: gradientBadge(viewBadgeData.badgeInputs),
            };
        });

    badgeData.forEach(badge => {
        fs.writeFileSync(badge.file, badge.badgeContent);
    });

    return badgeData;
};
