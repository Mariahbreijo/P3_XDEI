const METRIC_EXPLANATIONS = {
  ICA: "Índice de Calidad del Aire - Escala 0-500. Combina PM2.5, PM10, NO2 y O3 para medir la contaminación general. Valores bajos son mejores.",
  "Ruido medio":
    "LAeq (Nivel de Presión Sonora Continuo Equivalente) en decibeles. Mide el ruido urbano promedio. Límites: <55dB bueno, 55-70dB moderado, >70dB malo.",
  PM10: "Partículas menores a 10 micrómetros. Límite recomendado: <50 µg/m³. Afecta vías respiratorias.",
  PM2_5: "Partículas menores a 2.5 micrómetros (más peligrosas). Límite: <35 µg/m³. Penetran profundamente en pulmones.",
  NO2: "Dióxido de nitrógeno - Contaminante de tráfico. Límite: <40 µg/m³. Irritante respiratorio.",
  O3: "Ozono troposférico - Contaminante secundario. Límite: <120 µg/m³. Daña mucosas.",
  LAmax: "Nivel máximo de ruido puntual. Indica picos de ruido (sirenas, vehículos, etc.).",
  LA90: "Nivel de ruido de fondo. Ruido base sin picos. Indica tranquilidad general.",
};

const fallbackData = {
  headline: {
    airQualityIndex: 65,
    airQualityLevel: "GOOD",
    noiseLevelDb: 72.5,
    noiseLevel: "MODERATE",
  },
  cities: [
    {
      name: "Madrid",
      air: {
        sensor: {
          PM2_5: { value: 28.5 },
          PM10: { value: 65.4 },
          NO2: { value: 89.5 },
          O3: { value: 62.8 },
        },
        metrics: {
          airQualityIndex: 89.5,
          airQualityLevel: "MODERATE",
          mainPollutants: { PM2_5: 28.5, PM10: 65.4, NO2: 89.5, O3: 62.8 },
        },
      },
      noise: null,
    },
    {
      name: "Barcelona",
      air: null,
      noise: {
        sensor: {
          LAeq: { value: 72.5 },
          LAmax: { value: 85.2 },
          LA90: { value: 68.3 },
        },
        metrics: {
          LAeq: 72.5,
          noiseLevel: "LOUD",
          LAmax: 85.2,
          LA90: 68.3,
        },
      },
    },
  ],
  airHistory: [
    { timestamp: "12:30", PM2_5: 22.4, PM10: 48.8, NO2: 61.2, O3: 49.7 },
    { timestamp: "13:30", PM2_5: 25.8, PM10: 55.2, NO2: 72.1, O3: 56.8 },
    { timestamp: "14:30", PM2_5: 28.5, PM10: 65.4, NO2: 89.5, O3: 62.8 },
  ],
  noiseHistory: [
    { timestamp: "12:30", LAeq: 64.1 },
    { timestamp: "13:30", LAeq: 68.7 },
    { timestamp: "14:30", LAeq: 72.5 },
  ],
};

