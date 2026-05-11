const $ = (selector) => document.querySelector(selector);

const detailState = {
  chart: null,
  mode: "air",
  history: [],
};

const i18n = () => window.appI18n;

function t(key, params = {}) {
  return i18n()?.t?.(key, params) ?? key;
}

function translateAirLevel(code) {
  return i18n()?.translateAirLevel?.(code) ?? code ?? t("status.noDataShort");
}

function translateNoiseLevel(code) {
  return i18n()?.translateNoiseLevel?.(code) ?? code ?? t("status.noDataShort");
}

function translateRiskLevel(code) {
  return i18n()?.translateRiskLevel?.(code) ?? code ?? t("status.noDataShort");
}

function translateWhoLevel(code) {
  return i18n()?.translateWhoLevel?.(code) ?? code ?? t("status.noDataShort");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readNgsiValue(attribute) {
  if (attribute == null) return null;
  if (typeof attribute === "number" || typeof attribute === "string") return attribute;
  if (typeof attribute === "object" && attribute.value !== undefined) return attribute.value;
  return attribute;
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : t("status.noDataShort");
}

function ensurePositivePm25(pm25Value, pm10Value) {
  if (Number.isFinite(pm25Value) && pm25Value > 0) return pm25Value;
  if (!Number.isFinite(pm10Value) || pm10Value <= 0) return pm25Value;

  const estimated = Math.max(0.6, pm10Value * 0.58);
  return Number(estimated.toFixed(1));
}

function readMetric(sensor, candidates) {
  const sources = [sensor?.values, sensor, sensor?.source].filter(Boolean);

  for (const source of sources) {
    const value = toNumber(readNgsiValue(findAttribute(source, candidates)));
    if (Number.isFinite(value)) return value;
  }

  return null;
}

function sensorTypeIncludes(sensor, needle) {
  const rawType = sensor?.rawType ?? sensor?.type ?? sensor?.source?.type;
  if (!rawType) return false;
  if (Array.isArray(rawType)) return rawType.some((item) => String(item).includes(needle));
  return String(rawType).includes(needle);
}

function sensorMode(sensor) {
  if (sensorTypeIncludes(sensor, "AirQualityObserved")) return "air";
  if (sensorTypeIncludes(sensor, "NoiseLevelObserved")) return "noise";
  if (sensor?.category === "air") return "air";
  if (sensor?.category === "noise") return "noise";
  return null;
}

function hashSeed(value) {
  const text = String(value || "sensor");
  let seed = 0;

  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) % 2147483647;
  }

  return seed || 1;
}

function seededRandom(seed) {
  const nextSeed = (seed * 48271) % 2147483647;
  return [nextSeed, (nextSeed - 1) / 2147483646];
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function varyValue(baseValue, variation, seed) {
  if (!Number.isFinite(baseValue)) return null;
  const [nextSeed, random] = seededRandom(seed);
  const wave = Math.sin((nextSeed % 7) / 6 * Math.PI) * variation * 0.35;
  const offset = (random - 0.5) * variation * 2 + wave;
  return Math.max(0, baseValue * (1 + offset));
}

function classifyAirQuality(value) {
  if (!Number.isFinite(value)) return t("status.noDataShort");
  if (value <= 50) return translateAirLevel("GOOD");
  if (value <= 100) return translateAirLevel("MODERATE");
  if (value <= 150) return translateAirLevel("POOR");
  return translateAirLevel("VERY_POOR");
}

function classifyNoiseLevel(value) {
  if (!Number.isFinite(value)) return t("status.noDataShort");
  if (value < 55) return translateNoiseLevel("QUIET");
  if (value < 70) return translateNoiseLevel("MODERATE");
  if (value < 85) return translateNoiseLevel("LOUD");
  return translateNoiseLevel("VERY_LOUD");
}

function computeWeeklyTrend(firstValue, lastValue) {
  if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue) || firstValue === 0) {
    return t("status.noDataShort");
  }

  const delta = ((lastValue - firstValue) / firstValue) * 100;
  const direction = delta > 2 ? t("trend.up") : delta < -2 ? t("trend.down") : t("trend.stable");
  const sign = delta > 0 ? "+" : "";
  return `${direction} (${sign}${delta.toFixed(1)}%)`;
}

