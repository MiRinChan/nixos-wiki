(function () {
  const hlCanvas = document.createElement("canvas");
  hlCanvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  hlCanvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(hlCanvas);
  const hlCtx = hlCanvas.getContext("2d");
  const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  function updateBlendMode() {
    hlCanvas.style.mixBlendMode = darkMQ.matches ? "screen" : "multiply";
  }
  updateBlendMode();
  darkMQ.addEventListener("change", updateBlendMode);
  reduceMotionMQ.addEventListener("change", function () {
    if (!reduceMotionMQ.matches) return;
    if (hlRAF) cancelAnimationFrame(hlRAF);
    hlRAF = null;
    hlCtx?.clearRect(0, 0, hlCanvas.width, hlCanvas.height);
  });
  function resizeHlCanvas() {
    hlCanvas.width = window.innerWidth;
    hlCanvas.height = window.innerHeight;
  }
  resizeHlCanvas();
  window.addEventListener("resize", resizeHlCanvas, { passive: true });

  let hlTarget = null;
  let hlRAF = null;
  let highlightTimer = null;
  let highlightedStyle = null;

  function highlightTarget(target) {
    if (highlightTimer) window.clearTimeout(highlightTimer);
    if (highlightedStyle) {
      highlightedStyle.target.style.outline = highlightedStyle.outline;
      highlightedStyle.target.style.outlineOffset = highlightedStyle.outlineOffset;
      highlightedStyle.target.style.borderRadius = highlightedStyle.borderRadius;
      highlightedStyle = null;
    }

    highlightedStyle = {
      target,
      outline: target.style.outline,
      outlineOffset: target.style.outlineOffset,
      borderRadius: target.style.borderRadius,
    };
    target.style.outline = "3px solid #ff8205";
    target.style.outlineOffset = "4px";
    target.style.borderRadius = "2px";
    highlightTimer = window.setTimeout(() => {
      if (!highlightedStyle || highlightedStyle.target !== target) return;
      target.style.outline = highlightedStyle.outline;
      target.style.outlineOffset = highlightedStyle.outlineOffset;
      target.style.borderRadius = highlightedStyle.borderRadius;
      highlightedStyle = null;
      highlightTimer = null;
    }, 7000);

    if (!hlCtx) return;
    hlTarget = target;
    if (hlRAF) cancelAnimationFrame(hlRAF);
    const duration = 7000;
    const fadeInEnd = 300;
    const holdEnd = 5000;
    const start = performance.now();
    function draw(now) {
      const elapsed = now - start;
      hlCtx.clearRect(0, 0, hlCanvas.width, hlCanvas.height);
      if (elapsed >= duration) return;
      const rect = hlTarget.getBoundingClientRect();
      let alpha;
      if (elapsed < fadeInEnd) {
        alpha = elapsed / fadeInEnd;
      } else if (elapsed < holdEnd) {
        alpha = 1;
      } else {
        alpha = 1 - (elapsed - holdEnd) / (duration - holdEnd);
      }
      const pad = 4;
      hlCtx.save();
      hlCtx.globalAlpha = alpha;
      hlCtx.shadowColor = "#ff8205";
      hlCtx.shadowBlur = 15;
      hlCtx.fillStyle = "rgba(255,130,5,0.15)";
      hlCtx.fillRect(
        rect.left - pad, rect.top - pad,
        rect.width + pad * 2, rect.height + pad * 2,
      );
      hlCtx.restore();
      hlRAF = requestAnimationFrame(draw);
    }
    hlRAF = requestAnimationFrame(draw);
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
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = null;
    window.removeEventListener("scroll", resetProgrammaticScrollTimer);
    setProgrammaticScroll(false);
  }

  function resetProgrammaticScrollTimer() {
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(finishProgrammaticScroll, 180);
  }

  function decodeHash(hash) {
    try {
      return decodeURIComponent(hash.slice(1));
    } catch (_err) {
      return null;
    }
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    const id = decodeHash(hash);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const top = clampScrollTop(
      target.getBoundingClientRect().top +
        window.scrollY -
        window.innerHeight * 0.25,
    );

    if (scrollEndTimer) finishProgrammaticScroll();
    setProgrammaticScroll(true);
    window.addEventListener("scroll", resetProgrammaticScrollTimer, {
      passive: true,
    });
    resetProgrammaticScrollTimer();
    window.scrollTo({
      top,
      behavior: reduceMotionMQ.matches ? "auto" : "smooth",
    });
    highlightTarget(target);
  }

  window.wikiScrollToHash = scrollToHash;
  window.wikiIsProgrammaticScrollActive = function () {
    return Boolean(window.__wikiProgrammaticScroll);
  };

  document.addEventListener("click", function (e) {
    if (
      e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
      e.shiftKey || e.altKey
    ) return;
    const link = e.target.closest("a");
    if (!link) return;
    if (link.target && link.target !== "" && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;
    const raw = link.getAttribute("href");
    if (!raw) return;

    let url;
    try {
      url = new URL(raw, location.href);
    } catch (_err) {
      return;
    }
    if (
      !url.hash || url.hash === "#" ||
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.search !== location.search
    ) return;

    e.preventDefault();
    history.pushState(null, "", url.hash);
    scrollToHash(url.hash);
  });

  if (location.hash) {
    scrollToHash(location.hash);
  }
})();
