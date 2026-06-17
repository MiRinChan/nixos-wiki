// Regenerate the golden baseline from the current out/ directory.
// Run this ONLY when an output change is intentional (and explain it in the PR).
//
//   node test/update-golden.mjs   (or: deno run --allow-read --allow-write test/update-golden.mjs)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const outDir = path.join(root, "out");
const goldenPath = path.join(here, "golden.manifest.json");

const manifest = await buildManifest(outDir);
const json = JSON.stringify(manifest, null, 2) + "\n";
await fs.writeFile(goldenPath, json, "utf8");

const count = Object.keys(manifest).length;
console.log(`Wrote golden baseline: ${count} files → ${path.relative(root, goldenPath)}`);