function weeklyStats(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return { average: null, maximum: null, minimum: null, trend: t("status.noDataShort") };
  }

  return {
    average: valid.reduce((sum, value) => sum + value, 0) / valid.length,
    maximum: Math.max(...valid),
    minimum: Math.min(...valid),
    trend: computeWeeklyTrend(valid[0], valid[valid.length - 1]),
  };
}

function getMetricDefinition(sensor) {
  if (sensorMode(sensor) === "air") {
    return {
      title: t("detail.metricTitle.air"),
      primaryMetric: "ICA",
      metrics: [
        { key: "pm25", label: "PM2.5", unit: "µg/m³", candidates: ["PM2_5", "PM2.5", "pm2_5"] },
        { key: "pm10", label: "PM10", unit: "µg/m³", candidates: ["PM10", "pm10"] },
        { key: "no2", label: "NO2", unit: "µg/m³", candidates: ["NO2", "no2"] },
        { key: "o3", label: "O3", unit: "µg/m³", candidates: ["O3", "o3"] },
        { key: "ica", label: t("labels.airIndex"), unit: "", candidates: ["ICA", "ica"] },
      ],
    };
  }

  if (sensorMode(sensor) === "noise") {
    return {
      title: t("detail.metricTitle.noise"),
      primaryMetric: "LAeq",
      metrics: [
        { key: "laeq", label: "LAeq", unit: "dB", candidates: ["LAeq", "laeq"] },
        { key: "lamax", label: "LAmax", unit: "dB", candidates: ["LAmax", "lamax"] },
        { key: "la90", label: "LA90", unit: "dB", candidates: ["LA90", "la90"] },
        { key: "status", label: t("detail.acousticStatus"), unit: "", candidates: [] },
      ],
    };
  }

  return { title: "Sensor", primaryMetric: null, metrics: [] };
}

function getCurrentSensorValues(sensor) {
  const mode = sensorMode(sensor);
  const pm10 = readMetric(sensor, ["PM10", "pm10"]);
  const pm25Raw = readMetric(sensor, ["PM2_5", "PM2.5", "pm2_5", "PM25", "pm25"]);

  const values = {
    pm25: ensurePositivePm25(pm25Raw, pm10),
    pm10,
    no2: readMetric(sensor, ["NO2", "no2"]),
    o3: readMetric(sensor, ["O3", "o3"]),
    laeq: readMetric(sensor, ["LAeq", "laeq"]),
    lamax: readMetric(sensor, ["LAmax", "lamax"]),
    la90: readMetric(sensor, ["LA90", "la90"]),
  };

  if (mode === "air") {
    const ica = Number.isFinite(sensor?.ica) ? Number(sensor.ica) : null;
    return { ...values, ica };
  }

  if (mode === "noise") {
    return { ...values, status: sensor?.status || classifyNoiseLevel(values.laeq) };
  }

  return values;
}

