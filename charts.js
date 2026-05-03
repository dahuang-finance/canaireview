/* canaireview — interactive figures
 *
 * Top row (cohort trends): L1 distance + Correlation, both line charts
 * over model release date. Two lineages (Opus, GPT). Hover shows model
 * name, release date, and value. The dropdown can highlight one point.
 *
 * Bottom row (per-model detail): Score histogram + AI-vs-human heatmap.
 * Both react to the dropdown. Default selection is "all-model average".
 */

// ============================================================
// Data
// ============================================================

// Trend data (per-model L1 + Pearson correlation).
// Release dates verified via vendor announcements (Nov 2025 - Apr 2026).
const TREND_DATA = {
  opus: [
    { key: "opus-4.5", name: "Opus 4.5", date: "2025-11-24", l1: 0.814, corr: 0.234 },
    { key: "opus-4.6", name: "Opus 4.6", date: "2026-02-05", l1: 0.650, corr: 0.267 },
    { key: "opus-4.7", name: "Opus 4.7", date: "2026-04-16", l1: 0.454, corr: 0.310 },
  ],
  gpt: [
    { key: "gpt-5.1",  name: "GPT-5.1",  date: "2025-11-12", l1: 0.898, corr: 0.133 },
    { key: "gpt-5.4",  name: "GPT-5.4",  date: "2026-03-05", l1: 0.734, corr: 0.208 },
    { key: "gpt-5.5",  name: "GPT-5.5",  date: "2026-04-23", l1: 0.449, corr: 0.235 },
  ],
};

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

// Distinct shapes for the two vendor lineages
const SHAPES = {
  opus: "circle",
  gpt:  "rect",
};

Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#444";

if (window["chartjs-plugin-annotation"]) {
  Chart.register(window["chartjs-plugin-annotation"]);
}
if (window["ChartMatrix"]) {
  // chartjs-chart-matrix v2 exports controllers via Chart automatically;
  // explicit register is not needed when the UMD bundle is loaded.
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

const Y_AXIS_0_1 = {
  min: 0,
  max: 1,
  ticks: {
    stepSize: 1,
    callback: (v) => (v === 0 || v === 1) ? v.toString() : "",
    padding: 8,
    color: "#444",
  },
  grid: { display: false },
  border: { color: "#bbb" },
};

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
  return TREND_DATA[vendor].map(m => m.key === selectedKey ? 10 : 6);
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

// Custom legend onClick: blocks hiding the vendor whose model is selected
function lockedLegendOnClick(e, legendItem, legend) {
  const ds = legend.chart.data.datasets[legendItem.datasetIndex];
  // Convention: dataset 0 = Opus, dataset 1 = GPT (in top charts)
  const vendor = legendItem.datasetIndex === 0 ? "opus" : "gpt";
  if (vendorOfKey(currentSelection) === vendor) {
    return; // locked: do nothing
  }
  // Default toggle behavior
  const idx = legendItem.datasetIndex;
  const visible = legend.chart.isDatasetVisible(idx);
  legend.chart.setDatasetVisibility(idx, !visible);
  legend.chart.update();
}

// ============================================================
// Top row: line charts (L1, correlation)
// ============================================================

function buildLineChart(canvasId, metric, metricLabel, yMax) {
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
        },
        {
          label: "OpenAI GPT",
          data: pointsFor("gpt", metric),
          borderColor: COLORS.gpt,
          pointStyle: SHAPES.gpt,
          ...POINT_BASE,
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
          },
        },
        tooltip: {
          backgroundColor: "rgba(20,20,20,0.92)",
          padding: 10,
          titleFont: { weight: "600", size: 12 },
          bodyFont: { size: 12 },
          callbacks: tooltipCallbacks(metricLabel),
        },
      },
      scales: { x: X_AXIS_TIME, y: { ...Y_AXIS_0_1, max: yMax } },
    },
  });
}

const chartL1   = buildLineChart("chart-l1",   "l1",   "L₁", 1);
const chartCorr = buildLineChart("chart-corr", "corr", "r",  1);

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
// Bottom-right: heatmap (5x5, AI score × human score)
// ============================================================

// Build matrix data shape: array of {x, y, v}
function heatmapDataFor(modelKey) {
  const m = FIG_DATA.models[modelKey].heatmap;
  // m[h_index][a_index] is the percentage; h_index 0..4 corresponds to
  // human score 1..5, similarly a_index 0..4 -> AI score 1..5.
  const out = [];
  for (let h = 0; h < 5; h++) {
    for (let a = 0; a < 5; a++) {
      out.push({ x: a + 1, y: h + 1, v: m[h][a] });
    }
  }
  return out;
}

// Sequential blue palette for heatmap fills
function heatmapColor(v, vmax = 25) {
  const t = Math.max(0, Math.min(v / vmax, 1));
  // Light cream → mid blue → deep blue
  const lightness = 96 - t * 60;
  const sat = 25 + t * 35;
  return `hsl(210, ${sat}%, ${lightness}%)`;
}

const chartHeatmap = new Chart(document.getElementById("chart-heatmap"), {
  type: "matrix",
  data: {
    datasets: [{
      label: "AI vs human score share (%)",
      data: heatmapDataFor("all"),
      backgroundColor: (ctx) => heatmapColor(ctx.raw.v),
      borderColor: "#fff",
      borderWidth: 2,
      width:  ({chart}) => (chart.chartArea?.width  ?? 0) / 5 - 4,
      height: ({chart}) => (chart.chartArea?.height ?? 0) / 5 - 4,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 12, bottom: 4, left: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        callbacks: {
          title: () => "",
          label: (item) => {
            const { x, y, v } = item.raw;
            return `Human ${y} × AI ${x}: ${v.toFixed(1)}% of papers`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 0.5, max: 5.5,
        offset: false,
        ticks: {
          stepSize: 1,
          callback: (v) => (v >= 1 && v <= 5 && v === Math.floor(v)) ? `AI ${v}` : "",
          color: "#444",
          font: { size: 11 },
        },
        grid: { display: false },
        border: { color: "#bbb" },
        title: { display: false },
      },
      y: {
        type: "linear",
        min: 0.5, max: 5.5,
        reverse: true,
        offset: false,
        ticks: {
          stepSize: 1,
          callback: (v) => (v >= 1 && v <= 5 && v === Math.floor(v)) ? `Human ${v}` : "",
          color: "#444",
          font: { size: 11 },
        },
        grid: { display: false },
        border: { color: "#bbb" },
        title: { display: false },
      },
    },
  },
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

  // Heatmap: swap data (matrix plugin doesn't smoothly animate cell colors,
  // but switching is fast)
  chartHeatmap.data.datasets[0].data = heatmapDataFor(modelKey);
  chartHeatmap.update();

  // Section title updates dynamically based on selection
  const blockTitle = document.getElementById("drilldown-title");
  if (blockTitle) {
    blockTitle.textContent = (modelKey === "all")
      ? "Look across all six models"
      : `Look inside ${label}`;
  }

  // Per-figure subtitles
  const histSub = document.getElementById("hist-subtitle");
  const hmSub   = document.getElementById("heatmap-subtitle");
  if (histSub) histSub.textContent = (modelKey === "all")
    ? "All-model average vs human reference"
    : `${label} vs human reference`;
  if (hmSub) hmSub.textContent = (modelKey === "all")
    ? "Across all six models: share of papers in each (Human × AI) cell"
    : `${label}: share of papers in each (Human × AI) cell`;
}

document.getElementById("model-select").addEventListener("change", (e) => {
  applyModelSelection(e.target.value);
});

// Initialize state
applyModelSelection("all");
