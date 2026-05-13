/* canaireview — interactive figures
 *
 * Top row (cohort trends): L1 distance + Correlation, both line charts
 * over model release date. Two lineages (Opus, GPT). Hover shows model
 * name, release date, and value. The dropdown can highlight one point.
 *
 * Bottom row (per-model detail): Score histogram + per-paper scatter.
 * Both react to the dropdown. Default selection is "all-model average".
 */

// ============================================================
// Data
// ============================================================

// Trend data. l1 = L1 distributional distance to pooled human reference.
// corr = Pearson r between AI score and a single randomly chosen human
// reviewer (one paper contributes both (ai, h1) and (ai, h2) rows).
// corr_lo / corr_hi = 95% paper-clustered bootstrap CI (2000 reps).
// All numbers from code/analysis/compute_ai_vs_single_human_raw.py
// output on raw 2-reviewer sample (no pure-fit comment classifier
// applied — consistent with the website's "no written comment" claim).
// n ranges from 1,799 to 1,946 papers depending on the model.
// Release dates verified via vendor announcements (Nov 2025 - Apr 2026).
// pred_top, pred_mid = |β_H|/|β_AI| in the top-tail and middle score
// regions, computed from each model's Poisson PML citation regression.
// Top values > 1 (humans dominate top tail). Middle values < 1 (AI
// dominates middle). Plotting both on a log scale makes the symmetry
// visible: as AI improves, top decreases toward 1 from above and
// middle decreases away from 1 below.
const TREND_DATA = {
  opus: [
    { key: "opus-4.5", name: "Opus 4.5", date: "2025-11-24", l1: 0.814, corr: 0.184, corr_lo: 0.150, corr_hi: 0.220, pred_top: 4.03, pred_mid: 0.261 },
    { key: "opus-4.6", name: "Opus 4.6", date: "2026-02-05", l1: 0.650, corr: 0.207, corr_lo: 0.172, corr_hi: 0.240, pred_top: 2.30, pred_mid: 0.238 },
    { key: "opus-4.7", name: "Opus 4.7", date: "2026-04-16", l1: 0.454, corr: 0.257, corr_lo: 0.225, corr_hi: 0.291, pred_top: 1.33, pred_mid: 0.097 },
  ],
  gpt: [
    { key: "gpt-5.1",  name: "GPT-5.1",  date: "2025-11-12", l1: 0.898, corr: 0.110, corr_lo: 0.073, corr_hi: 0.145, pred_top: 3.00, pred_mid: 0.714 },
    { key: "gpt-5.4",  name: "GPT-5.4",  date: "2026-03-05", l1: 0.734, corr: 0.162, corr_lo: 0.127, corr_hi: 0.196, pred_top: 28.36, pred_mid: 0.398 },
    { key: "gpt-5.5",  name: "GPT-5.5",  date: "2026-04-23", l1: 0.449, corr: 0.176, corr_lo: 0.141, corr_hi: 0.209, pred_top: 4.65, pred_mid: 0.105 },
  ],
};

// Human-to-human Pearson r reference line for the correlation chart.
// 0.189 = correlation between two random human reviewers on the same
// paper (n = 2,029 papers with two raw reviews; 95% paper-clustered
// bootstrap CI [0.145, 0.231]). See
// code/analysis/compute_human_inter_reviewer_correlation_raw.py.
const H2H_R    = 0.189;
const H2H_R_LO = 0.145;
const H2H_R_HI = 0.231;

// Theoretical maximum for r(AI, single human) under the variance-
// components model: an oracle AI that perfectly recovers true paper
// quality would correlate with a randomly chosen single human at exactly
// sqrt(H2H_R), because each human's score is paper signal + reviewer-
// specific noise and only the paper part is predictable.
const R_THEORETICAL_MAX = Math.sqrt(H2H_R);

// Visual styling for the human-to-human reference and its CI band.
// RGB / alpha kept as separate constants so the toggle-animation helper
// can interpolate alpha without re-parsing the rgba string.
const H2H_BAND_RGB   = "120, 120, 120";
const H2H_BAND_ALPHA = 0.14;
const H2H_BAND_FILL  = `rgba(${H2H_BAND_RGB}, ${H2H_BAND_ALPHA})`;
const H2H_LINE_COLOR = "#666";

