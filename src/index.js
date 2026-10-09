const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const counts = ["tests", "failingTests", "criticalIssues", "lintFailures"];
const allowed = [
  ...counts,
  "coverage",
  "build",
  "uncommittedChanges",
  "branch",
  "day",
];

/** Explicit automation gate; a score alone is never a deployment approval. */
export function releaseGate(input = {}, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("Gate options must be an object.");
  const minScore = options.minScore ?? 80;
  if (
    typeof minScore !== "number" ||
    !Number.isFinite(minScore) ||
    minScore < 0 ||
    minScore > 100
  )
    throw new RangeError("minScore must be between 0 and 100.");
  const result = preflight(input);
  const blockers = [];
  if (!input.tests)
    blockers.push("Provide a positive test count. Vibes cannot pass CI.");
  if (input.build !== true) blockers.push("A passing build is required.");
  if (input.coverage === undefined)
    blockers.push("Coverage evidence is required.");
  if (input.failingTests) blockers.push("Failing tests block the gate.");
  if (input.criticalIssues) blockers.push("Critical issues block the gate.");
  if (input.lintFailures) blockers.push("Lint failures block the gate.");
  if (input.uncommittedChanges)
    blockers.push("Uncommitted changes block the gate.");
  if (result.score < minScore)
    blockers.push(`Score ${result.score} is below ${minScore}.`);
  return { ...result, minScore, passed: blockers.length === 0, blockers };
}

/**
 * Calculate a stateless readiness score. Missing evidence reduces the score.
 * @param {{tests?: number, failingTests?: number, coverage?: number, build?: boolean, uncommittedChanges?: boolean, branch?: string, day?: string, criticalIssues?: number, lintFailures?: number}} [input]
 * @returns {{score: number, verdict: string, reasons: string[]}}
 */
export function shipIt(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new TypeError("Input must be an object.");
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) throw new TypeError(`Unknown input: ${key}.`);
  for (const key of counts) {
    if (
      input[key] !== undefined &&
      (!Number.isSafeInteger(input[key]) || input[key] < 0)
    )
      throw new RangeError(`${key} must be a nonnegative safe integer.`);
  }
  if (
    input.coverage !== undefined &&
    (typeof input.coverage !== "number" ||
      !Number.isFinite(input.coverage) ||
      input.coverage < 0 ||
      input.coverage > 100)
  )
    throw new RangeError("coverage must be between 0 and 100.");
  for (const key of ["build", "uncommittedChanges"])
    if (input[key] !== undefined && typeof input[key] !== "boolean")
      throw new TypeError(`${key} must be a boolean.`);
  for (const key of ["branch", "day"])
    if (
      input[key] !== undefined &&
      (typeof input[key] !== "string" || !input[key].trim())
    )
      throw new TypeError(`${key} must be a nonempty string.`);
  const day = input.day?.trim().toLowerCase();
  if (day !== undefined && !days.includes(day))
    throw new RangeError("day must be a full weekday name.");
  const failing = input.failingTests ?? 0;
  if (failing > 0 && input.tests === undefined)
    throw new RangeError("tests is required when failingTests is positive.");
  if (input.tests !== undefined && failing > input.tests)
    throw new RangeError("failingTests cannot exceed tests.");
  let score = 100;
  const reasons = [];
  const deduct = (points, reason) => {
    score -= points;
    reasons.push(`${reason} (-${points})`);
  };
  if (!input.tests)
    deduct(
      25,
      input.tests === 0 ? "No tests reported" : "Test count not provided",
    );
  else if (failing)
    deduct(
      Math.min(50, 20 + Math.ceil(30 * (failing / input.tests))),
      `${failing} of ${input.tests} tests are failing`,
    );
  else reasons.push(`${input.tests} tests reported passing`);
  if (input.coverage === undefined) deduct(15, "Coverage not provided");
  else {
    const penalty = Math.ceil((100 - input.coverage) * 0.2);
    if (penalty) deduct(penalty, `Coverage is ${input.coverage}%`);
    else reasons.push("Coverage is 100%");
  }
  if (input.build === undefined) deduct(15, "Build status not provided");
  else if (!input.build) deduct(40, "Build failed");
  else reasons.push("Build passed");
  if (input.criticalIssues)
    deduct(
      Math.min(50, 25 * input.criticalIssues),
      `${input.criticalIssues} open critical issues`,
    );
  if (input.lintFailures)
    deduct(
      Math.min(20, 5 * input.lintFailures),
      `${input.lintFailures} lint failures`,
    );
  if (input.uncommittedChanges) deduct(10, "Uncommitted changes reported");
  if (
    input.branch !== undefined &&
    !["main", "master"].includes(input.branch.trim())
  )
    deduct(5, `Branch is ${input.branch.trim()}`);
  if (day === "friday")
    deduct(3, "Friday: the weekend would like a quiet entrance");
  score = Math.max(0, Math.min(100, score));
  if (input.build === false || input.criticalIssues > 0) {
    score = Math.min(score, 29);
    reasons.push("Failed build or critical issues cap the score at 29");
  } else if (failing > 0) {
    score = Math.min(score, 59);
    reasons.push("Failing tests cap the score at 59");
  }
  const verdict =
    score < 30
      ? "Absolutely Not"
      : score < 60
        ? "Questionable"
        : score < 80
          ? "Probably Fine"
          : score < 95
            ? "Ship It"
            : "Suspiciously Ready";
  return { score, verdict, reasons };
}

