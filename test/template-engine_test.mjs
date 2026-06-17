// Unit tests for the template engine's pure parsing core. These exercise the
// brace/parameter logic directly (independent of the golden build), covering
// nesting cases the sample content may not reach.

import assert from "node:assert/strict";
import {
  braceTokenAt,
  expandMarkdownTemplates,
  findMatchingBraces,
  findTopLevelDelimiter,
  parseTemplateCall,
  parseTemplateParameter,
  splitTopLevel,
} from "../scripts/lib/template-engine.mjs";

const ctx = { sourceName: "test.md", sourcePath: "test.md" };

Deno.test("braceTokenAt classifies brace tokens by length and stack", () => {
  assert.equal(braceTokenAt("{{{x", 0, undefined), 3);
  assert.equal(braceTokenAt("{{x", 0, undefined), 2);
  assert.equal(braceTokenAt("}}}", 0, 3), -3);
  assert.equal(braceTokenAt("}}", 0, 2), -2);
  assert.equal(braceTokenAt("}}", 0, 3), 0, "}} doesn't close a {{{");
  assert.equal(braceTokenAt("ab", 0, undefined), 0);
});

Deno.test("findMatchingBraces handles flat and nested calls", () => {
  assert.deepEqual(findMatchingBraces("{{a}}", 0, 2, ctx), { index: 3, closeLength: 2 });
  // Nested call: the inner {{b}} must not terminate the outer.
  const s = "{{a{{b}}c}}";
  const close = findMatchingBraces(s, 0, 2, ctx);
  assert.equal(s.slice(2, close.index), "a{{b}}c");
  // Triple braces (parameter ref).
  assert.deepEqual(findMatchingBraces("{{{p}}}", 0, 3, ctx), { index: 4, closeLength: 3 });
});

Deno.test("findMatchingBraces throws on an unclosed template", () => {
  assert.throws(() => findMatchingBraces("{{a", 0, 2, ctx), /未闭合/);
});

Deno.test("splitTopLevel respects brace nesting", () => {
  assert.deepEqual(splitTopLevel("a|b|c", "|", ctx), ["a", "b", "c"]);
  // A pipe inside a nested call is protected.
  assert.deepEqual(splitTopLevel("{{x|y}}|z", "|", ctx), ["{{x|y}}", "z"]);
  assert.deepEqual(splitTopLevel("solo", "|", ctx), ["solo"]);
});

Deno.test("findTopLevelDelimiter ignores delimiters inside braces", () => {
  assert.equal(findTopLevelDelimiter("{{a=b}}=c", "=", ctx), 7);
  assert.equal(findTopLevelDelimiter("no-delim", "=", ctx), -1);
});

Deno.test("parseTemplateCall parses positional, numbered and named params", () => {
  const positional = parseTemplateCall("Thankyou|你的努力|张三", ctx);
  assert.equal(positional.name, "Thankyou");
  assert.equal(positional.params.get("1"), "你的努力");
  assert.equal(positional.params.get("2"), "张三");

  const named = parseTemplateCall("Thankyou|signature=张三|reason=你的一切", ctx);
  assert.equal(named.params.get("signature"), "张三");
  assert.equal(named.params.get("reason"), "你的一切");

  // Empty-string named param is a value, not absent.
  const empty = parseTemplateCall("ParamEcho|bar=", ctx);
  assert.equal(empty.params.get("bar"), "");
});

Deno.test("parseTemplateParameter parses name and optional default", () => {
  assert.deepEqual(parseTemplateParameter("reason", ctx), { name: "reason", defaultValue: null });
  assert.deepEqual(parseTemplateParameter("reason|默认", ctx), { name: "reason", defaultValue: "默认" });
});

Deno.test("expandMarkdownTemplates leaves fenced code and inline code untouched", async () => {
  // A template call inside a fenced block must NOT be expanded (no file IO).
  const fenced = "```\n{{Foo}}\n```\n";
  assert.equal(await expandMarkdownTemplates(fenced, makeBareContext()), fenced);

  // Plain text passes through unchanged.
  assert.equal(await expandMarkdownTemplates("hello world\n", makeBareContext()), "hello world\n");

  // Inline code span is preserved verbatim.
  const inline = "see `{{Foo}}` here\n";
  assert.equal(await expandMarkdownTemplates(inline, makeBareContext()), inline);
});

function makeBareContext() {
  return { sourcePath: "test.md", sourceName: "test.md", entriesHtml: "", depth: 0, callStack: [] };
}