// Legend-toggle animation duration. Matches the chart's default 600ms
// transition (set in buildLineChart options) so the custom band fade
// finishes at the same moment as Chart.js's built-in line fade.
const TOGGLE_ANIM_MS = 600;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Per-model histograms and 5x5 heatmaps (computed from cleaned_master joined
// with all_v1_baseline.csv; see the code/make_paper_figures.py / direct python
// dump that produced website/figures_data.json).
const FIG_DATA = {
  human_hist: [11.75, 26.9, 30.11, 23.83, 7.4],
  models: {
    "all":       { hist: [0.92, 52.53, 36.0, 9.93, 0.62],
                    heatmap: [
                      [0.18, 5.60, 4.95, 1.04, 0.05],
                      [0.30, 13.78, 10.78, 1.96, 0.07],
                      [0.20, 18.69, 11.24, 1.97, 0.09],
                      [0.18, 11.74, 7.74, 4.43, 0.30],
                      [0.05, 2.66, 1.27, 0.49, 0.10],
                    ] },
    "opus-4.7":  { hist: [0.25, 21.27, 52.54, 24.10, 1.84],
                    heatmap: [
                      [0.04, 1.93, 6.74, 2.95, 0.21],
                      [0.04, 5.94, 16.03, 5.90, 0.45],
                      [0.04, 7.82, 17.44, 6.84, 0.45],
                      [0.12, 4.96, 11.30, 7.71, 0.66],
                      [0.04, 0.62, 1.03, 0.70, 0.08],
                    ] },
    "opus-4.6":  { hist: [1.02, 49.26, 40.25, 9.17, 0.29],
                    heatmap: [
                      [0.16, 5.86, 5.20, 0.61, 0.04],
                      [0.41, 14.13, 11.75, 1.97, 0.04],
                      [0.16, 19.01, 12.41, 1.27, 0.16],
                      [0.20, 8.93, 9.42, 4.91, 0.04],
                      [0.08, 1.31, 1.47, 0.41, 0.04],
                    ] },
    "opus-4.5":  { hist: [0.0, 66.82, 30.89, 2.21, 0.08],
                    heatmap: [
                      [0.0, 8.40, 3.36, 0.16, 0.0],
                      [0.0, 17.74, 9.71, 0.66, 0.04],
                      [0.0, 25.85, 7.95, 0.45, 0.0],
                      [0.0, 12.33, 8.15, 0.86, 0.04],
                      [0.0, 2.50, 1.72, 0.08, 0.0],
                    ] },
    "gpt-5.5":   { hist: [3.11, 46.95, 32.53, 16.67, 0.74],
                    heatmap: [
                      [0.61, 5.41, 4.18, 2.91, 0.00],
                      [0.78, 12.91, 9.71, 6.15, 0.20],
                      [0.86, 18.27, 10.94, 4.55, 0.20],
                      [0.66, 9.10, 6.84, 2.62, 0.29],
                      [0.20, 1.27, 0.86, 0.45, 0.04],
                    ] },
    "gpt-5.4":   { hist: [0.08, 59.07, 34.67, 5.85, 0.33],
                    heatmap: [
                      [0.0, 7.12, 5.20, 0.66, 0.04],
                      [0.0, 16.04, 12.07, 1.85, 0.08],
                      [0.04, 21.71, 10.93, 1.27, 0.04],
                      [0.0, 11.95, 5.61, 1.84, 0.16],
                      [0.04, 2.25, 0.86, 0.20, 0.0],
                    ] },
    "gpt-5.1":   { hist: [1.07, 71.80, 25.12, 1.59, 0.43],
                    heatmap: [
                      [0.34, 9.13, 2.36, 0.04, 0.04],
                      [0.21, 19.46, 7.45, 0.30, 0.04],
                      [0.30, 26.10, 6.04, 0.34, 0.13],
                      [0.21, 14.36, 8.59, 0.69, 0.21],
                      [0.04, 2.79, 0.69, 0.21, 0.04],
                    ] },
  },
  // for histogram x-axis: scores 1..5
  scores: [1, 2, 3, 4, 5],
};

const MODEL_LABELS = {
  "all":      "All-model average",
  "opus-4.7": "Anthropic Opus 4.7",
  "opus-4.6": "Anthropic Opus 4.6",
  "opus-4.5": "Anthropic Opus 4.5",
  "gpt-5.5":  "OpenAI GPT-5.5",
  "gpt-5.4":  "OpenAI GPT-5.4",
  "gpt-5.1":  "OpenAI GPT-5.1",
};

// ============================================================
// Style constants
// ============================================================

// Modern, editorial palette: warm terracotta vs cool ocean blue.
// Each vendor has a "dark" variant used for the highlighted state.
const COLORS = {
  opus:      "#c2553d",
  opusDark:  "#7e2d1c",
  gpt:       "#34618d",
  gptDark:   "#1f3f5e",
  human:     "#7c7565",
};

// Distinct shapes for the two vendor lineages.
// Squares read visually smaller than circles at the same nominal radius,
// so we scale GPT's marker up so they feel evenly weighted against Opus.
const SHAPES = {
  opus: "circle",
  gpt:  "rect",
};
const SHAPE_SCALE = {
  opus: 1.0,
  gpt:  1.3,
};
const BASE_RADIUS  = 6;
const HIGH_RADIUS  = 10;
const HOVER_RADIUS = 9;

Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#444";

if (window["chartjs-plugin-annotation"]) {
  Chart.register(window["chartjs-plugin-annotation"]);
}

// Default point look: outlined (white fill, colored border).
// Highlight (per-point) overrides via the `pointBackgroundColor` /
// `pointBorderColor` arrays set in applyHighlight().
const POINT_BASE = {
  pointRadius: 6,
  pointHoverRadius: 9,
  pointBorderWidth: 2.4,
  pointBackgroundColor: "#fff",
  borderWidth: 2.8,
  tension: 0.22,    // gentle bezier-like curve between releases
};

// ============================================================
// X-axis: only Nov 2025 and Apr 2026 labeled
// ============================================================

const X_MIN = "2025-10-15";
const X_MAX = "2026-05-15";

// Custom: only two labeled ticks, positioned at ~2/3 of each month so
// the labels sit visually close to where the data lives, not at the
// month boundary.
const TICK_NOV = new Date(2025, 10, 20).getTime();
const TICK_APR = new Date(2026,  3, 20).getTime();

const X_AXIS_TIME = {
  type: "time",
  min: X_MIN,
  max: X_MAX,
  time: { unit: "month", tooltipFormat: "MMM d, yyyy" },
  afterBuildTicks: function (scale) {
    scale.ticks = [
      { value: TICK_NOV, major: true },
      { value: TICK_APR, major: true },
    ];
  },
  ticks: {
    autoSkip: false,
    maxRotation: 0,
    color: "#666",
    font: { size: 10 },
    callback: function (value) {
      if (value === TICK_NOV) return "Nov 2025";
      if (value === TICK_APR) return "Apr 2026";
      return "";
    },
  },
  grid: { display: false },
  border: { color: "#bbb" },
};

// Y-axis with two numeric ticks (at min and max) AND semantic-pole
// annotations inside the chart corners. The numeric ticks keep the
// scale legible; the corner annotations explain what the poles mean.
// The corner labels are drawn INSIDE the chart by cornerLabelsPlugin
// (defined below) so they don't eat horizontal margin on the left.
function makeYAxisConfig({ min, max, topLabel, bottomLabel, tickDecimals = 0 }) {
  return {
    axis: {
      min, max,
      afterBuildTicks: function (scale) {
        scale.ticks = [{ value: min }, { value: max }];
      },
      // Force a consistent y-axis box across charts in the trend row
      // so wider tick labels (e.g. "0.435") don't shrink the plot
      // area relative to charts with narrow labels (e.g. "2"). The
      // width has to accommodate the widest label across all charts
      // in the row plus the tick padding.
      afterFit: function (scale) {
        scale.width = 44;
      },
      ticks: {
        autoSkip: false,
        padding: 6,
        color: "#666",
        font: { size: 10 },
        maxRotation: 0,
        callback: (v) => {
          if (Math.abs(v - max) < 1e-6) return max.toFixed(tickDecimals);
          if (Math.abs(v - min) < 1e-6) return min.toFixed(0);
          return "";
        },
      },
      grid: { display: false },
      border: { color: "#bbb" },
    },
    corner: { topLabel, bottomLabel },
  };
}

const Y_CFG_L1 = makeYAxisConfig({
  min: 0,
  max: 2,
  topLabel: "completely different from humans",
  bottomLabel: "identical to humans",
  tickDecimals: 0,
});

const Y_CFG_CORR = makeYAxisConfig({
  min: 0,
  max: R_THEORETICAL_MAX,
  topLabel: "theoretical maximum (see paper)",
  bottomLabel: "no agreement",
  tickDecimals: 3,
});

// Predictive-edge chart (Figure 6). Y is the ratio |β_H| / |β_AI| in
// the TOP TAIL score region (mean ≤ 1.5) on a LOG scale, which is
// the natural scale for a ratio of two estimates and which gracefully
// handles outliers (GPT-5.4's β_AI was nearly zero, blowing up its
// point estimate). Values above 1 = humans dominate; values closer
// to 1 = AI is closing the gap. Reference at y=1 = parity.
const Y_CFG_PRED = {
  axis: {
    type: "logarithmic",
    // Range chosen to fit both regions on one chart:
    //   top-tail ratios live in ~1 to ~30
    //   middle  ratios live in ~0.1 to ~1
    min: 0.05, max: 50,
    afterFit: (scale) => { scale.width = 44; },
    afterBuildTicks: (scale) => {
      scale.ticks = [
        { value: 0.1 }, { value: 1 }, { value: 10 },
      ];
    },
    ticks: {
      autoSkip: false,
      padding: 6,
      color: "#666",
      font: { size: 10 },
      maxRotation: 0,
      callback: (v) => {
        if (v === 1)  return "1";
        if (v === 10) return "10";
        if (Math.abs(v - 0.1) < 1e-6) return "0.1";
        return "";
      },
    },
    grid: { display: false },
    border: { color: "#bbb" },
  },
  corner: {
    topLabel: "humans predict citations better",
    bottomLabel: "AI predicts citations better",
  },
};

// Plugin: draws the top and bottom semantic-pole labels in the corners
// of the chart's plot area, hugging the left edge. Uses italic gray text
// so it reads as an annotation, not a data label.
const cornerLabelsPlugin = {
  id: "cornerLabels",
  afterDatasetsDraw(chart) {
    const cfg = chart.options.plugins.cornerLabels;
    if (!cfg) return;
    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "italic 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
    ctx.fillStyle = "#888";
    if (cfg.topLabel) {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(cfg.topLabel, xScale.left + 4, yScale.top + 2);
    }
    if (cfg.bottomLabel) {
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(cfg.bottomLabel, xScale.left + 4, yScale.bottom - 2);
    }
    ctx.restore();
  },
};
Chart.register(cornerLabelsPlugin);

// Plugin: draws italic gray text anchored to a specific y-value in the
// data space, used for Tufte-style direct labeling of reference lines
// (e.g., the human-to-human correlation dashed line on the trend
// chart). Each label: { y, text, align?, offset? }.
const yAnchoredLabelPlugin = {
  id: "yAnchoredLabel",
  afterDatasetsDraw(chart) {
    const cfg = chart.options.plugins.yAnchoredLabel;
    if (!cfg || !cfg.labels || !cfg.labels.length) return;
    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "italic 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
    ctx.fillStyle = "#888";
    for (const label of cfg.labels) {
      if (label.y == null || !label.text) continue;
      const yPx = yScale.getPixelForValue(label.y);
      const align = label.align === "right" ? "right" : "left";
      ctx.textAlign = align;
      ctx.textBaseline = "bottom";   // text sits just above the line
      const x = align === "right" ? xScale.right - 4 : xScale.left + 4;
      const offsetY = (label.offset != null) ? label.offset : -3;
      ctx.fillText(label.text, x, yPx + offsetY);
    }
    ctx.restore();
  },
};
Chart.register(yAnchoredLabelPlugin);

// Plugin: callout — italic gray label positioned anywhere in the
// plot area, with a thin leader line + small arrowhead pointing to
// a specific (anchorX, anchorY) target. Used when a feature being
// labeled sits in a region too crowded with data to host the text
// itself (e.g., the dashed h-to-h reference line on the trend chart,
// which is surrounded by both vendors' error bars).
const calloutPlugin = {
  id: "callout",
  afterDatasetsDraw(chart) {
    const cfg = chart.options.plugins.callout;
    if (!cfg || !cfg.items || !cfg.items.length) return;
    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "italic 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";

    for (const item of cfg.items) {
      ctx.fillStyle = "#888";
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.8;

      // Text in italic gray, top-left aligned to a data-space y.
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const textX = xScale.left + 6;
      const textY = yScale.getPixelForValue(item.textY);
      ctx.fillText(item.text, textX, textY);

      // Leader: short vertical line + arrowhead pointing AT the
      // anchor line, automatically flipping its start side and
      // arrow direction based on whether the anchor is above or
      // below the text. Default x sits just inside the plot's left
      // edge — the empty Oct/early-Nov zone before any data point.
      const textHeight = 10;
      const fromX = (item.leaderX != null)
        ? item.leaderX
        : xScale.left + 8;
      const textTopPx = textY;
      const textBottomPx = textY + textHeight;
      const toY = yScale.getPixelForValue(item.anchorY);
      const anchorAbove = toY < textTopPx;
      const fromY = anchorAbove ? textTopPx - 2 : textBottomPx + 2;
      const toX = fromX;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Small arrowhead — V shape opens away from the line so it
      // visually points AT the line, regardless of direction.
      const ah = 3.2;
      const ay = anchorAbove ? toY + ah : toY - ah;
      ctx.beginPath();
      ctx.moveTo(toX - ah, ay);
      ctx.lineTo(toX, toY);
      ctx.lineTo(toX + ah, ay);
      ctx.stroke();
    }
    ctx.restore();
  },
};
Chart.register(calloutPlugin);

// Plugin: draws multi-line italic annotation blocks in the upper
// corners of the plot area. Used by the scatter chart for an inside-
// the-chart "legend" — actual model's OLS on the left (tinted in the
// line color) and the theoretical ceiling on the right (in gray to
// match the dashed reference line). Each block: { align, color,
// lines: [...] }.
const olsAnnotationPlugin = {
  id: "olsAnnotation",
  afterDatasetsDraw(chart) {
    const cfg = chart.options.plugins.olsAnnotation;
    if (!cfg || !cfg.blocks || !cfg.blocks.length) return;
    const yScale = chart.scales.y;
    const xScale = chart.scales.x;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "italic 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
    ctx.textBaseline = "top";

    // Measure each block's max line width so we can detect whether the
    // left and right blocks would visually collide at the current chart
    // width. At narrow chart sizes we suppress the right block (which
    // carries the theoretical-best numbers) rather than let it overlap
    // the left block — the dashed line itself still communicates the
    // theoretical ceiling.
    const measureBlockWidth = (lines) => {
      let max = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > max) max = w;
      }
      return max;
    };

    const leftBlocks  = cfg.blocks.filter((b) => b.align !== "right");
    const rightBlocks = cfg.blocks.filter((b) => b.align === "right");
    const plotLeft  = xScale.left + 8;
    const plotRight = xScale.right - 8;
    const plotWidth = plotRight - plotLeft;
    const leftMaxW  = leftBlocks.reduce(
      (m, b) => Math.max(m, measureBlockWidth(b.lines || [])), 0);
    const rightMaxW = rightBlocks.reduce(
      (m, b) => Math.max(m, measureBlockWidth(b.lines || [])), 0);
    const overlap = leftMaxW + rightMaxW + 24 > plotWidth;

    // Draw left blocks always.
    for (const block of leftBlocks) {
      const lines = block.lines || [];
      if (!lines.length) continue;
      ctx.textAlign = "left";
      ctx.fillStyle = block.color || "#777";
      let y = yScale.top + 4;
      for (const line of lines) {
        ctx.fillText(line, plotLeft, y);
        y += 14;
      }
    }

    // Draw right blocks only when there's room.
    if (!overlap) {
      for (const block of rightBlocks) {
        const lines = block.lines || [];
        if (!lines.length) continue;
        ctx.textAlign = "right";
        ctx.fillStyle = block.color || "#777";
        let y = yScale.top + 4;
        for (const line of lines) {
          ctx.fillText(line, plotRight, y);
          y += 14;
        }
      }
    }
    ctx.restore();
  },
};
Chart.register(olsAnnotationPlugin);

