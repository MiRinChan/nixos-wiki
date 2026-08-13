/* AJAX page navigation — vanilla JS, no dependencies.
// Intercepts same-origin links, fetches the target page, and swaps the
// content / heading / footer in place instead of doing a full reload.
*/

(function () {
    const content = document.getElementById("wiki-content");
    const progress = document.getElementById("wiki-progress");
    if (!content || !progress || !window.fetch || !window.DOMParser) return;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let navToken = 0;
    let currentController = null;
    let currentPath = window.location.pathname;

    function startProgress() {
        progress.hidden = false;
        progress.style.transition = "none";
        progress.style.opacity = "1";
        progress.style.width = "0%";
        void progress.offsetWidth; // force reflow so the crawl restarts
        progress.style.transition = "width 8s cubic-bezier(0.1, 0.75, 0.2, 1)";
        progress.style.width = "85%";
    }

    function finishProgress() {
        progress.style.transition = "width 0.2s ease";
        progress.style.width = "100%";
        setTimeout(function () {
            progress.style.transition = "opacity 0.3s ease";
            progress.style.opacity = "0";
            setTimeout(function () {
                progress.hidden = true;
            }, 320);
        }, 220);
    }

    function applyScroll(url) {
        const hash = new URL(url).hash;
        if (hash && typeof window.wikiScrollToHash === "function") {
            window.wikiScrollToHash(hash);
        } else {
            window.scrollTo(0, 0);
        }
    }

    async function navigate(url, push) {
        const token = ++navToken;
        if (currentController) currentController.abort();
        const controller = new AbortController();
        currentController = controller;
        startProgress();

        let response;
        try {
            response = await fetch(url, { signal: controller.signal });
        } catch (err) {
            if (token === navToken) window.location.href = url;
            return;
        }
        if (token !== navToken) return;
        if (!response.ok) {
            window.location.href = url;
            return;
        }

        let text;
        try {
            text = await response.text();
        } catch (err) {
            if (token === navToken) window.location.href = url;
            return;
        }
        if (token !== navToken) return;

        const doc = new DOMParser().parseFromString(text, "text/html");
        const newContent = doc.getElementById("wiki-content");
        if (!newContent) {
            window.location.href = url;
            return;
        }
        const newHeading = doc.querySelector("h1");
        const newFooter = doc.querySelector("footer");

        content.classList.add("wiki-fading");
        await delay(160);
        if (token !== navToken) return;

        content.innerHTML = newContent.innerHTML;

        const heading = document.querySelector("h1");
        if (heading && newHeading) heading.innerHTML = newHeading.innerHTML;

        const footer = document.querySelector("footer");
        if (footer && newFooter) footer.innerHTML = newFooter.innerHTML;

        document.title = doc.title;

        // Keep meta tags in sync so Reader View (Firefox, Safari) picks up
        // the new page's title/description/URL rather than the original page's.
        function syncMeta(selector, attr, newDoc) {
            const src = newDoc.querySelector(selector);
            const dst = document.querySelector(selector);
            if (src && dst) dst.setAttribute(attr, src.getAttribute(attr));
        }
        syncMeta('meta[property="og:title"]',       "content", doc);
        syncMeta('meta[property="og:description"]', "content", doc);
        syncMeta('meta[property="og:url"]',         "content", doc);
        syncMeta('meta[name="description"]',        "content", doc);
        syncMeta('link[rel="canonical"]',           "href",    doc);

        if (push) history.pushState({}, "", url);
        currentPath = new URL(url).pathname;

        content.classList.remove("wiki-fading");

        if (typeof window.wikiRebuildToc === "function") window.wikiRebuildToc();

        if (window.mermaid && typeof window.mermaid.run === "function") {
            try {
                window.mermaid.run({ querySelector: "#wiki-content .mermaid" });
            } catch (err) {
                /* mermaid render failure is non-fatal */
            }
        }

        applyScroll(url);
        finishProgress();
        currentController = null;
    }

    document.addEventListener("click", function (e) {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }

        const link = e.target.closest("a");
        if (!link) return;
        if (!link.getAttribute("href")) return;
        if (link.target && link.target !== "" && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;

        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (err) {
            return;
        }
        if (url.origin !== window.location.origin) return;

        // Same-page links (incl. pure #hash) are left to the browser /
        // the inline hash-scroll handler.
        if (url.pathname === window.location.pathname) return;

        // Skip links that point to static asset files (not wiki pages).
        // Page names may legitimately contain dots (e.g. "NixOSCN.org"),
        // so match only known asset extensions rather than "has a dot".
        if (/\.(css|gif|ico|jpe?g|js|png|svg|webp|webm|mp4)$/i.test(url.pathname)) {
            return;
        }

        e.preventDefault();
        navigate(url.href, true);
    });

    window.addEventListener("popstate", function () {
        if (window.location.pathname === currentPath) {
            applyScroll(window.location.href);
            return;
        }
        navigate(window.location.href, false);
    });
})();
