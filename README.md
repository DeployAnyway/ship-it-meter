# ship-it-meter

## Show Your Receipts: release policies from actual reports (1.0.0)

evaluateReports(bundle, policy) turns actual test, coverage and build receipts into a release gate and prioritized repair tasks. parseTestReport supports completed Node TAP v13 and Jest JSON. parseCoverageReport supports c8/Istanbul coverage-summary.json. Skipped/todo tests are excluded from executed evidence; failed/cancelled tests, unsuccessful Jest suites and collected-only/interrupted runs do not count as successful execution. Coverage counts must reconcile; empty lines/statements are not measured evidence.

```js
import { evaluateReports } from "@deployanyway/ship-it-meter";
const result = evaluateReports(
  {
    commit: "abc123",
    tests: {
      commit: "abc123",
      capturedAt: "2026-10-09T02:00:00Z",
      format: "node-tap",
      data: tapOutput,
    },
    coverage: {
      commit: "abc123",
      capturedAt: "2026-10-09T02:00:00Z",
      format: "istanbul-summary",
      data: coverageSummary,
    },
    build: {
      commit: "abc123",
      capturedAt: "2026-10-09T02:00:00Z",
      exitCode: buildExitCode,
    },
  },
  { minTests: 1, minCoverage: 80, minScore: 80, maxAgeMs: 3600000 },
);
if (!result.passed) console.error(result.blockers);
```

All three receipts are required, must identify the same nonempty bundle commit, and use valid UTC ISO capturedAt timestamps. Future/stale receipts block. Default policy: at least one executed test, all four coverage percentages >=80, passing build and score >=80, max age one hour. now can be supplied for deterministic evaluation. Unknown policy keys throw, so misspelled thresholds do not silently apply defaults. The policy is configurable; it does not alter your artifacts.

Result adds evidence, receipts, commit, policy and evaluatedAt to a release plan. Each receipt exposes acceptance and issues; rejected receipts add blocker tasks with verification criteria. The final summary/passed value follows receipt blockers, even when the heuristic score looks good. Parse helpers throw on malformed reports; evaluateReports converts report problems into blockers. Invalid policy/bundle configuration throws.

```sh
ship-it-meter --report-file receipts.json --policy '{"minCoverage":90,"maxAgeMs":1800000}' --json
cat receipts.json | ship-it-meter --reports --json
node node_modules/@deployanyway/ship-it-meter/examples/report-gate.mjs receipts.json
```

Report CLI input is bounded to 10 MiB and exits 1 when blocked, 2 for invalid arguments/configuration. Receipt mode rejects manual evidence overrides and conflicting gate/scenario flags. The browser demo uses pure parsers; file reading and CI collection happen in Node. Metadata is a claim from your trusted pipeline, not a cryptographic attestation; do not relabel old reports or trust arbitrary submitted bundles. The gate neither runs your CI nor deploys anything. See examples/collect-receipts.mjs for collecting new Node test and c8 coverage reports together, followed by your actual npm build, inside an npm script. It requires c8 as a project dev dependency, Node-discoverable tests (or explicit test file arguments), npm run build, an unchanged Git commit and clean tracked source. Generated/untracked files must be excluded from your test configuration; receipt metadata remains a trusted pipeline claim.

## Stable v1 contract

Node 22.13+ or Node 24. MIT licensed. CLI flags, structured fields, ESM/CommonJS exports and declarations are covered by tests and installed-package checks. Existing 0.4 APIs remain available except the explicitly documented doggo-log redaction/text-context changes. Future incompatible public API changes require a major release; callers should consume structured fields rather than parse jokes. Exact humorous wording and seeded catalog choices are version-specific. No telemetry, external API keys or network service is needed for core use.

Run npm test, npm run lint, npm run format:check, npm run coverage, npm run test:types and npm run verify:package from a source checkout. Runnable examples are shipped under examples/. The root demo is https://deployanyway.github.io/.

## Evidence into an actual release plan (0.4.0)

Twelve named demonstration scenarios show passing evidence, Friday releases, missing evidence, failed builds, failing tests, low coverage, critical issues, lint failures, dirty worktrees, feature branches, zero tests and weekend incidents. These are examples, never evidence about your real project.

```sh
npx @deployanyway/ship-it-meter --list-scenarios
npx @deployanyway/ship-it-meter --scenario failed-build --plan
npx @deployanyway/ship-it-meter --scenario ready --plan --json
```

