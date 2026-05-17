import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const programFiles = [
  ".github/workflows/pages.yml",
  ".github/workflows/pr-build.yml",
  "WIKI-SETUP.md",
  "flake.lock",
  "flake.nix",
  "package-lock.json",
  "package.json",
  "scripts/build.mjs",
  "scripts/init-site.mjs",
  "scripts/upgrade-program.mjs",
  "styles-base.css",
  "styles-code-dark.css",
  "styles-code-light.css",
  "template.html",
  "toc.js",
];

const preservedPaths = [
  "entries/",
  "index.md",
  "template/",
  "README.md",
  "LICENSE-for-content",
  "root static assets",
];

function usage() {
  return `Usage:
  npm run upgrade-program -- --from upstream/main
  npm run upgrade-program -- --from upstream/main --apply
  npm run upgrade-program -- --from ../nixos-wiki --apply

Options:
  --from   Git ref or directory to copy program files from. Required.
  --apply  Write changes. Without this flag the script only prints a dry-run plan.
  --list   Print the program-file allowlist and preserved paths.

This updates only the static wiki program files. It never writes entries/, index.md, or template/.
`;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    list: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--list") {
      options.list = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--from") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--from requires a value");
      }

      options.from = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printList() {
  console.log("Program files updated by this script:");
  for (const file of programFiles) {
    console.log(`  ${file}`);
  }

  console.log("");
  console.log("Preserved site/content paths:");
  for (const file of preservedPaths) {
    console.log(`  ${file}`);
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runGitShow(ref, file) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["show", `${ref}:${file}`], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }

      const error = new Error(Buffer.concat(stderr).toString("utf8").trim() || `git show failed for ${file}`);
      error.code = code;
      reject(error);
    });
  });
}

async function readSourceFile(source, file, sourceIsDirectory) {
  if (sourceIsDirectory) {
    const sourcePath = path.join(source, file);
    if (!(await pathExists(sourcePath))) {
      return null;
    }

    return fs.readFile(sourcePath);
  }

  try {
    return await runGitShow(source, file);
  } catch {
    return null;
  }
}

async function readCurrentFile(file) {
  const currentPath = path.join(rootDir, file);
  if (!(await pathExists(currentPath))) {
    return null;
  }

  return fs.readFile(currentPath);
}

async function writeProgramFile(file, content) {
  const targetPath = path.join(rootDir, file);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.list) {
    printList();
    if (!options.from) {
      return;
    }
  }

  if (!options.from) {
    throw new Error("--from is required");
  }

  const sourceIsDirectory = await pathExists(options.from);
  const changes = [];

  for (const file of programFiles) {
    const sourceContent = await readSourceFile(options.from, file, sourceIsDirectory);
    if (sourceContent === null) {
      console.log(`missing ${file}`);
      continue;
    }

    const currentContent = await readCurrentFile(file);
    if (currentContent !== null && Buffer.compare(sourceContent, currentContent) === 0) {
      console.log(`same    ${file}`);
      continue;
    }

    changes.push({ file, content: sourceContent, exists: currentContent !== null });
    console.log(`${currentContent === null ? "create" : "update"} ${file}`);
  }

  if (changes.length === 0) {
    console.log("");
    console.log("No program-file changes found.");
    return;
  }

  console.log("");
  if (!options.apply) {
    console.log(`Dry run only. Re-run with --apply to write ${changes.length} program file(s).`);
    return;
  }

  for (const change of changes) {
    await writeProgramFile(change.file, change.content);
  }

  console.log(`Applied ${changes.length} program file(s).`);
}

main().catch((error) => {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
});
