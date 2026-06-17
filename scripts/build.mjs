/* The wiki program. Provide a simple markdown-based wiki with a static site generator for easy hosting on GitHub Pages or similar platforms.
// Copyright (C) 2026 MiRinChan
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License along
// with this program; if not, see < https://www.gnu.org/licenses/>.
*/

import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import footnote from "marked-footnote";
import alert from "marked-alert";
import hljs from "highlight.js";
import {
  defaultFooterHtml,
  entriesDir,
  escapeHtml,
  homePath,
  outDir,
  rootDir,
  siteConfig,
  sourcePathToEncodedPath,
  staticExtensions,
  templatePath,
} from "./lib/config.mjs";
import {
  describeContext,
  expandMarkdownTemplates,
  makeRenderContext,
  readRequiredFile,
} from "./lib/template-engine.mjs";


marked.use(footnote({ description: "脚注" }));
marked.use(alert({
  variants: [
    { type: "note", title: "备注", icon: '<svg class="octicon octicon-info mr-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>' },
    { type: "tip", title: "提示", icon: '<svg class="octicon octicon-light-bulb mr-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>' },
    { type: "important", title: "重要", icon: '<svg class="octicon octicon-report mr-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>' },
    { type: "warning", title: "警告", icon: '<svg class="octicon octicon-alert mr-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>' },
    { type: "caution", title: "注意", icon: '<svg class="octicon octicon-stop mr-2" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>' },
  ],
}));

