// Deno test: assert the built out/ tree matches the committed golden baseline.
// Run the build first (CI does `deno task build` before `deno task test`):
//
//   deno task build && deno task test
//
// Shares the runtime-agnostic manifest logic with compare-out.mjs.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, diffManifests } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);

Deno.test("out/ matches golden baseline", async () => {
  const golden = JSON.parse(
    await fs.readFile(path.join(here, "golden.manifest.json"), "utf8"),
  );
  const current = await buildManifest(path.join(root, "out"));
  const { missing, added, changed } = diffManifests(golden, current);

  if (missing.length || added.length || changed.length) {
    const lines = [
      ...missing.map((p) => `  - missing: ${p}`),
      ...added.map((p) => `  + added:   ${p}`),
      ...changed.map((p) => `  ~ changed: ${p}`),
    ];
    throw new Error(
      `out/ differs from golden baseline (${Object.keys(golden).length} files expected):\n` +
        lines.join("\n") +
        `\n\nIf intentional, run: deno run --allow-read --allow-write test/update-golden.mjs`,
    );
  }
});
