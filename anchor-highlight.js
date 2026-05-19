(function () {
  const hlCanvas = document.createElement("canvas");
  hlCanvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  hlCanvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(hlCanvas);
  const hlCtx = hlCanvas.getContext("2d");
  const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
  function updateBlendMode() {
    hlCanvas.style.mixBlendMode = darkMQ.matches ? "screen" : "multiply";
  }
  updateBlendMode();
  darkMQ.addEventListener("change", updateBlendMode);
  function resizeHlCanvas() {
    hlCanvas.width = window.innerWidth;
    hlCanvas.height = window.innerHeight;
  }
  resizeHlCanvas();
  window.addEventListener("resize", resizeHlCanvas, { passive: true });

  let hlTarget = null;
  let hlRAF = null;

  function highlightTarget(target) {
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
    history.pushState(null, null, hash);
    scrollToHash(hash);
  });

  if (location.hash) {
    scrollToHash(location.hash);
  }
})();