const state = {
  dashboard: fallbackData,
  map: null,
  airChart: null,
  noiseChart: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function classifyGeneral(airLevel, noiseLevel) {
  if (airLevel === "VERY_POOR" || noiseLevel === "VERY_LOUD") {
    return { label: "Malo", detail: "Se recomienda limitar la exposición exterior." };
  }
  if (airLevel === "POOR" || noiseLevel === "LOUD") {
    return { label: "Moderado", detail: "Atención a grupos sensibles." };
  }
  if (airLevel === "MODERATE" || noiseLevel === "MODERATE") {
    return { label: "Moderado", detail: "Condiciones aceptables con vigilancia." };
  }
  return { label: "Bueno", detail: "Condiciones favorables en la zona monitorizada." };
}

function normalizeDashboardPayload(payload) {
  // Handle new multi-city format
  if (payload?.cities && Array.isArray(payload.cities)) {
    return {
      headline: payload.headline,
      cities: payload.cities,
      airHistory: payload.airHistory ?? fallbackData.airHistory,
      noiseHistory: payload.noiseHistory ?? fallbackData.noiseHistory,
    };
  }

  // Legacy single-sensor format fallback
  const airSensor = payload?.sensor ?? fallbackData.cities[0]?.air?.sensor;
  const noiseSensor = payload?.noiseSensor ?? fallbackData.cities[1]?.noise?.sensor;
  const airMetrics = {
    airQualityIndex: payload?.airMetrics?.airQualityIndex ?? payload?.headline?.airQualityIndex ?? fallbackData.headline.airQualityIndex,
    airQualityLevel: payload?.airMetrics?.airQualityLevel ?? payload?.headline?.airQualityLevel ?? fallbackData.headline.airQualityLevel,
    PM2_5: payload?.airMetrics?.mainPollutants?.PM2_5 ?? airSensor?.PM2_5?.value ?? fallbackData.cities[0]?.air?.sensor?.PM2_5?.value,
    PM10: payload?.airMetrics?.mainPollutants?.PM10 ?? airSensor?.PM10?.value ?? fallbackData.cities[0]?.air?.sensor?.PM10?.value,
    NO2: payload?.airMetrics?.mainPollutants?.NO2 ?? airSensor?.NO2?.value ?? fallbackData.cities[0]?.air?.sensor?.NO2?.value,
    O3: payload?.airMetrics?.mainPollutants?.O3 ?? airSensor?.O3?.value ?? fallbackData.cities[0]?.air?.sensor?.O3?.value,
    CO2: airSensor?.CO2?.value,
  };

  let derivedAirLevel = airMetrics.airQualityLevel;
  if (airMetrics.PM10 > 50) {
    derivedAirLevel = "VERY_POOR";
  }

  const noiseMetrics = {
    LAeq: payload?.noiseMetrics?.LAeq ?? payload?.headline?.noiseLevelDb ?? fallbackData.headline.noiseLevelDb,
    noiseLevel: payload?.noiseMetrics?.noiseLevel ?? payload?.headline?.noiseLevel ?? fallbackData.headline.noiseLevel,
    LAmax: noiseSensor?.LAmax?.value ?? fallbackData.cities[1]?.noise?.sensor?.LAmax?.value,
    LA90: noiseSensor?.LA90?.value ?? fallbackData.cities[1]?.noise?.sensor?.LA90?.value,
  };

  return {
    headline: {
      airQualityIndex: airMetrics.airQualityIndex,
      airQualityLevel: derivedAirLevel,
      noiseLevelDb: noiseMetrics.LAeq,
      noiseLevel: noiseMetrics.noiseLevel,
    },
    cities: fallbackData.cities,
    airHistory: payload?.airHistory ?? fallbackData.airHistory,
    noiseHistory: payload?.noiseHistory ?? fallbackData.noiseHistory,
  };
}

async function fetchDashboardData() {
  try {
    const response = await fetch("http://localhost:8000/api/v1/dashboard");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return normalizeDashboardPayload(payload);
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return fallbackData;
  }
}

function renderCityCards(cities) {
  const container = $("#cities-container");
  if (!container) return;

  container.innerHTML = cities
    .map((city) => {
      const air = city.air?.metrics;
      const noise = city.noise?.metrics;

      let airCard = "";
      if (air) {
        const pm10 = air.mainPollutants.PM10;
        const airStatus = pm10 > 50 ? "VERY_POOR" : air.airQualityLevel;
        const statusColor = airStatus === "VERY_POOR" ? "text-red-500" : "text-cyan-400";
        airCard = `
          <div class="metric-card">
            <div class="metric-title">Calidad del Aire</div>
            <div class="metric-value">${city.name}</div>
            <div class="metric-detail">ICA: <strong>${Math.round(air.airQualityIndex)}</strong></div>
            <div class="metric-detail ${statusColor}">Estado: <strong>${airStatus}</strong></div>
            <div class="metric-small">PM10: ${air.mainPollutants.PM10.toFixed(1)} µg/m³</div>
            <div class="metric-small">PM2.5: ${air.mainPollutants.PM2_5.toFixed(1)} µg/m³</div>
            <div class="metric-small">NO2: ${air.mainPollutants.NO2.toFixed(1)} µg/m³</div>
            <div class="metric-explanation">${METRIC_EXPLANATIONS.ICA}</div>
          </div>
        `;
      }

      let noiseCard = "";
      if (noise) {
        const noiseStatus = noise.noiseLevel === "VERY_LOUD" ? "text-red-500" : "text-yellow-400";
        noiseCard = `
          <div class="metric-card">
            <div class="metric-title">Ruido Urbano</div>
            <div class="metric-value">${city.name}</div>
            <div class="metric-detail">LAeq: <strong>${noise.LAeq} dB</strong></div>
            <div class="metric-detail ${noiseStatus}">Estado: <strong>${noise.noiseLevel}</strong></div>
            <div class="metric-small">LAmax: ${noise.LAmax} dB (picos)</div>
            <div class="metric-small">LA90: ${noise.LA90} dB (fondo)</div>
            <div class="metric-explanation">${METRIC_EXPLANATIONS["Ruido medio"]}</div>
          </div>
        `;
      }

      return airCard + noiseCard;
    })
    .join("");
}

function bootstrap() {
  fetchDashboardData().then((data) => {
    state.dashboard = data;
    renderCityCards(data.cities);
  });
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
