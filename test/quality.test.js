import { URL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { readStdin } from "../src/input.js";
const cli = (args, input = "", extraEnv = {}) => {
  const env = { ...process.env, ...extraEnv };
  if (!Object.hasOwn(extraEnv, "NO_COLOR")) delete env.NO_COLOR;
  return spawnSync(process.execPath, ["bin/cli.js", ...args], {
    cwd: new URL("..", import.meta.url),
    input,
    encoding: "utf8",
    env,
  });
};
test("stdin handles UTF-8 buffers and string chunks, refuses TTY/empty/oversized input", async () => {
  assert.equal(
    await readStdin(Readable.from([Buffer.from("你好"), Buffer.from(" 👋\n")])),
    "你好 👋",
  );
  assert.equal(await readStdin(Readable.from([" hello "])), "hello");
  const tty = Readable.from([]);
  tty.isTTY = true;
  await assert.rejects(readStdin(tty), /Pipe/);
  await assert.rejects(readStdin(Readable.from([" \n"])), /nonempty/);
  await assert.rejects(
    readStdin(Readable.from([Buffer.alloc(262145)])),
    /256 KiB/,
  );
});
import { releaseGate } from "../src/index.js";
const good = { tests: 20, build: true, coverage: 90 };
test("release gate requires evidence, exposes blockers and honors a threshold", () => {
  assert.equal(releaseGate(good).passed, true);
  assert.equal(releaseGate(good, { minScore: 100 }).passed, false);
  const empty = releaseGate();
  assert.equal(empty.passed, false);
  assert.ok(empty.blockers.length >= 3);
  const blocked = releaseGate({
    ...good,
    failingTests: 1,
    criticalIssues: 1,
    lintFailures: 1,
    uncommittedChanges: true,
  });
  assert.equal(blocked.passed, false);
  assert.ok(blocked.blockers.some((x) => x.includes("Critical")));
  for (const options of [null, [], "x"])
    assert.throws(() => releaseGate(good, options), TypeError);
  for (const minScore of [-1, 101, NaN, Infinity, "80"])
    assert.throws(() => releaseGate(good, { minScore }), RangeError);
});
test("CLI gate has useful exit 1, JSON stdin and explicit flag precedence", () => {
  const pass = cli(["--stdin", "--gate", "--json"], JSON.stringify(good));
  assert.equal(pass.status, 0);
  assert.equal(JSON.parse(pass.stdout).passed, true);
  const fail = cli(
    ["--stdin", "--gate", "--json", "--build", "fail"],
    JSON.stringify(good),
  );
  assert.equal(fail.status, 1);
  assert.equal(JSON.parse(fail.stdout).passed, false);
  assert.equal(fail.stderr, "");
  assert.ok(cli(["--gate"]).stdout.includes("gate blocked"));
  assert.equal(
    cli(["--stdin", "--gate", "--min-score", "100"], JSON.stringify(good))
      .status,
    1,
  );
  for (const [args, input] of [
    [["--stdin"], "[]"],
    [["--stdin"], "oops"],
    [["--min-score", "80"], ""],
    [["--gate", "--min-score", "oops"], ""],
    [["--gate", "--min-score", "101"], ""],
    [["--stdin"], "x".repeat(262145)],
  ])
    assert.equal(cli(args, input).status, 2);
});
