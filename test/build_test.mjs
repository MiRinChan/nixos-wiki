// Deno test: assert the built out/ tree matches the committed golden baseline.
// `deno task test` runs the build before invoking this test:
//
//   deno task test
//
// Shares the runtime-agnostic manifest logic with compare-out.mjs.

import { promises as fs } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "../scripts/build.mjs";
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

Deno.test("entry pages contain server-rendered TOC markup", async () => {
  const html = await fs.readFile(path.join(root, "out/wiki/NVIDIA/index.html"), "utf8");
  assert(html.includes('<ul id="toc-tree">'), "TOC tree should be rendered during build");
  assert(
    html.includes('<details class="toc-container" open><summary>目录</summary>'),
    "TOC should use an operable native disclosure",
  );
  assert(
    html.includes('<details class="toc-branch" open><summary>启用 的子目录</summary>'),
    "nested TOC branches should remain operable without JavaScript",
  );
  assert(!html.includes('class="toc-toggle"'), "TOC should not contain script-only controls");
});

Deno.test("generated heading IDs are unique", () => {
  const html = renderMarkdown("## 重复标题\n\n## 重复标题\n");
  assert(html.includes('<h2 id="重复标题">'));
  assert(html.includes('<h2 id="重复标题-2">'));
});

Deno.test("homepage controls work without JavaScript", async () => {
  const html = await fs.readFile(path.join(root, "out/index.html"), "utf8");
  assert(html.includes('<form id="newEntryForm" action="https://github.com/MiRinChan/nixos-wiki/new/main/entries" method="get" target="_blank" rel="noopener">'));
  assert(html.includes('<label for="newEntryInput">词条路径（例如 Example/index.md）</label>'));
  assert(html.includes('<input id="newEntryInput" name="filename" required />'));
  assert(html.includes('<button type="submit">在 GitHub 新建词条</button>'));
  assert(!html.includes("encodedEntryName"), "the form should not depend on a script-only submission path");
});
