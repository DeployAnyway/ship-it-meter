import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/index.js"],
  outfile: "dist/index.cjs",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
});
await writeFile("index.d.cts", await readFile("index.d.ts"));
