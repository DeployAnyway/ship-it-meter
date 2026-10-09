import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { URL } from "node:url";
import {
  parseTestReport,
  parseCoverageReport,
  evaluateReports,
} from "@deployanyway/ship-it-meter";
const stamp = "2026-10-09T00:00:00Z",
  meta = { commit: "abc123", capturedAt: stamp };
const coverage = () => ({
  total: Object.fromEntries(
    ["lines", "statements", "functions", "branches"].map((key) => [
      key,
      { total: 10, covered: 10, pct: 100 },
    ]),
  ),
});
const jest = () => ({
  numTotalTests: 4,
  numPassedTests: 2,
  numFailedTests: 0,
  numPendingTests: 1,
  numTodoTests: 1,
  success: true,
});
const bundle = () => ({
  commit: "abc123",
  tests: { ...meta, format: "jest", data: jest() },
  coverage: { ...meta, format: "istanbul-summary", data: coverage() },
  build: { ...meta, exitCode: 0 },
});

test("actual Node TAP, c8 and esbuild output form passing measured receipts", () => {
  const temp = mkdtempSync(join(tmpdir(), "deployanyway-reports-"));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_V8_COVERAGE;
  try {
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/c8/bin/c8.js",
        "--reporter=json-summary",
        "--reports-dir",
        temp,
        "--temp-directory",
        join(temp, "v8"),
        "--include",
        "test/fixtures/value.js",
        "--exclude",
        "**/node_modules/**",
        process.execPath,
        "--test",
        "--test-reporter=tap",
        "test/fixtures/report-fixture.js",
      ],
      { encoding: "utf8", env },
    );
    assert.equal(run.status, 0, run.stderr);
    const tests = parseTestReport(run.stdout);
    assert.equal(tests.tests, 1);
    assert.equal(tests.skippedTests, 1);
    const report = JSON.parse(
      readFileSync(join(temp, "coverage-summary.json"), "utf8"),
    );
    assert.equal(parseCoverageReport(report).lines, 100);
    const build = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {buildSync} from 'esbuild'; buildSync({entryPoints:['test/fixtures/value.js'],bundle:true,outfile:" +
          JSON.stringify(join(temp, "built.js")) +
          "});",
      ],
      { encoding: "utf8" },
    );
    assert.equal(build.status, 0, build.stderr);
    const input = {
      commit: "abc123",
      tests: { ...meta, format: "node-tap", data: run.stdout },
      coverage: { ...meta, format: "istanbul-summary", data: report },
      build: { ...meta, exitCode: build.status },
    };
    const result = evaluateReports(input, { now: stamp });
    assert.equal(result.passed, true);
    assert.equal(result.evidence.tests, 1);
    assert.ok(result.receipts.every((item) => item.accepted));
    const file = join(temp, "receipts.json");
    writeFileSync(file, JSON.stringify(input));
    const cli = spawnSync(
      process.execPath,
      [
        "bin/cli.js",
        "--report-file",
        file,
        "--policy",
        JSON.stringify({ now: stamp }),
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).passed, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
test("strict parsers reject incomplete, contradictory, empty and collected-only reports", () => {
  const actualJest = JSON.parse(
    readFileSync(new URL("./fixtures/jest-real.json", import.meta.url), "utf8"),
  );
  assert.equal(parseTestReport(actualJest, "jest").tests, 1);
  assert.deepEqual(parseTestReport(JSON.stringify(jest()), "jest"), {
    tests: 2,
    passedTests: 2,
    failingTests: 0,
    skippedTests: 1,
    todoTests: 1,
    successful: true,
  });
  for (const data of [
    "not tap",
    "TAP version 13\n# tests 1",
    "TAP version 13\nBail out!",
  ])
    assert.throws(() => parseTestReport(data));
  const malformed = jest();
  malformed.numTotalTests = 99;
  assert.throws(() => parseTestReport(malformed, "jest"));
  assert.throws(() =>
    parseTestReport(
      { ...jest(), testResults: [{ assertionResults: [{ wouldRun: true }] }] },
      "jest",
    ),
  );
  assert.throws(() =>
    parseTestReport({ ...jest(), wasInterrupted: true }, "jest"),
  );
  assert.throws(() => parseTestReport({}, "other"));
  assert.throws(() => parseCoverageReport({}));
  for (const change of [
    { total: 0, covered: 0, pct: 100 },
    { total: 10, covered: 11, pct: 100 },
    { total: 10, covered: 1, pct: 100 },
    { total: 10, covered: 10, pct: "Unknown" },
  ]) {
    const data = coverage();
    data.total.lines = change;
    assert.throws(() => parseCoverageReport(data));
  }
  const zeroBranches = coverage();
  zeroBranches.total.branches = { total: 0, covered: 0, pct: 100 };
  assert.equal(parseCoverageReport(zeroBranches).branches, 100);
});
test("policies block missing, failed, stale, future and wrong-commit evidence with repair tasks", () => {
  const original = bundle();
  const before = JSON.stringify(original);
  assert.equal(evaluateReports(original, { now: stamp }).passed, true);
  assert.equal(JSON.stringify(original), before);
  for (const kind of ["tests", "coverage", "build"]) {
    const input = bundle();
    delete input[kind];
    const result = evaluateReports(input, { now: stamp });
    assert.equal(result.passed, false);
    assert.ok(result.tasks.some((task) => task.id === "receipt-" + kind));
  }
  for (const change of [
    { commit: "wrong" },
    { capturedAt: "2025-01-01T00:00:00Z" },
    { capturedAt: "2027-01-01T00:00:00Z" },
    { capturedAt: "2026-02-30T00:00:00Z" },
    { capturedAt: "bad" },
  ]) {
    const input = bundle();
    Object.assign(input.build, change);
    assert.equal(evaluateReports(input, { now: stamp }).passed, false);
  }
  const fail = bundle();
  fail.build.exitCode = 1;
  assert.equal(evaluateReports(fail, { now: stamp }).passed, false);
  const execution = bundle();
  execution.tests.data.success = false;
  assert.equal(evaluateReports(execution, { now: stamp }).passed, false);
  assert.equal(
    evaluateReports(bundle(), { now: stamp, minTests: 3 }).passed,
    false,
  );
  const low = bundle();
  low.coverage.data.total.branches = { total: 10, covered: 7, pct: 70 };
  assert.equal(
    evaluateReports(low, { now: stamp, minCoverage: 80 }).passed,
    false,
  );
  for (const options of [
    { minTests: 0 },
    { minCoverage: 101 },
    { minScore: -1 },
    { maxAgeMs: 0 },
    { maxAgeMs: 1.5 },
    { now: "bad" },
    { minCoverge: 90 },
  ])
    assert.throws(() => evaluateReports(bundle(), options));
  assert.throws(() => evaluateReports({}));
  assert.throws(() => evaluateReports(null));
  assert.throws(() => evaluateReports(bundle(), null));
  const cli = spawnSync(
    process.execPath,
    [
      "bin/cli.js",
      "--reports",
      "--policy",
      JSON.stringify({ now: stamp }),
      "--json",
    ],
    { input: JSON.stringify({ commit: "abc123" }), encoding: "utf8" },
  );
  assert.equal(cli.status, 1);
  assert.equal(JSON.parse(cli.stdout).passed, false);
});
