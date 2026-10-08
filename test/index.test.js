import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { shipIt } from "@deployanyway/ship-it-meter";

const ready = { tests: 100, coverage: 100, build: true };
const cliPath = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const cli = (...args) =>
  spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
test("ready and missing-evidence defaults", () => {
  assert.equal(shipIt(ready).score, 100);
  assert.equal(shipIt(ready).verdict, "Suspiciously Ready");
  assert.equal(shipIt().score, 45);
  assert.equal(shipIt().verdict, "Questionable");
});
test("documented example and exact reasons", () => {
  assert.deepEqual(
    shipIt({
      tests: 125,
      failingTests: 2,
      coverage: 82,
      day: "Friday",
      branch: "main",
      build: true,
    }),
    {
      score: 59,
      verdict: "Questionable",
      reasons: [
        "2 of 125 tests are failing (-21)",
        "Coverage is 82% (-4)",
        "Build passed",
        "Friday: the weekend would like a quiet entrance (-3)",
        "Failing tests cap the score at 59",
      ],
    },
  );
});
test("individual penalties and blocker ceilings", () => {
  for (const [input, score] of [
    [{ tests: 0 }, 75],
    [{ coverage: 0 }, 80],
    [{ build: false }, 29],
    [{ criticalIssues: 1 }, 29],
    [{ failingTests: 1 }, 59],
    [{ lintFailures: 1 }, 95],
    [{ lintFailures: 100 }, 80],
    [{ uncommittedChanges: true }, 90],
    [{ branch: "feature/x" }, 95],
    [{ day: "FRIDAY" }, 97],
  ]) {
    assert.equal(shipIt({ ...ready, ...input }).score, score);
  }
  assert.equal(
    shipIt({
      ...ready,
      failingTests: 100,
      criticalIssues: 3,
      lintFailures: 5,
      build: false,
      uncommittedChanges: true,
    }).score,
    0,
  );
});
test("verdict boundaries", () => {
  for (const [input, score, verdict] of [
    [{ ...ready, build: false }, 29, "Absolutely Not"],
    [{ tests: 0, coverage: 0, lintFailures: 1 }, 35, "Questionable"],
    [
      { ...ready, coverage: 0, uncommittedChanges: true, lintFailures: 4 },
      50,
      "Questionable",
    ],
    [
      { ...ready, coverage: 0, uncommittedChanges: true, lintFailures: 2 },
      60,
      "Probably Fine",
    ],
    [
      { ...ready, coverage: 95, uncommittedChanges: true, lintFailures: 2 },
      79,
      "Probably Fine",
    ],
    [{ ...ready, coverage: 0 }, 80, "Ship It"],
    [{ ...ready, coverage: 70 }, 94, "Ship It"],
    [{ ...ready, coverage: 75 }, 95, "Suspiciously Ready"],
  ]) {
    const result = shipIt(input);
    assert.equal(result.score, score);
    assert.equal(result.verdict, verdict);
  }
});
test("monotonic coverage, failures, lint and critical issue penalties", () => {
  let previous = 0;
  for (let coverage = 0; coverage <= 100; coverage++) {
    const score = shipIt({ ...ready, coverage }).score;
    assert.ok(score >= previous);
    previous = score;
  }
  for (const key of ["failingTests", "lintFailures", "criticalIssues"]) {
    let previousScore = 100;
    for (let count = 0; count <= 100; count++) {
      const score = shipIt({ ...ready, [key]: count }).score;
      assert.ok(score <= previousScore);
      previousScore = score;
    }
  }
});
test("Friday cannot override blockers, omitted day is deterministic", () => {
  assert.equal(
    shipIt({ ...ready, build: false, day: "friday" }).verdict,
    "Absolutely Not",
  );
  assert.equal(shipIt({ ...ready, day: " monday " }).score, 100);
  assert.deepEqual(shipIt(ready), shipIt(ready));
});
test("input remains unchanged and results are independent", () => {
  const input = Object.freeze({ ...ready });
  const result = shipIt(input);
  result.reasons.length = 0;
  assert.ok(shipIt(input).reasons.length);
  assert.deepEqual(input, ready);
});
test("invalid inputs", () => {
  for (const input of [
    null,
    [],
    1,
    { typo: 1 },
    { build: "pass" },
    { uncommittedChanges: 0 },
    { branch: "" },
    { day: null },
  ])
    assert.throws(() => shipIt(input), TypeError);
  for (const input of [
    { tests: -1 },
    { tests: 1.5 },
    { tests: "1" },
    { tests: Number.MAX_SAFE_INTEGER + 1 },
    { coverage: NaN },
    { coverage: Infinity },
    { coverage: 101 },
    { coverage: -1 },
    { coverage: "80" },
    { day: "Fri" },
    { failingTests: 1 },
    { tests: 0, failingTests: 1 },
    { criticalIssues: -1 },
    { lintFailures: 0.5 },
  ])
    assert.throws(() => shipIt(input), RangeError);
});
test("CLI JSON agrees with library, help/version/text and bad readiness exit 0", () => {
  const result = cli(
    "--tests",
    "100",
    "--coverage",
    "100",
    "--build",
    "pass",
    "--json",
  );
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), shipIt(ready));
  assert.ok(cli().stdout.includes("45/100 — Questionable"));
  assert.ok(cli("--help").stdout.includes("Usage:"));
  assert.equal(cli("--version").stdout.trim(), "0.1.0");
  assert.equal(cli("--build", "fail").status, 0);
  const full = cli(
    "--tests",
    "100",
    "--failing",
    "2",
    "--coverage",
    "82",
    "--build",
    "pass",
    "--day",
    "Friday",
    "--branch",
    "dev",
    "--critical",
    "1",
    "--lint",
    "2",
    "--dirty",
    "--json",
  );
  assert.deepEqual(
    JSON.parse(full.stdout),
    shipIt({
      tests: 100,
      failingTests: 2,
      coverage: 82,
      build: true,
      day: "Friday",
      branch: "dev",
      criticalIssues: 1,
      lintFailures: 2,
      uncommittedChanges: true,
    }),
  );
});
test("CLI rejects malformed flags, numeric coercion and inconsistent evidence", () => {
  for (const args of [
    ["wat"],
    ["--wat"],
    ["--tests"],
    ["--tests", ""],
    ["--tests", "0x10"],
    ["--tests", "1e2"],
    ["--tests", "1.5"],
    ["--coverage", "NaN"],
    ["--coverage", "101"],
    ["--build", "maybe"],
    ["--failing", "1"],
    ["--day", "Fri"],
  ]) {
    const result = cli(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.includes("--help"));
  }
});
