/* In-page hash navigation — vanilla JS, no dependencies.
// Intercepts same-page anchor clicks, smooth-scrolls to the target with a
// highlight pulse, and exposes wikiScrollToHash() for nav.js to reuse.
*/

(function () {
    // Keyframes mirror the former CSS @keyframes wiki-highlight.
    // 0→4.3% = 300ms fade-in, 4.3→71.4% = ~4.7s hold, 71.4→100% = 2s fade-out.
    const HIGHLIGHT_KEYFRAMES = [
        { offset: 0, filter: "drop-shadow(0 0 0 transparent)", easing: "ease-out" },
        { offset: 0.043, filter: "drop-shadow(0 0 10px #ff8205)" },
        { offset: 0.714, filter: "drop-shadow(0 0 10px #ff8205)", easing: "ease-out" },
        { offset: 1, filter: "drop-shadow(0 0 0 transparent)" },
    ];

    let activeHighlight = null;

    function highlightTarget(target) {
        // Drive the pulse via the Web Animations API: element.animate() starts
        // a fresh animation synchronously, so re-triggering restarts it reliably
        // in Safari. The former double-rAF approach was deferred by Safari
        // during the smooth scroll, animating the previously clicked target.
        if (activeHighlight) activeHighlight.cancel();
        activeHighlight = target.animate(HIGHLIGHT_KEYFRAMES, {
            duration: 7000,
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
