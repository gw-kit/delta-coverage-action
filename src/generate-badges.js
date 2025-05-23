const fs = require('fs');
const path = require('path');
const gradientBadge = require('gradient-badge');
const core = require('@actions/core');

const badgesOutputDir = 'badges/';
fs.mkdirSync(badgesOutputDir, {recursive: true});

const secondColor = '#117efa'; // blue
const firstColors = [
    '#ea00ff', // purple
    '#16a41f', // green
    '#16019f', // blue
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

const [, , summariesFile] = process.argv;
const summaries = JSON.parse(fs.readFileSync(summariesFile, 'utf8'));
summaries
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
    }).forEach(badge => {
        fs.writeFileSync(badge.file, badge.badgeContent);
        core.info(`🏷️ Generated badge for ${badge.view} at ${badge.file}`);
        core.setOutput(badge.view, badge.file);
    });

core.setOutput('badges-dir', badgesOutputDir);
