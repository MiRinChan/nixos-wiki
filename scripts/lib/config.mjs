// Build configuration and shared primitives: filesystem paths, environment-
// driven site config, and small pure helpers used across the build modules.

import path from "node:path";
import { fileURLToPath } from "node:url";

// This module lives at scripts/lib/, so the repo root is three levels up.
export const rootDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
export const entriesDir = path.join(rootDir, "entries");
export const outDir = path.join(rootDir, "out");
export const markdownTemplateDir = path.join(rootDir, "template");
export const templatePath = path.join(rootDir, "template.html");
export const homePath = path.join(rootDir, "index.md");
export const maxMarkdownTemplateDepth = 32;

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
  } catch {
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

export const siteConfig = {
  siteTitle: readEnv("WIKI_SITE_TITLE", "NixOS Wiki zh-CN"),
  siteOrigin: readUrlEnv("WIKI_SITE_ORIGIN", "https://nixoscn.org"),
  htmlLang: readEnv("WIKI_HTML_LANG", "zh-CN"),
  entryUrlPrefix: readPathPrefixEnv("WIKI_ENTRY_URL_PREFIX", "wiki"),
  editUrlTemplate: readOptionalPathEnv("WIKI_EDIT_URL_TEMPLATE") || "https://github.com/MiRinChan/nixos-wiki/edit/main/{encodedPath}",
  editLinkLabel: readEnv("WIKI_EDIT_LINK_LABEL", "前往 GitHub 编辑此页"),
  faviconPath: readOptionalPathEnv("WIKI_FAVICON_PATH") || "photo_2026-05-14_19-41-31.jpg",
  cname: readOptionalPathEnv("WIKI_CNAME") || "nixoscn.org",
};
export const defaultFooterHtml = "CC-BY-SA 4.0许可证授权，但禁止在所有 MediaWiki 程序中复制和分发。";

export const staticExtensions = new Set([
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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function sourcePathToEncodedPath(sourcePath) {
  return sourcePath.split("/").map(encodeURIComponent).join("/");
}
