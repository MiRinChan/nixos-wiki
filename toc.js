/* TOC (Table of Contents) component — vanilla JS, no dependencies.
// Scans rendered Markdown headings, builds a collapsible tree,
// highlights the active section on scroll, and positions responsively.
*/

(function () {
    const toc = document.getElementById("toc");
    if (!toc) return;

    // Hide TOC on home page by default
    if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
        toc.hidden = true;
        return;
    }

    // Collect all h2–h6 headings in the document body.
    // The h1 page title is excluded by the selector.
    const headingElements = document.querySelectorAll("h2, h3, h4, h5, h6");

    if (headingElements.length === 0) {
        toc.hidden = true;
        return;
    }

    // Signal that TOC is present so CSS can adjust layout
    document.body.classList.add("has-toc");

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
                el,
            };

            // Pop stack until we find a parent with level < current level
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            const parent = stack[stack.length - 1];
            parent.children.push(node);
            stack.push(node);
        }

        return root.children;
    }

    const tree = buildTree(headingElements);

    // Render tree as nested <ul>/<li>
    function renderTree(nodes) {
        const ul = document.createElement("ul");

        for (const node of nodes) {
            const li = document.createElement("li");

            const a = document.createElement("a");
            a.href = "#" + node.id;
            a.textContent = node.text;
            a.addEventListener("click", function (e) {
                e.preventDefault();
                const target = document.getElementById(node.id);
                if (target) {
                    target.scrollIntoView({ behavior: "smooth" });
                    // Update URL hash without scrolling
                    history.pushState(null, null, "#" + node.id);
                }
            });
            li.appendChild(a);

            if (node.children.length > 0) {
                const toggle = document.createElement("button");
                toggle.className = "toc-toggle";
                toggle.setAttribute("aria-label", "展开/折叠");
                toggle.addEventListener("click", function () {
                    li.classList.toggle("collapsed");
                });
                li.appendChild(toggle);
                li.appendChild(renderTree(node.children));
            }

            ul.appendChild(li);
        }

        return ul;
    }

    toc.appendChild(renderTree(tree));

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
            if (current.tagName === "LI") {
                current.classList.remove("collapsed");
            }
            current = current.parentElement;
        }
    }

    // IntersectionObserver for scroll spy
    const observer = new IntersectionObserver(
        function (entries) {
            // Find the entry with the highest intersection ratio
            let best = null;
            for (const entry of entries) {
                if (!best || entry.intersectionRatio > best.intersectionRatio) {
                    best = entry;
                }
            }

            if (best && best.intersectionRatio > 0) {
                // Remove active from all links
                for (const a of linkMap.values()) {
                    a.classList.remove("active");
                }
                // Set active on the best match
                const activeLink = linkMap.get(best.target.id);
                if (activeLink) {
                    activeLink.classList.add("active");
                    expandAncestors(activeLink);
                }
            }
        },
        {
            rootMargin: "0px 0px -80% 0px",
            threshold: [0, 0.25, 0.5, 0.75, 1],
        },
    );

    for (const el of headingElements) {
        if (el.id) observer.observe(el);
    }

    // On load, expand ancestors for hash fragment
    if (window.location.hash) {
        const id = window.location.hash.replace(/^#/, "");
        const link = linkMap.get(id);
        if (link) {
            expandAncestors(link);
            link.classList.add("active");
        }
    }
})();
