import api = require("@deployanyway/ship-it-meter");
api.releaseGate({ tests: 20, build: true, coverage: 90 }, { minScore: 80 });
// @ts-expect-error invalid literal
api.shipIt({ day: "funday" });
api.releasePlan(api.scenarioEvidence("ready")).tasks[0].verify;
api.releaseScenarios();
import reports = require("@deployanyway/ship-it-meter");
reports.evaluateReports({ commit: "abc" }).receipts;
