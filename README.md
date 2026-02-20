# Delta Coverage Report GitHub Action

![GitHub Release](https://img.shields.io/github/v/release/gw-kit/delta-coverage-action)

The action creates check run with detailed coverage info based on the Delta-Coverage summary report.
Also, the action creates a comment in the pull request with links to the check runs.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `title` | No | `📈 Δelta Coverage Check` | PR comment title. If not blank, the previous comment is updated; otherwise a new comment is created. |
| `summary-report-base-path` | Yes | `build/reports/coverage-reports/` | Base path for all summary report JSON files. |
| `suppress-check-failures` | No | `false` | Suppress check run failures. Auto-set to `true` if PR has the `suppress-delta-coverage` label. |
| `github-token` | No | `${{ github.token }}` | GitHub token for authentication. |
| `external-id` | No | `delta-coverage` | External identifier for check runs. |
| `check-run-extra-render-script` | No | | Custom JS function `(view) => string` to render additional info in check runs. |

## Outputs

- `badges-dir` - The directory where the coverage badges are stored.

## Pre-requisites

Required permissions:
- issues: `read`
- pull-requests: `write`
- checks: `write`


## Example usage

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      issues: read
      pull-requests: write
      checks: write
          
    steps:
      - name: Publish Delta Coverage Report
        uses: gw-kit/delta-coverage-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The latest version: ![GitHub Release](https://img.shields.io/github/v/release/gw-kit/delta-coverage-action)

## Coverage Badges

The action generates coverage badges for each [coverage view](https://github.com/gw-kit/delta-coverage-plugin/blob/main/README.md#report-views).
The badges are generated based on _full coverage summary_ data files created by [Delta-Coverage plugin](https://github.com/gw-kit/delta-coverage-plugin).

⚠️ Enabling of full coverage report is required:
```kts
deltaCoverageReport {
   reports {
      fullCoverageReport = true
   }
}
```

⚠️ Min required [Delta-Coverage plugin](https://github.com/gw-kit/delta-coverage-action) is `3.4.0`.

### Badges example

![aggregated.svg](https://raw.githubusercontent.com/gw-kit/coverage-badges/refs/heads/main/delta-coverage-plugin/badges/aggregated.svg)
![functionalTest.svg](https://raw.githubusercontent.com/gw-kit/coverage-badges/refs/heads/main/delta-coverage-plugin/badges/functionalTest.svg)
![test.svg](https://raw.githubusercontent.com/gw-kit/coverage-badges/refs/heads/main/delta-coverage-plugin/badges/test.svg)
