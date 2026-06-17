// Markdown template engine: expands {{TemplateName|param}} calls and
// {{{param|default}}} parameter references, while leaving fenced code blocks,
// inline code spans, and raw HTML blocks untouched. Self-contained — depends
// only on filesystem paths from config, never on marked or the page renderer.

import { promises as fs } from "node:fs";
import path from "node:path";
import { markdownTemplateDir, maxMarkdownTemplateDepth, rootDir } from "./config.mjs";

export function describeContext(context) {
  return context.sourceName || path.relative(rootDir, context.sourcePath);
}

function templateError(context, message) {
  throw new Error(`${describeContext(context)}: ${message}`);
}

// Read a build-critical file, turning a missing file into a readable error
// instead of a bare ENOENT stack trace.
export async function readRequiredFile(filePath, label) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      throw new Error(`找不到${label}：${path.relative(rootDir, filePath)}`);
    }
    throw err;
  }
}

// A {{ }} / {{{ }}} brace token at `index`, encoded as a signed length:
//   +3 / +2  → an opening {{{ or {{
//   -3 / -2  → a closing }}} or }} that matches the current open (`stackTop`)
//    0       → no brace token here
// Check order matches the longer delimiter first ({{{ before {{, }}} before }}).
export function braceTokenAt(value, index, stackTop) {
  if (value.startsWith("{{{", index)) return 3;
  if (value.startsWith("{{", index)) return 2;
  if (value.startsWith("}}}", index) && stackTop === 3) return -3;
  if (value.startsWith("}}", index) && stackTop === 2) return -2;
  return 0;
}

export function findMatchingBraces(markdown, start, openLength, context) {
  const stack = [openLength];
  let index = start + openLength;

  while (index < markdown.length) {
    const token = braceTokenAt(markdown, index, stack.at(-1));
    if (token > 0) {
      stack.push(token);
      index += token;
    } else if (token < 0) {
      stack.pop();
      const closeLength = -token;
      if (stack.length === 0) {
        return { index, closeLength };
      }
      index += closeLength;
    } else {
      index += 1;
    }
  }

  templateError(context, `未闭合的模板语法：${markdown.slice(start, start + 40)}`);
}

export function findTopLevelDelimiter(value, delimiter, context) {
  const stack = [];
  let index = 0;

  while (index < value.length) {
    const token = braceTokenAt(value, index, stack.at(-1));
    if (token > 0) {
      stack.push(token);
      index += token;
    } else if (token < 0) {
      stack.pop();
      index += -token;
    } else if (value[index] === delimiter && stack.length === 0) {
      return index;
    } else {
      index += 1;
    }
  }

  if (stack.length > 0) {
    templateError(context, `参数语法无法解析：${value}`);
  }

  return -1;
}

export function splitTopLevel(value, delimiter, context) {
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

export function parseTemplateCall(inner, context) {
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

export function parseTemplateParameter(inner, context) {
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

const htmlBlockTags = new Set(
  "address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul".split(" ")
);

function isIndentedCodeLine(line) {
  return /^(?: {4}|\t)/.test(line);
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

export async function expandMarkdownTemplates(markdown, context) {
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

    if (singleExpansion) break;
  }

  return singleExpansion ? { value: result, length: cursor } : result;
}

async function expandTemplateParameter(inner, context) {
  const parameter = parseTemplateParameter(inner, context);

  if (context.params.has(parameter.name)) {
    return await expandMarkdownTemplates(context.params.get(parameter.name), context);
  }

  if (parameter.defaultValue !== null) {
    return await expandMarkdownTemplates(parameter.defaultValue, context);
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

export function makeRenderContext(sourcePath, sourceName, entriesHtml = '') {
  return { sourcePath, sourceName, entriesHtml, depth: 0, callStack: [] };
}