// Per-chart, per-vendor whisker opacity. Lives outside Chart.js so the
// errorBarsPlugin can multiply it into the stroke alpha each frame; the
// fadeWhiskers helper interpolates it on legend toggles.
const whiskerOpacityState = new WeakMap();

function getWhiskerOpacity(chart, vendorIdx) {
  const map = whiskerOpacityState.get(chart);
  if (!map || map[vendorIdx] === undefined) return 1.0;
  return map[vendorIdx];
}

function setWhiskerOpacity(chart, vendorIdx, alpha) {
  let map = whiskerOpacityState.get(chart);
  if (!map) {
    map = {};
    whiskerOpacityState.set(chart, map);
  }
  map[vendorIdx] = alpha;
}

// Combine a "#rrggbb" base color with an alpha into a usable rgba string.
function colorWithAlpha(hex, alpha) {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Plugin: draws per-marker error bars (whiskers) instead of a continuous
// band. A band misleadingly implies the CI is a continuous function of
// time, but we only have CIs at discrete release points. Whiskers at each
// marker spanning [lo, hi] are the honest representation.
//
// Stroke alpha is multiplied by the per-vendor whisker opacity from
// whiskerOpacityState, so fading the line via the legend smoothly fades
// the whiskers on the exact same 600ms curve (driven by fadeWhiskers).
const errorBarsPlugin = {
  id: "errorBars",
  afterDatasetsDraw(chart) {
    const cfg = chart.options.plugins.errorBars;
    if (!cfg || !cfg.series) return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const ctx = chart.ctx;
    cfg.series.forEach(({ points, color, mainDatasetIndex }) => {
      const opacity = mainDatasetIndex !== undefined
        ? getWhiskerOpacity(chart, mainDatasetIndex)
        : 1.0;
      if (opacity <= 0.001) return;
      ctx.save();
      ctx.strokeStyle = colorWithAlpha(color, opacity);
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      const cap = 4;
      points.forEach((p) => {
        const x = xScale.getPixelForValue(new Date(p.x).getTime());
        const yLo = yScale.getPixelForValue(p.lo);
        const yHi = yScale.getPixelForValue(p.hi);
        ctx.beginPath();
        ctx.moveTo(x, yLo);
        ctx.lineTo(x, yHi);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - cap, yHi);
        ctx.lineTo(x + cap, yHi);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - cap, yLo);
        ctx.lineTo(x + cap, yLo);
        ctx.stroke();
      });
      ctx.restore();
    });
  },
};
Chart.register(errorBarsPlugin);

// Helper: dense points along a horizontal flat line at y=value across
// the chart's full x-range. Used to give the reference line enough
// hit-points that hovering anywhere along it fires a tooltip — even
// though the line is drawn pointless.
function flatLinePoints(y, n, extras = {}) {
  const startTime = new Date(X_MIN).getTime();
  const endTime = new Date(X_MAX).getTime();
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = startTime + (endTime - startTime) * (i / n);
    const dateStr = new Date(t).toISOString().slice(0, 10);
    out.push({ x: dateStr, y, ...extras });
  }
  return out;
}

// ============================================================
// Helpers
// ============================================================

const fmtDate = (d) => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

function pointsFor(vendor, metric) {
  return TREND_DATA[vendor].map((m) => {
    const point = { x: m.date, y: m[metric], name: m.name, key: m.key };
    // Include CI on each point if the metric has _lo / _hi values
    // defined in TREND_DATA. Currently only `corr` has CIs.
    if (m[`${metric}_lo`] !== undefined) {
      point.ciLo = m[`${metric}_lo`];
      point.ciHi = m[`${metric}_hi`];
    }
    return point;
  });
}

function tooltipCallbacks(metricLabel) {
  return {
    title: (items) => {
      if (!items.length) return "";
      const r = items[0].raw;
      if (r && r.isRef) return "Human-to-human correlation";
      return r && r.name ? r.name : "";
    },
    label: (item) => {
      const r = item.raw;
      if (r.isRef) {
        return `${metricLabel} = ${r.y.toFixed(3)}  (95% CI [${r.ciLo.toFixed(3)}, ${r.ciHi.toFixed(3)}])`;
      }
      if (r.ciLo !== undefined && r.ciHi !== undefined) {
        return `${metricLabel} = ${r.y.toFixed(3)}  [95% CI ${r.ciLo.toFixed(3)}, ${r.ciHi.toFixed(3)}]  (released ${fmtDate(r.x)})`;
      }
      return `${metricLabel} = ${r.y.toFixed(3)}  (released ${fmtDate(r.x)})`;
    },
  };
}

// Per-point styling. Two emphasis paths:
//   (1) When a model is picked via the dropdown, that point gets filled
//       solid in the vendor color and bumped up in radius.
//   (2) When NO model is picked, the LATEST release of each vendor is
//       softly emphasized (filled, larger) so the eye lands on "where
//       we are now" while the older releases stay outlined as context.
function latestKeyOf(vendor) {
  const arr = TREND_DATA[vendor];
  return arr[arr.length - 1].key;
}
function isFocus(vendor, modelEntry, selectedKey) {
  if (selectedKey) return modelEntry.key === selectedKey;
  return modelEntry.key === latestKeyOf(vendor);
}
function pointRadii(vendor, selectedKey) {
  const s = SHAPE_SCALE[vendor];
  return TREND_DATA[vendor].map(m =>
    isFocus(vendor, m, selectedKey) ? HIGH_RADIUS * s : BASE_RADIUS * s
  );
}
function pointBorderWidths(vendor, selectedKey) {
  return TREND_DATA[vendor].map(m =>
    isFocus(vendor, m, selectedKey) ? 0 : 2.4
  );
}
function pointFillColors(vendor, selectedKey) {
  const base = vendor === "opus" ? COLORS.opus : COLORS.gpt;
  return TREND_DATA[vendor].map(m =>
    isFocus(vendor, m, selectedKey) ? base : "#fff"
  );
}
function pointBorderColors(vendor, selectedKey) {
  const base = vendor === "opus" ? COLORS.opus : COLORS.gpt;
  return TREND_DATA[vendor].map(_ => base);  // border is always the base color
}

// ============================================================
// Selection state
// ============================================================
// Tracks the dropdown's current value; legend click handlers consult this
// to decide whether to allow hiding a vendor series (we lock the vendor
// whose model is currently highlighted).
let currentSelection = "all";

function vendorOfKey(key) {
  if (!key || key === "all") return null;
  return key.startsWith("opus") ? "opus" : "gpt";
}

// In-flight requestAnimationFrame ids — one per chart for the h2h set,
// one per (chart, vendor) for the whiskers. Used to cancel a previous
// fade when a rapid second click comes in.
const h2hAnimFrames = new WeakMap();
const whiskerAnimFrames = new WeakMap();

// Logical visibility intent for the h2h reference set. Needed because
// the line dataset stays "visible" during a hide animation (we delay the
// real meta.hidden flip until the fade completes); if we read the dataset
// state directly, a click mid-fade would not know the right direction to
// flip. Defaults to true (visible on first load).
const h2hIntendedVisible = new WeakMap();

function getH2HIntent(chart) {
  const v = h2hIntendedVisible.get(chart);
  return v === undefined ? true : v;
}

// Animate per-vendor whisker opacity. Runs in parallel with Chart.js's
// own line-fade for the corresponding vendor dataset, on the same 600ms
// ease-out curve, so the whiskers finish vanishing at the exact moment
// the marker + line do.
//
// IMPORTANT: this tick does NOT call chart.update(). Chart.js's own
// show/hide animation on the line dataset already redraws the chart at
// 60 fps, and the errorBarsPlugin reads the latest whisker opacity on
// every redraw. Calling chart.update("none") from here would cancel
// Chart.js's animation each frame and the line would just snap.
function fadeWhiskers(chart, vendorIdx, willBeVisible) {
  let animMap = whiskerAnimFrames.get(chart);
  if (!animMap) {
    animMap = {};
    whiskerAnimFrames.set(chart, animMap);
  }
  if (animMap[vendorIdx]) cancelAnimationFrame(animMap[vendorIdx]);

  const fromAlpha = getWhiskerOpacity(chart, vendorIdx);
  const toAlpha   = willBeVisible ? 1 : 0;
  const startTime = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - startTime) / TOGGLE_ANIM_MS);
    const eased = easeOutCubic(t);
    const alpha = fromAlpha + (toAlpha - fromAlpha) * eased;
    setWhiskerOpacity(chart, vendorIdx, alpha);
    if (t < 1) {
      animMap[vendorIdx] = requestAnimationFrame(tick);
    } else {
      delete animMap[vendorIdx];
      // Single final redraw to lock the end state in, in case Chart.js's
      // own line animation finished a hair earlier (no animation = no
      // auto-redraw, and we'd otherwise be stuck on the second-to-last
      // opacity value).
      chart.update("none");
    }
  }
  animMap[vendorIdx] = requestAnimationFrame(tick);
}

