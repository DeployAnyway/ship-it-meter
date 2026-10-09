// Demonstration inputs, never a claim about a real release.
const scenarios = {
  ready: {
    description:
      "Passing evidence, clean worktree and main branch. Boring is a compliment.",
    evidence: {
      tests: 125,
      coverage: 96,
      build: true,
      branch: "main",
      day: "tuesday",
    },
  },
  friday: {
    description:
      "Good evidence on Friday. Confirm rollback and on-call before the victory lap.",
    evidence: {
      tests: 125,
      coverage: 92,
      build: true,
      branch: "main",
      day: "friday",
    },
  },
  "no-evidence": {
    description:
      "Confidence is present. Test, coverage and build evidence have not arrived.",
    evidence: {},
  },
  "failed-build": {
    description:
      "The build is red. The deploy button is not a color correction tool.",
    evidence: {
      tests: 125,
      coverage: 92,
      build: false,
    },
  },
  "failing-tests": {
    description:
      "Some tests fail. Green deployment lights will not repair assertions.",
    evidence: {
      tests: 125,
      failingTests: 3,
      coverage: 92,
      build: true,
    },
  },
  "low-coverage": {
    description:
      "A passing build with many untested paths. The bugs appreciate the privacy.",
    evidence: {
      tests: 125,
      coverage: 45,
      build: true,
    },
  },
  "critical-issue": {
    description:
      "A critical issue blocks the gate even when everything else looks cheerful.",
    evidence: {
      tests: 125,
      coverage: 96,
      build: true,
      criticalIssues: 1,
    },
  },
  "lint-failures": {
    description:
      "Lint failures are still failures, however decorative the semicolons feel.",
    evidence: {
      tests: 125,
      coverage: 96,
      build: true,
      lintFailures: 2,
    },
  },
  "dirty-worktree": {
    description:
      "The laptop contains uncommitted changes. It is not the release archive.",
    evidence: {
      tests: 125,
      coverage: 96,
      build: true,
      uncommittedChanges: true,
    },
  },
  "feature-branch": {
    description:
      "Healthy evidence on a feature branch. Verify the intended release source.",
    evidence: {
      tests: 125,
      coverage: 96,
      build: true,
      branch: "feature/zoomies",
    },
  },
  "zero-tests": {
    description:
      "No tests ran. Zero failures is an especially small achievement here.",
    evidence: {
      tests: 0,
      coverage: 0,
      build: true,
    },
  },
  "weekend-incident": {
    description:
      "A failed build, failing tests and a critical issue. Bring evidence, not a bigger confidence hat.",
    evidence: {
      tests: 125,
      failingTests: 12,
      coverage: 60,
      build: false,
      criticalIssues: 1,
      day: "saturday",
    },
  },
};
export function releaseScenarios() {
  return Object.entries(scenarios).map(([name, value]) => ({
    name,
    description: value.description,
    evidence: { ...value.evidence },
  }));
}
export function scenarioEvidence(name) {
  if (typeof name !== "string" || !Object.hasOwn(scenarios, name))
    throw new RangeError(
      "Unknown scenario. Choose: " + Object.keys(scenarios).join(", "),
    );
  return { ...scenarios[name].evidence };
}
