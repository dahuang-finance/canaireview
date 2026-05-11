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
// All numbers from code/analysis/compute_ai_vs_single_human.py output
// on n = 1,088-1,171 papers (varies by model) with two quality reviews.
// Release dates verified via vendor announcements (Nov 2025 - Apr 2026).
const TREND_DATA = {
  opus: [
    { key: "opus-4.5", name: "Opus 4.5", date: "2025-11-24", l1: 0.814, corr: 0.191, corr_lo: 0.145, corr_hi: 0.237 },
    { key: "opus-4.6", name: "Opus 4.6", date: "2026-02-05", l1: 0.650, corr: 0.210, corr_lo: 0.166, corr_hi: 0.254 },
    { key: "opus-4.7", name: "Opus 4.7", date: "2026-04-16", l1: 0.454, corr: 0.236, corr_lo: 0.192, corr_hi: 0.280 },
  ],
  gpt: [
    { key: "gpt-5.1",  name: "GPT-5.1",  date: "2025-11-12", l1: 0.898, corr: 0.105, corr_lo: 0.059, corr_hi: 0.152 },
    { key: "gpt-5.4",  name: "GPT-5.4",  date: "2026-03-05", l1: 0.734, corr: 0.173, corr_lo: 0.126, corr_hi: 0.220 },
    { key: "gpt-5.5",  name: "GPT-5.5",  date: "2026-04-23", l1: 0.449, corr: 0.184, corr_lo: 0.139, corr_hi: 0.226 },
  ],
};

// Human-to-human Pearson r reference line for the correlation chart.
// 0.175 = correlation between two random human reviewers on the same
// paper (n = 1,224 papers with two quality reviews; 95% paper-clustered
// bootstrap CI [0.116, 0.230]). See compute_human_inter_reviewer_correlation.py.
const H2H_R    = 0.175;
const H2H_R_LO = 0.116;
const H2H_R_HI = 0.230;

// Theoretical maximum for r(AI, single human) under the variance-
// components model: an oracle AI that perfectly recovers true paper
// quality would correlate with a randomly chosen single human at exactly
// sqrt(H2H_R), because each human's score is paper signal + reviewer-
// specific noise and only the paper part is predictable.
const R_THEORETICAL_MAX = Math.sqrt(H2H_R);

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
  pointBorderWidth: 2.2,
  pointBackgroundColor: "#fff",
  borderWidth: 2.4,
  tension: 0.04,
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

// Y-axis with semantic top / bottom labels instead of bare numbers.
// Used by both trend charts; each chart passes its own min/max anchoring
// the semantic poles (e.g., "no agreement" at 0, "theoretical maximum"
// at sqrt(H2H_R) for the correlation chart).
function makeYAxis({ min, max, topLabel, bottomLabel }) {
  return {
    min, max,
    afterBuildTicks: function (scale) {
      scale.ticks = [{ value: min }, { value: max }];
    },
    ticks: {
      autoSkip: false,
      padding: 8,
      color: "#666",
      font: { size: 10 },
      maxRotation: 0,
      callback: (v) => {
        if (Math.abs(v - max) < 1e-6) return topLabel;
        if (Math.abs(v - min) < 1e-6) return bottomLabel;
        return "";
      },
    },
    grid: { display: false },
    border: { color: "#bbb" },
  };
}

const Y_AXIS_L1 = makeYAxis({
  min: 0,
  max: 2,
  topLabel: "completely different",
  bottomLabel: "identical to humans",
});

const Y_AXIS_CORR = makeYAxis({
  min: 0,
  max: R_THEORETICAL_MAX,
  topLabel: "theoretical maximum",
  bottomLabel: "no agreement",
});

// ============================================================
// Helpers
// ============================================================

const fmtDate = (d) => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

function pointsFor(vendor, metric) {
  return TREND_DATA[vendor].map(m => ({
    x: m.date, y: m[metric], name: m.name, key: m.key,
  }));
}