// Animate the h2h reference set (dashed line + shaded CI band) end-to-end
// by hand. Chart.js's chart.hide() flips the dataset hidden flag right
// away and stops drawing, so a dashed line "doesn't fade — it just blinks
// out." Instead we keep the dataset visible throughout the animation,
// drive borderColor / backgroundColor alpha externally, and only flip
// the real visibility flag at the very end (so the legend strikethrough
// settles a hair after the fade — close enough to feel synchronized).
function toggleH2HSet(chart, willBeVisible) {
  const prev = h2hAnimFrames.get(chart);
  if (prev) cancelAnimationFrame(prev);

  const lineIdx = chart.data.datasets.findIndex(
    (ds) => ds.label && ds.label.startsWith("Human-to-human")
  );
  const bandUpperIdx = chart.data.datasets.findIndex(
    (ds) => ds.label === "_h2h_band_upper"
  );
  const bandLowerIdx = chart.data.datasets.findIndex(
    (ds) => ds.label === "_h2h_band_lower"
  );
  if (lineIdx === -1) return;

  h2hIntendedVisible.set(chart, willBeVisible);

  // On show: bring datasets into visibility immediately so subsequent
  // draws actually run, but start their colors at zero alpha so the
  // fade-in has somewhere to come from.
  if (willBeVisible) {
    chart.setDatasetVisibility(lineIdx, true);
    if (bandUpperIdx !== -1) chart.setDatasetVisibility(bandUpperIdx, true);
    if (bandLowerIdx !== -1) chart.setDatasetVisibility(bandLowerIdx, true);
    chart.data.datasets[lineIdx].borderColor = "rgba(102, 102, 102, 0)";
    if (bandUpperIdx !== -1) {
      chart.data.datasets[bandUpperIdx].backgroundColor =
        `rgba(${H2H_BAND_RGB}, 0)`;
    }
  }

  // Read CURRENT alpha out of the dataset (handles mid-animation cancel
  // cleanly — pick up where we left off rather than snapping back to 0/1).
  const currentLineRgba = chart.data.datasets[lineIdx].borderColor;
  const currentBandRgba = bandUpperIdx !== -1
    ? chart.data.datasets[bandUpperIdx].backgroundColor
    : null;
  const fromLineAlpha = alphaFromRgba(currentLineRgba, 1);
  const fromBandAlpha = alphaFromRgba(currentBandRgba, H2H_BAND_ALPHA);
  const toLineAlpha   = willBeVisible ? 1 : 0;
  const toBandAlpha   = willBeVisible ? H2H_BAND_ALPHA : 0;
  const startTime = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - startTime) / TOGGLE_ANIM_MS);
    const eased = easeOutCubic(t);
    const lineAlpha = fromLineAlpha + (toLineAlpha - fromLineAlpha) * eased;
    const bandAlpha = fromBandAlpha + (toBandAlpha - fromBandAlpha) * eased;
    chart.data.datasets[lineIdx].borderColor =
      `rgba(102, 102, 102, ${lineAlpha})`;
    if (bandUpperIdx !== -1) {
      chart.data.datasets[bandUpperIdx].backgroundColor =
        `rgba(${H2H_BAND_RGB}, ${bandAlpha})`;
    }
    chart.update("none");
    if (t < 1) {
      h2hAnimFrames.set(chart, requestAnimationFrame(tick));
    } else {
      // Reset to canonical colors so a future show starts cleanly.
      chart.data.datasets[lineIdx].borderColor = H2H_LINE_COLOR;
      if (bandUpperIdx !== -1) {
        chart.data.datasets[bandUpperIdx].backgroundColor = H2H_BAND_FILL;
      }
      if (!willBeVisible) {
        chart.setDatasetVisibility(lineIdx, false);
        if (bandUpperIdx !== -1) chart.setDatasetVisibility(bandUpperIdx, false);
        if (bandLowerIdx !== -1) chart.setDatasetVisibility(bandLowerIdx, false);
      }
      chart.update("none");
      h2hAnimFrames.delete(chart);
    }
  }
  h2hAnimFrames.set(chart, requestAnimationFrame(tick));
}

// Extract the alpha channel out of an "rgba(r, g, b, a)" string. Used so
// mid-animation cancels can resume from the current displayed alpha
// instead of snapping back to the canonical start value.
function alphaFromRgba(rgba, fallback) {
  if (typeof rgba !== "string") return fallback;
  const m = rgba.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  if (m) return parseFloat(m[1]);
  return fallback;
}

// Custom legend onClick. Three responsibilities:
//   (1) Vendor lock: block hiding Opus / GPT if the dropdown is currently
//       highlighting a model from that vendor.
//   (2) For Opus / GPT (idx 0/1): use Chart.js's normal show/hide for
//       line + markers, then fade the whiskers in parallel.
//   (3) For the h2h line (idx 4): fully manual fade for both the dashed
//       line and the CI band, because Chart.js's dataset hide is too
//       abrupt for a stroke-only / fill-only dataset.
function lockedLegendOnClick(e, legendItem, legend) {
  const idx = legendItem.datasetIndex;
  const chart = legend.chart;
  if (idx < 2) {
    const vendor = idx === 0 ? "opus" : "gpt";
    if (vendorOfKey(currentSelection) === vendor) {
      return;
    }
  }
  const mainLabel = chart.data.datasets[idx].label || "";

  if (mainLabel.startsWith("Human-to-human")) {
    const willBeVisible = !getH2HIntent(chart);
    legendItem.hidden = !willBeVisible;
    toggleH2HSet(chart, willBeVisible);
    return;
  }

  const willBeVisible = !chart.isDatasetVisible(idx);
  if (willBeVisible) chart.show(idx);
  else chart.hide(idx);
  legendItem.hidden = !willBeVisible;
  if (idx === 0 || idx === 1) {
    fadeWhiskers(chart, idx, willBeVisible);
  }
}

// ============================================================
// Top row: line charts (L1, correlation)
// ============================================================

function buildLineChart(canvasId, metric, metricLabel, yCfg) {
  return new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      datasets: [
        {
          label: "Anthropic Opus",
          data: pointsFor("opus", metric),
          borderColor: COLORS.opus,
          pointStyle: SHAPES.opus,
          ...POINT_BASE,
          pointHoverRadius: HOVER_RADIUS * SHAPE_SCALE.opus,
          order: 2,
        },
        {
          label: "OpenAI GPT",
          data: pointsFor("gpt", metric),
          borderColor: COLORS.gpt,
          pointStyle: SHAPES.gpt,
          ...POINT_BASE,
          pointHoverRadius: HOVER_RADIUS * SHAPE_SCALE.gpt,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      layout: { padding: { top: 8, right: 18, bottom: 4, left: 4 } },
      animation: { duration: 600, easing: "easeOutCubic" },
      plugins: {
        legend: {
          position: "top", align: "end",
          // Conditional: hide-on-click is allowed UNLESS this vendor is
          // the one currently highlighted via the dropdown.
          onClick: lockedLegendOnClick,
          labels: {
            usePointStyle: true,
            boxWidth: 8, boxHeight: 8, padding: 14,
            font: { size: 11 }, color: "#333",
            // Hide datasets whose label starts with "_" (CI band fills
            // drawn at order=0) AND the human-to-human reference
            // line, which is now labeled directly on the chart in
            // Tufte style instead of via a legend entry.
            filter: (item) => !item.text.startsWith("_") &&
                              !item.text.startsWith("Human-to-human"),
            // Pin legend display order to dataset-array order. Without
            // this, Chart.js sorts legend items by dataset.order which
            // we use for z-depth, so the visible legend can disagree
            // with what a reader expects and clicks on the wrong thing.
            sort: (a, b) => a.datasetIndex - b.datasetIndex,
          },
        },
        tooltip: {
          backgroundColor: "rgba(20,20,20,0.92)",
          padding: 10,
          titleFont: { weight: "600", size: 12 },
          bodyFont: { size: 12 },
          callbacks: tooltipCallbacks(metricLabel),
          // Same filter as the legend — bands have no `name` on their
          // points and would render an empty tooltip row.
          filter: (item) => !item.dataset.label.startsWith("_"),
        },
        cornerLabels: yCfg.corner,
      },
      scales: { x: X_AXIS_TIME, y: yCfg.axis },
    },
  });
}

const chartL1   = buildLineChart("chart-l1",   "l1",   "L₁", Y_CFG_L1);
const chartCorr = buildLineChart("chart-corr", "corr", "r",  Y_CFG_CORR);

// Figure 6's chart has 4 series instead of 2 — top-tail and middle
// regions for each vendor — so it doesn't fit buildLineChart's
// 2-vendor template. Build it explicitly.
function predDataset(vendor, region) {
  const base = vendor === "opus" ? COLORS.opus : COLORS.gpt;
  const metric = region === "top" ? "pred_top" : "pred_mid";
  const isSolid = region === "top";
  return {
    label: `${vendor === "opus" ? "Opus" : "GPT"} · ${region === "top" ? "top tail" : "middle"}`,
    data: TREND_DATA[vendor].map((m) => ({ x: m.date, y: m[metric] })),
    borderColor: base,
    borderDash: isSolid ? [] : [3, 3],
    pointStyle: SHAPES[vendor],
    pointRadius: BASE_RADIUS * SHAPE_SCALE[vendor],
    pointHoverRadius: HOVER_RADIUS * SHAPE_SCALE[vendor],
    pointBorderWidth: 2.4,
    pointBackgroundColor: "#fff",
    pointBorderColor: base,
    borderWidth: 2.4,
    tension: 0.22,
    order: 2,
  };
}

