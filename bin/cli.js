#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { shipIt } from "../src/index.js";

try {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      json: { type: "boolean" },
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
      "Usage: ship-it-meter [options]\n\nOptions:\n  --tests number    Total tests\n  --failing number  Failing tests\n  --coverage number Coverage percent\n  --build pass|fail Build result\n  --critical number Open critical issues\n  --lint number     Lint failures\n  --dirty           Uncommitted changes\n  --branch name     Branch name\n  --day weekday     Full weekday name\n  --json            Structured output\n  -h, --help        Help\n  -v, --version     Version\n\nMissing test, coverage, and build evidence reduces readiness.\nExit codes: 0 scored successfully; 2 invalid arguments.",
    );
  } else if (values.version) {
    console.log(
      JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
    );
  } else {
    const input = {};
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
    const result = shipIt(input);
    console.log(
      values.json
        ? JSON.stringify(result, null, 2)
        : `${result.score}/100 — ${result.verdict}\n${result.reasons.map((reason) => `- ${reason}`).join("\n")}`,
    );
  }
} catch (error) {
  console.error(`ship-it-meter: ${error.message}\nRun with --help for usage.`);
  process.exitCode = 2;
}
