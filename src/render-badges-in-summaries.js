module.exports = async (ctx) => {
    const fs = require('fs');

    Object.values(ctx.badgesFiles)
        .map(file => fs.readFileSync(file, 'utf8'))
        .map(badgeContent => Buffer.from(badgeContent).toString('base64'))
        .map(base64Data => `![badge](data:image/svg+xml;base64,${base64Data})`)
        .reduce(
            (buffer, badge) => {
                return buffer.addRaw(badge, true)
            },
            ctx.core.summary.addHeading('Coverage Badges', '4').addEOL()
        );
};