const chartPred = new Chart(document.getElementById("chart-pred"), {
  type: "line",
  data: {
    datasets: [
      predDataset("opus", "top"),
      predDataset("gpt",  "top"),
      predDataset("opus", "mid"),
      predDataset("gpt",  "mid"),
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    layout: { padding: { top: 8, right: 18, bottom: 4, left: 4 } },
    animation: { duration: 600, easing: "easeOutCubic" },
    plugins: {
      legend: {
        position: "top", align: "end",
        labels: {
          usePointStyle: true,
          boxWidth: 14, boxHeight: 10, padding: 14,
          font: { size: 11 }, color: "#333",
          // Compact 2-item vendor legend. The region (top tail vs
          // middle) is communicated in-chart via direct labels and
          // line style (solid vs dashed), not via the legend.
          // `hidden` is computed from current visibility so the
          // legend item gets the strikethrough state when toggled.
          generateLabels: (chart) => [
            { text: "Anthropic Opus", fillStyle: "transparent",
              strokeStyle: COLORS.opus, lineWidth: 2.4,
              pointStyle: SHAPES.opus,
              hidden: !chart.isDatasetVisible(0),
              datasetIndex: 0 },
            { text: "OpenAI GPT", fillStyle: "transparent",
              strokeStyle: COLORS.gpt, lineWidth: 2.4,
              pointStyle: SHAPES.gpt,
              hidden: !chart.isDatasetVisible(1),
              datasetIndex: 1 },
          ],
        },
        // Click on a vendor toggles BOTH datasets for that vendor
        // (top-tail dataset at index v, middle dataset at index v+2).
        // Vendor-lock: if the model picker has selected this vendor,
        // refuse to hide it.
        onClick: (e, legendItem, legend) => {
          const chart = legend.chart;
          const vendorIdx = legendItem.datasetIndex; // 0=opus, 1=gpt
          const vendor = vendorIdx === 0 ? "opus" : "gpt";
          if (vendorOfKey(currentSelection) === vendor) return;
          const topIdx = vendorIdx;
          const midIdx = vendorIdx + 2;
          const willBeVisible = !chart.isDatasetVisible(topIdx);
          chart.setDatasetVisibility(topIdx, willBeVisible);
          chart.setDatasetVisibility(midIdx, willBeVisible);
          legendItem.hidden = !willBeVisible;
          chart.update();
        },
      },
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        titleFont: { weight: "600", size: 12 },
        bodyFont: { size: 12 },
        callbacks: {
          title: (items) => {
            if (!items.length) return "";
            const ds = items[0].dataset;
            return ds.label;
          },
          label: (item) => {
            const v = Number(item.parsed.y);
            return `|β_H| / |β_AI| = ${v.toFixed(2)}  (released ${fmtDate(item.parsed.x)})`;
          },
        },
        filter: (item) => !item.dataset.label.startsWith("_"),
      },
      cornerLabels: Y_CFG_PRED.corner,
      // Direct in-chart region labels — replace the role a 4-item
      // legend would play.
      yAnchoredLabel: {
        labels: [
          { y: 2.4, text: "top tail (solid)",  align: "right", offset: -1 },
          { y: 0.42, text: "middle (dashed)", align: "right", offset: -1 },
        ],
      },
    },
    scales: { x: X_AXIS_TIME, y: Y_CFG_PRED.axis },
  },
});

// Post-build setup for chart-corr:
//   (i) per-vendor CI as whiskers (custom plugin reads visibility flags
//       on the main vendor datasets, so toggling auto-syncs)
//   (ii) human-to-human CI as a shaded band (a constant, so a continuous
//       band IS the right representation here)
//   (iii) human-to-human reference line, densified with hit-points so
//        hovering anywhere along it fires a tooltip

// Whiskers plugin config (dataset indices 0/1 = opus/gpt main lines).
chartCorr.options.plugins.errorBars = {
  series: [
    {
      points: TREND_DATA.opus.map((m) => ({ x: m.date, lo: m.corr_lo, hi: m.corr_hi })),
      color: COLORS.opus,
      mainDatasetIndex: 0,
    },
    {
      points: TREND_DATA.gpt.map((m) => ({ x: m.date, lo: m.corr_lo, hi: m.corr_hi })),
      color: COLORS.gpt,
      mainDatasetIndex: 1,
    },
  ],
};

chartCorr.data.datasets.push(
  // ----- Human-to-human reference band (95% CI). Order 0 = background. -----
  {
    label: "_h2h_band_upper",
    data: [{ x: X_MIN, y: H2H_R_HI }, { x: X_MAX, y: H2H_R_HI }],
    borderColor: "transparent",
    backgroundColor: H2H_BAND_FILL,
    fill: "+1",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  {
    label: "_h2h_band_lower",
    data: [{ x: X_MIN, y: H2H_R_LO }, { x: X_MAX, y: H2H_R_LO }],
    borderColor: "transparent",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  // ----- Human-to-human reference line (visible, dashed). Order 1. -----
  // Dense data points along the line give Chart.js something to detect
  // hover against, so the tooltip fires when the user mouses near the
  // line — the points themselves render at radius 0.
  {
    label: `Human-to-human correlation (${H2H_R.toFixed(3)})`,
    data: flatLinePoints(H2H_R, 40, {
      isRef: true, ciLo: H2H_R_LO, ciHi: H2H_R_HI,
    }),
    borderColor: H2H_LINE_COLOR,
    borderDash: [5, 4],
    borderWidth: 1.4,
    pointRadius: 0,
    pointHoverRadius: 0,
    pointHitRadius: 12,
    pointStyle: "line",
    fill: false,
    spanGaps: true,
    order: 1,
  },
);
// Tufte-style callout for the dashed H2H reference line — text
// floats in the upper-left region (below the "theoretical maximum"
// label) with a thin leader line + arrowhead pointing down to the
// line at y=0.189. Avoids overlap with both vendors' error bars
// that cluster around the reference line in the middle of the chart.
chartCorr.options.plugins.callout = {
  items: [
    {
      text: `human-to-human correlation = ${H2H_R.toFixed(3)}`,
      textY: 0.33,   // text sits at this y (upper-left region)
      anchorY: H2H_R, // leader arrow points to the dashed line
    },
  ],
};
chartCorr.update();

// ----- Figure 6: predictive-edge chart -----
// Dashed reference line at y=1 (parity). Top-tail lines sit above
// it (humans dominate); middle lines sit below (AI dominates). The
// log axis makes the symmetry around this line visible.
chartPred.data.datasets.push({
  label: "_parity_ref",
  data: [{ x: X_MIN, y: 1 }, { x: X_MAX, y: 1 }],
  borderColor: H2H_LINE_COLOR,
  borderDash: [5, 4],
  borderWidth: 1.4,
  pointRadius: 0,
  pointHoverRadius: 0,
  pointStyle: "line",
  fill: false,
  order: 1,
});

// Callout for the parity reference. Text sits just below the line
// (in the empty band between the parity line and the middle-region
// data), arrow pointing UP to the line.
chartPred.options.plugins.callout = {
  items: [
    {
      text: "AI matches humans at this line",
      textY: 0.5,
      anchorY: 1,
    },
  ],
};
chartPred.update();

// ============================================================
// Highlight selected model in top charts
// ============================================================

function applyHighlight(modelKey) {
  // When modelKey is "all" or falsy, every helper returns uniform default
  // values. Always assigning ARRAYS here (not scalars) avoids a Chart.js
  // quirk where switching from per-point arrays back to a scalar leaves
  // the array values cached on individual point elements.
  const key = (!modelKey || modelKey === "all") ? null : modelKey;
  const setVendorStyle = (ds, vendor) => {
    ds.pointRadius           = pointRadii(vendor, key);
    ds.pointBorderWidth      = pointBorderWidths(vendor, key);
    ds.pointBorderColor      = pointBorderColors(vendor, key);
    ds.pointBackgroundColor  = pointFillColors(vendor, key);
  };
  for (const chart of [chartL1, chartCorr]) {
    setVendorStyle(chart.data.datasets[0], "opus");
    setVendorStyle(chart.data.datasets[1], "gpt");
    chart.update();
  }
  // chartPred has 4 vendor datasets: opus_top=0, gpt_top=1, opus_mid=2, gpt_mid=3
  const p = chartPred.data.datasets;
  setVendorStyle(p[0], "opus");
  setVendorStyle(p[1], "gpt");
  setVendorStyle(p[2], "opus");
  setVendorStyle(p[3], "gpt");
  chartPred.update();
}

// ============================================================
// Bottom-left: histogram
//   AI bars (single dataset) + custom-drawn human reference rules.
//   The human distribution is static, so we render it as horizontal
//   line segments that sit ON TOP of the AI bars at their respective
//   percentages, each labeled. This keeps the human anchor always
//   visible regardless of which model the user picks.
// ============================================================

const SCORE_LABELS = ["1 (best)", "2", "3", "4", "5 (worst)"];
const HUMAN_HIST = FIG_DATA.human_hist;
const HUMAN_REF_COLOR = "#1f1f1f";   // strong but not pure black
const HUMAN_REF_WIDTH = 2.0;
const HUMAN_LABEL_COLOR = "#1f1f1f";
const HUMAN_LABEL_FONT = "600 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";

// Custom Chart.js plugin: draws a horizontal rule across each AI bar
// at the human percentage for that score, with the percentage label
// tucked just above the line.
const humanRefPlugin = {
  id: "humanRef",
  afterDatasetsDraw(chart) {
    const data = chart.options.plugins.humanRef?.data;
    if (!Array.isArray(data)) return;
    // Use the AI dataset's bar geometry for exact alignment
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;
    const yScale = chart.scales.y;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = HUMAN_REF_COLOR;
    ctx.lineWidth = HUMAN_REF_WIDTH;
    ctx.lineCap = "round";
    ctx.font = HUMAN_LABEL_FONT;
    ctx.fillStyle = HUMAN_LABEL_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (let i = 0; i < data.length; i++) {
      const bar = meta.data[i];
      if (!bar) continue;
      const value = data[i];
      const w = bar.width ?? 0;
      // Slightly extend the rule beyond the bar edges for an elegant
      // overhang; about 6% on each side.
      const overhang = w * 0.06;
      const xLeft  = bar.x - w / 2 - overhang;
      const xRight = bar.x + w / 2 + overhang;
      const y = yScale.getPixelForValue(value);

      ctx.beginPath();
      ctx.moveTo(xLeft, y);
      ctx.lineTo(xRight, y);
      ctx.stroke();

      // Label tucked above the line, with a near-white pill background so
      // the percentage stays readable when an AI bar reaches up under it.
      const text = `${value.toFixed(1)}%`;
      const tw = ctx.measureText(text).width;
      const th = 11;            // approx font cap height
      const padX = 4, padY = 1.5;
      const lift = 4;           // gap between rule and pill bottom
      const cx = bar.x;
      const top = y - lift - th - padY;
      const left = cx - tw / 2 - padX;
      const pillW = tw + 2 * padX;
      const pillH = th + 2 * padY;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      // Rounded pill (fall back to plain rect if roundRect not supported)
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(left, top, pillW, pillH, 2);
        ctx.fill();
      } else {
        ctx.fillRect(left, top, pillW, pillH);
      }
      ctx.fillStyle = HUMAN_LABEL_COLOR;
      ctx.fillText(text, cx, y - lift);
      ctx.restore();
    }
    ctx.restore();
  },
};
Chart.register(humanRefPlugin);

// Custom interaction mode for the histogram: hover only when the
// cursor is over the bar itself, with one exception — bars shorter
// than MIN_HIT_HEIGHT (~24 px, roughly <6% of the chart) get their
// hit rect extended upward to that minimum so the near-zero bars
// remain reachable. Tall bars use their drawn rect, no expansion.
Chart.Interaction.modes.barWithMinHit = function (chart, event, options, useFinalPosition) {
  const position = Chart.helpers.getRelativePosition(event, chart);
  const items = [];
  const MIN_HIT_HEIGHT = 24;
  chart.data.datasets.forEach((_, datasetIndex) => {
    const meta = chart.getDatasetMeta(datasetIndex);
    if (!meta || meta.hidden) return;
    meta.data.forEach((element, index) => {
      if (!element || element.skip) return;
      const { x, y, base, width } = element.getProps(
        ["x", "y", "base", "width"], useFinalPosition
      );
      const half = width / 2;
      const top = Math.min(y, base);
      const bottom = Math.max(y, base);
      const hitTop = Math.min(top, bottom - MIN_HIT_HEIGHT);
      if (
        position.x >= x - half && position.x <= x + half &&
        position.y >= hitTop && position.y <= bottom
      ) {
        items.push({ datasetIndex, index, element });
      }
    });
  });
  return items;
};

const chartHist = new Chart(document.getElementById("chart-hist"), {
  type: "bar",
  data: {
    labels: SCORE_LABELS,
    datasets: [
      {
        label: "AI: All-model average",
        data: FIG_DATA.models.all.hist,
        backgroundColor: COLORS.opus,
        borderColor: COLORS.opus,
        borderWidth: 0,
        borderRadius: 2,
        categoryPercentage: 0.85,
        barPercentage: 0.92,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 14, right: 12, bottom: 4, left: 4 } },
    animation: { duration: 600, easing: "easeOutCubic" },
    // Custom mode: hover the bar itself, but bars shorter than
    // ~24 px (≈6% of chart) get their hit rect extended up from the
    // baseline so the near-zero bars stay reachable.
    interaction: { mode: "barWithMinHit", intersect: true },
    plugins: {
      // Per-chart options for the custom human-reference plugin
      humanRef: { data: HUMAN_HIST },
      legend: {
        position: "top", align: "end",
        // Synthesize a two-item legend: AI bar + Human reference rule
        labels: {
          padding: 14,
          font: { size: 11 },
          color: "#333",
          usePointStyle: true,
          generateLabels: (chart) => {
            const aiDs = chart.data.datasets[0];
            return [
              {
                text: aiDs.label,
                fillStyle: aiDs.backgroundColor,
                strokeStyle: aiDs.backgroundColor,
                lineWidth: 0,
                pointStyle: "rect",
                hidden: !chart.isDatasetVisible(0),
                datasetIndex: 0,
              },
              {
                text: "Human reference",
                fillStyle: "transparent",
                strokeStyle: HUMAN_REF_COLOR,
                lineWidth: HUMAN_REF_WIDTH,
                pointStyle: "line",
                hidden: false,
                datasetIndex: -1,
              },
            ];
          },
        },
        // Click does nothing — these series aren't user-toggleable.
        onClick: () => {},
      },
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        callbacks: {
          label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: "#bbb" },
        ticks: { color: "#444", font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 80,
        ticks: {
          color: "#444",
          callback: (v) => v + "%",
          stepSize: 20,
        },
        grid: { color: "#eee" },
        border: { display: false },
      },
    },
  },
});

// ============================================================
// Bottom-right: per-paper scatter (mean human score vs AI score)
//   Data is loaded async from scatter_data.json (~340 KB) — too big to
//   inline. Until the fetch resolves, the scatter is empty; once loaded,
//   applyModelSelection populates it.
// ============================================================

let SCATTER_DATA = null;          // populated after fetch
let SCATTER_JITTERED = {};        // cached jittered points per model key

// Reproducible-ish jitter so points stay put across re-renders
function seededRandom(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 0xffffffff - 0.5);  // -0.5..0.5
  };
}

