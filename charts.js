/* Charts for the canaireview landing page.
 *
 * Style guide: Tufte-clean. Maximize data-ink, minimize chrome.
 *   - No axis titles (the figure title above the chart says what it is)
 *   - X-axis: no tick labels (release date is in the hover tooltip)
 *   - Y-axis: only 0 and 1 labeled
 *   - Reference lines (y=0 for L1, y=0 and y=1 for correlation) but no text labels
 *   - Smaller legend, larger figure points
 *
 * Release dates below are approximate placeholders within the
 * Nov 2025 -- Apr 2026 window. Replace with exact dates when known.
 */

const MODEL_DATA = {
  opus: [
    { name: "Opus 4.5", date: "2025-11-04", l1: 0.814, corr: 0.234 },
    { name: "Opus 4.6", date: "2026-01-15", l1: 0.650, corr: 0.267 },
    { name: "Opus 4.7", date: "2026-04-08", l1: 0.454, corr: 0.310 },
  ],
  gpt: [
    { name: "GPT-5.1", date: "2025-11-20", l1: 0.898, corr: 0.133 },
    { name: "GPT-5.4", date: "2026-02-10", l1: 0.734, corr: 0.208 },
    { name: "GPT-5.5", date: "2026-04-22", l1: 0.449, corr: 0.235 },
  ],
};

// Colorblind-safe pair: warm orange + cool blue.
// (Okabe-Ito orange #E69F00 and blue #0072B2; toned slightly for academic feel.)
const COLORS = {
  opus: "#cc7a00", // amber-orange
  gpt:  "#0072b2", // colorblind-safe blue
};

// Plugin registration
if (window["chartjs-plugin-annotation"]) {
  Chart.register(window["chartjs-plugin-annotation"]);
}

// Defaults
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#444";

// Helpers
const pointsFor = (vendor, metric) =>
  MODEL_DATA[vendor].map(m => ({ x: m.date, y: m[metric], name: m.name }));

const fmtDate = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const tooltipCallbacks = (metricLabel) => ({
  title: (items) => items.length ? items[0].raw.name : "",
  label: (item) => {
    const r = item.raw;
    return `${metricLabel} = ${r.y.toFixed(3)}  (released ${fmtDate(r.x)})`;
  },
});

// Span the data with a small visual margin so endpoints don't sit on the edge.
const X_MIN = "2025-10-15";
const X_MAX = "2026-05-15";

const X_AXIS = {
  type: "time",
  min: X_MIN,
  max: X_MAX,
  time: { unit: "month", tooltipFormat: "MMM d, yyyy" },
  ticks: { display: false },
  grid: { display: false, drawBorder: true, color: "#ddd" },
  border: { display: true, color: "#bbb" },
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
  border: { display: true, color: "#bbb" },
};

const SHARED_LEGEND = {
  position: "top",
  align: "end",
  labels: {
    usePointStyle: true,
    pointStyle: "circle",
    boxWidth: 6,
    boxHeight: 6,
    padding: 12,
    font: { size: 11 },
    color: "#333",
  },
};

const POINT_STYLE = {
  pointRadius: 6,
  pointHoverRadius: 9,
  pointBorderWidth: 2,
  pointBackgroundColor: "#fff",
  borderWidth: 2.4,
  tension: 0.04,
};

// ---------- Figure 1: L1 distance ----------
new Chart(document.getElementById("chart-l1"), {
  type: "line",
  data: {
    datasets: [
      {
        label: "Anthropic Opus",
        data: pointsFor("opus", "l1"),
        borderColor: COLORS.opus,
        backgroundColor: COLORS.opus,
        ...POINT_STYLE,
      },
      {
        label: "OpenAI GPT",
        data: pointsFor("gpt", "l1"),
        borderColor: COLORS.gpt,
        backgroundColor: COLORS.gpt,
        ...POINT_STYLE,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
    plugins: {
      legend: SHARED_LEGEND,
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        titleFont: { weight: "600", size: 12 },
        bodyFont: { size: 12 },
        callbacks: tooltipCallbacks("L₁"),
      },
      annotation: {
        annotations: {
          zeroLine: {
            type: "line", yMin: 0, yMax: 0,
            borderColor: "#999", borderWidth: 1, borderDash: [3, 3],
          },
        },
      },
    },
    scales: { x: X_AXIS, y: Y_AXIS_0_1 },
  },
});

// ---------- Figure 2: Correlation ----------
new Chart(document.getElementById("chart-corr"), {
  type: "line",
  data: {
    datasets: [
      {
        label: "Anthropic Opus",
        data: pointsFor("opus", "corr"),
        borderColor: COLORS.opus,
        backgroundColor: COLORS.opus,
        ...POINT_STYLE,
      },
      {
        label: "OpenAI GPT",
        data: pointsFor("gpt", "corr"),
        borderColor: COLORS.gpt,
        backgroundColor: COLORS.gpt,
        ...POINT_STYLE,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: true },
    layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
    plugins: {
      legend: SHARED_LEGEND,
      tooltip: {
        backgroundColor: "rgba(20,20,20,0.92)",
        padding: 10,
        titleFont: { weight: "600", size: 12 },
        bodyFont: { size: 12 },
        callbacks: tooltipCallbacks("r"),
      },
      annotation: {
        annotations: {
          zeroLine: {
            type: "line", yMin: 0, yMax: 0,
            borderColor: "#999", borderWidth: 1, borderDash: [3, 3],
          },
          oneLine: {
            type: "line", yMin: 1, yMax: 1,
            borderColor: "#999", borderWidth: 1, borderDash: [3, 3],
          },
        },
      },
    },
    scales: { x: X_AXIS, y: Y_AXIS_0_1 },
  },
});
