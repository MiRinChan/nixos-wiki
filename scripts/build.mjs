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
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import footnote from "marked-footnote";
import alert from "marked-alert";
import hljs from "highlight.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const entriesDir = path.join(rootDir, "entries");
const outDir = path.join(rootDir, "out");
const markdownTemplateDir = path.join(rootDir, "template");
const templatePath = path.join(rootDir, "template.html");
const homePath = path.join(rootDir, "index.md");
const maxMarkdownTemplateDepth = 32;

function readEnv(name, fallback = "") {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return value.trim();
}

function readUrlEnv(name, fallback) {
  const value = readEnv(name, fallback);

  try {
    return new URL(value).origin;
  } catch (error) {
    throw new Error(`${name} must be an absolute URL: ${value}`);
  }
}

function readPathPrefixEnv(name, fallback) {
  const value = readEnv(name, fallback).replace(/^\/+|\/+$/g, "");

  if (!value || value.includes("?") || value.includes("#")) {
    throw new Error(`${name} must be a non-empty URL path prefix without query or fragment`);
  }

  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${name} contains an invalid path segment: ${value}`);
  }

  return value;
}

function readOptionalPathEnv(name) {
  const value = readEnv(name);

  if (!value) {
    return "";
  }

  if (/[\r\n]/.test(value)) {
    throw new Error(`${name} must be a single path or URL`);
  }

  return value;
}

const siteConfig = {
  siteTitle: readEnv("WIKI_SITE_TITLE", "NixOS Wiki zh-CN"),
  siteOrigin: readUrlEnv("WIKI_SITE_ORIGIN", "https://nixoscn.org"),
  htmlLang: readEnv("WIKI_HTML_LANG", "zh-CN"),
  entryUrlPrefix: readPathPrefixEnv("WIKI_ENTRY_URL_PREFIX", "wiki"),
  editUrlTemplate: readOptionalPathEnv("WIKI_EDIT_URL_TEMPLATE") || "https://github.com/MiRinChan/nixos-wiki/edit/main/{encodedPath}",
  editLinkLabel: readEnv("WIKI_EDIT_LINK_LABEL", "前往 GitHub 编辑此页"),
  faviconPath: readOptionalPathEnv("WIKI_FAVICON_PATH") || "photo_2026-05-14_19-41-31.jpg",
  cname: readOptionalPathEnv("WIKI_CNAME") || "nixoscn.org",
};
const defaultFooterHtml = "CC-BY-SA 4.0许可证授权，但禁止在所有 MediaWiki 程序中复制和分发。";

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
  ".webm",
  ".mp4",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourcePathToEncodedPath(sourcePath) {
  return sourcePath.split("/").map(encodeURIComponent).join("/");
}

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
      href="${escapeAttribute(href)}"
    />`;
}

function buildFooterHtml(editUrl) {
  const items = [];

  if (editUrl) {
    items.push(
      `<a
        class="autoInject"
        href="${escapeAttribute(editUrl)}"
        target="_blank"
        rel="noreferrer"
        >${escapeHtml(siteConfig.editLinkLabel)}</a
      >`,
    );
  }

  items.push(defaultFooterHtml);

  if (items.length === 0) {
    return "";
  }

  return `<hr class="autoInject" />
    <footer class="autoInject">
      ${items.join("\n      ")}
    </footer>`;
}

function renderPage(template, title, content, editUrl, pageSegments = [], assetPrefix = '', heading = escapeHtml(title), entryTopLevelSegments = new Set()) {
  const page = template
    .replaceAll("{{html_lang}}", escapeAttribute(siteConfig.htmlLang))
    .replaceAll("{{title}}", escapeHtml(title))
    .replaceAll("{{site_link}}", buildSiteLink())
    .replaceAll("{{heading}}", heading)
    .replaceAll("{{favicon_link}}", buildFaviconLink(assetPrefix))
    .replaceAll("{{content}}", content)
    .replaceAll("{{footer_html}}", buildFooterHtml(editUrl))
    .replaceAll("{{asset_prefix}}", assetPrefix);

  return absolutizeHtmlUrls(page, siteConfig.siteOrigin, pageSegments, entryTopLevelSegments);
}