function jitteredFor(key) {
  if (SCATTER_JITTERED[key]) return SCATTER_JITTERED[key];
  if (!SCATTER_DATA || !SCATTER_DATA[key]) return [];
  const pts = SCATTER_DATA[key].points;
  const rand = seededRandom(key.charCodeAt(0) * 9973 + (key.length * 17));
  // Jitter narrow enough that an integer-score dot doesn't visually
  // bleed into the half-score region (e.g., a dot at h=2 should not
  // smear close to h=2.5). The "all" view uses the model-averaged AI
  // score which is naturally continuous, so it needs even less jitter.
  // Vertical jitter is wider than horizontal because the y-axis (AI
  // score) has more room with the taller chart aspect ratio.
  const xJ = key === "all" ? 0.04 : 0.12;
  const yJ = key === "all" ? 0.06 : 0.20;

  // Density-adaptive thinning. Bin points into 0.5x0.5 (h,a) cells,
  // then keep a larger fraction of sparse cells and a smaller fraction
  // of saturated ones. Off-diagonal disagreement dots (rare) survive
  // fully; the dense diagonal mass is thinned aggressively so the
  // binned-mean markers and trend remain readable without destroying
  // the underlying density signal entirely.
  const CELL = 0.5;
  const cellKey = (h, a) => `${Math.round(h / CELL)}_${Math.round(a / CELL)}`;
  const counts = new Map();
  for (const p of pts) {
    const k = cellKey(p.h, p.a);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  // Tiered ladder: less aggressive than a uniform thin, but still
  // monotone in density. Tuned by eye against the ~3,890-point
  // per-model cloud — the densest cells (>250) keep ~12% so the
  // dominant diagonal mass still reads as dense, just no longer flat.
  const keepFrac = (n) => {
    if (n <= 5)   return 1.00;   // preserve every dot in rare cells
    if (n <= 15)  return 0.80;
    if (n <= 40)  return 0.50;
    if (n <= 100) return 0.30;
    if (n <= 250) return 0.18;
    return 0.12;                 // most-saturated cells
  };

  const out = [];
  for (const p of pts) {
    const keep = keepFrac(counts.get(cellKey(p.h, p.a)));
    const u = rand() + 0.5;            // 0..1 from seededRandom's -0.5..0.5
    if (u > keep) continue;
    out.push({
      x: p.h + rand() * 2 * xJ,
      y: p.a + rand() * 2 * yJ,
    });
  }
  SCATTER_JITTERED[key] = out;
  return out;
}

const SCATTER_DOT = {
  base: "#999",      // gray for "all"
  baseAlpha: "rgba(140,140,140,0.20)",
  opusAlpha: "rgba(194,85,61,0.28)",     // COLORS.opus at low alpha
  gptAlpha:  "rgba(52,97,141,0.28)",     // COLORS.gpt at low alpha
};

function scatterDotColor(modelKey) {
  if (modelKey === "all") return SCATTER_DOT.baseAlpha;
  const v = vendorOfKey(modelKey);
  return v === "opus" ? SCATTER_DOT.opusAlpha : SCATTER_DOT.gptAlpha;
}

function scatterLineColor(modelKey) {
  if (modelKey === "all") return "#1f1f1f";
  const v = vendorOfKey(modelKey);
  return v === "opus" ? COLORS.opus : COLORS.gpt;
}

// Marker fill for the binned-mean dots is a darker variant of the
// trend-line color so the dot reads as a distinct point against the
// line and the dense cloud beneath it.
function scatterMarkerFillColor(modelKey) {
  if (modelKey === "all") return "#000000";
  const v = vendorOfKey(modelKey);
  return v === "opus" ? "#7a3525" : "#1f3a55";
}

// OLS regression of AI score on human score across all per-review
// scatter points. Returns {b, a, r}: slope, intercept, Pearson r.
// Slope b < 1 means AI compresses (less response per unit of human);
// intercept a > 0 means AI is on average more lenient than humans.
function computeScatterOLS(points) {
  const n = points.length;
  if (n < 2) return { b: NaN, a: NaN, r: NaN };
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    sx += p.h;  sy += p.a;
    sxx += p.h * p.h;  syy += p.a * p.a;  sxy += p.h * p.a;
  }
  const mx = sx / n, my = sy / n;
  const varX = sxx / n - mx * mx;
  const varY = syy / n - my * my;
  const cov  = sxy / n - mx * my;
  const b = cov / varX;
  const a = my - b * mx;
  const r = cov / Math.sqrt(varX * varY);
  return { b, a, r };
}

// Custom interaction mode for the scatter chart: only the binned-mean
// dataset (index 2) participates in hit-testing. Without this, the
// default "nearest" mode picks a cloud dot first and the tooltip
// filter silently drops it — so hovering near the marker shows
// nothing. Hit threshold is the element's own radius + hitRadius
// (same convention as Chart.js's built-in nearest mode).
Chart.Interaction.modes.binMeanOnly = function (chart, event, options, useFinalPosition) {
  const position = Chart.helpers.getRelativePosition(event, chart);
  const meta = chart.getDatasetMeta(2);
  if (!meta || meta.hidden) return [];
  let nearest = null;
  let minDist = Infinity;
  for (let i = 0; i < meta.data.length; i++) {
    const element = meta.data[i];
    if (!element || element.skip) continue;
    const center = element.getCenterPoint(useFinalPosition);
    const dx = center.x - position.x;
    const dy = center.y - position.y;
    const dist = Math.hypot(dx, dy);
    const opts = element.options || {};
    const hitR = (opts.radius || 0) + (opts.hitRadius || 0);
    if (dist <= hitR && dist < minDist) {
      minDist = dist;
      nearest = { datasetIndex: 2, index: i, element };
    }
  }
  return nearest ? [nearest] : [];
};

