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
const siteTitle = "NixOS Wiki that my personal change which is in Chinese";


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
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPage(template, title, content) {
  return template
    .replaceAll("{{title}}", escapeHtml(title))
    .replaceAll("{{content}}", content);
}

async function listEntries() {
  await fs.mkdir(entriesDir, { recursive: true });
  const dirents = await fs.readdir(entriesDir, { withFileTypes: true });

  const result = [];

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      const indexPath = path.join(entriesDir, dirent.name, "index.md");
      try {
        await fs.access(indexPath);
        result.push({
          dirName: dirent.name,
          title: dirent.name,
          outputFileName: `${dirent.name}/index.html`,
        });
      } catch {
        // directory without index.md, skip
      }
    }
  }

  return result.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}

function buildEntryList(entries) {
  if (entries.length === 0) {
    return "<p>暂无词条。</p>";
  }

  const links = entries
    .map((entry) => {
      const href = encodeURI(entry.outputFileName);
      const title = escapeHtml(entry.title);
      return `      <li><a href="${href}">${title}</a></li>`;
    })
    .join("\n");

  return `<ul>\n${links}\n    </ul>`;
}

async function renderHome(entries) {
  const markdown = await fs.readFile(homePath, "utf8");
  const markdownWithEntries = markdown.replaceAll("{{entries}}", buildEntryList(entries));
  return marked.parse(markdownWithEntries);
}

async function copyStaticAssets() {
  const dirents = await fs.readdir(rootDir, { withFileTypes: true });

  await Promise.all(
    dirents
      .filter((dirent) => dirent.isFile() && staticExtensions.has(path.extname(dirent.name).toLowerCase()))
      .map((dirent) => fs.copyFile(path.join(rootDir, dirent.name), path.join(outDir, dirent.name))),
  );
}

async function build() {
  const template = await fs.readFile(templatePath, "utf8");
  const entries = await listEntries();

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const entry of entries) {
    const markdown = await fs.readFile(path.join(entriesDir, entry.dirName, "index.md"), "utf8");
    const html = marked.parse(markdown);
    const page = renderPage(template, entry.title, html);
    const entryOutDir = path.join(outDir, entry.dirName);
    await fs.mkdir(entryOutDir, { recursive: true });
    await fs.writeFile(path.join(entryOutDir, "index.html"), page, "utf8");
  }

  const home = renderPage(template, siteTitle, await renderHome(entries));
  await fs.writeFile(path.join(outDir, "index.html"), home, "utf8");

  await copyStaticAssets();
}

await build();
