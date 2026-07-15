/* TOC (Table of Contents) component — vanilla JS, no dependencies.
// Wires the server-rendered tree, handles collapsible branches,
// highlights the active section on scroll, and positions responsively.
// buildToc() is re-runnable so AJAX navigation can rebuild the TOC.
*/

(function () {
    const toc = document.getElementById("toc");
    if (!toc) return;
    const mobileQuery = window.matchMedia("(max-width: 47.99em)");

    let programmaticScroll = typeof window.wikiIsProgrammaticScrollActive === "function"
        ? window.wikiIsProgrammaticScrollActive()
        : false;

    document.addEventListener("wiki:programmatic-scroll", function (event) {
        programmaticScroll = Boolean(event.detail?.active);
    });

    // Per-build state, refreshed by buildToc()
    let currentObserver = null;
    let tocContainer = null;

    function setTocCollapsed(collapsed) {
        if (!tocContainer) return;
        tocContainer.open = !collapsed;
    }

    // Single persistent listener — references the current build via module state
    mobileQuery.addEventListener("change", function () {
        setTocCollapsed(mobileQuery.matches);
    });

    function buildToc() {
        // Tear down the previous build
        if (currentObserver) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        tocContainer = null;
        toc.hidden = false;
        document.body.classList.remove("has-toc");

        // Hide TOC on home page by default
        if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
            toc.hidden = true;
            return;
        }

        // The server renders the TOC tree. The client only wires interactions.
        // The h1 page title is excluded by the selector.
        const headingElements = document.querySelectorAll(
            "#wiki-content h2, #wiki-content h3, #wiki-content h4, #wiki-content h5, #wiki-content h6",
        );

        if (headingElements.length === 0 || !toc.querySelector("#toc-tree")) {
            toc.hidden = true;
            return;
        }

        // Signal that TOC is present so CSS can adjust layout
        document.body.classList.add("has-toc");

        tocContainer = toc.querySelector(".toc-container");
        const treeElement = toc.querySelector("#toc-tree");

        if (!tocContainer) {
            toc.hidden = true;
            return;
        }

        for (const branch of treeElement.querySelectorAll(".toc-branch")) {
            branch.open = false;
        }

        setTocCollapsed(mobileQuery.matches);

        // Build a map from heading id → TOC <a> element. The build pipeline
        // may absolutize fragment URLs, so read the hash through URL parsing.
        const linkMap = new Map();
        for (const a of toc.querySelectorAll("a")) {
            const href = a.getAttribute("href");
            if (!href) continue;
            try {
                const url = new URL(href, window.location.href);
                if (url.origin === window.location.origin &&
                    url.pathname === window.location.pathname &&
                    url.search === window.location.search && url.hash) {
                    linkMap.set(url.hash.slice(1), a);
                }
            } catch (_err) {
                // Ignore malformed links in trusted page content.
            }
        }

        // Expand ancestors of a given element
        function expandAncestors(el) {
            let current = el;
            while (current && current !== toc) {
                if (current.matches?.("details.toc-branch")) current.open = true;
                current = current.parentElement;
            }
        }

        // Track the current link to avoid an O(n) class-removal loop on every scroll
        let currentActiveLink = null;

        function setActiveLink(activeLink) {
            if (currentActiveLink === activeLink) return;
            if (currentActiveLink) currentActiveLink.classList.remove("active");
            if (activeLink) activeLink.classList.add("active");
            currentActiveLink = activeLink;
            if (activeLink && !programmaticScroll) expandAncestors(activeLink);
        }

        // Scroll-spy: highlight the last heading at or above the 25% line,
        // matching the quarter-screen offset used in anchor-highlight.js.
        function findActiveHeadingEl() {
            const threshold = window.innerHeight * 0.25 + 4;
            let active = null;
            for (const el of headingElements) {
                if (el.getBoundingClientRect().top <= threshold) active = el;
            }
            return active;
        }

        function updateHighlight() {
            const el = findActiveHeadingEl();
            if (!el) {
                setActiveLink(null);
                return;
            }
            const link = linkMap.get(el.id);
            if (link) setActiveLink(link);
        }

        let scrollRAF = null;
        function onScroll() {
            if (programmaticScroll) return;
            if (scrollRAF) return;
            scrollRAF = requestAnimationFrame(function () { scrollRAF = null; updateHighlight(); });
        }

        function onScrollEnd(e) {
            if (!e.detail?.active) requestAnimationFrame(updateHighlight);
        }

        currentObserver = {
            disconnect: function () {
                window.removeEventListener("scroll", onScroll);
                document.removeEventListener("wiki:programmatic-scroll", onScrollEnd);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("wiki:programmatic-scroll", onScrollEnd);

        updateHighlight();
    }

    window.wikiRebuildToc = buildToc;
    buildToc();
})();
