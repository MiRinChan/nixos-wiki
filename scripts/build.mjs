import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import hljs from "highlight.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const entriesDir = path.join(rootDir, "entries");
const outDir = path.join(rootDir, "out");
const templatePath = path.join(rootDir, "template.html");
const homePath = path.join(rootDir, "index.md");
const siteTitle = "NixOS Wiki zh-CN";


marked.use({
  renderer: {
    code({ text, lang: infostring }) {
      // 正则匹配 语言:文件名 或 语言 文件名 (例如 js:app.js 或 js app.js)
      const match = infostring?.match(/^([^\s:]+)[:\s](.+)$/);

      let lang = infostring || '';
      let fileName = '';

      if (match) {
        lang = match[1];
        fileName = match[2];
      }

      const header = fileName
        ? `<div class="code-header"><span class="code-filename">${fileName}</span></div>`
        : '';

      // 使用 highlight.js 渲染代码
      let highlighted;
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(text, { language: lang }).value;
        } catch {
          highlighted = escapeHtml(text);
        }
      } else {
        highlighted = escapeHtml(text);
      }

      return `<div class="code-container">
        ${header}
        <pre><code class="language-${lang} hljs">${highlighted}</code></pre>
      </div>`;
    }
  }
});


const staticExtensions = new Set([
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".png",
  ".svg",
  ".webp",
  ".mp4",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const repoBase = "https://github.com/MiRinChan/nixos-wiki/edit/main";

function renderPage(template, title, content, githubEditUrl, assetPrefix = '', heading = escapeHtml(title)) {
  return template
    .replaceAll("{{title}}", escapeHtml(title))
    .replaceAll("{{heading}}", heading)
    .replaceAll("{{content}}", content)
    .replaceAll("{{github_edit_url}}", githubEditUrl)
    .replaceAll("{{asset_prefix}}", assetPrefix);
}

async function listEntries() {
  await fs.mkdir(entriesDir, { recursive: true });
  return listEntryChildren(entriesDir, []);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listEntryChildren(parentDir, parentSegments) {
  const dirents = await fs.readdir(parentDir, { withFileTypes: true });
  const result = [];

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      const segments = [...parentSegments, dirent.name];
      const entryDir = path.join(parentDir, dirent.name);
      const indexPath = path.join(entryDir, "index.md");
      const children = await listEntryChildren(entryDir, segments);
      const hasIndex = await pathExists(indexPath);

      if (hasIndex || children.length > 0) {
        result.push({
          segments,
          title: segments.join("/"),
          sourcePath: indexPath,
          hasIndex,
          children,
        });
      }
    }
  }

  return result.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}

function encodeUrlSegments(segments) {
  return segments.map((segment) => encodeURIComponent(segment));
}

function relativeEntryHref(fromSegments, toSegments) {
  if (!toSegments || toSegments.length === 0) return "/";
  const pathSegments = toSegments.map(encodeURIComponent);
  return "/" + pathSegments.join("/") + "/";
}

function assetPrefixForEntry(entry) {
  return entry.segments.length === 0 ? "" : "../".repeat(entry.segments.length);
}

function buildEntryHeading(entry) {
  if (entry.segments.length < 2) {
    return escapeHtml(entry.title);
  }

  const items = entry.segments.map((segment, index) => {
    const label = escapeHtml(segment);

    if (index === entry.segments.length - 1) {
      return label;
    }

    const href = relativeEntryHref(entry.segments, entry.segments.slice(0, index + 1));
    return `<a href="${href}">${label}</a>`;
  });

  return items.join("<span aria-hidden=\"true\"> / </span>");
}

function* walkEntries(entries) {
  for (const entry of entries) {
    yield entry;
    yield* walkEntries(entry.children);
  }
}

function buildEntryList(entries, currentSegments = [], options = {}) {
  if (entries.length === 0) {
    return "<p>暂无词条。</p>";
  }

  const links = entries
    .map((entry) => {
      const href = relativeEntryHref(currentSegments, entry.segments);
      const title = escapeHtml(entry.title);
      const children = options.includeDescendants && entry.children.length > 0
        ? `\n${buildEntryList(entry.children, currentSegments, options)}`
        : "";

      return `      <li><a href="${href}">${title}</a>${children}</li>`;
    })
    .join("\n");

  return `<ul>\n${links}\n    </ul>`;
}

async function renderHome(entries) {
  const markdown = await fs.readFile(homePath, "utf8");
  const markdownWithEntries = markdown.replaceAll("{{entries}}", buildEntryList(entries, [], { includeDescendants: true }));
  return marked.parse(markdownWithEntries);
}

async function renderEntry(entry) {
  const markdown = entry.hasIndex ? await fs.readFile(entry.sourcePath, "utf8") : "{{entries}}";
  const markdownWithEntries = markdown.replaceAll("{{entries}}", buildEntryList(entry.children, entry.segments));
  return marked.parse(markdownWithEntries);
}

async function copyStaticAssets() {
  const dirents = await fs.readdir(rootDir, { withFileTypes: true });

  await Promise.all(
    dirents
      .filter((dirent) => dirent.isFile() && (staticExtensions.has(path.extname(dirent.name).toLowerCase()) || dirent.name === "CNAME"))
      .map((dirent) => fs.copyFile(path.join(rootDir, dirent.name), path.join(outDir, dirent.name))),
  );

  await copyEntryStaticAssets(entriesDir, outDir);
}

async function copyEntryStaticAssets(sourceDir, targetDir) {
  const dirents = await fs.readdir(sourceDir, { withFileTypes: true });

  await Promise.all(
    dirents.map(async (dirent) => {
      const sourcePath = path.join(sourceDir, dirent.name);
      const targetPath = path.join(targetDir, dirent.name);

      if (dirent.isDirectory()) {
        await copyEntryStaticAssets(sourcePath, targetPath);
        return;
      }

      if (!dirent.isFile() || !staticExtensions.has(path.extname(dirent.name).toLowerCase())) {
        return;
      }

      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }),
  );
}

async function build() {
  const template = await fs.readFile(templatePath, "utf8");
  const entries = await listEntries();

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const entry of walkEntries(entries)) {
    const html = await renderEntry(entry);
    const githubEditUrl = `${repoBase}/entries/${entry.segments.map(encodeURIComponent).join("/")}/index.md`;
    const page = renderPage(template, entry.title, html, githubEditUrl, assetPrefixForEntry(entry), buildEntryHeading(entry));
    const entryOutDir = path.join(outDir, ...entry.segments);
    await fs.mkdir(entryOutDir, { recursive: true });
    await fs.writeFile(path.join(entryOutDir, "index.html"), page, "utf8");
  }

  const home = renderPage(template, siteTitle, await renderHome(entries), `${repoBase}/index.md`, '');
  await fs.writeFile(path.join(outDir, "index.html"), home, "utf8");

  await copyStaticAssets();
}

await build();