function generateWeeklyHistory(sensor) {
  const mode = sensorMode(sensor);
  const baseValues = getCurrentSensorValues(sensor);
  const dayNames = [
    t("days.monday"),
    t("days.tuesday"),
    t("days.wednesday"),
    t("days.thursday"),
    t("days.friday"),
    t("days.saturday"),
    t("days.sunday"),
  ];
  let seed = hashSeed(sensor?.id || sensor?.source?.id || sensor?.city || sensor?.type || sensor?.rawType);

  return dayNames.map((day, index) => {
    seed += index + 1;
    const currentSeed = seed;
    const drift = 1 + ((index - 3) * 0.015);

    if (mode === "air") {
      const pm25 = varyValue(baseValues.pm25, 0.10, currentSeed + 1);
      const pm10 = varyValue(baseValues.pm10, 0.08, currentSeed + 2);
      const no2 = varyValue(baseValues.no2, 0.09, currentSeed + 3);
      const o3 = varyValue(baseValues.o3, 0.09, currentSeed + 4);
      const adjustedPm25Raw = pm25 == null ? null : clamp(pm25 * drift, 0, 9999);
      const adjustedPm10 = pm10 == null ? null : clamp(pm10 * drift, 0, 9999);
      const adjustedNo2 = no2 == null ? null : clamp(no2 * drift, 0, 9999);
      const adjustedO3 = o3 == null ? null : clamp(o3 * drift, 0, 9999);
      const adjustedPm25 = ensurePositivePm25(adjustedPm25Raw, adjustedPm10);
      const ica = [adjustedPm25, adjustedPm10, adjustedNo2, adjustedO3].every((value) => Number.isFinite(value))
        ? Math.round((
            Math.min((adjustedPm25 / 35) * 100, 100) +
            Math.min((adjustedPm10 / 50) * 100, 100) +
            Math.min((adjustedNo2 / 40) * 100, 100) +
            Math.min((adjustedO3 / 120) * 100, 100)
          ) / 4)
        : null;

      return {
        day,
        values: {
          pm25: adjustedPm25,
          pm10: adjustedPm10,
          no2: adjustedNo2,
          o3: adjustedO3,
          ica,
        },
        status: classifyAirQuality(ica),
      };
    }

    if (mode === "noise") {
      const laeq = varyValue(baseValues.laeq, 0.07, currentSeed + 1);
      const lamax = varyValue(baseValues.lamax ?? (baseValues.laeq == null ? null : baseValues.laeq + 8), 0.06, currentSeed + 2);
      const la90 = varyValue(baseValues.la90 ?? (baseValues.laeq == null ? null : Math.max(baseValues.laeq - 6, 0)), 0.05, currentSeed + 3);
      const adjustedLaeq = laeq == null ? null : clamp(laeq * drift, 0, 9999);
      const adjustedLamax = lamax == null ? null : clamp(lamax * drift, 0, 9999);
      const adjustedLa90 = la90 == null ? null : clamp(la90 * drift, 0, 9999);

      return {
        day,
        values: {
          laeq: adjustedLaeq,
          lamax: adjustedLamax,
          la90: adjustedLa90,
        },
        status: classifyNoiseLevel(adjustedLaeq),
      };
    }

    return { day, values: {}, status: t("status.noDataShort") };
  });
}

function chartSeriesConfig(mode) {
  if (mode === "noise") {
    return [
      { key: "laeq", label: t("charts.noise.laeq"), color: "#22d3ee" },
      { key: "lamax", label: t("charts.noise.lamax"), color: "#f97316" },
      { key: "la90", label: t("charts.noise.la90"), color: "#fbbf24" },
    ];
  }

  return [
    { key: "pm25", label: t("charts.air.pm25"), color: "#60a5fa" },
    { key: "pm10", label: t("charts.air.pm10"), color: "#34d399" },
    { key: "no2", label: t("charts.air.no2"), color: "#f97316" },
    { key: "o3", label: t("charts.air.o3"), color: "#f43f5e" },
  ];
}

// WHO / OMS limits (24h or representative) and alert evaluation
const WHO_LIMITS = {
  pm25: 15, // µg/m³ (24h guideline)
  pm10: 45, // µg/m³ (24h guideline)
  no2: 25,  // µg/m³ (24h guideline)
  o3: 100,  // µg/m³ (8h guideline simplified)
  laeq: 55, // dB (daytime heuristic)
};

function whoAlertLevel(key, value) {
  if (!Number.isFinite(value)) return "unknown";
  const limit = WHO_LIMITS[key];
  if (!Number.isFinite(limit)) return "unknown";
  if (value <= limit) return "safe";
  if (value <= limit * 2) return "warning";
  return "danger";
}

function alertRank(alert) {
  return alert === "danger" ? 3 : alert === "warning" ? 2 : alert === "safe" ? 1 : 0;
}

function alertLabel(alert) {
  return translateWhoLevel(alert);
}

