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
