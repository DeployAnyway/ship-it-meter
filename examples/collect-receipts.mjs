import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { evaluateReports } from "@deployanyway/ship-it-meter";
// Configure in your project: "release:receipts": "node node_modules/@deployanyway/ship-it-meter/examples/collect-receipts.mjs"
// Requires your project's c8 dev dependency, Node tests using Node test discovery, and npm run build.
const run = (args) =>
  spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
const git = (args) => spawnSync("git", args, { encoding: "utf8" });
let temp;
try {
  if (!process.env.npm_execpath)
    throw new Error(
      "Run through an npm script so the build uses the current npm CLI.",
    );
  const head = git(["rev-parse", "HEAD"]);
  if (head.status !== 0)
    throw new Error("Cannot identify the exact Git commit.");
  const commit = head.stdout.trim();
  const clean = () => {
    const status = git(["status", "--porcelain", "--untracked-files=no"]);
    if (status.status !== 0 || status.stdout.trim())
      throw new Error(
        "Tracked source changes must be committed before collecting receipts.",
      );
  };
  clean();
  temp = mkdtempSync(join(tmpdir(), "deployanyway-receipts-"));
  const tests = run([
    resolve("node_modules/c8/bin/c8.js"),
    "--reporter=json-summary",
    "--reports-dir",
    temp,
    "--temp-directory",
    join(temp, "v8"),
    process.execPath,
    "--test",
    "--test-reporter=tap",
    ...process.argv.slice(2),
  ]);
  if (tests.error) throw tests.error;
  const testTime = new Date().toISOString(),
    coverage = JSON.parse(
      readFileSync(join(temp, "coverage-summary.json"), "utf8"),
    );
  const build = run([process.env.npm_execpath, "run", "build"]);
  if (build.error) throw build.error;
  const after = git(["rev-parse", "HEAD"]);
  if (after.status !== 0 || after.stdout.trim() !== commit)
    throw new Error("Commit changed during collection.");
  clean();
  const bundle = {
    commit,
    tests: {
      commit,
      capturedAt: testTime,
      format: "node-tap",
      data: tests.stdout,
    },
    coverage: {
      commit,
      capturedAt: testTime,
      format: "istanbul-summary",
      data: coverage,
    },
    build: {
      commit,
      capturedAt: new Date().toISOString(),
      exitCode: build.status,
    },
  };
  writeFileSync("receipts.json", JSON.stringify(bundle, null, 2));
  const result = evaluateReports(bundle);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.passed ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true });
}