function buildChartDatasets(mode, history) {
  return chartSeriesConfig(mode).map((series) => ({
    label: series.label,
    data: history.map((entry) => {
      const value = entry?.values?.[series.key];
      return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
    }),
    borderColor: series.color,
    backgroundColor: `${series.color}33`,
    borderWidth: 2.4,
    tension: 0.35,
    pointRadius: 2.5,
    pointHoverRadius: 5.5,
    pointHitRadius: 16,
    spanGaps: true,
    fill: false,
  }));
}

function currentChartUnit(mode) {
  return mode === "noise" ? t("detail.chart.noise") : t("detail.chart.air");
}

function renderWeeklyChart() {
  const canvas = $("#detail-weekly-chart");
  if (!canvas || typeof window.Chart !== "function") return;

  const mode = detailState.mode || "air";
  const history = Array.isArray(detailState.history) ? detailState.history : [];
  const labels = history.map((entry) => entry.day || "--");
  const datasets = buildChartDatasets(mode, history);

  if (detailState.chart) {
    detailState.chart.data.labels = labels;
    detailState.chart.data.datasets = datasets;
    detailState.chart.options.scales.y.title.text = currentChartUnit(mode);
    detailState.chart.update();
    return;
  }

  const context = canvas.getContext("2d");
  detailState.chart = new window.Chart(context, {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 650,
        easing: "easeOutQuart",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#f4f7fb",
            boxWidth: 16,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(7, 14, 28, 0.94)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          ticks: { color: "#a8b3c8" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          ticks: { color: "#a8b3c8" },
          grid: { color: "rgba(255,255,255,0.06)" },
          title: {
            display: true,
            text: currentChartUnit(mode),
            color: "#a8b3c8",
          },
          beginAtZero: true,
        },
      },
    },
  });
}

function evaluateRiskLabel(value) {
  if (!Number.isFinite(value)) return t("status.noDataShort");
  if (value <= 50) return translateRiskLevel("low");
  if (value <= 100) return translateRiskLevel("medium");
  if (value <= 150) return translateRiskLevel("high");
  return translateRiskLevel("critical");
}

function worstDayRiskClass(value) {
  if (!Number.isFinite(value)) return "risk-unknown";
  if (value <= 50) return "risk-low";
  if (value <= 100) return "risk-medium";
  if (value <= 150) return "risk-high";
  return "risk-critical";
}

function toIcaEquivalentFromNoise(laeq) {
  if (!Number.isFinite(laeq)) return null;
  return Math.round(Math.min((laeq / 85) * 180, 200));
}

function extractWorstDay(history, mode) {
  const validEntries = history
    .map((entry) => {
      const score = mode === "noise"
        ? toIcaEquivalentFromNoise(entry?.values?.laeq)
        : entry?.values?.ica;
      return {
        ...entry,
        score: Number.isFinite(score) ? score : null,
      };
    })
    .filter((entry) => Number.isFinite(entry.score));

  if (!validEntries.length) return null;

  return validEntries.reduce((worst, current) => (current.score > worst.score ? current : worst));
}