const chartScatter = new Chart(document.getElementById("chart-scatter"), {
  type: "scatter",
  data: {
    datasets: [
      // 0: dots (one per paper), populated on fetch
      {
        label: "Papers",
        type: "scatter",
        data: [],
        backgroundColor: SCATTER_DOT.baseAlpha,
        borderColor: "transparent",
        pointRadius: 2.6,
        pointHoverRadius: 5,
      },
      // 1: theoretical best-fit line. Represents the "variance-matched
      // oracle" — an AI that (a) achieves the maximum-possible
      // correlation with a single human (= sqrt(r_HH), since human
      // scores carry only r_HH worth of latent-quality signal) AND
      // (b) spreads its scores across the full 1-5 range the way
      // humans do (sd(AI) = sd(h)). Under both conditions, the
      // regression slope equals sqrt(r_HH); the intercept is set so
      // the line passes through (mean_h, mean_h) — i.e., a perfectly
      // calibrated oracle. Endpoints populated per-render.
      {
        label: "Theoretical best AI",
        type: "line",
        data: [],
        borderColor: "#888",
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      // 2: binned conditional mean of AI given human. Filled with the
      // vendor color (set per-model in applyModelSelection) and ringed
      // with a white border so the dot reads cleanly against the dense
      // dot cloud underneath. The `order` value puts this dataset on
      // top of the scatter dots (lower `order` draws first, higher
      // draws last); a large pointHitRadius makes the tooltip activate
      // without requiring the cursor to land on the 4 px center.
      {
        label: "AI mean per human-score bin",
        type: "line",
        data: [],
        borderColor: "#1f1f1f",
        borderWidth: 2,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHitRadius: 18,
        pointBackgroundColor: "#000000",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        showLine: true,
        fill: false,
        tension: 0.05,
        // Force this dataset to draw last (foreground). In Chart.js v4,
        // higher `order` draws later, so this sits on top of the dot
        // cloud (order 0).
        order: 100,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutCubic" },
    // Custom mode restricts hit-testing to the binned-mean dataset, so
    // hovering anywhere in a ~40 px area around a marker activates its
    // tooltip — cloud dots no longer compete for "nearest" and then
    // get filtered out.
    interaction: { mode: "binMeanOnly", intersect: false },
    layout: { padding: { top: 8, right: 14, bottom: 4, left: 4 } },
    plugins: {
      olsAnnotation: { blocks: [] },
      legend: {
        position: "top", align: "end",
        labels: {
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
          // Small boxHeight shrinks the "Human reviews" circle swatch
          // without truncating the line-style swatches (which use
          // boxWidth for length).
          boxWidth: 24,
          boxHeight: 5,
          generateLabels: (chart) => {
            const dotDs = chart.data.datasets[0];
            const lineDs = chart.data.datasets[2];
            return [
              {
                text: "Human reviews",
                fillStyle: dotDs.backgroundColor,
                strokeStyle: dotDs.backgroundColor,
                lineWidth: 0,
                pointStyle: "circle",
                hidden: false,
                datasetIndex: 0,
              },
              {
                text: "AI mean per bin",
                fillStyle: lineDs.borderColor,
                strokeStyle: lineDs.borderColor,
                lineWidth: 2,
                pointStyle: "line",
                hidden: false,
                datasetIndex: 2,
              },
            ];
          },
        },
        onClick: () => {},   // these aren't real toggleable series
      },
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        callbacks: {
          title: () => "",
          label: (item) => {
            if (item.datasetIndex === 2) {
              return `Bin centered at ${item.parsed.x.toFixed(2)}: AI mean = ${item.parsed.y.toFixed(2)}`;
            }
            return null;
          },
        },
        // Only show tooltips for the binned-mean line. The dots are
        // jittered for visibility, so showing per-dot coordinates would
        // be misleading. The y=x reference line also doesn't need one.
        filter: (item) => item.datasetIndex === 2,
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 0.6, max: 5.4,
        // Chart.js's auto-tick generator drops 1 and 5 because they
        // sit too close to the boundary values (0.6, 5.4). Force the
        // exact tick list so all five integer labels render at every
        // chart width.
        afterBuildTicks: (axis) => {
          axis.ticks = [1, 2, 3, 4, 5].map((v) => ({ value: v }));
        },
        ticks: {
          autoSkip: false,
          callback: (v) => v,
          color: "#444",
          font: { size: 11 },
        },
        grid: { display: false },
        border: { color: "#bbb" },
        title: {
          display: true,
          text: "Human reviewer score (reviewers occasionally give half-step scores)",
          padding: 6,
          color: "#666",
          font: { size: 11 },
        },
      },
      y: {
        type: "linear",
        // Extend the upper bound past the data so the OLS annotation
        // in the top-left has clean white space and doesn't sit on
        // top of dots.
        min: 0.6, max: 6.0,
        afterBuildTicks: (axis) => {
          axis.ticks = [1, 2, 3, 4, 5].map((v) => ({ value: v }));
        },
        ticks: {
          autoSkip: false,
          callback: (v) => v,
          color: "#444",
          font: { size: 11 },
        },
        grid: { display: false },
        border: { color: "#bbb" },
        title: {
          display: true, text: "AI score", padding: 6,
          color: "#666", font: { size: 11 },
        },
      },
    },
  },
});

// Fetch scatter data, then render the initial selection
fetch("scatter_data.json")
  .then(r => r.json())
  .then(data => {
    SCATTER_DATA = data;
    applyModelSelection(currentSelection);
  })
  .catch(err => {
    console.error("Failed to load scatter_data.json:", err);
  });

// ============================================================
// Predictive-edge bar chart (paired bars by score region).
// One bar pair per region: |beta_H| (human reviewer) and |beta_AI|
// (AI score) from a Poisson PML regression of citations on both,
// fit separately within each region. Source data is
// predictive_edge_data.json. The chart reacts to the same model
// picker as the histogram and scatter.
// ============================================================

let PREDICTIVE_DATA = null;
// Side store of the current model's bin metadata, indexed by bin
// position. Kept alongside the chart so the tooltip callback can read
// signed beta + SE without putting non-numeric values into Chart.js's
// data array (which would interfere with bar rendering).
let PREDICTIVE_CURRENT_BINS = null;

const PRED_HUMAN_COLOR = "#333333";
function predAiColorFor(modelKey) {
  if (modelKey === "all") return "#9a9a9a";
  return vendorOfKey(modelKey) === "opus" ? COLORS.opus : COLORS.gpt;
}

const chartPredictive = new Chart(document.getElementById("chart-predictive"), {
  type: "bar",
  data: {
    labels: [
      ["Top tail", "(mean ≤ 1.5)"],
      ["Middle",   "(1.5 < mean < 4.0)"],
      ["Bottom tail", "(mean ≥ 4.0)"],
    ],
    datasets: [
      {
        label: "Human reviewer",
        data: [0, 0, 0],
        backgroundColor: PRED_HUMAN_COLOR,
        borderColor: PRED_HUMAN_COLOR,
        borderWidth: 0,
        borderRadius: 2,
        categoryPercentage: 0.72,
        barPercentage: 0.85,
      },
      {
        label: "AI",
        data: [0, 0, 0],
        backgroundColor: "#9a9a9a",
        borderColor: "#9a9a9a",
        borderWidth: 0,
        borderRadius: 2,
        categoryPercentage: 0.72,
        barPercentage: 0.85,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutCubic" },
    layout: { padding: { top: 12, right: 14, bottom: 4, left: 4 } },
    plugins: {
      legend: {
        position: "top", align: "end",
        labels: {
          usePointStyle: true,
          boxWidth: 10, boxHeight: 10, padding: 14,
          font: { size: 11 }, color: "#333",
        },
        // Click does nothing — these series aren't user-toggleable.
        onClick: () => {},
      },
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        callbacks: {
          title: (items) => {
            if (!items.length) return "";
            const lbl = items[0].label;
            return Array.isArray(lbl) ? lbl.join(" ") : String(lbl);
          },
          label: (item) => {
            const ds = item.dataset;
            const i  = item.dataIndex;
            const bin = PREDICTIVE_CURRENT_BINS && PREDICTIVE_CURRENT_BINS[i];
            if (!bin) {
              return `${ds.label}: |β| = ${Number(item.parsed.y).toFixed(3)}`;
            }
            const isHuman = ds.label === "Human reviewer";
            const beta = isHuman ? bin.beta_h : bin.beta_ai;
            const se   = isHuman ? bin.se_h   : bin.se_ai;
            if (beta === null || beta === undefined) {
              return `${ds.label}: not estimated`;
            }
            const sign = beta >= 0 ? "+" : "−";
            const m = Math.abs(beta).toFixed(3);
            const seStr = (se !== null && se !== undefined)
              ? `  (SE ${se.toFixed(3)})` : "";
            return `${ds.label}: β = ${sign}${m}${seStr}`;
          },
          afterBody: (items) => {
            if (!items.length) return [];
            const i = items[0].dataIndex;
            const bin = PREDICTIVE_CURRENT_BINS && PREDICTIVE_CURRENT_BINS[i];
            return bin ? [`n = ${bin.n_pap} papers`] : [];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: "#bbb" },
        ticks: {
          color: "#333",
          font: { size: 10.5 },
          autoSkip: false,
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#eee", drawBorder: false },
        border: { color: "#bbb" },
        ticks: { color: "#444", font: { size: 10 } },
        title: {
          display: true,
          text: "Citation predictive power",
          padding: 8,
          color: "#666",
          font: { size: 10.5 },
        },
      },
    },
  },
});

function applyPredictiveSelection(modelKey) {
  if (!PREDICTIVE_DATA || !PREDICTIVE_DATA[modelKey]) return;
  const bins = PREDICTIVE_DATA[modelKey].bins;
  PREDICTIVE_CURRENT_BINS = bins;
  const dsH = chartPredictive.data.datasets[0];
  const dsA = chartPredictive.data.datasets[1];
  dsH.data = bins.map((b) =>
    b.beta_h === null || b.beta_h === undefined ? 0 : Math.abs(b.beta_h));
  dsA.data = bins.map((b) =>
    b.beta_ai === null || b.beta_ai === undefined ? 0 : Math.abs(b.beta_ai));
  const aiColor = predAiColorFor(modelKey);
  dsA.backgroundColor = aiColor;
  dsA.borderColor = aiColor;
  chartPredictive.update();

  const sub = document.getElementById("predictive-subtitle");
  if (sub) {
    const label = MODEL_LABELS[modelKey];
    sub.textContent = (modelKey === "all")
      ? "All-model average"
      : label;
  }
}

fetch("predictive_edge_data.json")
  .then(r => r.json())
  .then(data => {
    PREDICTIVE_DATA = data;
    applyPredictiveSelection(currentSelection);
  })
  .catch(err => {
    console.error("Failed to load predictive_edge_data.json:", err);
  });

// ============================================================
// Belt-and-suspenders: re-size every chart on window resize.
// Chart.js v4 already uses ResizeObserver, but breakpoint changes that
// move figures between 1- and 2-column layouts can leave a chart at the
// previous (larger) buffer size. A debounced resize() forces a redraw
// at the current container dimensions.
// ============================================================
let _resizeDebounce;
window.addEventListener("resize", () => {
  clearTimeout(_resizeDebounce);
  _resizeDebounce = setTimeout(() => {
    const charts = [chartL1, chartCorr, chartPred, chartHist, chartScatter, chartPredictive];
    for (const c of charts) {
      if (c && typeof c.resize === "function") {
        try { c.resize(); } catch (_) { /* noop */ }
      }
    }
  }, 120);
});

// ============================================================
// Dropdown wiring
// ============================================================

function vendorOf(modelKey) {
  if (modelKey.startsWith("opus")) return "opus";
  if (modelKey.startsWith("gpt"))  return "gpt";
  return null;
}

function aiBarColorFor(modelKey) {
  if (modelKey === "all") return COLORS.opus;  // arbitrary; "average" is gray-ish
  const v = vendorOf(modelKey);
  return v === "opus" ? COLORS.opus : COLORS.gpt;
}

function applyModelSelection(modelKey) {
  const label = MODEL_LABELS[modelKey];
  currentSelection = modelKey;

  // If a specific vendor is now selected, make sure that vendor's
  // series is visible everywhere (un-hide if it had been toggled
  // off via the legend). For chartPred there are TWO datasets per
  // vendor (top tail at index v, middle at v+2).
  const vendor = vendorOfKey(modelKey);
  if (vendor) {
    const dsIdx = vendor === "opus" ? 0 : 1;
    for (const chart of [chartL1, chartCorr]) {
      if (!chart.isDatasetVisible(dsIdx)) {
        chart.setDatasetVisibility(dsIdx, true);
      }
    }
    if (!chartPred.isDatasetVisible(dsIdx)) {
      chartPred.setDatasetVisibility(dsIdx, true);
    }
    if (!chartPred.isDatasetVisible(dsIdx + 2)) {
      chartPred.setDatasetVisibility(dsIdx + 2, true);
    }
  }

  // Top charts: highlight the selected point (smooth transition)
  applyHighlight(modelKey);

  // Histogram: single AI dataset; swap data + color to vendor's
  const histDs = chartHist.data.datasets[0];
  histDs.data = FIG_DATA.models[modelKey].hist;
  histDs.label = "AI: " + label;
  const aiColor = modelKey === "all" ? "#9a9a9a" : aiBarColorFor(modelKey);
  histDs.backgroundColor = aiColor;
  histDs.borderColor = aiColor;
  chartHist.update();

  // Scatter: swap dot cloud + binned mean for the selected model
  if (SCATTER_DATA && SCATTER_DATA[modelKey]) {
    const dotsDs   = chartScatter.data.datasets[0];
    const theoryDs = chartScatter.data.datasets[1];
    const lineDs   = chartScatter.data.datasets[2];
    const points = SCATTER_DATA[modelKey].points;
    dotsDs.data = jitteredFor(modelKey);
    dotsDs.backgroundColor = scatterDotColor(modelKey);
    lineDs.data = SCATTER_DATA[modelKey].binned.map(p => ({ x: p.h, y: p.a }));
    lineDs.borderColor = scatterLineColor(modelKey);
    lineDs.pointBackgroundColor = scatterMarkerFillColor(modelKey);

    // Theoretical best-fit line for a variance-matched oracle AI —
    // achieves max correlation sqrt(r_HH) AND spreads scores across
    // the full 1-5 range (sd(AI) = sd(h)):
    //   slope     = sqrt(r_HH)
    //   intercept = (1 - sqrt(r_HH)) * mean_h
    // Line passes through (mean_h, mean_h) — a perfectly calibrated
    // oracle. mean_h is computed from the observed h's (same across
    // models).
    const meanH = points.reduce((s, p) => s + p.h, 0) / points.length;
    const theorySlope = Math.sqrt(H2H_R);
    const theoryIntercept = (1 - theorySlope) * meanH;
    theoryDs.data = [
      { x: 1, y: theorySlope * 1 + theoryIntercept },
      { x: 5, y: theorySlope * 5 + theoryIntercept },
    ];

    // Inside-the-chart annotations: actual model's OLS on the left
    // (tinted in the binned-mean line color), variance-matched-oracle
    // ceiling on the right (gray, matching the theoretical dashed
    // line). Reader can read the actual-vs-ceiling gap directly.
    const { b, a, r } = computeScatterOLS(points);
    const sign = a >= 0 ? "+" : "−";
    const theorySign = theoryIntercept >= 0 ? "+" : "−";
    chartScatter.options.plugins.olsAnnotation.blocks = [
      {
        align: "left",
        color: scatterLineColor(modelKey),
        lines: [
          `AI = ${b.toFixed(2)} · Human ${sign} ${Math.abs(a).toFixed(2)}`,
          `Correlation = ${r.toFixed(2)}`,
        ],
      },
      {
        align: "right",
        color: "#888",
        lines: [
          `Theoretical best AI = ${theorySlope.toFixed(2)} · Human ${theorySign} ${Math.abs(theoryIntercept).toFixed(2)}`,
          `Theoretical max correlation = ${theorySlope.toFixed(2)}`,
        ],
      },
    ];
    chartScatter.update();
  }

  // Predictive-edge chart: paired bars by score region
  applyPredictiveSelection(modelKey);

  // Section 1's inline eyebrow updates based on selection.
  const blockTitle = document.getElementById("drilldown-title");
  if (blockTitle) {
    blockTitle.textContent = (modelKey === "all")
      ? "Findings 1–3 · Look across all six models"
      : `Findings 1–3 · Look inside ${label}`;
  }

  // Per-figure subtitles
  const histSub    = document.getElementById("hist-subtitle");
  const scatterSub = document.getElementById("scatter-subtitle");
  if (histSub) histSub.textContent = (modelKey === "all")
    ? "All-model average vs human reference"
    : `${label} vs human reference`;
  if (scatterSub) scatterSub.textContent = (modelKey === "all")
    ? "Each paper scored by two humans and six AI models (averaged)"
    : `Each paper scored by two humans and ${label}`;
}

// Two synced model pickers — one at the top (Section 1, Findings 1-3)
// and one with the trend block (Section 2, Finding 4). Changing either
// mirrors the value into the other and re-runs applyModelSelection.
const modelPickers = [
  document.getElementById("model-select"),
  document.getElementById("model-select-2"),
].filter(Boolean);

function selectModel(value) {
  for (const p of modelPickers) {
    if (p.value !== value) p.value = value;
  }
  applyModelSelection(value);
}

for (const picker of modelPickers) {
  picker.addEventListener("change", (e) => selectModel(e.target.value));
}

// Initialize state
applyModelSelection("all");

// Findings "+ details" / "− details" expand-collapse toggles. Each
// button has an aria-controls pointing at the corresponding details
// div; click flips the hidden attribute and the aria-expanded state,
// then re-syncs the sidebar's max-height (next block) so the sidebar
// tracks the findings block's current height.
document.querySelectorAll(".finding-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("aria-controls");
    const target = document.getElementById(targetId);
    if (!target) return;
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    target.hidden = expanded;
    btn.textContent = expanded ? "+ details" : "− details";
    syncSidebarHeight();
  });
});

// Measure-then-position each finding's tools so all three layout rules
// hold simultaneously: (1) claim text uses the full container width;
// (2) tools are flush against the right edge; (3) tools sit on the
// claim's last line unless that line is too full to fit them, in
// which case they drop to a new line below — still right-aligned.
function positionLeadTools(lead) {
  const claim = lead.querySelector(".finding-claim");
  const tools = lead.querySelector(".lead-tools");
  if (!claim || !tools) return;

  // Step 0: reset to natural inline state so we can measure cleanly.
  tools.style.position = "";
  tools.style.right = "";
  tools.style.top = "";
  tools.style.display = "";
  lead.style.paddingBottom = "";
  void lead.offsetHeight;

  // Step 1: measure the tools' natural inline-flex box.
  const toolsRect = tools.getBoundingClientRect();
  const toolsWidth = toolsRect.width;
  const toolsHeight = toolsRect.height;

  // Step 2: hide the tools and measure the claim's natural last line
  // (with no inline element competing for space on that line).
  tools.style.display = "none";
  void lead.offsetHeight;
  const claimRects = claim.getClientRects();
  if (claimRects.length === 0) {
    tools.style.display = "";
    return;
  }
  const lastLine = claimRects[claimRects.length - 1];
  const leadRect = lead.getBoundingClientRect();
  const spaceAfter = leadRect.right - lastLine.right;

  // Step 3: position tools absolutely, either at right of last line
  // or right-aligned on a new line below the claim.
  tools.style.display = "";
  tools.style.position = "absolute";
  tools.style.right = "0";

  // Visual breathing room between the claim's last word and the tools
  // when they share a line. A small margin keeps them from touching.
  const sameLineMargin = 14;
  if (spaceAfter >= toolsWidth + sameLineMargin) {
    // Fits on the claim's last line.
    tools.style.top = `${lastLine.top - leadRect.top}px`;
  } else {
    // No room — drop tools to a new line below the claim, right-aligned.
    tools.style.top = `${lastLine.bottom - leadRect.top}px`;
    lead.style.paddingBottom = `${toolsHeight}px`;
  }
}

function positionAllLeadTools() {
  document.querySelectorAll(".finding-lead").forEach(positionLeadTools);
}

// Dynamically constrain the "Models covered" sidebar so its overall
// height never exceeds the findings block's current height. The
// .run-log inside is flex 1 1 auto with overflow-y: auto, so any
// list overflow scrolls within the constrained sidebar.
function syncSidebarHeight() {
  const findings = document.querySelector(".findings");
  const sidebar = document.querySelector(".sidebar");
  if (!findings || !sidebar) return;
  sidebar.style.maxHeight = `${findings.offsetHeight}px`;
}

positionAllLeadTools();
syncSidebarHeight();

// Fonts can finish loading after the first sync, which re-wraps the
// claim text — re-run once they're ready so the position is correct.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    positionAllLeadTools();
    syncSidebarHeight();
  });
}

window.addEventListener("resize", () => {
  positionAllLeadTools();
  syncSidebarHeight();
});