/** Return actionable preflight tasks alongside the existing score. */
export function preflight(input = {}) {
  const result = shipIt(input);
  const actions = [];
  if (input.build !== true)
    actions.push("Get a passing build. Confidence is not a build artifact.");
  if (!input.tests)
    actions.push("Run tests and report the count. Vibes are not assertions.");
  if (input.failingTests)
    actions.push("Fix failing tests. Red is not a festive deployment theme.");
  if (input.coverage === undefined || input.coverage < 80)
    actions.push(
      "Measure coverage and review untested paths. The bugs enjoy privacy.",
    );
  if (input.criticalIssues)
    actions.push(
      "Resolve critical issues. The incident channel deserves a quiet afternoon.",
    );
  if (input.lintFailures)
    actions.push("Fix lint failures. Let the semicolons retire in peace.");
  if (input.uncommittedChanges)
    actions.push(
      "Commit or stash local changes. Your laptop is not the release archive.",
    );
  if (input.day?.trim().toLowerCase() === "friday")
    actions.push(
      "Confirm rollback and on-call cover. The weekend has other plans.",
    );
  if (!actions.length)
    actions.push(
      "Confirm monitoring and rollback. Even excellent evidence needs a parachute.",
    );
  return { ...result, actions };
}

export { releaseScenarios, scenarioEvidence } from "./scenarios.js";
/** Explain the gate as ordered work with observable completion criteria. */
export function releasePlan(input = {}, options = {}) {
  const gate = releaseGate(input, options);
  const tasks = [];
  const add = (id, priority, title, verify) =>
    tasks.push({ id, priority, title, verify });
  if (input.build !== true)
    add(
      "build",
      "blocker",
      "Get a passing build",
      "Run the release build for the exact commit and record its successful result.",
    );
  if (!input.tests)
    add(
      "tests",
      "blocker",
      "Run a nonempty test suite",
      "Record the test count and outcome for the release commit.",
    );
  if (input.failingTests)
    add(
      "failing-tests",
      "blocker",
      "Repair failing tests",
      "Reproduce each failure, fix its cause and rerun the suite.",
    );
  if (input.coverage === undefined)
    add(
      "coverage-evidence",
      "blocker",
      "Measure coverage",
      "Generate coverage for the release commit and record the percentage.",
    );
  else if (input.coverage < 80)
    add(
      "coverage-review",
      "review",
      "Review untested paths",
      "Inspect uncovered critical paths and add meaningful tests where needed.",
    );
  if (input.criticalIssues)
    add(
      "critical-issues",
      "blocker",
      "Resolve critical issues",
      "Record the resolution and verify the affected behavior.",
    );
  if (input.lintFailures)
    add(
      "lint",
      "blocker",
      "Fix lint failures",
      "Run the configured lint checks successfully.",
    );
  if (input.uncommittedChanges)
    add(
      "worktree",
      "blocker",
      "Reconcile local changes",
      "Commit or stash intentionally and verify the exact release source.",
    );
  if (input.branch && !["main", "master"].includes(input.branch.trim()))
    add(
      "branch",
      "review",
      "Confirm release branch",
      "Verify that this branch is the intended release source and that its CI passed.",
    );
  if (input.day?.trim().toLowerCase() === "friday")
    add(
      "friday",
      "review",
      "Confirm weekend support",
      "Identify monitoring ownership and a tested rollback path.",
    );
  if (gate.score < gate.minScore)
    add(
      "score",
      "blocker",
      "Improve evidence to the configured threshold",
      "Address score deductions, rerun the checks and reevaluate the gate.",
    );
  add(
    "rollback",
    "release",
    "Prepare the return route",
    "Verify the rollback artifact and procedure before deployment.",
  );
  add(
    "monitoring",
    "release",
    "Watch the actual release",
    "Check health and error metrics after deployment and name an owner.",
  );
  const summaries = {
    "Absolutely Not": "The evidence says stop. The confidence hat can wait.",
    Questionable:
      "The release has questions. Answer them before adding confetti.",
    "Probably Fine": "Close is a useful direction, not a deployment receipt.",
    "Ship It": "Good evidence. Keep the parachute and watch the landing.",
    "Suspiciously Ready":
      "Boring, verified readiness. Give the checks their share of the applause.",
  };
  const rank = { blocker: 0, review: 1, release: 2 };
  tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
  return { ...gate, summary: summaries[gate.verdict], tasks };
}
export {
  parseTestReport,
  parseCoverageReport,
  evaluateReports,
} from "./reports.js";
