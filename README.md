# ship-it-meter

A humorous, deterministic deployment readiness score that shows its homework.

```text
59/100 — Questionable
- 2 of 125 tests are failing (-21)
- Coverage is 82% (-4)
- Build passed
- Friday: the weekend would like a quiet entrance (-3)
- Failing tests cap the score at 59
```

## Installation

Version 0.1.0 is not published to npm. Try from source with Node 22 or 24:

```sh
git clone https://github.com/DeployAnyway/ship-it-meter.git
cd ship-it-meter
git checkout feature/initial-mvp
npm ci
node examples/basic.js
```

After an approved release: `npm install @deployanyway/ship-it-meter`.

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

After publication: `npx @deployanyway/ship-it-meter --tests 125 --coverage 82 --build pass`.

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
