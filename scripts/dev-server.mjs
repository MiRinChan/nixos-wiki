// Development server with live reload.
//
// Rebuilds out/ whenever a source file changes and pushes a reload to every
// open browser tab over Server-Sent Events. Replaces the old live-server +
// chokidar + concurrently setup with a single `deno task dev` process.

import { serveDir } from "@std/http/file-server";
import { promises as fs } from "node:fs";
import path from "node:path";
const PORT = Number(Deno.env.get("WIKI_DEV_PORT") ?? "8000");
if (!Deno.env.has("WIKI_SITE_ORIGIN")) {
  Deno.env.set("WIKI_SITE_ORIGIN", `http://localhost:${PORT}`);
}

const { build } = await import("./build.mjs");
const { entriesDir, homePath, markdownTemplateDir, outDir, rootDir, templatePath } = await import("./lib/config.mjs");

function wrapperUrl(url) {
  const redirected = new URL(url);
  if (redirected.pathname !== "/" && redirected.pathname.endsWith("/")) {
    redirected.pathname = redirected.pathname.slice(0, -1);
    return redirected;
  }
  return null;
}

async function serveOutput(request, url) {
  const headers = new Headers(request.headers);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");

  const requestUrl = new URL(url);
  let response = await serveDir(new Request(requestUrl, {
    method: request.method,
    headers,
  }), {
    fsRoot: outDir,
    quiet: true,
  });

  // Production pages live at <path>/index.html, while wikiwrapper exposes
  // the public URL as <path> after redirecting away a trailing slash.
  if (response.status !== 200 && !requestUrl.pathname.endsWith("/")) {
    requestUrl.pathname += "/index.html";
    response = await serveDir(new Request(requestUrl, {
      method: request.method,
      headers,
    }), {
      fsRoot: outDir,
      quiet: true,
    });
  }

  return response;
}

const RELOAD_SNIPPET = `
<script>
  (() => {
    const es = new EventSource("/__livereload");
    es.onmessage = (e) => {
      if (e.data === "reload") location.reload();
    };
  })();
</script>`;

// Connected SSE stream controllers, one per open tab.
const clients = new Set();

function broadcastReload() {
  const data = new TextEncoder().encode("data: reload\n\n");
  for (const controller of clients) {
    try {
      controller.enqueue(data);
    } catch {
      clients.delete(controller);
    }
  }
}

function liveReloadStream() {
  let self;
  const body = new ReadableStream({
    start(controller) {
      self = controller;
      clients.add(controller);
      controller.enqueue(new TextEncoder().encode(": connected\n\n"));
    },
    cancel() {
      clients.delete(self);
    },
  });
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}

async function handler(req) {
  const url = new URL(req.url);
  if (url.pathname === "/__livereload") {
    return liveReloadStream();
  }

  const redirectUrl = wrapperUrl(url);
  if (redirectUrl) {
    return Response.redirect(redirectUrl.toString(), 301);
  }

  const res = await serveOutput(req, url);

  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 200 && contentType.includes("text/html")) {
    const html = await res.text();
    const injected = html.includes("</body>")
      ? html.replace("</body>", `${RELOAD_SNIPPET}\n</body>`)
      : html + RELOAD_SNIPPET;
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-length");
    outHeaders.delete("etag");
    outHeaders.delete("last-modified");
    outHeaders.set("cache-control", "no-store");
    return new Response(injected, { status: res.status, headers: outHeaders });
  }

  return res;
}

async function rebuild(reason) {
  const start = performance.now();
  try {
    await build();
    console.log(`✓ rebuilt (${reason}) in ${Math.round(performance.now() - start)}ms`);
    broadcastReload();
  } catch (err) {
    console.error(`✗ build failed: ${err?.message ?? err}`);
  }
}

let rebuildRunning = false;
let pendingRebuild = false;

async function queueRebuild(reason) {
  if (rebuildRunning) {
    pendingRebuild = true;
    return;
  }

  rebuildRunning = true;
  do {
    pendingRebuild = false;
    await rebuild(reason);
    reason = "queued change";
  } while (pendingRebuild);
  rebuildRunning = false;
}

async function watchSources() {
  const candidates = [
    entriesDir,
    path.join(rootDir, "categories"),
    markdownTemplateDir,
    homePath,
    templatePath,
    path.join(rootDir, "styles-base.css"),
    path.join(rootDir, "styles-code-light.css"),
    path.join(rootDir, "styles-code-dark.css"),
    path.join(rootDir, "anchor-highlight.js"),
    path.join(rootDir, "toc.js"),
    path.join(rootDir, "nav.js"),
  ];
  const paths = [];
  for (const candidate of candidates) {
    try {
      await fs.stat(candidate);
      paths.push(candidate);
    } catch {
      // Skip sources that don't exist in this repo.
    }
  }

  const watcher = Deno.watchFs(paths);
  let timer;
  for await (const _event of watcher) {
    clearTimeout(timer);
    timer = setTimeout(() => queueRebuild("change"), 80);
  }
}

await queueRebuild("startup");
watchSources();
Deno.serve({
  port: PORT,
  onListen: ({ port }) => console.log(`Dev server: http://localhost:${port}  (live reload on)`),
}, handler);
