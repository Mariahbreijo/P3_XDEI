const $ = (selector) => document.querySelector(selector);

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
  return Number.isFinite(value) ? value.toFixed(digits) : "N/D";
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
  if (!Number.isFinite(value)) return "N/D";
  if (value <= 50) return "Bueno";
  if (value <= 100) return "Moderado";
  if (value <= 150) return "Malo";
  return "Crítico";
}

function classifyNoiseLevel(value) {
  if (!Number.isFinite(value)) return "N/D";
  if (value < 55) return "Silencioso";
  if (value < 70) return "Moderado";
  if (value < 85) return "Alto";
  return "Muy alto";
}

function computeWeeklyTrend(firstValue, lastValue) {
  if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue) || firstValue === 0) {
    return "N/D";
  }

  const delta = ((lastValue - firstValue) / firstValue) * 100;
  const direction = delta > 2 ? "al alza" : delta < -2 ? "a la baja" : "estable";
  const sign = delta > 0 ? "+" : "";
  return `${direction} (${sign}${delta.toFixed(1)}%)`;
}

function weeklyStats(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return { average: null, maximum: null, minimum: null, trend: "N/D" };
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
      title: "Calidad del aire",
      primaryMetric: "ICA",
      metrics: [
        { key: "pm25", label: "PM2.5", unit: "µg/m³", candidates: ["PM2_5", "PM2.5", "pm2_5"] },
        { key: "pm10", label: "PM10", unit: "µg/m³", candidates: ["PM10", "pm10"] },
        { key: "no2", label: "NO2", unit: "µg/m³", candidates: ["NO2", "no2"] },
        { key: "o3", label: "O3", unit: "µg/m³", candidates: ["O3", "o3"] },
        { key: "ica", label: "ICA", unit: "", candidates: ["ICA", "ica"] },
      ],
    };
  }

  if (sensorMode(sensor) === "noise") {
    return {
      title: "Ruido urbano",
      primaryMetric: "LAeq",
      metrics: [
        { key: "laeq", label: "LAeq", unit: "dB", candidates: ["LAeq", "laeq"] },
        { key: "lamax", label: "LAmax", unit: "dB", candidates: ["LAmax", "lamax"] },
        { key: "la90", label: "LA90", unit: "dB", candidates: ["LA90", "la90"] },
        { key: "status", label: "Estado acústico", unit: "", candidates: [] },
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
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
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

    return { day, values: {}, status: "N/D" };
  });
}

function renderMetricCard(metric, value, unit, extraClass = "") {
  const displayValue = Number.isFinite(value) ? formatNumber(value, metric === "ica" ? 0 : 1) : "N/D";
  const unitLabel = unit ? ` ${unit}` : "";
  return `
    <article class="detail-kpi-card ${extraClass}">
      <p class="label">${escapeHtml(metric)}</p>
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
    grid.innerHTML = '<article class="detail-card detail-empty">N/D</article>';
    return;
  }

  const cards = definition.metrics.map((metric) => {
    if (metric.key === "status") {
      const statusValue = sensorMode(sensor) === "noise" ? (current.status || "N/D") : "N/D";
      return `
        <article class="detail-kpi-card detail-kpi-status">
          <p class="label">${escapeHtml(metric.label)}</p>
          <strong>${escapeHtml(statusValue || "N/D")}</strong>
        </article>
      `;
    }

    return renderMetricCard(metric.label, current[metric.key], metric.unit, metric.key === definition.primaryMetric?.toLowerCase() ? "is-primary" : "");
  });

  grid.innerHTML = cards.join("");
}

function renderWeeklySummary(sensor, history) {
  const summary = $("#detail-weekly-summary");
  if (!summary) return;

  const mode = sensorMode(sensor);
  const metricName = mode === "air" ? "ICA" : mode === "noise" ? "LAeq" : "Métrica";
  const values = history.map((entry) => {
    if (mode === "air") return entry.values.ica;
    if (mode === "noise") return entry.values.laeq;
    return null;
  });
  const stats = weeklyStats(values);
  const cards = [
    ["Promedio", stats.average, mode === "air" ? "ICA" : "dB"],
    ["Máximo", stats.maximum, mode === "air" ? "ICA" : "dB"],
    ["Mínimo", stats.minimum, mode === "air" ? "ICA" : "dB"],
    ["Tendencia", stats.trend, ""],
  ];

  summary.innerHTML = cards
    .map(([label, value, unit]) => `
      <article class="detail-summary-card">
        <p class="label">${escapeHtml(label)} ${escapeHtml(metricName)}</p>
        <strong>${Number.isFinite(value) ? escapeHtml(formatNumber(value, mode === "air" ? 0 : 1)) : escapeHtml(String(value || "N/D"))}${unit ? ` <span>${escapeHtml(unit)}</span>` : ""}</strong>
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
              <th>Día</th>
              <th>PM2.5</th>
              <th>PM10</th>
              <th>NO2</th>
              <th>O3</th>
              <th>ICA</th>
              <th>Estado</th>
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
              <th>Día</th>
              <th>LAeq</th>
              <th>LAmax</th>
              <th>LA90</th>
              <th>Estado acústico</th>
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

  container.innerHTML = '<p class="detail-empty">N/D</p>';
}

function clearDetailExtras() {
  const kpiGrid = $("#detail-kpi-grid");
  const weeklySummary = $("#detail-weekly-summary");
  const weeklyHistory = $("#detail-weekly-history");

  if (kpiGrid) kpiGrid.innerHTML = '<article class="detail-card detail-empty">N/D</article>';
  if (weeklySummary) weeklySummary.innerHTML = '<article class="detail-summary-card"><strong>N/D</strong></article>';
  if (weeklyHistory) weeklyHistory.innerHTML = '<p class="detail-empty">N/D</p>';
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
  if (sensor.category === "air") return "Calidad del aire";
  if (sensor.category === "noise") return "Ruido urbano";
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
    nameEl.textContent = "Selecciona un sensor";
    cityEl.textContent = "--";
    typeEl.textContent = "--";
    clearDetailExtras();
    return;
  }

  nameEl.textContent = sensorDisplayName(sensor);
  cityEl.textContent = sensor.city || "--";
  typeEl.textContent = sensorTypeLabel(sensor);

  const history = generateWeeklyHistory(sensor);
  renderDetailKpis(sensor);
  renderWeeklySummary(sensor, history);
  renderWeeklyHistory(sensor, history);
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
}

window.renderSensorDetail = renderSensorDetail;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSensorDetail);
} else {
  initSensorDetail();
}
