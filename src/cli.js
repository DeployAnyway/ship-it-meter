import { parseArgs } from "node:util";
import { readFileSync, statSync } from "node:fs";
import { URL } from "node:url";
import {
  shipIt,
  preflight,
  releaseGate,
  releasePlan,
  releaseScenarios,
  scenarioEvidence,
  evaluateReports,
} from "./index.js";

import { readStdin } from "./input.js";

try {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      json: { type: "boolean" },
      stdin: { type: "boolean" },
      reports: { type: "boolean" },
      "report-file": { type: "string" },
      policy: { type: "string" },
      gate: { type: "boolean" },
      plan: { type: "boolean" },
      scenario: { type: "string" },
      "list-scenarios": { type: "boolean" },
      "min-score": { type: "string" },
      checklist: { type: "boolean" },
      tests: { type: "string" },
      failing: { type: "string" },
      coverage: { type: "string" },
      day: { type: "string" },
      branch: { type: "string" },
      critical: { type: "string" },
      lint: { type: "string" },
      build: { type: "string" },
      dirty: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "Usage: ship-it-meter [options]\n\nOptions:\n  --reports         Read report bundle JSON from stdin (10 MiB)\n  --report-file path Read report bundle JSON file\n  --policy JSON      Receipt thresholds/freshness; receipt mode only\n  --tests number    Total tests\n  --failing number  Failing tests\n  --coverage number Coverage percent\n  --build pass|fail Build result\n  --critical number Open critical issues\n  --lint number     Lint failures\n  --dirty           Uncommitted changes\n  --branch name     Branch name\n  --day weekday     Full weekday name\n  --scenario name   Explore a named evidence scenario\n  --list-scenarios  List sample scenarios\n  --plan            Gate plus prioritized tasks and verification criteria\n  --checklist       Actionable, mildly concerned preflight\n  --json            Structured output\n  -h, --help        Help\n  -v, --version     Version\n\n--stdin reads a JSON evidence object (256 KiB); explicit flags override it. --gate requires passing evidence; --min-score 80 selects its threshold. A blocked gate exits 1. Missing test, coverage, and build evidence reduces readiness.\nExit codes: 0 scored successfully; 2 invalid arguments.",
    );
  } else if (values.version) {
    console.log(
      JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
    );
  } else if (values["list-scenarios"]) {
    console.log(
      releaseScenarios()
        .map((item) => item.name + " — " + item.description)
        .join("\n"),
    );
  } else if (values.reports || values["report-file"] !== undefined) {
    if (values.reports && values["report-file"] !== undefined)
      throw new TypeError("Choose --reports stdin or --report-file.");
    const allowed = new Set(["reports", "report-file", "policy", "json"]);
    for (const [key, value] of Object.entries(values))
      if (value !== undefined && !allowed.has(key))
        throw new TypeError(`--${key} cannot combine with report evaluation.`);
    if (
      values["report-file"] !== undefined &&
      statSync(values["report-file"]).size > 10485760
    )
      throw new RangeError("Report bundle exceeds 10 MiB.");
    const text =
      values["report-file"] !== undefined
        ? readFileSync(values["report-file"], "utf8")
        : await readStdin(process.stdin, 10485760);
    if (Buffer.byteLength(text) > 10485760)
      throw new RangeError("Report bundle exceeds 10 MiB.");
    const policy = values.policy === undefined ? {} : JSON.parse(values.policy);
    const result = evaluateReports(JSON.parse(text), policy);
    if (!result.passed) process.exitCode = 1;
    console.log(
      values.json
        ? JSON.stringify(result, null, 2)
        : `Receipt gate: ${result.passed ? "PASS" : "BLOCKED"} for ${result.commit}\n` +
            result.receipts
              .map(
                (item) =>
                  `${item.kind}: ${item.accepted ? "accepted" : "rejected"}`,
              )
              .join("\n") +
            "\n" +
            result.blockers.map((item) => "- " + item).join("\n"),
    );
  } else if (values.policy !== undefined) {
    throw new TypeError("--policy requires --reports or --report-file.");
  } else {
    const input = values.stdin
      ? JSON.parse(await readStdin())
      : values.scenario !== undefined
        ? scenarioEvidence(values.scenario)
        : {};
    if (values.stdin && values.scenario !== undefined)
      throw new TypeError("Choose --stdin or --scenario, not both.");
    if ([values.gate, values.plan, values.checklist].filter(Boolean).length > 1)
      throw new TypeError("Choose one of --gate, --plan or --checklist.");
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new TypeError("stdin must contain an evidence object.");
    if (
      values["min-score"] !== undefined &&
      (!(values.gate || values.plan) ||
        !/^\d+(?:\.\d+)?$/.test(values["min-score"]))
    )
      throw new TypeError(
        "--min-score requires --gate or --plan and a decimal number.",
      );
    for (const [flag, key] of Object.entries({
      tests: "tests",
      failing: "failingTests",
      coverage: "coverage",
      critical: "criticalIssues",
      lint: "lintFailures",
    })) {
      if (values[flag] !== undefined) {
        if (!/^\d+(?:\.\d+)?$/.test(values[flag]))
          throw new TypeError(`${flag} must be a nonnegative decimal number.`);
        input[key] = Number(values[flag]);
      }
    }
    if (values.build !== undefined) {
      if (!["pass", "fail"].includes(values.build))
        throw new RangeError("--build must be pass or fail.");
      input.build = values.build === "pass";
    }
    for (const key of ["day", "branch"])
      if (values[key] !== undefined) input[key] = values[key];
    if (values.dirty) input.uncommittedChanges = true;
    const result =
      values.gate || values.plan
        ? (values.plan ? releasePlan : releaseGate)(input, {
            minScore:
              values["min-score"] === undefined
                ? undefined
                : Number(values["min-score"]),
          })
        : values.checklist
          ? preflight(input)
          : shipIt(input);
    if ((values.gate || values.plan) && !result.passed) process.exitCode = 1;
    if (values.plan && !values.json)
      console.log(
        result.summary +
          "\n" +
          result.tasks
            .map(
              (task) =>
                `[${task.priority}] ${task.title}\n  Verify: ${task.verify}`,
            )
            .join("\n") +
          "\n",
      );
    console.log(
      values.json
        ? JSON.stringify(result, null, 2)
        : `${result.score}/100 — ${result.verdict}${values.gate || values.plan ? (result.passed ? " — gate passed" : " — gate blocked") : ""}\n${result.reasons.map((reason) => `- ${reason}`).join("\n")}${result.actions ? "\n\nBefore you ship:\n" + result.actions.map((action) => `[ ] ${action}`).join("\n") : ""}`,
    );
  }
} catch (error) {
  console.error(`ship-it-meter: ${error.message}\nRun with --help for usage.`);
  process.exitCode = 2;
}
