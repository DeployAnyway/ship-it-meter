import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const npm = process.env.npm_execpath;
assert.ok(npm, "Use npm run verify:package");
const run = (args, cwd = process.cwd()) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};
const temp = mkdtempSync(join(tmpdir(), "deployanyway-package-"));
try {
  run([npm, "run", "build"]);
  const [pack] = JSON.parse(
    run([
      npm,
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temp,
    ]),
  );
  for (const required of [
    "src/index.js",
    "dist/index.cjs",
    "index.d.ts",
    "index.d.cts",
    "bin/cli.js",
    "README.md",
    "LICENSE",
    "MIGRATION.md",
  ])
    assert.ok(
      pack.files.some((f) => f.path === required),
      required,
    );
  assert.ok(
    pack.files.every(
      (f) =>
        !/^(test|scripts|node_modules|coverage|demo|\.github)\//.test(f.path),
    ),
  );
  assert.ok(pack.size < 50000, "Archive budget: 50 kB compressed");
  writeFileSync(join(temp, "package.json"), '{"type":"module","private":true}');
  run(
    [
      npm,
      "install",
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
      join(temp, pack.filename),
    ],
    temp,
  );
  const esm = run(
    [
      "--input-type=module",
      "-e",
      'import * as api from "' +
        manifest.name +
        '"; console.log(JSON.stringify(api.releaseGate({tests:20,build:true,coverage:90},{minScore:80})))',
    ],
    temp,
  );
  const cjs = run(
    [
      "--input-type=commonjs",
      "-e",
      'const api=require("' +
        manifest.name +
        '"); console.log(JSON.stringify(api.releaseGate({tests:20,build:true,coverage:90},{minScore:80})))',
    ],
    temp,
  );
  assert.equal(esm, cjs);
  run(
    [join(temp, "node_modules", manifest.name, "bin/cli.js"), "--help"],
    temp,
  );
  run(
    [npm, "exec", "--offline", "--", Object.keys(manifest.bin)[0], "--help"],
    temp,
  );
  const types = readFileSync("test/types.mts", "utf8");
  writeFileSync(join(temp, "types.mts"), types);
  writeFileSync(
    join(temp, "types.cts"),
    readFileSync("test/types.cts", "utf8"),
  );
  run(
    [
      resolve("node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--target",
      "ES2022",
      "types.mts",
      "types.cts",
    ],
    temp,
  );
  assert.ok(
    pack.files.some((f) => f.path === "examples/report-gate.mjs"),
    "Runnable example must ship",
  );
  assert.equal(
    run(
      [
        "--input-type=module",
        "-e",
        "import * as api from '@deployanyway/ship-it-meter';const r=api.evaluateReports({commit:'test'},{now:'2026-10-09T00:00:00Z'}); if(r.passed||r.receipts.length!==3)throw new Error('Missing reports passed'); console.log(JSON.stringify(r));",
      ],
      temp,
    ),
    run(
      [
        "--input-type=commonjs",
        "-e",
        "const api=require('@deployanyway/ship-it-meter');const r=api.evaluateReports({commit:'test'},{now:'2026-10-09T00:00:00Z'}); if(r.passed||r.receipts.length!==3)throw new Error('Missing reports passed'); console.log(JSON.stringify(r));",
      ],
      temp,
    ),
  );
  console.log(
    JSON.stringify(
      {
        name: manifest.name,
        version: manifest.version,
        compressedBytes: pack.size,
        unpackedBytes: pack.unpackedSize,
        files: pack.files.length,
        runtimeDependencies: Object.keys(manifest.dependencies ?? {}).length,
        verified: [
          "ESM",
          "CommonJS",
          "installed types",
          "CLI",
          "offline npm exec",
          "archive contents",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
