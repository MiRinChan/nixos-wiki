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

    let currentObserver = null;
    let collapseToggle = null;

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

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

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }

        return root.children;
    }

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

    mobileQuery.addEventListener("change", function () {
        setTocCollapsed(mobileQuery.matches);
    });

    function buildToc() {
        if (currentObserver) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        collapseToggle = null;
        toc.innerHTML = "";
        toc.hidden = false;
        document.body.classList.remove("has-toc");

        if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
            toc.hidden = true;
            return;
        }

        const headingElements = document.querySelectorAll(
            "#wiki-content h2, #wiki-content h3, #wiki-content h4, #wiki-content h5, #wiki-content h6",
        );

        if (headingElements.length === 0) {
            toc.hidden = true;
            return;
        }

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
        treeElement.addEventListener("click", function (event) {
            const toggle = event.target.closest(".toc-toggle");
            if (toggle) toggle.closest("li").classList.toggle("collapsed");
        });

        collapseToggle.setAttribute("aria-controls", treeElement.id);
        toc.appendChild(header);
        toc.appendChild(treeElement);
        collapseToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            setTocCollapsed(!toc.collapsed);
        });
        setTocCollapsed(mobileQuery.matches);

        const linkMap = new Map();
        for (const a of toc.querySelectorAll("a")) {
            const id = a.getAttribute("href")?.replace(/^#/, "");
            if (id) linkMap.set(id, a);
        }

        function expandAncestors(el) {
            let current = el;
            while (current && current !== toc) {
                if (current.tagName === "LI") current.classList.remove("collapsed");
                current = current.parentElement;
            }
        }

        let currentActiveLink = null;
        function setActiveLink(activeLink) {
            if (currentActiveLink === activeLink) return;
            if (currentActiveLink) currentActiveLink.classList.remove("active");
            if (activeLink) activeLink.classList.add("active");
            currentActiveLink = activeLink;
            if (activeLink && !programmaticScroll) expandAncestors(activeLink);
        }

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
            if (!el) return;
            const link = linkMap.get(el.id);
            if (link) setActiveLink(link);
        }

        let scrollRAF = null;
        function onScroll() {
            if (programmaticScroll) return;
            if (scrollRAF) return;
            scrollRAF = requestAnimationFrame(function () {
                scrollRAF = null;
                updateHighlight();
            });
        }

        function onScrollEnd(event) {
            if (!event.detail?.active) requestAnimationFrame(updateHighlight);
        }

        currentObserver = {
            disconnect: function () {
                window.removeEventListener("scroll", onScroll);
                document.removeEventListener("wiki:programmatic-scroll", onScrollEnd);
            },
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("wiki:programmatic-scroll", onScrollEnd);
        updateHighlight();
    }

    window.wikiRebuildToc = buildToc;
    buildToc();
})();