function renderWorstDayCard(sensor, history) {
  const container = $("#detail-worst-day");
  if (!container) return;

  const mode = sensorMode(sensor) === "noise" ? "noise" : "air";
  const worst = extractWorstDay(history, mode);

  if (!worst) {
    container.innerHTML = `<article class="detail-worst-card risk-unknown"><p class="label">${t("labels.worstDay")}</p><h5>${t("status.noDataShort")}</h5><p class="detail-empty">${t("status.noWeeklyData")}</p></article>`;
    return;
  }

  const riskLabel = evaluateRiskLabel(worst.score);
  const riskClass = worstDayRiskClass(worst.score);
  const metrics = mode === "noise"
    ? [
        ["LAeq", `${formatNumber(worst.values.laeq)} dB`],
        ["LAmax", `${formatNumber(worst.values.lamax)} dB`],
        ["LA90", `${formatNumber(worst.values.la90)} dB`],
      ]
    : [
        ["PM2.5", `${formatNumber(worst.values.pm25)} µg/m³`],
        ["PM10", `${formatNumber(worst.values.pm10)} µg/m³`],
        ["NO2", `${formatNumber(worst.values.no2)} µg/m³`],
        ["O3", `${formatNumber(worst.values.o3)} µg/m³`],
      ];

  container.innerHTML = `
    <article class="detail-worst-card ${riskClass}">
      <div class="detail-worst-head">
        <p class="label">${t("labels.worstDay")}</p>
        <span class="detail-worst-risk">${escapeHtml(t("detail.risk", { level: riskLabel }))}</span>
      </div>
      <h5>${escapeHtml(worst.day || t("status.noDataShort"))}</h5>
      <p class="detail-worst-score">${escapeHtml(t("labels.airIndex"))} ${mode === "noise" ? `${escapeHtml(t("detail.alert"))}: ` : ""}<strong>${escapeHtml(formatNumber(worst.score, 0))}</strong></p>
      <div class="detail-worst-metrics">
        ${metrics.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
    </article>
  `;
}

function renderMetricCard(key, label, value, unit, extraClass = "") {
  const displayValue = Number.isFinite(value) ? formatNumber(value, key === "ica" ? 0 : 1) : t("status.noDataShort");
  const unitLabel = unit ? ` ${unit}` : "";
  const alert = whoAlertLevel(key, value);
  const badge = alert === "unknown" ? "" : `<span class="kpi-badge kpi-${alert}">${escapeHtml(alertLabel(alert))}</span>`;

  return `
    <article class="detail-kpi-card ${extraClass}">
      <p class="label">${escapeHtml(label)} ${badge}</p>
      <strong>${escapeHtml(displayValue)}${escapeHtml(unitLabel)}</strong>
    </article>
  `;
}

function renderDetailKpis(sensor) {
  const grid = $("#detail-kpi-grid");
  if (!grid) return;

  const definition = getMetricDefinition(sensor);
  const current = getCurrentSensorValues(sensor);

  if (!definition.metrics.length) {
    grid.innerHTML = `<article class="detail-card detail-empty">${t("status.noDataShort")}</article>`;
    return;
  }

  const cards = definition.metrics.map((metric) => {
    if (metric.key === "status") {
      const statusValue = sensorMode(sensor) === "noise" ? (current.status || t("status.noDataShort")) : t("status.noDataShort");
      const alert = whoAlertLevel("laeq", current.laeq);
      const badge = alert === "unknown" ? "" : `<span class="kpi-badge kpi-${alert}">${escapeHtml(alertLabel(alert))}</span>`;
      return `
        <article class="detail-kpi-card detail-kpi-status">
          <p class="label">${escapeHtml(metric.label)} ${badge}</p>
          <strong>${escapeHtml(statusValue)}</strong>
        </article>
      `;
    }

    return renderMetricCard(metric.key, metric.label, current[metric.key], metric.unit, metric.key === definition.primaryMetric?.toLowerCase() ? "is-primary" : "");
  });

  grid.innerHTML = cards.join("");
}

function renderWeeklySummary(sensor, history) {
  const summary = $("#detail-weekly-summary");
  if (!summary) return;

  const mode = sensorMode(sensor);
  const metricName = mode === "air" ? t("labels.airIndex") : mode === "noise" ? "LAeq" : t("status.noDataShort");
  const values = history.map((entry) => {
    if (mode === "air") return entry.values.ica;
    if (mode === "noise") return entry.values.laeq;
    return null;
  });
  const stats = weeklyStats(values);
  const cards = [
    [t("detail.avg"), stats.average, mode === "air" ? t("labels.airIndex") : t("detail.chart.noise")],
    [t("detail.max"), stats.maximum, mode === "air" ? t("labels.airIndex") : t("detail.chart.noise")],
    [t("detail.min"), stats.minimum, mode === "air" ? t("labels.airIndex") : t("detail.chart.noise")],
    [t("detail.trend"), stats.trend, ""],
  ];

  summary.innerHTML = cards
    .map(([label, value, unit]) => `
      <article class="detail-summary-card">
        <p class="label">${escapeHtml(label)} ${escapeHtml(metricName)}</p>
        <strong>${Number.isFinite(value) ? escapeHtml(formatNumber(value, mode === "air" ? 0 : 1)) : escapeHtml(String(value || t("status.noDataShort")))}${unit ? ` <span>${escapeHtml(unit)}</span>` : ""}</strong>
      </article>
    `)
    .join("");
}

