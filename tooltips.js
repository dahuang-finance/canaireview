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
    tip.style.zIndex = "";
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
    // Raise the actively-positioned tooltip above any focus-pinned
    // tooltips so a hover doesn't get visually buried behind one the
    // user previously clicked. (CSS default z-index for .info-tooltip
    // is 100, so 110 lifts this one above its peers.)
    tip.style.zIndex = "110";
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
        if (!tip) return;
        if (host.matches(":focus-within") || host.classList.contains("pinned")) {
          // Tooltip is staying open (focus or explicit pin). Keep the
          // inline JS position so it doesn't snap back to the CSS
          // default, but drop the raised z-index so a subsequently
          // hovered tooltip can layer on top.
          tip.style.zIndex = "";
          return;
        }
        reset(tip);
      });
      host.addEventListener("focusout", function () {
        // If the mouse is still hovering, hover keeps it open. If the
        // tooltip is explicitly pinned (e.g., across a window switch),
        // keep its position too.
        if (host.matches(":hover")) return;
        if (host.classList.contains("pinned")) return;
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

  // Re-anchor any pinned tooltip to its trigger as the page scrolls,
  // so the tooltip tracks the question-mark instead of staying pinned
  // in viewport coords and then "jumping" the next time the cursor
  // enters the trigger area. Throttled to one frame.
  let scrollRaf = null;
  window.addEventListener("scroll", function () {
    if (scrollRaf !== null) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = null;
      document.querySelectorAll(SELECTOR).forEach(function (host) {
        const pinned = host.matches(":focus-within") || host.classList.contains("pinned");
        if (!pinned) return;
        const tip = getTip(host);
        if (!tip || getComputedStyle(tip).display === "none") return;
        // position() always raises z-index to 110; for pinned tooltips
        // that have already been "demoted" on mouseleave we want to
        // keep their current z-index so a separately hovered tooltip
        // can still layer on top.
        const savedZ = tip.style.zIndex;
        position(host);
        tip.style.zIndex = savedZ;
      });
    });
  }, { passive: true });

  // Explicit "pin" behavior. Clicking the question-mark adds a .pinned
  // class so the tooltip stays visible even when the window loses focus
  // (switching tabs/apps). Click outside any tooltip or trigger — or
  // press Escape — to unpin.
  function unpinHost(host) {
    host.classList.remove("pinned");
    // If nothing else is keeping the tooltip open (no hover, no focus),
    // clear the inline styles so it doesn't linger in its last position
    // the next time something briefly hovers it.
    if (!host.matches(":hover") && !host.matches(":focus-within")) {
      const tip = getTip(host);
      if (tip) reset(tip);
    }
  }

  function unpinAll() {
    document.querySelectorAll(".info-trigger.pinned").forEach(unpinHost);
  }

  document.addEventListener("click", function (e) {
    const trigger = e.target.closest(".info-trigger");
    if (trigger) {
      // Only one tooltip pinned at a time — unpin any others first.
      document.querySelectorAll(".info-trigger.pinned").forEach(function (h) {
        if (h !== trigger) unpinHost(h);
      });
      trigger.classList.add("pinned");
      return;
    }
    // Clicks inside an already-open tooltip body don't unpin.
    if (e.target.closest(".info-tooltip")) return;
    unpinAll();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") unpinAll();
  });
})();
