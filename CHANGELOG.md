# Delta Coverage Action

## 1.2

- Suppressed coverage failures now use `neutral` check run conclusion (gray dash icon) instead of `success`.
  PR comment shows `🟡` for suppressed failures, distinguishing them from genuinely passing checks (`🟢`).
  
- Fixed PR comment status inconsistent with check run conclusion.
  Previously the comment re-derived failure status from `failOnViolation` flag and coverage thresholds,
  which could disagree with the actual check run conclusion (e.g. when suppression is active or `failOnViolation` is disabled).
  Now the comment uses `checkRun.conclusion` directly.
  
- Migrated from JS composite action to TypeScript Node20 action

## 1.1

- Added custom script to generate extra check run content

## 1.0

- Now the action generates coverage badges for each test view.
  For details see [readme](./README.md#coverage-badges).
