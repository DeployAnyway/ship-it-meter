import { URL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  releasePlan,
  releaseScenarios,
  scenarioEvidence,
  releaseGate,
} from "../src/index.js";
test("sample evidence is independent and plans explain gates with prioritized work", () => {
  assert.equal(releaseScenarios().length, 12);
  const sample = scenarioEvidence("ready");
  sample.build = false;
  assert.equal(scenarioEvidence("ready").build, true);
  const list = releaseScenarios();
  list[0].evidence.tests = 0;
  assert.equal(scenarioEvidence("ready").tests, 125);
  for (const { evidence } of releaseScenarios()) {
    const plan = releasePlan(evidence);
    assert.equal(plan.passed, releaseGate(evidence).passed);
    assert.ok(plan.summary);
    assert.ok(plan.tasks.every((task) => task.id && task.title && task.verify));
    assert.equal(
      new Set(plan.tasks.map((task) => task.id)).size,
      plan.tasks.length,
    );
    assert.equal(plan.tasks.at(-1).id, "monitoring");
  }
  assert.equal(
    releasePlan(scenarioEvidence("failed-build")).tasks.find(
      (task) => task.id === "build",
    ).priority,
    "blocker",
  );
  assert.ok(
    releasePlan(scenarioEvidence("low-coverage")).tasks.some(
      (task) => task.id === "coverage-review",
    ),
  );
  assert.ok(
    releasePlan(scenarioEvidence("no-evidence")).tasks.some(
      (task) => task.id === "coverage-evidence",
    ),
  );
  assert.ok(
    releasePlan(scenarioEvidence("friday")).tasks.some(
      (task) => task.id === "friday",
    ),
  );
  assert.throws(() => scenarioEvidence("constructor"), RangeError);
  assert.throws(() => scenarioEvidence(null), RangeError);
  assert.throws(() => releasePlan({ tests: -1 }), RangeError);
});
test("CLI plans, sample listing and flag overrides retain gate exit codes", () => {
  const run = (args) =>
    spawnSync(process.execPath, ["bin/cli.js", ...args], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    });
  let result = run(["--scenario", "ready", "--plan", "--json"]);
  assert.equal(result.status, 0);
  assert.ok(JSON.parse(result.stdout).tasks.length);
  result = run(["--scenario", "ready", "--build", "fail", "--plan", "--json"]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).passed, false);
  assert.equal(run(["--scenario", "missing"]).status, 2);
  assert.equal(run(["--plan", "--gate"]).status, 2);
  assert.equal(run(["--list-scenarios"]).stdout.trim().split("\n").length, 12);
  assert.match(run(["--scenario", "ready", "--plan"]).stdout, /Verify:/);
});
test("blockers precede review and release tasks", () => {
  const plan = releasePlan({
    tests: 5,
    coverage: 30,
    build: true,
    day: "friday",
    lintFailures: 1,
  });
  const ranks = { blocker: 0, review: 1, release: 2 };
  assert.deepEqual(
    plan.tasks.map((t) => ranks[t.priority]),
    plan.tasks.map((t) => ranks[t.priority]).sort(),
  );
});
