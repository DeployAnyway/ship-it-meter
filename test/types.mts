import * as api from "@deployanyway/ship-it-meter";
api.releaseGate({ tests: 20, build: true, coverage: 90 }, { minScore: 80 });
// @ts-expect-error invalid literal
api.shipIt({ day: "funday" });
import {
  releasePlan,
  releaseScenarios,
  scenarioEvidence,
} from "@deployanyway/ship-it-meter";
releasePlan(scenarioEvidence("ready")).tasks[0].verify;
releaseScenarios();
import {
  evaluateReports,
  parseTestReport,
  parseCoverageReport,
} from "@deployanyway/ship-it-meter";
evaluateReports(
  {
    commit: "abc123",
    build: {
      commit: "abc123",
      capturedAt: "2026-10-09T00:00:00Z",
      exitCode: 0,
    },
  },
  { minCoverage: 90 },
);
parseTestReport("tap", "node-tap");
parseCoverageReport({});
// @ts-expect-error unsupported test format
parseTestReport({}, "made-up");