```js
import {
  releasePlan,
  releaseScenarios,
  scenarioEvidence,
} from "@deployanyway/ship-it-meter";
console.log(releaseScenarios());
const plan = releasePlan(scenarioEvidence("failing-tests"), { minScore: 80 });
console.log(plan.passed, plan.summary, plan.tasks);
```

`releasePlan(evidence?, options?)` includes the existing gate plus prioritized tasks with stable IDs and observable verification criteria. Priorities are blocker, review and release. `scenarioEvidence(name)` and `releaseScenarios()` return independent evidence copies. CLI flags override scenario fields; stdin and scenario cannot be combined. Choose one of plan, gate or checklist. A blocked plan/gate exits 1; invalid input exits 2. Readiness remains a heuristic based on caller-supplied evidence; it does not run CI or approve deployment automatically. Coverage below 80 adds a review task, not a separate hard blocker; the configured score threshold and existing gate rules still decide the gate.

> **Version 0.4.0:** install from npm with Node 22.13+ or Node 24. See MIGRATION.md for changes from 0.2.0.

[![npm version](https://img.shields.io/npm/v/%40deployanyway%2Fship-it-meter)](https://www.npmjs.com/package/@deployanyway/ship-it-meter)
[![CI](https://github.com/DeployAnyway/ship-it-meter/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DeployAnyway/ship-it-meter/actions/workflows/ci.yml)

Explainable deployment readiness scoring for tests, coverage, and builds. Turns questionable confidence into a number.

```text
59/100 — Questionable
- 2 of 125 tests are failing (-21)
- Coverage is 82% (-4)
- Build passed
- Friday: the weekend would like a quiet entrance (-3)
- Failing tests cap the score at 59
```

## Installation

Available on npm. Requires Node 22 or later.
You can also run from source with Node 22 or 24:

```sh
git clone https://github.com/DeployAnyway/ship-it-meter.git
cd ship-it-meter
git checkout main
npm ci
node examples/basic.js
```

Install from npm: `npm install @deployanyway/ship-it-meter`.

## Quick start

```js
import { shipIt } from "@deployanyway/ship-it-meter";

const result = shipIt({
  tests: 125,
  failingTests: 2,
  coverage: 82,
  day: "Friday",
  branch: "main",
  build: true,
});
console.log(result); // { score: 59, verdict: 'Questionable', reasons: [...] }
```

## CLI example

```sh
node bin/cli.js --tests 125 --failing 2 --coverage 82 --build pass --day Friday
```

Run with npx: `npx @deployanyway/ship-it-meter --tests 125 --coverage 82 --build pass`.

## API and inputs

`shipIt(input = {})` returns `{ score, verdict, reasons }`. It never reads the
filesystem, branch, clock, tests, CI, or issue tracker; all evidence is supplied
by the caller. It never logs or exits. Inputs are not mutated and results are fresh.

| Input                | Meaning and default                                               |
| -------------------- | ----------------------------------------------------------------- |
| `tests`              | Nonnegative safe integer; missing/zero penalized                  |
| `failingTests`       | Nonnegative safe integer, default 0; cannot exceed tests          |
| `coverage`           | Finite percentage 0–100; missing penalized                        |
| `build`              | Boolean; missing penalized                                        |
| `criticalIssues`     | Nonnegative safe integer, default 0                               |
| `lintFailures`       | Nonnegative safe integer, default 0                               |
| `uncommittedChanges` | Boolean, default false                                            |
| `branch`             | Nonempty string; omitted means no branch penalty                  |
| `day`                | Full weekday name, case insensitive; omitted means no day penalty |

Positive failingTests requires tests. Numeric strings are not library numbers.
Invalid types or unknown keys throw TypeError; invalid ranges, counts, day names,
or inconsistent test totals throw RangeError. Unknown optional issue/lint/dirty
data is treated as no reported problems, not verified clean evidence.

## Scoring algorithm (0.1.0)

Start at 100. Subtract the following, then clamp to 0–100 and apply blocker caps:

| Condition                                                        | Penalty                                       |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Missing test count or zero tests                                 | 25                                            |
| Failing tests                                                    | min(50, 20 + ceil(30 × failingTests / tests)) |
| Missing coverage                                                 | 15                                            |
| Known coverage                                                   | ceil((100 − coverage) × 0.2)                  |
| Missing build status                                             | 15                                            |
| Failed build                                                     | 40                                            |
| Critical issues                                                  | min(50, 25 × count)                           |
| Lint failures                                                    | min(20, 5 × count)                            |
| Uncommitted changes                                              | 10                                            |
| Supplied branch other than main/master (case sensitive, trimmed) | 5                                             |
| Friday                                                           | 3                                             |

Failed builds or any critical issue cap the final score at **29**. Otherwise,
any failing test caps it at **59**. Friday is only a small joke; technical blockers
always dominate. Every applied penalty/cap appears in reasons, alongside reported
passing tests/build. Caps are ceilings, not additional deductions.

| Final score | Verdict            |
| ----------- | ------------------ |
| 0–29        | Absolutely Not     |
| 30–59       | Questionable       |
| 60–79       | Probably Fine      |
| 80–94       | Ship It            |
| 95–100      | Suspiciously Ready |

`shipIt()` scores 45 (Questionable) because key evidence is missing. A passing
build, nonzero tests with no failures, and 100% coverage score 100. This is an
illustrative heuristic, not a deployment gate or a guarantee of reliability.
Its assumptions and scoring may evolve between versions; pin versions for repeatable reports.

## CLI reference

Flags: `--tests`, `--failing`, `--coverage`, `--critical`, `--lint` take numbers.
`--build pass|fail`, `--day weekday`, and `--branch name` take text. `--dirty`
reports uncommitted changes. `--json` emits the structured result. `--help`/`-h`
and `--version`/`-v` show help/version. No positional arguments or stdin support.

Exit 0 means scoring succeeded, even for Absolutely Not. Exit 2 means invalid
arguments. Consumers choose their own deployment thresholds.

## Development and examples

```sh
npm ci
node examples/basic.js
npm test
npm run lint
npm run format:check
npm pack --dry-run
```

ES modules, zero production dependencies, Node's test runner. CI runs Node 22/24;
development tooling requires Node 22.13+ or 24.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).

## More from DeployAnyway

**Tools for developers who probably know better.**

- [error-translator](https://github.com/DeployAnyway/error-translator)
- [excuse-js](https://github.com/DeployAnyway/excuse-js)
- [doggo-log](https://github.com/DeployAnyway/doggo-log)
- [ship-it-meter](https://github.com/DeployAnyway/ship-it-meter)
- [bro-say](https://github.com/DeployAnyway/bro-say)

## Preflight, with a parachute

`preflight(input)` returns the same score, verdict and reasons as `shipIt`, plus actionable `actions`. CLI `--checklist` includes them in text or JSON output. It uses only supplied evidence and is not a deployment guarantee.

```sh
npx @deployanyway/ship-it-meter --tests 125 --coverage 82 --build pass --day friday --checklist
```

API (import the named functions from this package):

```js
preflight({ tests: 125, coverage: 82, build: true, day: "friday" });
```

## An explicit gate for automation

```js
import { releaseGate } from "@deployanyway/ship-it-meter";
const result = releaseGate(
  { tests: 42, coverage: 92, build: true },
  { minScore: 80 },
);
console.log(result.passed, result.blockers);
```

A gate requires positive test count, coverage evidence and a passing build. Failing tests, critical issues, lint failures and dirty changes block it even when a low score threshold is chosen. Scores remain a heuristic, not authorization to deploy. The result adds passed, blockers and minScore to the preflight checklist.

```sh
node bin/cli.js --tests 42 --coverage 92 --build pass --gate --json
node bin/cli.js --stdin --gate --min-score 90 --json < evidence.json
```

--stdin accepts a bounded JSON evidence object (256 KiB); explicit flags override fields. --min-score requires --gate and a 0–100 threshold, default 80. Exit 0: gate passes or ordinary scoring succeeds; 1: gate blocked; 2: malformed input. Upstream pipeline status is your shell's responsibility.

## Run from source

```sh
git clone --branch main https://github.com/DeployAnyway/ship-it-meter.git
cd ship-it-meter
npm ci
npm run build
node bin/cli.js --help
```

## Candidate quality standard

Version 0.3 provides useful declaration types, ESM/CommonJS exports, installed-archive checks, and coverage gates (90% statements/lines/functions, 85% branches). CI covers Linux Node 22/24 and Windows/macOS Node 24. Node 22.13+ is required. No runtime dependencies, telemetry or network requests.

From a source checkout: npm ci, npm run build, npm run coverage, npm run test:types, npm run verify:package. Pack verification installs a temporary local archive and checks module entries, types, executable and offline npm exec.

[Contribution guide](CONTRIBUTING.md) · [Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Roadmap](ROADMAP.md) · [Migration](MIGRATION.md).

**Tools for developers who probably know better.** Software nobody requested, built with questionable priorities, and shipped with absolute confidence!