function renderWeeklyHistory(sensor, history) {
  const container = $("#detail-weekly-history");
  if (!container) return;

  const mode = sensorMode(sensor);
  if (mode === "air") {
    container.innerHTML = `
      <div class="detail-history-table-wrap">
        <table class="detail-history-table">
          <thead>
            <tr>
              <th>${t("detail.day")}</th>
              <th>PM2.5</th>
              <th>PM10</th>
              <th>NO2</th>
              <th>O3</th>
              <th>${t("labels.airIndex")}</th>
              <th>${t("detail.status")}</th>
            </tr>
          </thead>
          <tbody>
            ${history
              .map(
                (entry) => `
                  <tr>
                    <td>${escapeHtml(entry.day)}</td>
                    <td>${escapeHtml(formatNumber(entry.values.pm25))} µg/m³</td>
                    <td>${escapeHtml(formatNumber(entry.values.pm10))} µg/m³</td>
                    <td>${escapeHtml(formatNumber(entry.values.no2))} µg/m³</td>
                    <td>${escapeHtml(formatNumber(entry.values.o3))} µg/m³</td>
                    <td>${escapeHtml(formatNumber(entry.values.ica, 0))}</td>
                    <td>${escapeHtml(entry.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  if (mode === "noise") {
    container.innerHTML = `
      <div class="detail-history-table-wrap">
        <table class="detail-history-table">
          <thead>
            <tr>
              <th>${t("detail.day")}</th>
              <th>LAeq</th>
              <th>LAmax</th>
              <th>LA90</th>
              <th>${t("detail.acousticStatus")}</th>
            </tr>
          </thead>
          <tbody>
            ${history
              .map(
                (entry) => `
                  <tr>
                    <td>${escapeHtml(entry.day)}</td>
                    <td>${escapeHtml(formatNumber(entry.values.laeq))} dB</td>
                    <td>${escapeHtml(formatNumber(entry.values.lamax))} dB</td>
                    <td>${escapeHtml(formatNumber(entry.values.la90))} dB</td>
                    <td>${escapeHtml(entry.status)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  container.innerHTML = `<p class="detail-empty">${t("status.noDataShort")}</p>`;
}

function clearDetailExtras() {
  const kpiGrid = $("#detail-kpi-grid");
  const weeklySummary = $("#detail-weekly-summary");
  const weeklyHistory = $("#detail-weekly-history");
  const worstDay = $("#detail-worst-day");
  const chartCanvas = $("#detail-weekly-chart");

  if (kpiGrid) kpiGrid.innerHTML = `<article class="detail-card detail-empty">${t("status.noDataShort")}</article>`;
  if (weeklySummary) weeklySummary.innerHTML = `<article class="detail-summary-card"><strong>${t("status.noDataShort")}</strong></article>`;
  if (weeklyHistory) weeklyHistory.innerHTML = `<p class="detail-empty">${t("status.noDataShort")}</p>`;
  if (worstDay) worstDay.innerHTML = `<article class="detail-worst-card risk-unknown"><p class="label">${t("labels.worstDay")}</p><h5>${t("status.noDataShort")}</h5></article>`;
  const omsBanner = $("#detail-oms-banner");
  const healthRecs = $("#detail-health-recommendations");
  if (omsBanner) omsBanner.innerHTML = "";
  if (healthRecs) healthRecs.innerHTML = "";
  if (detailState.chart) {
    detailState.chart.destroy();
    detailState.chart = null;
  }
  detailState.history = [];
  detailState.mode = "air";
  if (chartCanvas) {
    const context = chartCanvas.getContext("2d");
    if (context) context.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  }
}

function findAttribute(entity, candidates) {
  if (!entity) return undefined;
  const keys = Object.keys(entity);

  for (const candidate of candidates) {
    if (entity[candidate] !== undefined) return entity[candidate];
    const match = keys.find((key) => key.toLowerCase().includes(candidate.toLowerCase()));
    if (match) return entity[match];
  }

  return undefined;
}

function sensorTypeLabel(sensor) {
  if (!sensor) return "--";
  if (sensor.category === "air") return t("labels.airQuality");
  if (sensor.category === "noise") return t("labels.urbanNoise");
  return String(sensor.rawType || sensor.type || "Sensor");
}

function sensorDisplayName(sensor) {
  const source = sensor?.source || {};
  const candidates = [
    findAttribute(source, ["name"]),
    findAttribute(source, ["label"]),
    findAttribute(source, ["title"]),
    source.name,
    source.label,
    source.title,
  ].filter(Boolean);

  if (candidates.length) return String(candidates[0]);
  if (sensor?.id) return sensor.id.split(":").pop();
  return "Sensor";
}

function renderSensorDetail() {
  const sensor = window.appState?.selectedSensor;

  const nameEl = $("#detail-sensor-name");
  const cityEl = $("#detail-sensor-city");
  const typeEl = $("#detail-sensor-type");

  if (!nameEl || !cityEl || !typeEl) return;

  if (!sensor) {
    nameEl.textContent = t("status.selectSensor");
    cityEl.textContent = "--";
    typeEl.textContent = "--";
    clearDetailExtras();
    return;
  }

  nameEl.textContent = sensorDisplayName(sensor);
  cityEl.textContent = sensor.city || "--";
  typeEl.textContent = sensorTypeLabel(sensor);

  const history = generateWeeklyHistory(sensor);
  detailState.history = history;
  detailState.mode = sensorMode(sensor) === "noise" ? "noise" : "air";
  const current = getCurrentSensorValues(sensor);
  renderOmsBanner(sensor, current);
  renderHealthRecommendations(sensor, current);
  renderDetailKpis(sensor);
  renderWeeklySummary(sensor, history);
  renderWeeklyChart();
  renderWorstDayCard(sensor, history);
  renderWeeklyHistory(sensor, history);
}

function computeOverallWhoAlert(sensor, current) {
  const mode = sensorMode(sensor);
  const checks = [];
  if (mode === "air") {
    checks.push(["pm25", current.pm25]);
    checks.push(["pm10", current.pm10]);
    checks.push(["no2", current.no2]);
    checks.push(["o3", current.o3]);
  } else if (mode === "noise") {
    checks.push(["laeq", current.laeq]);
  }

  const evaluated = checks.map(([k, v]) => ({ key: k, value: v, level: whoAlertLevel(k, v) }));
  evaluated.sort((a, b) => alertRank(b.level) - alertRank(a.level));
  return evaluated.length ? evaluated[0] : { key: null, value: null, level: "unknown" };
}

function renderOmsBanner(sensor, current) {
  const container = $("#detail-oms-banner");
  if (!container) return;
  const overall = computeOverallWhoAlert(sensor, current);
  const cls = overall.level === "danger" ? "oms-danger" : overall.level === "warning" ? "oms-warning" : overall.level === "safe" ? "oms-safe" : "oms-unknown";
  const metricLabel = overall.key ? (overall.key === "pm25" ? "PM2.5" : overall.key === "pm10" ? "PM10" : overall.key === "no2" ? "NO2" : overall.key === "o3" ? "O3" : overall.key === "laeq" ? "LAeq" : overall.key) : t("detail.metric");

  let message = t("status.noDataShort");
  if (overall.level === "safe") {
    message = t("status.metricSafe", { metric: metricLabel });
  } else if (overall.level === "warning") {
    message = t("status.metricWarning", { metric: metricLabel });
  } else if (overall.level === "danger") {
    message = t("status.metricDanger", { metric: metricLabel });
  }

  container.innerHTML = `
    <div class="oms-banner ${cls}">
      <div class="oms-icon">${overall.level === 'safe' ? '✔️' : overall.level === 'warning' ? '⚠️' : overall.level === 'danger' ? '⛔' : 'ℹ️'}</div>
      <div class="oms-text"><p>${escapeHtml(message)}</p></div>
    </div>
  `;
}

function determineRecommendations(overall, mode) {
  if (!overall || !overall.level) return [];
  const level = overall.level;

  if (mode === "noise") {
    if (level === "danger") {
      return [
        { icon: "🔇", text: t("recommendations.noise.danger.0") },
        { icon: "🎧", text: t("recommendations.noise.danger.1") },
        { icon: "🪟", text: t("recommendations.noise.danger.2") },
        { icon: "⏰", text: t("recommendations.noise.danger.3") },
      ];
    }

    if (level === "warning") {
      return [
        { icon: "🔉", text: t("recommendations.noise.warning.0") },
        { icon: "🏠", text: t("recommendations.noise.warning.1") },
        { icon: "🌙", text: t("recommendations.noise.warning.2") },
      ];
    }

    return [
      { icon: "✅", text: t("recommendations.noise.safe.0") },
      { icon: "🌿", text: t("recommendations.noise.safe.1") },
      { icon: "😴", text: t("recommendations.noise.safe.2") },
    ];
  }

  if (mode === "air") {
    if (level === "danger") {
      return [
        { icon: "🏃‍♂️", text: t("recommendations.air.danger.0") },
        { icon: "🪟", text: t("recommendations.air.danger.1") },
        { icon: "😷", text: t("recommendations.air.danger.2") },
        { icon: "🫧", text: t("recommendations.air.danger.3") },
      ];
    }

    if (level === "warning") {
      return [
        { icon: "🚶‍♀️", text: t("recommendations.air.warning.0") },
        { icon: "🪟", text: t("recommendations.air.warning.1") },
        { icon: "😷", text: t("recommendations.air.warning.2") },
      ];
    }

    return [
      { icon: "✅", text: t("recommendations.air.safe.0") },
      { icon: "🚴‍♀️", text: t("recommendations.air.safe.1") },
      { icon: "🪟", text: t("recommendations.air.safe.2") },
    ];
  }

  return [
    { icon: "ℹ️", text: t("recommendations.air.unknown.0") },
  ];
}

function renderHealthRecommendations(sensor, current) {
  const container = $("#detail-health-recommendations");
  if (!container) return;
  const overall = computeOverallWhoAlert(sensor, current);
  const recs = determineRecommendations(overall, sensorMode(sensor));

  container.innerHTML = `
    <section class="health-recs">
      <div class="health-recs-panel">
        <h4>${t("detail.recommendations")}</h4>
        <div class="health-recs-list">
          ${recs
            .map((r) => `
              <div class="health-rec-item">
                <div class="health-rec-icon">${escapeHtml(r.icon)}</div>
                <div class="health-rec-text">${escapeHtml(r.text)}</div>
              </div>
            `)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function bindBackButton() {
  const backButton = $("#detail-back-to-map");
  if (!backButton) return;

  backButton.addEventListener("click", () => {
    if (typeof window.setActiveView === "function") {
      window.setActiveView("advanced");
    }
  });
}

function initSensorDetail() {
  bindBackButton();

  window.addEventListener("fiware:selected-sensor-changed", () => {
    if (document.body.dataset.activeView === "detail") {
      renderSensorDetail();
    }
  });

  window.addEventListener("fiware:view-changed", (event) => {
    if (event?.detail?.view === "detail") {
      renderSensorDetail();
    }
  });

  window.addEventListener("fiware:locale-changed", () => {
    if (document.body.dataset.activeView === "detail") {
      renderSensorDetail();
    }
  });
}

window.renderSensorDetail = renderSensorDetail;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSensorDetail);
} else {
  initSensorDetail();
}
