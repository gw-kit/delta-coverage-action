# CLAUDE.md

## Project Overview

Delta Coverage Report GitHub Action (Node20). Creates check runs with coverage info from [Delta-Coverage Gradle plugin](https://github.com/gw-kit/delta-coverage-plugin) summary reports, posts PR comments with coverage tables, and generates SVG badges.

## Commands

```bash
npm ci              # install dependencies
npm test            # vitest + v8 coverage
npm run build       # rm -rf dist && ncc bundle → dist/index.js
```

## Architecture

TypeScript Node20 action. Single entry point `src/main.ts` bundled via `@vercel/ncc` into `dist/index.js`.

```
src/
  main.ts                  # Entry point: orchestrates the full pipeline
  read-summaries.ts        # Aggregates *-summary.json into single JSON
  generate-badges.ts       # Creates SVG badges from full coverage data
  suppression.ts           # Checks PR labels + input for failure suppression
  create-check-runs.ts     # Creates GitHub check runs via REST API
  build-comment-body.ts    # Builds HTML table for PR comment
  pr-comments.ts           # Finds/upserts PR comments
  types/coverage.ts        # Shared types: CoverageSummary, CheckRunResult, etc.
test/
  *.test.ts                # Vitest tests (54 tests, ~96.5% coverage)
  data/                    # Fixture JSONs (full-coverage-*, delta-coverage-*)
dist/
  index.js                 # ncc bundle (committed)
```

**Pipeline:** readSummaries → generateBadges → checkSuppression → createCheckRuns → buildCommentBody → upsertComment

**Key conventions:**
- GitHub API adapter interfaces use `any` for params to stay compatible with Octokit types
- `build-comment-body.ts` accepts injectable `env` param for testability (defaults to `process.env`)
- Check run conclusions: `success` (no violations), `neutral` (violations suppressed), `failure` (violations present)
- PR comment status symbols: `🟢` success, `🟡` neutral (suppressed), `🔴` failure
- Tests mock `fs` via `vi.mock('fs', () => ({...}))` factory pattern

## Action Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `title` | `📈 Δelta Coverage Check` | PR comment title (blank = new comment each time) |
| `summary-report-base-path` | `build/reports/coverage-reports/` | Where coverage JSONs are located |
| `suppress-check-failures` | `false` | Ignore failures (auto-true if PR has `suppress-coverage` label) |
| `github-token` | `${{ github.token }}` | GitHub authentication |
| `external-id` | `delta-coverage` | Check run identifier |
| `check-run-extra-render-script` | - | Custom JS function `(view) => string` for extra check run content |

## Required Permissions

```yaml
permissions:
  issues: read
  pull-requests: write
  checks: write
```
