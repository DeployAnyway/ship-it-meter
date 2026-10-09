# 0.3.0 migration

Node 22.13+ is required. Existing core APIs remain available; TypeScript declarations and CommonJS exports are new. The CLI now lives in src/cli.js behind the same executable path. Input/stdout behavior for new options is documented in README.

Install 0.3.0 with npm. Seeds and exact humorous wording are version-specific. Do not treat jokes or heuristic scores as production evidence.

## 0.3.0 to 0.4.0

12 discoverable evidence scenarios and releasePlan with ordered blocker/review/release tasks and observable completion criteria; API and CLI scenarios/plans; passing/blocked gate exit codes preserved.

Existing defaults and entry points remain available. The new release plan and demonstration scenarios are opt-in; the original scoring and gate rules are retained.

## 0.4.0 to stable 1.0.0

Report APIs and CLI receipt mode are additive. Existing supplied-evidence scoring remains a heuristic and named scenarios remain examples. Use report policies for actual CI gating; do not confuse demonstration scenarios with measured artifacts.

See README for exact contracts, bounds and failure behavior.
