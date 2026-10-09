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
