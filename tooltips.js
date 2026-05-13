(function () {
  "use strict";

  const SELECTOR = ".info-trigger, .link-tip-host";
  const MARGIN = 24;         // px from viewport edge (excludes scrollbar)
  const ARROW_HALF = 7;      // half base width of arrow
  const VERT_GAP = 12;       // gap between trigger and tooltip

  function getTip(host) {
    return host.querySelector(":scope > .info-tooltip");
  }

  function reset(tip) {
    tip.style.position = "";
    tip.style.top = "";
    tip.style.left = "";
    tip.style.bottom = "";
    tip.style.right = "";
    tip.style.transform = "";
    tip.style.setProperty("--arrow-offset", "0px");
    tip.classList.remove("flipped");
  }

  // For inline hosts that wrap across lines, pick the line fragment that
  // contains the mouse pointer; otherwise use the only fragment.
  function pickAnchor(host, mouseX, mouseY) {
    const rects = host.getClientRects();
    if (!rects.length) return host.getBoundingClientRect();
    if (rects.length === 1 || mouseY == null) return rects[0];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (mouseY >= r.top && mouseY <= r.bottom) return r;
    }
    // Mouse not within any fragment vertically — pick the nearest.
    let best = rects[0];
    let bestDist = Math.abs(mouseY - (best.top + best.bottom) / 2);
    for (let i = 1; i < rects.length; i++) {
      const d = Math.abs(mouseY - (rects[i].top + rects[i].bottom) / 2);
      if (d < bestDist) { best = rects[i]; bestDist = d; }
    }
    return best;
  }

  function position(host, evt) {
    const tip = getTip(host);
    if (!tip) return;

    reset(tip);

    // Force visible for measurement (CSS hover may not yet have applied
    // on first mouseenter).
    const wasHidden = getComputedStyle(tip).display === "none";
    if (wasHidden) tip.style.display = "block";

    const mouseX = evt ? evt.clientX : null;
    const mouseY = evt ? evt.clientY : null;
    const anchor = pickAnchor(host, mouseX, mouseY);
    const tipRect = tip.getBoundingClientRect();
    // clientWidth excludes the scrollbar; innerWidth includes it, which
    // pushed the tooltip up against the scrollbar on scrollable pages.
    const vw = document.documentElement.clientWidth;

    const anchorCenterX = anchor.left + anchor.width / 2;
    const tipW = tipRect.width;
    const tipH = tipRect.height;

    // Default: centered horizontally above the anchor fragment.
    let left = anchorCenterX - tipW / 2;
    let top = anchor.top - tipH - VERT_GAP;

    // Clamp horizontally to viewport.
    if (left < MARGIN) left = MARGIN;
    if (left + tipW > vw - MARGIN) left = vw - MARGIN - tipW;

    // Flip below if no room above.
    let flipped = false;
    if (top < MARGIN) {
      top = anchor.bottom + VERT_GAP;
      flipped = true;
    }

    // Arrow keeps pointing at anchor center even after the tooltip is
    // clamped to the viewport edge.
    const finalCenterX = left + tipW / 2;
    let arrowOffset = anchorCenterX - finalCenterX;
    const maxArrow = tipW / 2 - ARROW_HALF - 4;
    if (arrowOffset > maxArrow) arrowOffset = maxArrow;
    if (arrowOffset < -maxArrow) arrowOffset = -maxArrow;

    tip.style.position = "fixed";
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
    tip.style.bottom = "auto";
    tip.style.right = "auto";
    tip.style.transform = "none";
    tip.style.setProperty("--arrow-offset", `${arrowOffset}px`);
    if (flipped) tip.classList.add("flipped");

    if (wasHidden) tip.style.display = "";
  }

  function attach() {
    document.querySelectorAll(SELECTOR).forEach(function (host) {
      host.addEventListener("mouseenter", function (e) { position(host, e); });
      host.addEventListener("mousemove",  function (e) { position(host, e); });
      host.addEventListener("focusin",    function ()  { position(host); });
      host.addEventListener("mouseleave", function () {
        const tip = getTip(host);
        if (tip) reset(tip);
      });
      host.addEventListener("focusout", function () {
        const tip = getTip(host);
        if (tip) reset(tip);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }

  window.addEventListener("resize", function () {
    document.querySelectorAll(".info-tooltip").forEach(reset);
  });
})();
