/* TOC (Table of Contents) component — vanilla JS, no dependencies.
// Scans rendered Markdown headings, builds a collapsible tree,
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
    let collapseToggle = null;

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Build tree from flat heading list
    function buildTree(headings) {
        const root = { level: 1, children: [] };
        const stack = [root];

        for (const el of headings) {
            const level = parseInt(el.tagName.charAt(1), 10);
            const node = {
                level,
                id: el.id || "",
                text: el.textContent.trim(),
                children: [],
            };

            // Pop stack until we find a parent with level < current level
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }

        return root.children;
    }

    // Build the inner HTML for a <ul> level — one innerHTML write per subtree
    // instead of one createElement+appendChild per node.
    function buildTreeInner(nodes) {
        let html = "";
        for (const node of nodes) {
            const hasChildren = node.children.length > 0;
            html += `<li${hasChildren ? ' class="collapsed"' : ""}>`;
            html += `<a href="#${escapeHtml(node.id)}">${escapeHtml(node.text)}</a>`;
            if (hasChildren) {
                html += `<button type="button" class="toc-toggle" aria-label="展开/折叠"></button>`;
                html += `<ul>${buildTreeInner(node.children)}</ul>`;
            }
            html += "</li>";
        }
        return html;
    }

    function setTocCollapsed(collapsed) {
        if (!collapseToggle) return;
        toc.collapsed = Boolean(collapsed);
        toc.classList.toggle("toc-collapsed", mobileQuery.matches && toc.collapsed);
        collapseToggle.setAttribute(
            "aria-expanded",
            String(!mobileQuery.matches || !toc.collapsed),
        );
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
        collapseToggle = null;
        toc.innerHTML = "";
        toc.hidden = false;
        document.body.classList.remove("has-toc");

        // Hide TOC on home page by default
        if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
            toc.hidden = true;
            return;
        }

        // Collect all h2–h6 headings in the page content.
        // The h1 page title is excluded by the selector.
        const headingElements = document.querySelectorAll(
            "#wiki-content h2, #wiki-content h3, #wiki-content h4, #wiki-content h5, #wiki-content h6",
        );

        if (headingElements.length === 0) {
            toc.hidden = true;
            return;
        }

        // Signal that TOC is present so CSS can adjust layout
        document.body.classList.add("has-toc");

        const tree = buildTree(headingElements);

        const header = document.createElement("div");
        header.className = "toc-header";

        collapseToggle = document.createElement("button");
        collapseToggle.type = "button";
        collapseToggle.className = "toc-collapse-toggle";
        collapseToggle.textContent = "目录";
        collapseToggle.setAttribute("aria-label", "展开/折叠目录");
        header.appendChild(collapseToggle);

        const treeElement = document.createElement("ul");
        treeElement.id = "toc-tree";
        treeElement.innerHTML = buildTreeInner(tree);

        // One delegated listener for all toggle buttons instead of one per button
        treeElement.addEventListener("click", function (e) {
            const toggle = e.target.closest(".toc-toggle");
            if (toggle) toggle.closest("li").classList.toggle("collapsed");
        });

        collapseToggle.setAttribute("aria-controls", treeElement.id);

        toc.appendChild(header);
        toc.appendChild(treeElement);

        collapseToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            setTocCollapsed(!toc.collapsed);
        });

        setTocCollapsed(mobileQuery.matches);

        // Build a map from heading id → TOC <a> element
        const linkMap = new Map();
        for (const a of toc.querySelectorAll("a")) {
            const id = a.getAttribute("href")?.replace(/^#/, "");
            if (id) linkMap.set(id, a);
        }

        // Expand ancestors of a given element
        function expandAncestors(el) {
            let current = el;
            while (current && current !== toc) {
                if (current.tagName === "LI") current.classList.remove("collapsed");
                current = current.parentElement;
            }
        }

        // Track the current link to avoid an O(n) class-removal loop on every scroll
        let currentActiveLink = null;

        function setActiveLink(activeLink) {
            if (currentActiveLink === activeLink) return;
            if (currentActiveLink) currentActiveLink.classList.remove("active");
            activeLink.classList.add("active");
            currentActiveLink = activeLink;
            if (!programmaticScroll) expandAncestors(activeLink);
        }

        // IntersectionObserver for scroll spy
        currentObserver = new IntersectionObserver(
            function (entries) {
                // Find the entry with the highest intersection ratio
                let best = null;
                for (const entry of entries) {
                    if (!best || entry.intersectionRatio > best.intersectionRatio) {
                        best = entry;
                    }
                }

                if (best && best.intersectionRatio > 0) {
                    const activeLink = linkMap.get(best.target.id);
                    if (activeLink) setActiveLink(activeLink);
                }
            },
            {
                rootMargin: "0px 0px -80% 0px",
                threshold: [0, 0.25, 0.5, 0.75, 1],
            },
        );

        for (const el of headingElements) {
            if (el.id) currentObserver.observe(el);
        }

        // On load, expand ancestors for hash fragment
        if (window.location.hash) {
            const id = window.location.hash.replace(/^#/, "");
            const link = linkMap.get(id);
            if (link) setActiveLink(link);
        }
    }

    window.wikiRebuildToc = buildToc;
    buildToc();
})();