function buildSiteLink() {
  return `<a href="${escapeAttribute(siteConfig.siteOrigin)}">${escapeHtml(siteConfig.siteTitle)}</a>`;
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

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseCategories(markdown) {
  const categories = [];
  const cleanMarkdown = markdown.replace(/^\[\[Category:([^\]]+)\]\]\s*$/gm, (match, name) => {
    categories.push(name.trim());
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
  return html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    const absolute = absolutizeUrl(url, siteOrigin, pageSegments, entryTopLevelSegments);
    return `url(${quote}${absolute}${quote})`;
  });
}

function absolutizeHtmlUrls(html, siteOrigin, pageSegments, entryTopLevelSegments) {
  const withAttributes = html.replace(
    /\b(href|src|poster|action)\s*=\s*(["'])(.*?)\2/gis,
    (_match, attribute, quote, value) => {
      const absolute = escapeAttribute(absolutizeUrl(value, siteOrigin, pageSegments, entryTopLevelSegments));
      return `${attribute}=${quote}${absolute}${quote}`;
    },
  );

  const withSrcsets = withAttributes.replace(
    /\bsrcset\s*=\s*(["'])(.*?)\1/gis,
    (_match, quote, value) => {
      const absolute = escapeAttribute(absolutizeSrcset(value, siteOrigin, pageSegments, entryTopLevelSegments));
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

function encodeUrlSegments(segments) {
  return segments.map((segment) => encodeURIComponent(segment));
}

function relativeEntryHref(fromSegments, toSegments) {
  if (!toSegments || toSegments.length === 0) return "/";
  const pathSegments = toSegments.map(encodeURIComponent);
  return `/${siteConfig.entryUrlPrefix}/${pathSegments.join("/")}`;
}

function assetPrefixForEntry(entry) {
  return "../".repeat(entry.segments.length + siteConfig.entryUrlPrefix.split("/").length);
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
  const visibleEntries = entries.filter((entry) => !entry.isHidden);

  if (visibleEntries.length === 0) {
    return "<p>暂无词条。</p>";
  }

  const links = visibleEntries
    .map((entry) => {
      const href = relativeEntryHref(currentSegments, entry.segments);
      const title = `${escapeHtml(entry.title)}${entry.isFolded ? "…" : ""}`;
      const children = options.includeDescendants && !entry.isFolded && entry.children.length > 0
        ? `\n${buildEntryList(entry.children, currentSegments, options)}`
        : "";

      return `      <li><a href="${href}">${title}</a>${children}</li>`;
    })
    .join("\n");

  return `<ul>\n${links}\n    </ul>`;
}

function describeContext(context) {
  return context.sourceName || path.relative(rootDir, context.sourcePath);
}

function templateError(context, message) {
  throw new Error(`${describeContext(context)}: ${message}`);
}

function findMatchingBraces(markdown, start, openLength, context) {
  const stack = [openLength];
  let index = start + openLength;

  while (index < markdown.length) {
    if (markdown.startsWith("{{{", index)) {
      stack.push(3);
      index += 3;
      continue;
    }

    if (markdown.startsWith("{{", index)) {
      stack.push(2);
      index += 2;
      continue;
    }

    if (markdown.startsWith("}}}", index) && stack.at(-1) === 3) {
      stack.pop();
      if (stack.length === 0) {
        return { index, closeLength: 3 };
      }
      index += 3;
      continue;
    }

    if (markdown.startsWith("}}", index) && stack.at(-1) === 2) {
      stack.pop();
      if (stack.length === 0) {
        return { index, closeLength: 2 };
      }
      index += 2;
      continue;
    }

    index += 1;
  }

  templateError(context, `未闭合的模板语法：${markdown.slice(start, start + 40)}`);
}

function findTopLevelDelimiter(value, delimiter, context) {
  const stack = [];
  let index = 0;

  while (index < value.length) {
    if (value.startsWith("{{{", index)) {
      stack.push(3);
      index += 3;
      continue;
    }

    if (value.startsWith("{{", index)) {
      stack.push(2);
      index += 2;
      continue;
    }

    if (value.startsWith("}}}", index) && stack.at(-1) === 3) {
      stack.pop();
      index += 3;
      continue;
    }

    if (value.startsWith("}}", index) && stack.at(-1) === 2) {
      stack.pop();
      index += 2;
      continue;
    }

    if (value[index] === delimiter && stack.length === 0) {
      return index;
    }

    index += 1;
  }

  if (stack.length > 0) {
    templateError(context, `参数语法无法解析：${value}`);
  }

  return -1;
}

function splitTopLevel(value, delimiter, context) {
  const parts = [];
  let rest = value;
  let offset = 0;

  while (true) {
    const index = findTopLevelDelimiter(rest, delimiter, context);

    if (index === -1) {
      parts.push(rest);
      return parts;
    }

    parts.push(rest.slice(0, index));
    offset += index + 1;
    rest = value.slice(offset);
  }
}

function validateMarkdownTemplateName(rawName, context) {
  const name = rawName.trim();

  if (!name) {
    templateError(context, "模板名称不能为空");
  }

  if (name.includes("\\") || path.isAbsolute(name)) {
    templateError(context, `非法模板路径：${name}`);
  }

  const segments = name.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    templateError(context, `非法模板路径：${name}`);
  }

  return { name, segments };
}

function parseTemplateCall(inner, context) {
  const parts = splitTopLevel(inner, "|", context);
  const { name, segments } = validateMarkdownTemplateName(parts[0], context);
  const params = new Map();
  let anonymousIndex = 0;

  for (const rawPart of parts.slice(1)) {
    const equalsIndex = findTopLevelDelimiter(rawPart, "=", context);

    if (equalsIndex === -1) {
      anonymousIndex += 1;
      params.set(String(anonymousIndex), rawPart);
      continue;
    }

    const paramName = rawPart.slice(0, equalsIndex).trim();
    if (!paramName) {
      templateError(context, `参数名称不能为空：${rawPart}`);
    }

    params.set(paramName, rawPart.slice(equalsIndex + 1).trim());
  }

  return { name, segments, params, rawPartCount: parts.length };
}

function parseTemplateParameter(inner, context) {
  const parts = splitTopLevel(inner, "|", context);

  if (parts.length > 2) {
    templateError(context, `参数默认值语法无法解析：${inner}`);
  }

  const name = parts[0].trim();
  if (!name) {
    templateError(context, `参数名称不能为空：${inner}`);
  }

  return {
    name,
    defaultValue: parts.length === 2 ? parts[1] : null,
  };
}

const htmlBlockTags = new Set([
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
]);

function isIndentedCodeLine(line) {
  return /^(?:    |\t)/.test(line);
}

function startsHtmlBlock(line) {
  const match = line.match(/^ {0,3}<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/);
  return Boolean(match && htmlBlockTags.has(match[1].toLowerCase()));
}

function updateHtmlBlockDepth(line, currentDepth) {
  const tagPattern = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/g;
  let depth = currentDepth;
  let match;

  while ((match = tagPattern.exec(line)) !== null) {
    const tag = match[2].toLowerCase();

    if (!htmlBlockTags.has(tag)) {
      continue;
    }

    if (match[1]) {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (!/\/\s*>$/.test(match[0])) {
      depth += 1;
    }
  }

  return depth;
}

async function expandMarkdownTemplates(markdown, context) {
  let result = "";
  let chunk = "";
  let inFence = false;
  let fenceMarker = "";
  let fenceSize = 0;
  let htmlBlockDepth = 0;
  const lines = markdown.match(/[^\n]*\n|[^\n]+/g) || [""];

  async function flushChunk() {
    if (!chunk) {
      return;
    }

    result += await expandInlineMarkdownTemplates(chunk, context);
    chunk = "";
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);

    if (!inFence && fenceMatch) {
      await flushChunk();
      inFence = true;
      fenceMarker = fenceMatch[1][0];
      fenceSize = fenceMatch[1].length;
      result += line;
      continue;
    }

    if (inFence) {
      const closingMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(\r?\n?)$/);
      if (closingMatch && closingMatch[1][0] === fenceMarker && closingMatch[1].length >= fenceSize) {
        result += line;
        inFence = false;
        fenceMarker = "";
        fenceSize = 0;
      } else {
        result += line;
      }
      continue;
    }

    const isHtmlBlockLine = htmlBlockDepth > 0 || startsHtmlBlock(line);

    if (isIndentedCodeLine(line) && !isHtmlBlockLine) {
      await flushChunk();
      result += line;
      continue;
    }

    chunk += line;
    if (isHtmlBlockLine) {
      htmlBlockDepth = updateHtmlBlockDepth(line, htmlBlockDepth);
    }
  }

  await flushChunk();
  return result;
}

async function expandInlineMarkdownTemplates(markdown, context) {
  let result = "";
  let cursor = 0;

  while (cursor < markdown.length) {
    const codeStart = markdown.indexOf("`", cursor);
    const templateStart = markdown.indexOf("{{", cursor);
    const nextSpecial = [codeStart, templateStart]
      .filter((index) => index !== -1)
      .sort((left, right) => left - right)[0];

    if (nextSpecial === undefined) {
      result += markdown.slice(cursor);
      break;
    }

    if (nextSpecial === codeStart) {
      result += await expandBraceMarkdownTemplates(markdown.slice(cursor, codeStart), context);
      const tickMatch = markdown.slice(codeStart).match(/^`+/);
      const ticks = tickMatch[0];
      const codeEnd = markdown.indexOf(ticks, codeStart + ticks.length);

      if (codeEnd === -1) {
        result += markdown.slice(codeStart);
        break;
      }

      result += markdown.slice(codeStart, codeEnd + ticks.length);
      cursor = codeEnd + ticks.length;
      continue;
    }

    result += await expandBraceMarkdownTemplates(markdown.slice(cursor, templateStart), context);
    cursor = templateStart;
    const expanded = await expandBraceMarkdownTemplates(markdown.slice(cursor), context, true);
    result += expanded.value;
    cursor += expanded.length;
  }

  return result;
}

async function expandBraceMarkdownTemplates(markdown, context, singleExpansion = false) {
  let result = "";
  let cursor = 0;

  while (cursor < markdown.length) {
    const start = markdown.indexOf("{{", cursor);

    if (start === -1) {
      result += markdown.slice(cursor);
      break;
    }

    result += markdown.slice(cursor, start);
    const openLength = markdown.startsWith("{{{", start) ? 3 : 2;
    const close = findMatchingBraces(markdown, start, openLength, context);
    const inner = markdown.slice(start + openLength, close.index);

    if (openLength === 3) {
      if (!context.params) {
        templateError(context, `参数引用只能在 template/*.md 内使用：{{{${inner}}}}`);
      }

      result += await expandTemplateParameter(inner, context);
    } else {
      result += await expandTemplateCall(inner, context);
    }

    cursor = close.index + close.closeLength;

    if (singleExpansion) {
      return {
        value: result,
        length: cursor,
      };
    }
  }

  if (singleExpansion) {
    return {
      value: result,
      length: cursor,
    };
  }

  return result;
}

async function expandTemplateParameter(inner, context) {
  const parameter = parseTemplateParameter(inner, context);

  if (context.params.has(parameter.name)) {
    return expandMarkdownTemplates(context.params.get(parameter.name), context);
  }

  if (parameter.defaultValue !== null) {
    return expandMarkdownTemplates(parameter.defaultValue, context);
  }

  templateError(context, `缺少模板参数：${parameter.name}`);
}

async function expandTemplateCall(inner, context) {
  const call = parseTemplateCall(inner, context);

  if (call.name === "entries") {
    if (call.rawPartCount !== 1) {
      templateError(context, "{{entries}} 不接受参数");
    }

    return context.entriesHtml;
  }

  if (context.depth >= maxMarkdownTemplateDepth) {
    templateError(context, `模板递归超过 ${maxMarkdownTemplateDepth} 层：${call.name}`);
  }

  if (context.callStack.includes(call.name)) {
    templateError(context, `检测到模板循环：${[...context.callStack, call.name].join(" -> ")}`);
  }

  const sourcePath = path.join(markdownTemplateDir, ...call.segments) + ".md";
  let source;

  try {
    source = await fs.readFile(sourcePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      templateError(context, `缺少模板：template/${call.name}.md`);
    }
    throw error;
  }

  const params = new Map();
  for (const [name, value] of call.params) {
    params.set(name, await expandMarkdownTemplates(value, context));
  }

  return expandMarkdownTemplates(source, {
    ...context,
    sourcePath,
    sourceName: `template/${call.name}.md`,
    params,
    depth: context.depth + 1,
    callStack: [...context.callStack, call.name],
  });
}

async function renderHome(entries) {
  const markdown = await fs.readFile(homePath, "utf8");
  const expandedMarkdown = await expandMarkdownTemplates(markdown, {
    sourcePath: homePath,
    sourceName: "index.md",
    entriesHtml: buildEntryList(entries, [], { includeDescendants: true }),
    depth: 0,
    callStack: [],
  });

  const html = marked.parse(expandedMarkdown);
  checkDuplicateHeadings(html, {
    sourcePath: homePath,
    sourceName: "index.md",
  });
  return html;
}

async function renderEntry(entry) {
  const rawMarkdown = entry.hasIndex ? await fs.readFile(entry.sourcePath, "utf8") : "{{entries}}";
  const { categories, cleanMarkdown } = entry.hasIndex ? parseCategories(rawMarkdown) : { categories: [], cleanMarkdown: rawMarkdown };
  entry._categories = categories;

  const expandedMarkdown = await expandMarkdownTemplates(cleanMarkdown, {
    sourcePath: entry.sourcePath,
    sourceName: entry.hasIndex ? path.relative(rootDir, entry.sourcePath) : `entries/${entry.segments.join("/")}/index.md`,
    entriesHtml: buildEntryList(entry.children, entry.segments),
    depth: 0,
    callStack: [],
  });

  let html = marked.parse(expandedMarkdown);

  if (categories.length > 0) {
    const links = categories.map((cat) => {
      const href = relativeEntryHref(entry.segments, ["Category:" + cat]);
      return `<a href="${href}">${escapeHtml(cat)}</a>`;
    }).join("，");
    html += `\n<div class="category-links">\n<hr>\n<span>分类：${links}</span>\n</div>`;
  }

  checkDuplicateHeadings(html, {
    sourcePath: entry.sourcePath,
    sourceName: entry.hasIndex ? path.relative(rootDir, entry.sourcePath) : `entries/${entry.segments.join("/")}/index.md`,
  });
  return html;
}

function isEntryHiddenRecursively(entry, allEntries) {
  if (entry.isHidden) return true;
  if (entry.segments.length <= 1) return false;
  const parentSegments = entry.segments.slice(0, -1);
  const parent = allEntries.find(
    (e) => e.segments.length === parentSegments.length && parentSegments.every((s, i) => s === e.segments[i]),
  );
  return parent ? isEntryHiddenRecursively(parent, allEntries) : false;
}

function buildCategoryEntryList(segmentsByCategory, childCategoriesByParent, allEntries, categoryName) {
  const entrySegments = segmentsByCategory.get(categoryName);
  const children = childCategoriesByParent.get(categoryName);

  if ((!entrySegments || entrySegments.size === 0) && (!children || children.size === 0)) {
    return "<p>暂无词条。</p>";
  }

  const flatEntries = [...allEntries];
  let parts = [];

  // Entry listing
  if (entrySegments) {
    const visible = [...entrySegments]
      .map((key) => flatEntries.find((e) => e.segments.join("\0") === key))
      .filter(Boolean)
      .filter((entry) => !isEntryHiddenRecursively(entry, flatEntries));

    if (visible.length > 0) {
      const links = visible
        .map((entry) => {
          const href = relativeEntryHref(["Category:" + categoryName], entry.segments);
          const title = `${escapeHtml(entry.title)}${entry.isFolded ? "…" : ""}`;
          return `      <li><a href="${href}">${title}</a></li>`;
        })
        .join("\n");
      parts.push(`<ul>\n${links}\n    </ul>`);
    }
  }

  // Subcategory listing
  if (children && children.size > 0) {
    const childLinks = [...children]
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((childName) => {
        const href = relativeEntryHref(["Category:" + categoryName], ["Category:" + childName]);
        return `      <li><a href="${href}">${escapeHtml(childName)}</a></li>`;
      })
      .join("\n");
    parts.push(`<p><strong>子分类</strong></p>\n<ul>\n${childLinks}\n    </ul>`);
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

async function build() {
  const template = await fs.readFile(templatePath, "utf8");
  const entries = await listEntries();
  const entryTopLevelSegments = new Set(entries.map((entry) => entry.segments[0]));
  const categoriesDir = path.join(rootDir, "categories");

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (const entry of walkEntries(entries)) {
    const html = await renderEntry(entry);
    const sourcePath = `entries/${entry.segments.join("/")}/index.md`;
    const page = renderPage(template, entry.title, html, buildEditUrl(sourcePath), entry.segments, assetPrefixForEntry(entry), buildEntryHeading(entry), entryTopLevelSegments);
    const entryOutDir = path.join(outDir, siteConfig.entryUrlPrefix, ...entry.segments);
    await fs.mkdir(entryOutDir, { recursive: true });
    await fs.writeFile(path.join(entryOutDir, "index.html"), page, "utf8");
  }

  const home = renderPage(template, siteConfig.siteTitle, await renderHome(entries), buildEditUrl("index.md"), [], '', escapeHtml(siteConfig.siteTitle), entryTopLevelSegments);
  await fs.writeFile(path.join(outDir, "index.html"), home, "utf8");

  // Collect categories from all entries
  const segmentsByCategory = new Map();
  for (const entry of walkEntries(entries)) {
    const cats = entry._categories || [];
    for (const cat of cats) {
      if (!segmentsByCategory.has(cat)) {
        segmentsByCategory.set(cat, new Set());
      }
      segmentsByCategory.get(cat).add(entry.segments.join("\0"));
    }
  }

  // Collect parent-child relationships from category description files
  // Also ensure parent categories (which may have no direct entries) get entries
  const childCategoriesByParent = new Map();
  for (const [categoryName] of segmentsByCategory) {
    const catIndexPath = path.join(categoriesDir, categoryName, "index.md");
    if (await pathExists(catIndexPath)) {
      const catMarkdown = await fs.readFile(catIndexPath, "utf8");
      const { categories: parentCats } = parseCategories(catMarkdown);
      for (const parentCat of parentCats) {
        if (!childCategoriesByParent.has(parentCat)) {
          childCategoriesByParent.set(parentCat, new Set());
        }
        childCategoriesByParent.get(parentCat).add(categoryName);
        // Ensure parent category also gets an entry in segmentsByCategory (empty set = no entries, but page is built)
        if (!segmentsByCategory.has(parentCat)) {
          segmentsByCategory.set(parentCat, new Set());
        }
      }
    }
  }

  // Build category listing pages
  const allEntries = [...walkEntries(entries)];
  for (const [categoryName] of segmentsByCategory) {
    // Check for optional category description markdown
    const catIndexPath = path.join(categoriesDir, categoryName, "index.md");
    let introHtml = '';
    if (await pathExists(catIndexPath)) {
      const catMarkdown = await fs.readFile(catIndexPath, "utf8");
      const { cleanMarkdown } = parseCategories(catMarkdown);
      const expanded = await expandMarkdownTemplates(cleanMarkdown, {
        sourcePath: catIndexPath,
        sourceName: `categories/${categoryName}/index.md`,
        entriesHtml: '',
        depth: 0,
        callStack: [],
      });
      introHtml = marked.parse(expanded);
    }

    const listingHtml = buildCategoryEntryList(segmentsByCategory, childCategoriesByParent, allEntries, categoryName);
    const content = introHtml ? `${introHtml}\n${listingHtml}` : listingHtml;

    const heading = `分类：${escapeHtml(categoryName)}`;
    const catSegments = ["Category:" + categoryName];
    const assetPrefix = '../'.repeat(siteConfig.entryUrlPrefix.split("/").length + 1);
    const page = renderPage(template, `分类：${categoryName}`, content, '', catSegments, assetPrefix, heading, entryTopLevelSegments);

    const catOutDir = path.join(outDir, siteConfig.entryUrlPrefix, "Category:" + categoryName);
    await fs.mkdir(catOutDir, { recursive: true });
    await fs.writeFile(path.join(catOutDir, "index.html"), page, "utf8");
  }

  // Build Special:Categories page (all categories listing)
  const allCategoryNames = [...segmentsByCategory.keys()].sort((a, b) => a.localeCompare(b, "zh-CN"));
  if (allCategoryNames.length > 0) {
    const catLinks = allCategoryNames
      .map((name) => {
        const count = [...segmentsByCategory.get(name)]
          .map((key) => allEntries.find((e) => e.segments.join("\0") === key))
          .filter(Boolean)
          .filter((e) => !isEntryHiddenRecursively(e, allEntries))
          .length;
        const href = relativeEntryHref(["Special:Categories"], ["Category:" + name]);
        return `      <li><a href="${href}">${escapeHtml(name)}</a>（${count}）</li>`;
      })
      .join("\n");
    const specialContent = `<p>本维基中共有 ${allCategoryNames.length} 个分类。</p>\n<ul>\n${catLinks}\n    </ul>`;
    const specialSegments = ["Special:Categories"];
    const specialPrefix = '../'.repeat(siteConfig.entryUrlPrefix.split("/").length + 1);
    const specialPage = renderPage(template, '所有分类', specialContent, '', specialSegments, specialPrefix, '所有分类', entryTopLevelSegments);
    const specialOutDir = path.join(outDir, siteConfig.entryUrlPrefix, "Special:Categories");
    await fs.mkdir(specialOutDir, { recursive: true });
    await fs.writeFile(path.join(specialOutDir, "index.html"), specialPage, "utf8");
  }

  await copyStaticAssets();
  await writeCname();
}

await build();
