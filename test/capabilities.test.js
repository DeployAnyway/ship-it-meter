import { URL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { shipIt, preflight } from "../src/index.js";
test("preflight preserves score and produces tasks for actual missing or failed evidence", () => {
  const input = {
    tests: 10,
    failingTests: 2,
    coverage: 40,
    build: false,
    criticalIssues: 1,
    lintFailures: 2,
    uncommittedChanges: true,
    day: "friday",
  };
  const { actions, ...score } = preflight(input);
  assert.deepEqual(score, shipIt(input));
  assert.equal(actions.length, 7);
  assert.ok(actions.some((x) => x.includes("on-call")));
  assert.ok(actions.some((x) => x.includes("failing tests")));
  assert.equal(
    preflight({ tests: 10, coverage: 100, build: true }).actions.length,
    1,
  );
  assert.throws(() => preflight({ tests: -1 }), RangeError);
  const cli = spawnSync(
    process.execPath,
    [
      "bin/cli.js",
      "--tests",
      "10",
      "--coverage",
      "100",
      "--build",
      "pass",
      "--checklist",
      "--json",
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(cli.status, 0);
  assert.deepEqual(
    JSON.parse(cli.stdout),
    preflight({ tests: 10, coverage: 100, build: true }),
  );
});