// Custom extension: ||key|| → <kbd>key</kbd>
marked.use({
  extensions: [{
    name: "kbd",
    level: "inline",
    start(src) {
      return src.indexOf("||");
    },
    tokenizer(src) {
      const rule = /^\|\|(.+?)\|\|/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: "kbd",
          raw: match[0],
          text: match[1],
        };
      }
    },
    renderer(token) {
      return `<kbd>${escapeHtml(token.text)}</kbd>`;
    },
  }],
});

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      // Extract explicit id from inline HTML like <a id="foo"></a>
      const explicitId = text.match(/<[^>]*?\bid\s*=\s*"([^"]*)"[^>]*>/i)?.[1];
      const id = explicitId || text
        .replace(/<[^>]*>/g, "")
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    code({ text, lang: infostring }) {
      // Mermaid diagrams: output raw <pre class="mermaid"> for client-side rendering
      if (infostring === "mermaid") {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      }

      // 正则匹配 语言:文件名 或 语言 文件名 (例如 js:app.js 或 js app.js)
      const match = infostring?.match(/^([^\s:]+)[:\s](.+)$/);

      let lang = infostring || '';
      let fileName = '';

      if (match) {
        lang = match[1];
        fileName = match[2];
      }

      const header = fileName
        ? `<div class="code-header"><span class="code-filename">${escapeHtml(fileName)}</span></div>`
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
        <pre><code class="language-${escapeHtml(lang)} hljs">${highlighted}</code></pre>
      </div>`;
    }
  }
});

function buildEditUrl(sourcePath) {
  if (!siteConfig.editUrlTemplate) {
    return "";
  }

  return siteConfig.editUrlTemplate
    .replaceAll("{path}", sourcePath)
    .replaceAll("{encodedPath}", sourcePathToEncodedPath(sourcePath));
}

function buildFaviconLink(assetPrefix) {
  if (!siteConfig.faviconPath) {
    return "";
  }

  const href = isAbsoluteOrSpecialUrl(siteConfig.faviconPath) || siteConfig.faviconPath.startsWith("/")
    ? siteConfig.faviconPath
    : `${assetPrefix}${siteConfig.faviconPath}`;

  return `<link
      rel="icon"
      type="image/x-icon"
      href="${escapeHtml(href)}"
    />`;
}

function buildFooterHtml(editUrl) {
  const items = [];

  if (editUrl) {
    items.push(
      `<a
        class="autoInject"
        href="${escapeHtml(editUrl)}"
        target="_blank"
        rel="noreferrer"
        >${escapeHtml(siteConfig.editLinkLabel)}</a
      >`,
    );
  }

  items.push(defaultFooterHtml);

  return `<hr class="autoInject" />
    <footer class="autoInject">
      ${items.join("\n      ")}
    </footer>`;
}

// Derive a plain-text description from rendered HTML for <meta>/Open Graph:
// strip tags and entities, collapse whitespace, cap at ~150 chars.
function extractDescription(html) {
  const text = String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > 150 ? `${text.slice(0, 150).trimEnd()}…` : text;
}

function renderPage(template, title, content, editUrl, pageSegments = [], assetPrefix = '', heading = escapeHtml(title), entryTopLevelSegments = new Set()) {
  const description = extractDescription(content) || siteConfig.siteTitle;
  const canonicalUrl = pageUrlForSegments(siteConfig.siteOrigin, pageSegments);
  const page = template
    .replaceAll("{{html_lang}}", escapeHtml(siteConfig.htmlLang))
    .replaceAll("{{title}}", escapeHtml(title))
    .replaceAll("{{description}}", escapeHtml(description))
    .replaceAll("{{canonical_url}}", escapeHtml(canonicalUrl))
    .replaceAll("{{site_name}}", escapeHtml(siteConfig.siteTitle))
    .replaceAll("{{site_link}}", buildSiteLink())
    .replaceAll("{{heading}}", heading)
    .replaceAll("{{favicon_link}}", buildFaviconLink(assetPrefix))
    .replaceAll("{{content}}", content)
    .replaceAll("{{footer_html}}", buildFooterHtml(editUrl))
    .replaceAll("{{asset_prefix}}", assetPrefix);

  return absolutizeHtmlUrls(page, siteConfig.siteOrigin, pageSegments, entryTopLevelSegments);
}

function buildSiteLink() {
  return `<a href="${escapeHtml(siteConfig.siteOrigin)}">${escapeHtml(siteConfig.siteTitle)}</a>`;
}

function pageUrlForSegments(siteOrigin, segments) {
  const encodedPath = segments.length > 0
    ? `${siteConfig.entryUrlPrefix}/${segments.map(encodeURIComponent).join("/")}/`
    : "";

  return new URL(encodedPath, `${siteOrigin}/`).href;
}

function pageUrlForFragment(siteOrigin, segments, fragment) {
  if (segments.length === 0) {
    return new URL(fragment, `${siteOrigin}/`).href;
  }

  const pageUrl = pageUrlForSegments(siteOrigin, segments);
  return `${pageUrl.replace(/\/$/, "")}${fragment}`;
}

function isAbsoluteOrSpecialUrl(value) {
  return (
    /^[a-z][a-z\d+.-]*:/i.test(value)
    || value.startsWith("//")
  );
}


function parseCategories(markdown) {
  const categories = [];
  const cleanMarkdown = markdown.replace(/^\[\[Category:([^\]]+)\]\]\s*$/gm, (_match, name) => {
    const cat = name.trim();
    // Category names become path segments under out/<prefix>/Category:<name>/;
    // reject separators and traversal so a name can't escape the output dir.
    if (/[\\/]/.test(cat) || cat.includes("..")) {
      throw new Error(`非法分类名称（不能包含 / \\ 或 ..）：${cat}`);
    }
    categories.push(cat);
    return '';
  });
  return { categories, cleanMarkdown };
}

function checkDuplicateHeadings(html, context) {
  const headingIdPattern = /<(h[2-6])\b[^>]*?\bid\s*=\s*"([^"]*)"[^>]*>/gi;
  const ids = new Map();
  let match;

  while ((match = headingIdPattern.exec(html)) !== null) {
    const id = match[2];
    const tag = match[1];
    if (ids.has(id)) {
      const prev = ids.get(id);
      console.warn(
        `WARNING: ${describeContext(context)}: 重复的标题 ID "${id}"（${prev} 和 ${tag}）`,
      );
    } else {
      ids.set(id, tag);
    }
  }
}

function unescapeAttributeUrl(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function shouldUseEntryUrlPath(url, entryTopLevelSegments) {
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const prefixSegments = siteConfig.entryUrlPrefix.split("/");
  const alreadyHasPrefix = prefixSegments.every((segment, index) => pathSegments[index] === segment);

  if (pathSegments.length === 0 || alreadyHasPrefix) {
    return false;
  }

  try {
    return entryTopLevelSegments.has(decodeURIComponent(pathSegments[0]));
  } catch {
    return false;
  }
}

function rewriteEntryUrlPath(url, siteOrigin, entryTopLevelSegments) {
  if (url.origin !== siteOrigin || !shouldUseEntryUrlPath(url, entryTopLevelSegments)) {
    return url.href;
  }

  url.pathname = `/${siteConfig.entryUrlPrefix}${url.pathname}`;
  return url.href;
}

function absolutizeUrl(value, siteOrigin, pageSegments, entryTopLevelSegments = new Set()) {
  const trimmed = String(value).trim();

  if (!trimmed) {
    return value;
  }

  if (trimmed.startsWith("#")) {
    return pageUrlForFragment(siteOrigin, pageSegments, unescapeAttributeUrl(trimmed));
  }

  try {
    const url = isAbsoluteOrSpecialUrl(trimmed)
      ? new URL(unescapeAttributeUrl(trimmed), siteOrigin)
      : new URL(unescapeAttributeUrl(trimmed), pageUrlForSegments(siteOrigin, pageSegments));

    return rewriteEntryUrlPath(url, siteOrigin, entryTopLevelSegments);
  } catch {
    return value;
  }
}

function absolutizeSrcset(value, siteOrigin, pageSegments, entryTopLevelSegments) {
  return String(value)
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();
      const [url, ...descriptors] = trimmed.split(/\s+/);

      if (!url) {
        return candidate;
      }

      return [absolutizeUrl(url, siteOrigin, pageSegments, entryTopLevelSegments), ...descriptors].join(" ");
    })
    .join(", ");
}

function absolutizeCssUrls(html, siteOrigin, pageSegments, entryTopLevelSegments) {
  return html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (_match, quote, url) => {
    const absolute = absolutizeUrl(url, siteOrigin, pageSegments, entryTopLevelSegments);
    return `url(${quote}${absolute}${quote})`;
  });
}

function absolutizeHtmlUrls(html, siteOrigin, pageSegments, entryTopLevelSegments) {
  const withAttributes = html.replace(
    /\b(href|src|poster|action)\s*=\s*(["'])(.*?)\2/gis,
    (_match, attribute, quote, value) => {
      const absolute = escapeHtml(absolutizeUrl(value, siteOrigin, pageSegments, entryTopLevelSegments));
      return `${attribute}=${quote}${absolute}${quote}`;
    },
  );

  const withSrcsets = withAttributes.replace(
    /\bsrcset\s*=\s*(["'])(.*?)\1/gis,
    (_match, quote, value) => {
      const absolute = escapeHtml(absolutizeSrcset(value, siteOrigin, pageSegments, entryTopLevelSegments));
      return `srcset=${quote}${absolute}${quote}`;
    },
  );

  return absolutizeCssUrls(withSrcsets, siteOrigin, pageSegments, entryTopLevelSegments);
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
      const isFolded = await pathExists(path.join(entryDir, "FOLD"));
      const isHidden = await pathExists(path.join(entryDir, "HIDE"));

      if (hasIndex || children.length > 0) {
        result.push({
          segments,
          title: segments.join("/"),
          sourcePath: indexPath,
          hasIndex,
          isFolded,
          isHidden,
          children,
        });
      }
    }
  }

  return result.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}


function relativeEntryHref(_fromSegments, toSegments) {
  if (!toSegments || toSegments.length === 0) return "/";
  const pathSegments = toSegments.map(encodeURIComponent);
  return `/${siteConfig.entryUrlPrefix}/${pathSegments.join("/")}`;
}

function assetPrefixForEntry(entry) {
  return "../".repeat(entry.segments.length + siteConfig.entryUrlPrefix.split("/").length);
}

function assetPrefixForSpecialPage() {
  return '../'.repeat(siteConfig.entryUrlPrefix.split("/").length + 1);
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

// Namespace prefix for category pages (out/<prefix>/Category:<name>/).
const CATEGORY_NS = "Category:";

// Entry segments addressing a category page, e.g. "数据库" → ["Category:数据库"].
function categorySegments(name) {
  return [CATEGORY_NS + name];
}

// One list item, indented to match the surrounding <ul>. `after` is appended
// inside the <li> right after the anchor (a nested child list, a count, …).
function renderLinkItem(href, label, after = "") {
  return `      <li><a href="${href}">${label}</a>${after}</li>`;
}

// Wrap pre-rendered <li> strings in the project's <ul> block layout.
function renderLinkList(items) {
  return `<ul>\n${items.join("\n")}\n    </ul>`;
}

function buildEntryList(entries, currentSegments = [], options = {}) {
  const visibleEntries = entries.filter((entry) => !entry.isHidden);

  if (visibleEntries.length === 0) {
    return "<p>暂无词条。</p>";
  }

  const items = visibleEntries.map((entry) => {
    const href = relativeEntryHref(currentSegments, entry.segments);
    const title = `${escapeHtml(entry.title)}${entry.isFolded ? "…" : ""}`;
    const children = options.includeDescendants && !entry.isFolded && entry.children.length > 0
      ? `\n${buildEntryList(entry.children, currentSegments, options)}`
      : "";

    return renderLinkItem(href, title, children);
  });

  return renderLinkList(items);
}

async function renderHome(entries) {
  const markdown = await readRequiredFile(homePath, "首页内容文件");
  const expandedMarkdown = await expandMarkdownTemplates(markdown,
    makeRenderContext(homePath, "index.md", buildEntryList(entries, [], { includeDescendants: true })));

  const html = marked.parse(expandedMarkdown);
  checkDuplicateHeadings(html, {
    sourcePath: homePath,
    sourceName: "index.md",
  });
  return html;
}

async function renderEntry(entry) {
  const rawMarkdown = entry.hasIndex ? await readRequiredFile(entry.sourcePath, "条目内容文件") : "{{entries}}";
  const { categories, cleanMarkdown } = entry.hasIndex ? parseCategories(rawMarkdown) : { categories: [], cleanMarkdown: rawMarkdown };

  const sourceName = entry.hasIndex
    ? path.relative(rootDir, entry.sourcePath)
    : `entries/${entry.segments.join("/")}/index.md`;
  const expandedMarkdown = await expandMarkdownTemplates(cleanMarkdown,
    makeRenderContext(entry.sourcePath, sourceName, buildEntryList(entry.children, entry.segments)));

  let html = marked.parse(expandedMarkdown);

  if (categories.length > 0) {
    const links = categories.map((cat) => {
      const href = relativeEntryHref(entry.segments, categorySegments(cat));
      return `<a href="${href}">${escapeHtml(cat)}</a>`;
    }).join("，");
    html += `\n<div class="category-links">\n<hr>\n<span>分类：${links}</span>\n</div>`;
  }

  checkDuplicateHeadings(html, { sourcePath: entry.sourcePath, sourceName });
  return { html, categories };
}

// entryIndex maps `segments.join("\0")` → entry, so lookups are O(1) instead
// of a linear scan per key (the listings were previously O(n²) over entries).
function resolveVisibleEntries(keys, entryIndex) {
  return [...keys]
    .map((key) => entryIndex.get(key))
    .filter(Boolean)
    .filter((e) => !isEntryHiddenRecursively(e, entryIndex));
}

function isEntryHiddenRecursively(entry, entryIndex) {
  if (entry.isHidden) return true;
  if (entry.segments.length <= 1) return false;
  const parent = entryIndex.get(entry.segments.slice(0, -1).join("\0"));
  return parent ? isEntryHiddenRecursively(parent, entryIndex) : false;
}

function buildCategoryEntryList(segmentsByCategory, childCategoriesByParent, entryIndex, categoryName) {
  const entrySegments = segmentsByCategory.get(categoryName);
  const children = childCategoriesByParent.get(categoryName);

  if ((!entrySegments || entrySegments.size === 0) && (!children || children.size === 0)) {
    return "<p>暂无词条。</p>";
  }

  const parts = [];

  // Entry listing
  if (entrySegments) {
    const visible = resolveVisibleEntries(entrySegments, entryIndex);

    if (visible.length > 0) {
      const items = visible.map((entry) => {
        const href = relativeEntryHref(categorySegments(categoryName), entry.segments);
        const title = `${escapeHtml(entry.title)}${entry.isFolded ? "…" : ""}`;
        return renderLinkItem(href, title);
      });
      parts.push(renderLinkList(items));
    }
  }

  // Subcategory listing
  if (children && children.size > 0) {
    const childItems = [...children]
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((childName) => {
        const href = relativeEntryHref(categorySegments(categoryName), categorySegments(childName));
        return renderLinkItem(href, escapeHtml(childName));
      });
    parts.push(`<p><strong>子分类</strong></p>\n${renderLinkList(childItems)}`);
  }

  if (parts.length === 0) {
    return "<p>暂无词条。</p>";
  }

  return parts.join("\n");
}

async function copyStaticAssets() {
  const dirents = await fs.readdir(rootDir, { withFileTypes: true });

  await Promise.all(
    dirents
      .filter((dirent) => dirent.isFile() && staticExtensions.has(path.extname(dirent.name).toLowerCase()))
      .map((dirent) => fs.copyFile(path.join(rootDir, dirent.name), path.join(outDir, dirent.name))),
  );

  await copyEntryStaticAssets(entriesDir, path.join(outDir, siteConfig.entryUrlPrefix));
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

async function writeCname() {
  if (!siteConfig.cname) {
    return;
  }

  await fs.writeFile(path.join(outDir, "CNAME"), `${siteConfig.cname}\n`, "utf8");
}

// Render every entry page and, as a side effect, collect the category → entry
// memberships referenced by those entries. Returns segmentsByCategory.
async function renderAllEntries(template, entries, entryTopLevelSegments) {
  const segmentsByCategory = new Map();

  for (const entry of walkEntries(entries)) {
    const { html, categories } = await renderEntry(entry);
    const sourcePath = `entries/${entry.segments.join("/")}/index.md`;
    const page = renderPage(template, entry.title, html, buildEditUrl(sourcePath), entry.segments, assetPrefixForEntry(entry), buildEntryHeading(entry), entryTopLevelSegments);
    const entryOutDir = path.join(outDir, siteConfig.entryUrlPrefix, ...entry.segments);
    await fs.mkdir(entryOutDir, { recursive: true });
    await fs.writeFile(path.join(entryOutDir, "index.html"), page, "utf8");

    for (const cat of categories) {
      if (!segmentsByCategory.has(cat)) {
        segmentsByCategory.set(cat, new Set());
      }
      segmentsByCategory.get(cat).add(entry.segments.join("\0"));
    }
  }

  return segmentsByCategory;
}

async function renderHomePage(template, entries, entryTopLevelSegments) {
  const home = renderPage(template, siteConfig.siteTitle, await renderHome(entries), buildEditUrl("index.md"), [], '', escapeHtml(siteConfig.siteTitle), entryTopLevelSegments);
  await fs.writeFile(path.join(outDir, "index.html"), home, "utf8");
}

// Read category description files to discover parent → child relationships, and
// ensure every referenced parent category has an entry in segmentsByCategory
// (mutated in place) so its page is built even with no direct member entries.
async function collectCategoryRelations(segmentsByCategory, categoriesDir) {
  const childCategoriesByParent = new Map();
  const catMarkdownCache = new Map(); // catIndexPath → { categories, cleanMarkdown }

  for (const [categoryName] of segmentsByCategory) {
    const catIndexPath = path.join(categoriesDir, categoryName, "index.md");
    if (await pathExists(catIndexPath)) {
      const catMarkdown = await fs.readFile(catIndexPath, "utf8");
      const parsed = parseCategories(catMarkdown);
      catMarkdownCache.set(catIndexPath, parsed);
      for (const parentCat of parsed.categories) {
        if (!childCategoriesByParent.has(parentCat)) {
          childCategoriesByParent.set(parentCat, new Set());
        }
        childCategoriesByParent.get(parentCat).add(categoryName);
        if (!segmentsByCategory.has(parentCat)) {
          segmentsByCategory.set(parentCat, new Set());
        }
      }
    }
  }

  return { childCategoriesByParent, catMarkdownCache };
}

async function renderCategoryPages(template, categoryData, entryIndex, categoriesDir, entryTopLevelSegments) {
  const { segmentsByCategory, childCategoriesByParent, catMarkdownCache } = categoryData;

  for (const [categoryName] of segmentsByCategory) {
    const catIndexPath = path.join(categoriesDir, categoryName, "index.md");
    let introHtml = '';
    if (catMarkdownCache.has(catIndexPath)) {
      const { cleanMarkdown } = catMarkdownCache.get(catIndexPath);
      const expanded = await expandMarkdownTemplates(cleanMarkdown,
        makeRenderContext(catIndexPath, `categories/${categoryName}/index.md`));
      introHtml = marked.parse(expanded);
    }

    const listingHtml = buildCategoryEntryList(segmentsByCategory, childCategoriesByParent, entryIndex, categoryName);
    const content = introHtml ? `${introHtml}\n${listingHtml}` : listingHtml;

    const heading = `分类：${escapeHtml(categoryName)}`;
    const catSegments = categorySegments(categoryName);
    const page = renderPage(template, `分类：${categoryName}`, content, '', catSegments, assetPrefixForSpecialPage(), heading, entryTopLevelSegments);

    const catOutDir = path.join(outDir, siteConfig.entryUrlPrefix, CATEGORY_NS + categoryName);
    await fs.mkdir(catOutDir, { recursive: true });
    await fs.writeFile(path.join(catOutDir, "index.html"), page, "utf8");
  }
}

async function renderSpecialCategoriesPage(template, segmentsByCategory, entryIndex, entryTopLevelSegments) {
  const allCategoryNames = [...segmentsByCategory.keys()].sort((a, b) => a.localeCompare(b, "zh-CN"));
  if (allCategoryNames.length === 0) return;

  const catItems = allCategoryNames.map((name) => {
    const count = resolveVisibleEntries(segmentsByCategory.get(name), entryIndex).length;
    const href = relativeEntryHref(["Special:Categories"], categorySegments(name));
    return renderLinkItem(href, escapeHtml(name), `（${count}）`);
  });
  const specialContent = `<p>本维基中共有 ${allCategoryNames.length} 个分类。</p>\n${renderLinkList(catItems)}`;
  const specialSegments = ["Special:Categories"];
  const specialPage = renderPage(template, '所有分类', specialContent, '', specialSegments, assetPrefixForSpecialPage(), '所有分类', entryTopLevelSegments);
  const specialOutDir = path.join(outDir, siteConfig.entryUrlPrefix, "Special:Categories");
  await fs.mkdir(specialOutDir, { recursive: true });
  await fs.writeFile(path.join(specialOutDir, "index.html"), specialPage, "utf8");
}

async function build() {
  const template = await readRequiredFile(templatePath, "页面模板");
  const entries = await listEntries();
  const entryTopLevelSegments = new Set(entries.map((entry) => entry.segments[0]));
  const categoriesDir = path.join(rootDir, "categories");

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const segmentsByCategory = await renderAllEntries(template, entries, entryTopLevelSegments);
  await renderHomePage(template, entries, entryTopLevelSegments);

  const { childCategoriesByParent, catMarkdownCache } = await collectCategoryRelations(segmentsByCategory, categoriesDir);

  const entryIndex = new Map();
  for (const entry of walkEntries(entries)) {
    entryIndex.set(entry.segments.join("\0"), entry);
  }
  await renderCategoryPages(template, { segmentsByCategory, childCategoriesByParent, catMarkdownCache }, entryIndex, categoriesDir, entryTopLevelSegments);
  await renderSpecialCategoriesPage(template, segmentsByCategory, entryIndex, entryTopLevelSegments);

  await copyStaticAssets();
  await writeCname();
}

build().catch((err) => {
  console.error(`构建失败：${err?.message ?? err}`);
  process.exitCode = 1;
});
