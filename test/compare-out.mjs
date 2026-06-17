// Compare the current out/ build against the committed golden baseline.
// Exits non-zero on any added / missing / changed file. The acceptance gate
// for behaviour-preserving refactors: the diff must be empty.
//
//   node test/compare-out.mjs   (or: deno run --allow-read test/compare-out.mjs)

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, diffManifests } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const outDir = path.join(root, "out");
const goldenPath = path.join(here, "golden.manifest.json");

let golden;
try {
  golden = JSON.parse(await fs.readFile(goldenPath, "utf8"));
} catch {
  console.error(
    `Golden baseline missing: ${path.relative(root, goldenPath)}.\n` +
      `Build first, then run: node test/update-golden.mjs`,
  );
  process.exit(2);
}

const current = await buildManifest(outDir);
const { missing, added, changed } = diffManifests(golden, current);

if (missing.length === 0 && added.length === 0 && changed.length === 0) {
  console.log(`OK: out/ matches golden baseline (${Object.keys(golden).length} files)`);
  process.exit(0);
}

console.error("MISMATCH: out/ differs from golden baseline");
for (const p of missing) console.error(`  - missing: ${p}`);
for (const p of added) console.error(`  + added:   ${p}`);
for (const p of changed) console.error(`  ~ changed: ${p}`);
console.error(
  `\nIf this change is intentional, run: node test/update-golden.mjs (and explain in the PR).`,
);
process.exit(1);
