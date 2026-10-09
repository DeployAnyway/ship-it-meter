import { releasePlan } from "./index.js";
const object = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(`${label} must be an object.`);
  return value;
};
const count = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new TypeError(`${label} must be a nonnegative safe integer.`);
  return value;
};
const json = (value) => (typeof value === "string" ? JSON.parse(value) : value);
const date = (value, label) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)
  )
    throw new TypeError(`${label} must be a UTC ISO timestamp.`);
  return Date.parse(value);
};

/** Parse completed Node TAP or Jest JSON test results; skipped/todo tests are not passing evidence. */
export function parseTestReport(data, format = "node-tap") {
  if (format === "node-tap") {
    if (
      typeof data !== "string" ||
      !data.startsWith("TAP version 13") ||
      /^Bail out!/m.test(data)
    )
      throw new TypeError("Expected a completed Node TAP v13 report.");
    const values = {};
    for (const key of [
      "tests",
      "pass",
      "fail",
      "cancelled",
      "skipped",
      "todo",
    ]) {
      const matches = [
        ...data.matchAll(new RegExp(`^# ${key} (\\d+)\\r?$`, "gm")),
      ];
      if (matches.length !== 1)
        throw new TypeError(`TAP requires one ${key} summary.`);
      values[key] = count(Number(matches[0][1]), key);
    }
    if (
      values.pass +
        values.fail +
        values.cancelled +
        values.skipped +
        values.todo !==
      values.tests
    )
      throw new TypeError("TAP counts do not reconcile.");
    return {
      tests: values.tests - values.skipped - values.todo,
      passedTests: values.pass,
      failingTests: values.fail + values.cancelled,
      skippedTests: values.skipped,
      todoTests: values.todo,
      successful: values.fail + values.cancelled === 0,
    };
  }
  if (format === "jest") {
    const report = object(json(data), "Jest report");
    const total = count(report.numTotalTests, "numTotalTests"),
      passed = count(report.numPassedTests, "numPassedTests"),
      failed = count(report.numFailedTests, "numFailedTests"),
      pending = count(report.numPendingTests, "numPendingTests"),
      todo = count(report.numTodoTests ?? 0, "numTodoTests");
    if (
      total !== passed + failed + pending + todo ||
      typeof report.success !== "boolean"
    )
      throw new TypeError("Jest counts/success do not reconcile.");
    if (
      report.wasInterrupted ||
      report.testResults?.some((result) =>
        result.assertionResults?.some(
          (assertion) => assertion.wouldRun === true,
        ),
      )
    )
      throw new TypeError(
        "Interrupted or collected-only Jest output is not executed evidence.",
      );
    const failedSuites = count(
      report.numFailedTestSuites ?? 0,
      "numFailedTestSuites",
    );
    return {
      tests: total - pending - todo,
      passedTests: passed,
      failingTests: failed,
      skippedTests: pending,
      todoTests: todo,
      successful: report.success && failed === 0 && failedSuites === 0,
    };
  }
  throw new RangeError("Supported test formats: node-tap, jest.");
}
/** Read Istanbul/c8 coverage-summary.json. Empty instrumented code is not evidence. */
export function parseCoverageReport(data) {
  const total = object(
      object(json(data), "Coverage report").total,
      "Coverage total",
    ),
    result = {};
  for (const key of ["lines", "statements", "functions", "branches"]) {
    const metric = object(total[key], `Coverage ${key}`),
      all = count(metric.total, `${key}.total`),
      covered = count(metric.covered, `${key}.covered`);
    if (
      (all === 0 && ["lines", "statements"].includes(key)) ||
      covered > all ||
      typeof metric.pct !== "number" ||
      !Number.isFinite(metric.pct) ||
      metric.pct < 0 ||
      metric.pct > 100
    )
      throw new TypeError(
        `Coverage ${key} must contain measured code and a percentage.`,
      );
    const computed = all === 0 ? 100 : (covered / all) * 100;
    if (Math.abs(computed - metric.pct) > 0.02)
      throw new TypeError(`Coverage ${key} percentage disagrees with counts.`);
    result[key] = metric.pct;
  }
  return result;
}
/** Gate real report envelopes. Caller-supplied commit/timestamps are provenance claims, not signatures. */
export function evaluateReports(bundle, options = {}) {
  object(bundle, "Report bundle");
  object(options, "Policy");
  for (const key of Object.keys(options))
    if (
      !["minTests", "minCoverage", "minScore", "maxAgeMs", "now"].includes(key)
    )
      throw new TypeError(`Unknown policy option: ${key}.`);
  if (typeof bundle.commit !== "string" || !bundle.commit.trim())
    throw new TypeError("Report bundle requires a nonempty commit.");
  const policy = {
    minTests: 1,
    minCoverage: 80,
    minScore: 80,
    maxAgeMs: 3600000,
    ...options,
  };
  for (const [key, value] of Object.entries({
    minTests: 1,
    minCoverage: 80,
    minScore: 80,
    maxAgeMs: 3600000,
  }))
    if (policy[key] === undefined) policy[key] = value;
  count(policy.minTests, "minTests");
  if (policy.minTests < 1) throw new RangeError("minTests must be positive.");
  for (const key of ["minCoverage", "minScore"])
    if (
      typeof policy[key] !== "number" ||
      !Number.isFinite(policy[key]) ||
      policy[key] < 0 ||
      policy[key] > 100
    )
      throw new RangeError(`${key} must be from 0 to 100.`);
  if (!Number.isSafeInteger(policy.maxAgeMs) || policy.maxAgeMs < 1)
    throw new RangeError("maxAgeMs must be a positive safe integer.");
  const now = options.now ?? new Date().toISOString();
  const nowMs = date(now, "now");
  const evidence = {},
    receipts = [],
    blockers = [];
  for (const kind of ["tests", "coverage", "build"]) {
    const issues = [],
      report = bundle[kind];
    if (!report) {
      issues.push(`${kind}: report is missing.`);
    } else
      try {
        object(report, kind);
        const captured = date(report.capturedAt, `${kind}.capturedAt`);
        if (report.commit !== bundle.commit)
          issues.push(`${kind}: commit does not match ${bundle.commit}.`);
        if (captured > nowMs)
          issues.push(`${kind}: timestamp is in the future.`);
        if (nowMs - captured > policy.maxAgeMs)
          issues.push(`${kind}: report is stale.`);
        if (kind === "tests") {
          if (!["node-tap", "jest"].includes(report.format))
            throw new RangeError("Test format must be node-tap or jest.");
          const parsed = parseTestReport(report.data, report.format);
          evidence.tests = parsed.tests;
          evidence.failingTests = parsed.failingTests;
          if (!parsed.successful)
            issues.push("tests: test execution was unsuccessful.");
          if (parsed.tests < policy.minTests)
            issues.push(
              `tests: ${parsed.tests} executed tests is below ${policy.minTests}.`,
            );
        } else if (kind === "coverage") {
          if (report.format !== "istanbul-summary")
            throw new RangeError("Coverage format must be istanbul-summary.");
          const coverage = parseCoverageReport(report.data);
          evidence.coverage = coverage.lines;
          for (const [metric, value] of Object.entries(coverage))
            if (value < policy.minCoverage)
              issues.push(
                `coverage: ${metric} ${value}% is below ${policy.minCoverage}%.`,
              );
        } else {
          count(report.exitCode, "build.exitCode");
          evidence.build = report.exitCode === 0;
          if (report.exitCode !== 0)
            issues.push(`build: command exited ${report.exitCode}.`);
        }
      } catch (error) {
        issues.push(`${kind}: ${error.message}`);
      }
    receipts.push({
      kind,
      format: kind === "build" ? "exit-code" : (report?.format ?? "missing"),
      commit: typeof report?.commit === "string" ? report.commit : null,
      capturedAt:
        typeof report?.capturedAt === "string" ? report.capturedAt : null,
      accepted: issues.length === 0,
      issues,
    });
    blockers.push(...issues);
  }
  const plan = releasePlan(evidence, { minScore: policy.minScore });
  const combined = [...new Set([...blockers, ...plan.blockers])];
  const receiptTasks = receipts
    .filter((item) => !item.accepted)
    .map((item) => ({
      id: "receipt-" + item.kind,
      priority: "blocker",
      title: "Repair " + item.kind + " evidence",
      verify: `Generate a completed ${item.kind} report for ${bundle.commit} with a current UTC timestamp; resolve: ${item.issues.join(" ")}`,
    }));
  return {
    ...plan,
    summary: combined.length
      ? "The receipts say stop. Confidence must wait."
      : plan.summary,
    tasks: [...receiptTasks, ...plan.tasks],
    passed: combined.length === 0,
    blockers: combined,
    evidence,
    receipts,
    commit: bundle.commit,
    policy: {
      minTests: policy.minTests,
      minCoverage: policy.minCoverage,
      minScore: policy.minScore,
      maxAgeMs: policy.maxAgeMs,
    },
    evaluatedAt: now,
  };
}
