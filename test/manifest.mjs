// Runtime-agnostic build-output manifest (works under both Node and Deno).
// Walks a directory and returns { "<relative/path>": "<sha256-hex>" }, sorted
// by path, so two builds can be compared byte-for-byte regardless of which
// runtime produced them.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function buildManifest(dir) {
  const manifest = {};

  async function walk(current, rel) {
    const dirents = await fs.readdir(current, { withFileTypes: true });
    dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const dirent of dirents) {
      const abs = path.join(current, dirent.name);
      const relPath = rel ? `${rel}/${dirent.name}` : dirent.name;
      if (dirent.isDirectory()) {
        await walk(abs, relPath);
      } else {
        const buf = await fs.readFile(abs);
        manifest[relPath] = createHash("sha256").update(buf).digest("hex");
      }
    }
  }

  await walk(dir, "");
  return manifest;
}

// Compare two manifests. Returns { missing, added, changed } arrays of paths.
export function diffManifests(golden, current) {
  const goldenKeys = Object.keys(golden);
  const currentKeys = new Set(Object.keys(current));
  const goldenSet = new Set(goldenKeys);
  const missing = goldenKeys.filter((k) => !currentKeys.has(k));
  const added = [...currentKeys].filter((k) => !goldenSet.has(k));
  const changed = goldenKeys.filter(
    (k) => currentKeys.has(k) && golden[k] !== current[k],
  );
  return { missing, added, changed };
}
