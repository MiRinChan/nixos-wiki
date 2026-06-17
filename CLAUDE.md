# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project runs on **Deno** (no npm / no `node_modules`). Dependencies are
declared in `deno.json` (`imports`) and locked in `deno.lock`; Deno fetches them
into its global cache on first run.

```sh
deno task build     # generate out/
deno task dev       # rebuild on change (deno --watch; refresh browser manually)
deno task serve     # serve out/ at http://localhost:8000
deno task test      # build first, then verify out/ matches the golden baseline
deno task lint      # lint scripts/ and test/
rm -rf out && deno task build   # clean rebuild
```

With Nix:
```sh
nix develop --command bash -c 'deno task build'
```

Verify a successful build:
```sh
deno task build && test -f out/index.html
```

### Output regression guardrail

`test/golden.manifest.json` records a SHA-256 of every file the build emits.
`deno task test` (and `test/compare-out.mjs`) rebuilds and asserts the output is
**byte-for-byte identical** to that baseline — the acceptance gate for any
behaviour-preserving refactor. When a change *intentionally* alters output, run
`deno run --allow-read --allow-write test/update-golden.mjs` to refresh the
baseline and explain the change in the PR.

## Architecture

This is a **static Markdown wiki generator** (JavaScript ESM, run on Deno). The single build script `scripts/build.mjs` reads content from the repo, runs it through `marked` (with extensions), and writes HTML to `out/`. There is no framework or bundler; `deno task serve` (the `@std/http` file server) serves `out/` for local preview.

### Content layout

| Path | Purpose |
|---|---|
| `index.md` | Site home page; use `{{entries}}` to render the full entry list |
| `entries/<Name>/index.md` | A wiki entry page |
| `entries/<Parent>/<Child>/index.md` | Nested entry (sub-entry) |
| `entries/**/FOLD` | Empty sentinel: collapse this subtree in entry listings |
| `entries/**/HIDE` | Empty sentinel: hide this subtree from all listings |
| `categories/<Name>/index.md` | Optional category description; use `[[Category:Name]]` to assign parent categories |
| `template/<Name>.md` | Reusable Markdown template, invoked with `{{Name}}` |

An entry directory with no `index.md` but with sub-entries is valid — the build auto-generates a listing page for it.

### Build pipeline (`scripts/build.mjs`)

1. `listEntries()` — walks `entries/` recursively, detects FOLD/HIDE sentinels, sorts `zh-CN`.
2. `expandMarkdownTemplates()` — processes `{{TemplateName|param}}` and `{{{param|default}}}` syntax (skips fenced code blocks and backtick spans). Also handles the built-in `{{entries}}` token.
3. `marked.parse()` — renders Markdown to HTML with custom extensions (see below).
4. `renderPage()` — injects HTML into `template.html` replacing `{{placeholders}}`.
5. Writes each entry to `out/<WIKI_ENTRY_URL_PREFIX>/<segments>/index.html`.
6. Builds `out/wiki/Category:<Name>/index.html` for each category referenced via `[[Category:Name]]`.
7. Builds `out/wiki/Special:Categories/index.html`.
8. Copies static assets (`.css .gif .ico .jpeg .jpg .js .png .svg .webp .webm .mp4`) from root and `entries/` into `out/`.
9. Writes `out/CNAME` if `WIKI_CNAME` is set.

### Markdown extensions

- **`||key||`** → `<kbd>key</kbd>`
- **Code block with filename**: ` ```lang:filename ``` ` or ` ```lang filename ``` ` — renders a filename header above the code block
- **Mermaid diagrams**: ` ```mermaid ``` ` → `<pre class="mermaid">` for client-side rendering
- **GFM alerts** (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`) with Chinese titles
- **Footnotes** via `marked-footnote` (description label: "脚注")
- **Category tags**: `[[Category:Name]]` lines are stripped from rendered content and collected for category pages

### Template system

Templates live in `template/*.md`. Invocation:
```
{{TemplateName|positional|named=value}}
```
Parameters accessed inside templates with `{{{name|default}}}`. Template calls are **not** expanded inside fenced code blocks or inline code spans. Circular references and missing templates are build errors.

### Site configuration

All parameters are environment variables (with hardcoded defaults for this NixOS wiki):

| Variable | Default |
|---|---|
| `WIKI_SITE_TITLE` | `NixOS Wiki zh-CN` |
| `WIKI_SITE_ORIGIN` | `https://nixoscn.org` |
| `WIKI_HTML_LANG` | `zh-CN` |
| `WIKI_ENTRY_URL_PREFIX` | `wiki` |
| `WIKI_EDIT_URL_TEMPLATE` | GitHub edit URL |
| `WIKI_EDIT_LINK_LABEL` | `前往 GitHub 编辑此页` |
| `WIKI_FAVICON_PATH` | `photo_2026-05-14_19-41-31.jpg` |
| `WIKI_CNAME` | `nixoscn.org` |

Production values are set as GitHub Repository Variables. Never write a `CNAME` file manually.

### CI

- **`pages.yml`**: triggers on push to `main`, builds, and force-pushes `out/` to the `pages` branch (configurable via `WIKI_PUBLISH_BRANCH`).
- **`pr-build.yml`**: on every PR runs `deno task lint`, `deno task build`, and `deno task test` (golden-baseline check) as a build check.

### Contributor agreement

PRs must include `这是我的翻译` or `这是我的著作` in the PR description to sign the contributor agreement (CC-BY-SA 4.0 with the "Part CC" MediaWiki restriction).

### Security model (read before "fixing" XSS)

Content is **trusted**: every entry/category/template arrives through a reviewed
PR that also signs the contributor agreement. The pipeline is built around that
assumption, so the following are **intentional**, not bugs:

- **`marked` runs without HTML sanitization** (its default). Raw HTML in Markdown
  passes through verbatim — this is what lets entries embed rich HTML/SVG. Do
  **not** add a sanitizer (e.g. DOMPurify) or `marked`'s deprecated `sanitize`
  option; it would strip legitimate markup from existing entries.
- **`nav.js` swaps page sections with `innerHTML`** from a **same-origin** fetch
  of the site's own already-published pages — the same trust boundary as the
  page already loaded, and `innerHTML` does not execute injected `<script>`.
- **Heading ids** are derived from already-rendered inline HTML; the explicit-id
  regex captures `[^"]*`, so an id can't break out of the `id="…"` attribute.
- **CI uses `pull_request`, never `pull_request_target`**, so untrusted fork code
  runs without repository secrets (`pr-build.yml` is read-only).

Genuine hardening that *is* applied: the third-party Mermaid bundle is loaded
from a pinned CDN version with Subresource Integrity (`template.html`).
