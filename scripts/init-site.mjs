import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function usage() {
  return `Usage:
  npm run init-site -- --title "Example Wiki" --origin "https://wiki.example.com" [--entry "Getting Started"] [--force]

Options:
  --title   Site title for generated starter content.
  --origin  Public site origin used in the printed environment example.
  --entry   Starter entry name. Defaults to "Getting Started".
  --force   Overwrite generated starter files if they already exist.
`;
}

function parseArgs(argv) {
  const options = {
    entry: "Getting Started",
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--title" || arg === "--origin" || arg === "--entry") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }

      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function validateEntryName(entry) {
  if (entry.includes("\\") || path.isAbsolute(entry)) {
    throw new Error("--entry must be a relative entry path");
  }

  const segments = entry.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("--entry contains an invalid path segment");
  }

  return segments;
}

async function writeStarterFile(relativePath, content, force) {
  const targetPath = path.join(rootDir, relativePath);

  try {
    await fs.access(targetPath);
    if (!force) {
      console.log(`skip ${relativePath} (already exists)`);
      return;
    }
  } catch {
    // File does not exist.
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
  console.log(`${force ? "write" : "create"} ${relativePath}`);
}

function githubVariablesExample(options) {
  const origin = new URL(options.origin).origin;

  return [
    `WIKI_SITE_TITLE=${options.title}`,
    `WIKI_SITE_ORIGIN=${origin}`,
    "WIKI_HTML_LANG=en",
    "WIKI_ENTRY_URL_PREFIX=wiki",
    "WIKI_EDIT_URL_TEMPLATE=https://github.com/OWNER/REPO/edit/main/{encodedPath}",
    "WIKI_EDIT_LINK_LABEL=Edit this page",
    "WIKI_FAVICON_PATH=",
    "WIKI_CNAME=",
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.title) {
    throw new Error("--title is required");
  }

  if (!options.origin) {
    throw new Error("--origin is required");
  }

  const entrySegments = validateEntryName(options.entry);
  new URL(options.origin);

  const indexMarkdown = `# ${options.title}

{{entries}}
`;
  const entryMarkdown = `# ${entrySegments.at(-1)}

Write the first page here.
`;

  await writeStarterFile("index.md", indexMarkdown, options.force);
  await writeStarterFile(path.join("entries", ...entrySegments, "index.md"), entryMarkdown, options.force);
  await fs.mkdir(path.join(rootDir, "template"), { recursive: true });

  console.log("");
  console.log("GitHub Variables / local env example:");
  console.log(githubVariablesExample(options));
}

main().catch((error) => {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
});
