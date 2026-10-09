import { readFileSync } from "node:fs";
import { evaluateReports } from "@deployanyway/ship-it-meter";
try {
  if (!process.argv[2]) throw new TypeError("Provide receipts.json.");
  const result = evaluateReports(
    JSON.parse(readFileSync(process.argv[2], "utf8")),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.passed ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