function tooltipCallbacks(metricLabel) {
  return {
    title: (items) => items.length ? items[0].raw.name : "",
    label: (item) => {
      const r = item.raw;
      return `${metricLabel} = ${r.y.toFixed(3)}  (released ${fmtDate(r.x)})`;
    },
  };
}

// Per-point styling: highlighted point is the same vendor color, but
// solidly filled (no white interior) and bigger. Default stays outlined.
function pointRadii(vendor, selectedKey) {
  const s = SHAPE_SCALE[vendor];
  return TREND_DATA[vendor].map(m =>
    m.key === selectedKey ? HIGH_RADIUS * s : BASE_RADIUS * s
  );
}
function pointBorderWidths(vendor, selectedKey) {
  return TREND_DATA[vendor].map(m => m.key === selectedKey ? 0 : 2.2);
}
function pointFillColors(vendor, selectedKey) {
  const base = vendor === "opus" ? COLORS.opus : COLORS.gpt;
  return TREND_DATA[vendor].map(m => m.key === selectedKey ? base : "#fff");
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

// Custom legend onClick. Two responsibilities:
//   (1) Vendor lock: block hiding Opus or GPT if the dropdown highlights
//       a model from that vendor.
//   (2) Band pairing: when a main legend item is toggled, also toggle
//       its associated CI-band datasets so the shaded area follows the
//       line. Bands are matched by label-prefix convention (see
//       BAND_PREFIX_BY_MAIN below).
//
// Uses chart.hide() / chart.show() (not setDatasetVisibility + update),
// because those Chart.js helpers animate the transition instead of just
// popping the series off.
const BAND_PREFIX_BY_MAIN = {
  "Anthropic Opus": "_opus_band",
  "OpenAI GPT":     "_gpt_band",
  // Human-to-human label includes the r value; match by `.startsWith`
  // in the function below.
};

function lockedLegendOnClick(e, legendItem, legend) {
  const idx = legendItem.datasetIndex;
  const chart = legend.chart;
  // Vendor lock applies only to the Opus and GPT main datasets (indices 0/1).
  if (idx < 2) {
    const vendor = idx === 0 ? "opus" : "gpt";
    if (vendorOfKey(currentSelection) === vendor) {
      return;
    }
  }
  const willBeVisible = !chart.isDatasetVisible(idx);
  if (willBeVisible) {
    chart.show(idx);
    legendItem.hidden = false;
  } else {
    chart.hide(idx);
    legendItem.hidden = true;
  }
  // Toggle paired CI band datasets.
  const mainLabel = chart.data.datasets[idx].label;
  let bandPrefix = BAND_PREFIX_BY_MAIN[mainLabel];
  if (!bandPrefix && mainLabel.startsWith("Human-to-human")) {
    bandPrefix = "_h2h_band";
  }
  if (bandPrefix) {
    chart.data.datasets.forEach((ds, i) => {
      if (ds.label && ds.label.startsWith(bandPrefix)) {
        if (willBeVisible) chart.show(i);
        else chart.hide(i);
      }
    });
  }
}

// ============================================================
// Top row: line charts (L1, correlation)
// ============================================================

function buildLineChart(canvasId, metric, metricLabel, yAxis) {
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
            // for the per-vendor error bands and the human-to-human band).
            filter: (item) => !item.text.startsWith("_"),
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
      },
      scales: { x: X_AXIS_TIME, y: yAxis },
    },
  });
}

const chartL1   = buildLineChart("chart-l1",   "l1",   "L₁", Y_AXIS_L1);
const chartCorr = buildLineChart("chart-corr", "corr", "r",  Y_AXIS_CORR);

// Append confidence bands and the human-to-human reference to chart-corr.
//
// Drawing order is controlled by `order`: lower = drawn first (background).
// Bands get order=0 so they sit behind the main lines (order=2 set in
// buildLineChart) and the reference line (order=1).
//
// Each band is a pair of datasets: an "upper" line that fills DOWN to a
// "lower" line via `fill: '+1'`. The line strokes themselves are
// transparent so only the filled area is visible.
function bandPoints(metricKey, vendor) {
  return TREND_DATA[vendor].map((m) => ({ x: m.date, y: m[metricKey] }));
}

