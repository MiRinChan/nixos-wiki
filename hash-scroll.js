/* In-page hash navigation — vanilla JS, no dependencies.
// Intercepts same-page anchor clicks, smooth-scrolls to the target with a
// highlight pulse, and exposes wikiScrollToHash() for nav.js to reuse.
*/

(function () {
    function highlightTarget(target) {
        target.classList.remove("wiki-highlight");
        // Double-rAF ensures Safari commits the class removal before re-adding,
        // reliably restarting the animation (void offsetWidth is not enough in Safari).
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                target.classList.add("wiki-highlight");
            });
        });
    }

    function maxScrollTop() {
        return Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight,
        );
    }

    function clampScrollTop(top) {
        return Math.min(Math.max(0, top), maxScrollTop());
    }

    let scrollEndTimer = null;

    function setProgrammaticScroll(active) {
        window.__wikiProgrammaticScroll = active;
        document.dispatchEvent(
            new CustomEvent("wiki:programmatic-scroll", {
                detail: { active },
            }),
        );
    }

    function finishProgrammaticScroll() {
        window.removeEventListener("scroll", resetProgrammaticScrollTimer);
        setProgrammaticScroll(false);
    }

    function resetProgrammaticScrollTimer() {
        window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(finishProgrammaticScroll, 180);
    }

    function scrollToHash(hash) {
        if (!hash || hash === "#") return;
        const id = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(id);
        if (!target) return;

        const top = clampScrollTop(
            target.getBoundingClientRect().top +
                window.scrollY -
                window.innerHeight * 0.25,
        );

        setProgrammaticScroll(true);
        window.addEventListener("scroll", resetProgrammaticScrollTimer, {
            passive: true,
        });
        resetProgrammaticScrollTimer();
        window.scrollTo({ top, behavior: "smooth" });
        highlightTarget(target);
    }

    window.wikiScrollToHash = scrollToHash;
    window.wikiIsProgrammaticScrollActive = function () {
        return Boolean(window.__wikiProgrammaticScroll);
    };

    // Intercept anchor clicks
    document.addEventListener("click", function (e) {
        const link = e.target.closest("a");
        if (!link) return;
        const raw = link.getAttribute("href");
        if (!raw) return;

        let hash = null;
        if (raw.startsWith("#")) {
            if (raw === "#") return;
            hash = raw;
        } else {
            const hashIdx = raw.indexOf("#");
            if (hashIdx < 0) return;
            const tmp = document.createElement("a");
            tmp.href = raw;
            if (tmp.pathname !== location.pathname) return;
            hash = "#" + raw.substring(hashIdx + 1);
        }
        if (!hash) return;

        e.preventDefault();
        history.pushState(null, "", hash);
        scrollToHash(hash);
    });

    // Handle initial hash on page load
    if (location.hash) {
        scrollToHash(location.hash);
    }
})();