const VENDOR_BAND_ALPHA = "26"; // ~15% alpha as hex (38/255)
const H2H_BAND_FILL = "rgba(120, 120, 120, 0.14)";

chartCorr.data.datasets.push(
  // ----- Per-vendor CI bands -----
  {
    label: "_opus_band_upper",
    data: bandPoints("corr_hi", "opus"),
    borderColor: "transparent",
    backgroundColor: COLORS.opus + VENDOR_BAND_ALPHA,
    fill: "+1",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  {
    label: "_opus_band_lower",
    data: bandPoints("corr_lo", "opus"),
    borderColor: "transparent",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  {
    label: "_gpt_band_upper",
    data: bandPoints("corr_hi", "gpt"),
    borderColor: "transparent",
    backgroundColor: COLORS.gpt + VENDOR_BAND_ALPHA,
    fill: "+1",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  {
    label: "_gpt_band_lower",
    data: bandPoints("corr_lo", "gpt"),
    borderColor: "transparent",
    pointRadius: 0,
    pointHoverRadius: 0,
    order: 0,
  },
  // ----- Human-to-human reference band (95% CI) -----
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
  // ----- Human-to-human reference line (visible, dashed) -----
  {
    label: `Human-to-human r (${H2H_R.toFixed(2)})`,
    data: [{ x: X_MIN, y: H2H_R }, { x: X_MAX, y: H2H_R }],
    borderColor: "#666",
    borderDash: [5, 4],
    borderWidth: 1.4,
    pointRadius: 0,
    pointHoverRadius: 0,
    pointStyle: "line",
    fill: false,
    spanGaps: true,
    order: 1,
  },
);
chartCorr.update();

// ============================================================
// Highlight selected model in top charts
// ============================================================

function applyHighlight(modelKey) {
  // When modelKey is "all" or falsy, every helper returns uniform default
  // values. Always assigning ARRAYS here (not scalars) avoids a Chart.js
  // quirk where switching from per-point arrays back to a scalar leaves
  // the array values cached on individual point elements.
  const key = (!modelKey || modelKey === "all") ? null : modelKey;
  for (const chart of [chartL1, chartCorr]) {
    const dsOpus = chart.data.datasets[0];
    const dsGpt  = chart.data.datasets[1];
    dsOpus.pointRadius           = pointRadii("opus", key);
    dsOpus.pointBorderWidth      = pointBorderWidths("opus", key);
    dsOpus.pointBorderColor      = pointBorderColors("opus", key);
    dsOpus.pointBackgroundColor  = pointFillColors("opus", key);
    dsGpt.pointRadius            = pointRadii("gpt",  key);
    dsGpt.pointBorderWidth       = pointBorderWidths("gpt",  key);
    dsGpt.pointBorderColor       = pointBorderColors("gpt",  key);
    dsGpt.pointBackgroundColor   = pointFillColors("gpt",  key);
    chart.update();
  }
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
        // Human reference is synthetic; click does nothing on it.
        onClick: (e, item, legend) => {
          if (item.datasetIndex < 0) return;
          const visible = legend.chart.isDatasetVisible(item.datasetIndex);
          legend.chart.setDatasetVisibility(item.datasetIndex, !visible);
          legend.chart.update();
        },
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
  // Specific models: integer AI, half-integer mean human → larger jitter
  // "all": already continuous → smaller jitter
  const xJ = key === "all" ? 0.04 : 0.12;
  const yJ = key === "all" ? 0.04 : 0.12;
  const out = pts.map(p => ({
    x: p.h + rand() * 2 * xJ,
    y: p.a + rand() * 2 * yJ,
  }));
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
      // 1: 45° reference line (perfect agreement)
      {
        label: "Perfect agreement",
        type: "line",
        data: [{ x: 1, y: 1 }, { x: 5, y: 5 }],
        borderColor: "#aaa",
        borderDash: [4, 4],
        borderWidth: 1,
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
      // 2: binned conditional mean of AI given human
      {
        label: "AI mean per human-score bin",
        type: "line",
        data: [],
        borderColor: "#1f1f1f",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#1f1f1f",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        showLine: true,
        fill: false,
        tension: 0.05,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutCubic" },
    interaction: { mode: "nearest", intersect: true },
    layout: { padding: { top: 8, right: 14, bottom: 4, left: 4 } },
    plugins: {
      legend: {
        position: "top", align: "end",
        // Skip the synthetic "perfect agreement" entry; show only Papers
        // and the binned mean for cleanliness.
        labels: {
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
          generateLabels: (chart) => {
            const dotDs = chart.data.datasets[0];
            const lineDs = chart.data.datasets[2];
            return [
              {
                text: "Papers (one dot each)",
                fillStyle: dotDs.backgroundColor,
                strokeStyle: dotDs.backgroundColor,
                lineWidth: 0,
                pointStyle: "circle",
                hidden: false,
                datasetIndex: 0,
              },
              {
                text: "AI mean by human-score bin",
                fillStyle: lineDs.borderColor,
                strokeStyle: lineDs.borderColor,
                lineWidth: 2,
                pointStyle: "line",
                hidden: false,
                datasetIndex: 2,
              },
              {
                text: "Perfect agreement (y = x)",
                fillStyle: "transparent",
                strokeStyle: "#999",
                lineWidth: 1,
                pointStyle: "line",
                lineDash: [4, 4],
                hidden: false,
                datasetIndex: 1,
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
        ticks: {
          stepSize: 1,
          callback: (v) => (v === Math.floor(v) && v >= 1 && v <= 5) ? v : "",
          color: "#444",
          font: { size: 11 },
        },
        grid: { display: false },
        border: { color: "#bbb" },
        title: {
          display: true,
          text: "Mean human score (each paper has 2 human reviewers)",
          padding: 6,
          color: "#666",
          font: { size: 11 },
        },
      },
      y: {
        type: "linear",
        min: 0.6, max: 5.4,
        ticks: {
          stepSize: 1,
          callback: (v) => (v === Math.floor(v) && v >= 1 && v <= 5) ? v : "",
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
    const charts = [chartL1, chartCorr, chartHist, chartScatter];
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

  // If a specific vendor is now selected, make sure that series is
  // visible in the top charts (un-hide if it had been toggled off).
  const vendor = vendorOfKey(modelKey);
  if (vendor) {
    const dsIdx = vendor === "opus" ? 0 : 1;
    for (const chart of [chartL1, chartCorr]) {
      if (!chart.isDatasetVisible(dsIdx)) {
        chart.setDatasetVisibility(dsIdx, true);
      }
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
    const dotsDs = chartScatter.data.datasets[0];
    const lineDs = chartScatter.data.datasets[2];
    dotsDs.data = jitteredFor(modelKey);
    dotsDs.backgroundColor = scatterDotColor(modelKey);
    lineDs.data = SCATTER_DATA[modelKey].binned.map(p => ({ x: p.h, y: p.a }));
    lineDs.borderColor = scatterLineColor(modelKey);
    lineDs.pointBackgroundColor = scatterLineColor(modelKey);
    chartScatter.update();
  }

  // Section title updates dynamically based on selection
  const blockTitle = document.getElementById("drilldown-title");
  if (blockTitle) {
    blockTitle.textContent = (modelKey === "all")
      ? "Look across all six models"
      : `Look inside ${label}`;
  }

  // Per-figure subtitles
  const histSub    = document.getElementById("hist-subtitle");
  const scatterSub = document.getElementById("scatter-subtitle");
  if (histSub) histSub.textContent = (modelKey === "all")
    ? "All-model average vs human reference"
    : `${label} vs human reference`;
  if (scatterSub) scatterSub.textContent = (modelKey === "all")
    ? "Each dot = one paper (AI score averaged across all six models)"
    : `Each dot = one paper, scored by ${label}`;
}

document.getElementById("model-select").addEventListener("change", (e) => {
  applyModelSelection(e.target.value);
});

// Initialize state
applyModelSelection("all");
