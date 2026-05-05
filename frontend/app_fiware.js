/**
 * Smart Air & Noise Monitor - FIWARE Edition
 * 
 * Lee DATOS ACTUALES de Orion (puerto 1026)
 * Lee HISTÓRICOS de QuantumLeap (puerto 8668)
 * 
 * Flujo:
 *  - Orion almacena estado actual de entidades
 *  - QuantumLeap almacena histórico de valores
 *  - Frontend agrega ambas fuentes
 */

// ==================== CONFIGURACIÓN ====================
const ORION_URL = "http://localhost:1026";
const QUANTUMLEAP_URL = "http://localhost:8668";
const BACKEND_URL = "http://localhost:8000"; // fallback

// Mapping: IDs exactos usados por el stack/terminal
const CITY_ENTITIES = {
  Madrid: {
    air: [
      "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
      "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
    ],
    noise: [
      "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
    ],
  },
  Barcelona: {
    air: [
      "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
      "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
    ],
    noise: [
      "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
    ],
  },
  "A Coruña": {
    air: [
      "urn:ngsi-ld:AirQualityObserved:ES-Corunna-01",
      "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
    ],
    noise: [
      "urn:ngsi-ld:NoiseLevelObserved:ES-Corunna-01",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
    ],
  },
  Alicante: {
    air: [
      "urn:ngsi-ld:AirQualityObserved:ES-Alicante-01",
      "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
    ],
    noise: [
      "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
    ],
  },
  Bilbao: {
    air: [
      "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
      "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
    ],
    noise: [
      "urn:ngsi-ld:NoiseLevelObserved:ES-Bilbao-01",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
      "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
    ],
  },
};

const ENTITY_CITY_BY_ID = Object.fromEntries(
  Object.entries(CITY_ENTITIES).flatMap(([city, ids]) =>
    [...ids.air, ...ids.noise].filter(Boolean).map((id) => [id, city])
  )
);

async function fetchFirstAvailableEntity(entityIds) {
  for (const id of entityIds) {
    const entity = await fetchEntityFromOrion(id);
    if (entity?.id) return entity;
  }
  return null;
}

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

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const state = {
  dashboard: null,
  map: null,
  airChart: null,
  noiseChart: null,
  orionAvailable: false,
  quantumleapAvailable: false,
};

// ==================== ORION API ====================
/**
 * Obtiene entidad actual de Orion (datos en tiempo real)
 * USA PROXY DEL BACKEND para evitar problemas de CORS
 */
/**
 * Fetch all local entities from Orion with tenant headers.
 * Uses ?local=true and sets Fiware-Service / Fiware-ServicePath.
 */
// --- ADD / REPLACE: new helpers and local fetch ---------------------------

async function fetchEntitiesLocal() {
  try {
    // Fetch from backend directly (bypass static server) - backend has CORS enabled
    const url = `http://localhost:8000/api/v1/orion-proxy/ngsi-ld/v1/entities?local=true`;
    console.log(`[DEBUG] Fetching local entities from backend proxy: ${url}`);
    const response = await fetch(url);

    console.log(`[DEBUG] Backend proxy response status: ${response.status}`);
    if (!response.ok) {
      console.warn(`Backend proxy returned ${response.status} for local entities`);
      return [];
    }
    const entities = await response.json();
    return Array.isArray(entities) ? entities : [];
  } catch (error) {
    console.error(`[ERROR] Backend proxy fetch failed:`, error);
    return [];
  }
}

function findAttribute(entity, candidates) {
  if (!entity) return undefined;
  const keys = Object.keys(entity || {});
  for (const cand of candidates) {
    if (entity[cand] !== undefined) return entity[cand];
    const match = keys.find((k) => k.toLowerCase().includes(cand.toLowerCase()));
    if (match) return entity[match];
  }
  return undefined;
}

function typeIncludes(entity, substr) {
  const t = entity?.type;
  if (!t) return false;
  if (Array.isArray(t)) return t.some((x) => String(x).includes(substr));
  return String(t).includes(substr);
}
// -------------------------------------------------------------------------

// ==================== QUANTUMLEAP API ====================
/**
 * Obtiene histórico de una entidad de QuantumLeap
 * Retorna últimos N valores de un atributo
 */
async function fetchHistoryFromQuantumLeap(entityId, attribute, lastN = 100) {
  try {
    const url = `${QUANTUMLEAP_URL}/v1/entities/${encodeURIComponent(entityId)}/attrs/${attribute}/value?lastN=${lastN}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) return [];

    const data = await response.json();
    state.quantumleapAvailable = true;

    // Estructura QuantumLeap: { values: [...] } o directamente array
    if (Array.isArray(data)) {
      return data;
    } else if (data.values) {
      return data.values;
    }
    return [];
  } catch (error) {
    console.warn(`QuantumLeap unavailable for ${entityId}/${attribute}:`, error.message);
    return [];
  }
}

// ==================== BACKEND API (FALLBACK) ====================
/**
 * Fallback: obtiene datos del backend (para cuando Orion no está disponible)
 */
async function fetchDashboardFromBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/dashboard`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Backend unavailable:", error);
    return null;
  }
}

// ==================== CONVERSIÓN NGSI-LD → FORMATO UI ====================
/**
 * Extrae valores de propiedades NGSI-LD
 * En NGSI-LD: {"PM10": {"type": "Property", "value": 65.4}}
 * Retorna: 65.4
 */
function extractPropertyValue(obj) {
  if (!obj) return null;
  if (typeof obj === "number") return obj;
  if (typeof obj === "string") return obj;
  if (obj.value !== undefined) return obj.value;
  return obj;
}

/**
 * Convierte entidad Orion a formato de sensor para UI
 */
function orionEntityToSensor(entity) {
  if (!entity) {
    console.warn("[DEBUG] orionEntityToSensor: entity is null");
    return null;
  }

  console.log(`[DEBUG] Converting entity to sensor:`, entity);

  const addrObj = findAttribute(entity, ["address", "http://", "https://"]);
  const tempObj = findAttribute(entity, ["temperature", "http"]);
  const rhObj = findAttribute(entity, ["relativeHumidity", "humidity", "relative_humidity"]);

  const pm10Obj = findAttribute(entity, ["PM10", "pm10"]);
  const pm25Obj = findAttribute(entity, ["PM2_5", "PM2.5", "pm2_5"]);
  const no2Obj = findAttribute(entity, ["NO2", "no2"]);
  const o3Obj = findAttribute(entity, ["O3", "o3"]);

  const laeqObj = findAttribute(entity, ["LAeq", "laeq"]);
  const lamaxObj = findAttribute(entity, ["LAmax", "lamax"]);
  const la90Obj = findAttribute(entity, ["LA90", "la90"]);

  const sensor = {
    id: entity.id,
    type: entity.type,
    location: extractPropertyValue(findAttribute(entity, ["location", "http://", "https://"]) || entity.location),
    address: extractPropertyValue(addrObj),
    PM10: extractPropertyValue(pm10Obj) ?? 0,
    PM2_5: extractPropertyValue(pm25Obj) ?? 0,
    NO2: extractPropertyValue(no2Obj) ?? 0,
    O3: extractPropertyValue(o3Obj) ?? 0,
    LAeq: extractPropertyValue(laeqObj) ?? 0,
    LAmax: extractPropertyValue(lamaxObj) ?? 0,
    LA90: extractPropertyValue(la90Obj) ?? 0,
    temperature: extractPropertyValue(tempObj) ?? null,
    relativeHumidity: extractPropertyValue(rhObj) ?? null,
  };

  console.log(`[DEBUG] Converted sensor object:`, sensor);
  return sensor;
}
 

// ==================== CÁLCULOS ====================
function calculateICA(pm25, pm10, no2, o3) {
  // Fórmula simplificada (usar ICA real en producción)
  const pm25Score = Math.min(pm25 / 35 * 100, 100);
  const pm10Score = Math.min(pm10 / 50 * 100, 100);
  const no2Score = Math.min(no2 / 40 * 100, 100);
  const o3Score = Math.min(o3 / 120 * 100, 100);
  return Math.round((pm25Score + pm10Score + no2Score + o3Score) / 4);
}

function classifyICA(ica) {
  if (ica <= 50) return "GOOD";
  if (ica <= 100) return "MODERATE";
  if (ica <= 150) return "POOR";
  return "VERY_POOR";
}

function classifyNoiseLevel(laeq) {
  if (laeq < 55) return "QUIET";
  if (laeq < 70) return "MODERATE";
  if (laeq < 85) return "LOUD";
  return "VERY_LOUD";
}

// ==================== COMPOSICIÓN DEL DASHBOARD ====================
/**
 * Obtiene datos actuales de Orion, con fallback a backend
 */
async function fetchCurrentData() {
  console.log("[DEBUG] Starting fetchCurrentData...");

  // Fetch all local entities from Orion with the FIWARE tenant headers
  const entities = await fetchEntitiesLocal();
  const entityById = Object.fromEntries((entities || []).map((e) => [e.id, e]));

  const cityMap = new Map();

  for (const [cityName, ids] of Object.entries(CITY_ENTITIES)) {
    const city = cityMap.get(cityName) || { name: cityName, air: null, noise: null };

    // Find first available air entity among declared IDs that also matches type includes
    let airEnt = null;
    for (const id of ids.air || []) {
      const e = entityById[id];
      if (e && typeIncludes(e, "AirQualityObserved")) {
        airEnt = e;
        break;
      }
    }

    // Find first available noise entity
    let noiseEnt = null;
    for (const id of ids.noise || []) {
      const e = entityById[id];
      if (e && typeIncludes(e, "NoiseLevelObserved")) {
        noiseEnt = e;
        break;
      }
    }

    if (airEnt) {
      const sensor = orionEntityToSensor(airEnt);
      const ica = calculateICA(sensor?.PM2_5 || 0, sensor?.PM10 || 0, sensor?.NO2 || 0, sensor?.O3 || 0);
      city.air = {
        sensor,
        metrics: {
          airQualityIndex: ica,
          airQualityLevel: classifyICA(ica),
          mainPollutants: {
            PM10: sensor?.PM10 || 0,
            PM2_5: sensor?.PM2_5 || 0,
            NO2: sensor?.NO2 || 0,
            O3: sensor?.O3 || 0,
          },
        },
      };
    }

    if (noiseEnt) {
      const sensor = orionEntityToSensor(noiseEnt);
      const laeq = sensor?.LAeq || 0;
      city.noise = {
        sensor,
        metrics: {
          LAeq: laeq,
          LAmax: sensor?.LAmax || 0,
          LA90: sensor?.LA90 || 0,
          noiseLevel: classifyNoiseLevel(laeq),
        },
      };
    }

    cityMap.set(cityName, city);
  }


  const cities = Array.from(cityMap.values());
  if (cities.length === 0) {
    return null;
  }

  const dashboard = {
    headline: { airQualityIndex: 0, airQualityLevel: "GOOD", noiseLevelDb: 0, noiseLevel: "QUIET" },
    cities,
    airHistory: [],
    noiseHistory: [],
  };

  const airMetrics = cities.filter((c) => c.air).map((c) => c.air.metrics.airQualityIndex);
  const noiseMetrics = cities.filter((c) => c.noise).map((c) => c.noise.metrics.LAeq);

  if (airMetrics.length > 0) {
    const avgICA = Math.round(airMetrics.reduce((a, b) => a + b, 0) / airMetrics.length);
    dashboard.headline.airQualityIndex = avgICA;
    dashboard.headline.airQualityLevel = classifyICA(avgICA);
  }

  if (noiseMetrics.length > 0) {
    const avgNoise = Math.round((noiseMetrics.reduce((a, b) => a + b, 0) / noiseMetrics.length) * 10) / 10;
    dashboard.headline.noiseLevelDb = avgNoise;
    dashboard.headline.noiseLevel = classifyNoiseLevel(avgNoise);
  }

  const airCity = dashboard.cities.find((c) => c.air);
  if (airCity?.air?.sensor?.id) {
    const history = await fetchHistoryFromQuantumLeap(airCity.air.sensor.id, "PM10", 10);
    dashboard.airHistory = history.slice(0, 10);
  }

  const noiseCity = dashboard.cities.find((c) => c.noise);
  if (noiseCity?.noise?.sensor?.id) {
    const history = await fetchHistoryFromQuantumLeap(noiseCity.noise.sensor.id, "LAeq", 10);
    dashboard.noiseHistory = history.slice(0, 10);
  }

  state.orionAvailable = true;
  return dashboard;
}

// ==================== RENDERIZADO ====================
function setLoadingState(message) {
  const airIndex = $("#air-index");
  const airStatus = $("#air-status");
  const noiseIndex = $("#noise-index");
  const noiseStatus = $("#noise-status");
  const generalStatus = $("#general-status");
  const generalDetail = $("#general-detail");

  if (airIndex) airIndex.textContent = "--";
  if (airStatus) airStatus.textContent = message;
  if (noiseIndex) noiseIndex.textContent = "-- dB";
  if (noiseStatus) noiseStatus.textContent = message;
  if (generalStatus) generalStatus.textContent = "--";
  if (generalDetail) generalDetail.textContent = message;
}

function renderDashboard(data) {
  const airIndex = $("#air-index");
  const airStatus = $("#air-status");
  const noiseIndex = $("#noise-index");
  const noiseStatus = $("#noise-status");
  const generalStatus = $("#general-status");
  const generalDetail = $("#general-detail");
  const airSummary = $("#air-summary");
  const noiseSummary = $("#noise-summary");
  const airPollutants = $("#air-pollutants");
  const noiseMetrics = $("#noise-metrics");

  if (!data) {
    setLoadingState("Orion no responde");
    return;
  }

  const headline = data.headline || {};
  const airCity = data.cities.find((city) => city.air);
  const noiseCity = data.cities.find((city) => city.noise);

  if (airIndex) airIndex.textContent = Math.round(headline.airQualityIndex || 0).toString();
  if (airStatus) airStatus.textContent = headline.airQualityLevel || "GOOD";
  if (noiseIndex) noiseIndex.textContent = `${(headline.noiseLevelDb || 0).toFixed(1)} dB`;
  if (noiseStatus) noiseStatus.textContent = headline.noiseLevel || "QUIET";

  const generalLabel = (() => {
    if (headline.airQualityLevel === "VERY_POOR" || headline.noiseLevel === "VERY_LOUD") return "Malo";
    if (headline.airQualityLevel === "POOR" || headline.noiseLevel === "LOUD") return "Moderado";
    return "Bueno";
  })();
  if (generalStatus) generalStatus.textContent = generalLabel;
  if (generalDetail) {
    generalDetail.textContent =
      generalLabel === "Malo"
        ? "Revisa el flujo de datos y la exposición exterior."
        : generalLabel === "Moderado"
          ? "Hay actividad, pero los datos siguen llegando desde Orion."
          : "Orion está entregando datos correctos.";
  }

  if (airSummary) {
    airSummary.textContent = airCity
      ? `ICA calculado en tiempo real a partir de ${airCity.name}. Los atributos vienen de Orion-LD.`
      : "Sin entidades de aire disponibles en Orion-LD.";
  }
  if (noiseSummary) {
    noiseSummary.textContent = noiseCity
      ? `Nivel medio actual de ruido tomado de ${noiseCity.name}. La lectura viene de Orion-LD.`
      : "Sin entidades de ruido disponibles en Orion-LD.";
  }

  if (airPollutants) {
    airPollutants.innerHTML = airCity?.air
      ? [
          ["PM10", airCity.air.metrics.mainPollutants.PM10],
          ["PM2.5", airCity.air.metrics.mainPollutants.PM2_5],
          ["NO2", airCity.air.metrics.mainPollutants.NO2],
          ["O3", airCity.air.metrics.mainPollutants.O3],
        ]
          .map(([label, value]) => `<li><strong>${label}</strong><span>${Number(value).toFixed(1)}</span></li>`)
          .join("")
      : "";
  }

  if (noiseMetrics) {
    noiseMetrics.innerHTML = noiseCity?.noise
      ? [
          ["LAeq", `${noiseCity.noise.metrics.LAeq.toFixed(1)} dB`],
          ["LAmax", `${noiseCity.noise.metrics.LAmax.toFixed(1)} dB`],
          ["LA90", `${noiseCity.noise.metrics.LA90.toFixed(1)} dB`],
        ]
          .map(([label, value]) => `<li><strong>${label}</strong><span>${value}</span></li>`)
          .join("")
      : "";
  }
}

function renderCityCards(cities) {
  const container = $("#cities-container");
  if (!container) return;

  if (!cities || cities.length === 0) {
    container.innerHTML = `
      <article class="metric-card">
        <div class="metric-title">Esperando Orion</div>
        <div class="metric-value">Sin datos reales</div>
        <div class="metric-detail">La vista espera entidades NGSI-LD desde Orion-LD.</div>
        <div class="metric-explanation">Si Orion no responde, revisa la consola del navegador y el estado de los contenedores.</div>
      </article>
    `;
    return;
  }

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

async function bootstrap() {
  console.log("🚀 Fetching current Orion data...");
  console.log(`   Orion: ${ORION_URL}/ngsi-ld/v1/entities`);
  console.log(`   QuantumLeap: ${QUANTUMLEAP_URL}`);
  console.log(`   FIWARE: none (no tenant headers)`);

  setLoadingState("Cargando desde Orion...");

  const data = await fetchCurrentData();
  state.dashboard = data;

  if (!data) {
    setLoadingState("Sin entidades en Orion");
    renderCityCards([]);
    console.info("[INFO] Orion responded correctly, but there are no entities for the current deployment.");
    return;
  }

  renderDashboard(data);
  renderCityCards(data.cities);

  console.log(`✅ Loaded ${data.cities.length} cities from Orion`);
  console.log(`   Orion available: ${state.orionAvailable}`);
  console.log(`   QuantumLeap available: ${state.quantumleapAvailable}`);
}

// ==================== DIAGNOSTIC FUNCTION ====================
/**
 * Ejecuta diagnóstico completo
 * Úsalo en la consola: runDiagnostics()
 */
async function runDiagnostics() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 FIWARE DIAGNOSTICS");
  console.log("=".repeat(80));

  // 1. Test Orion availability
  console.log("\n1. Testing Orion connectivity...");
  try {
    const response = await fetch(`${ORION_URL}/version`, {
      headers: {}
    });
    console.log(`   ✓ Orion version check: ${response.status}`);
    const version = await response.json();
    console.log(`   Version:`, version);
  } catch (e) {
    console.error(`   ✗ Orion not reachable:`, e.message);
  }

  // 2. Test Orion entities (all types)
  console.log("\n2. Checking for entities in Orion...");
  const types = ["AirQualityObserved", "NoiseLevelObserved"];
  for (const type of types) {
    console.log(`\n   Querying type: ${type}`);
    try {
      const url = `${ORION_URL}/ngsi-ld/v1/entities?type=${type}`;
      const response = await fetch(url, { headers: { "Accept": "application/ld+json" } });
      console.log(`   Response status: ${response.status}`);
      const entities = await response.json();
      console.log(`   Entities found: ${Array.isArray(entities) ? entities.length : 0}`);
      if (Array.isArray(entities) && entities.length > 0) {
        console.log(`   Sample entity:`, entities[0]);
      } else {
        console.log(`   ⚠️  No entities found for type ${type}`);
      }
    } catch (e) {
      console.error(`   ✗ Error querying ${type}:`, e.message);
    }
  }

  // 3. Test specific entity with different service paths
  console.log("\n3. Testing specific entity queries with different service paths...");
  const testEntityId = "urn:ngsi-ld:AirQualityObserved:Madrid:Centro";
  const paths = ["/", "/madrid", "/"];
  for (const path of paths) {
    console.log(`\n   Query: ${testEntityId} with path: ${path}`);
    try {
      const url = `${ORION_URL}/ngsi-ld/v1/entities/${encodeURIComponent(testEntityId)}`;
      const response = await fetch(url, { headers: { "Accept": "application/ld+json" } });
      console.log(`   Response status: ${response.status}`);
      if (response.ok) {
        const entity = await response.json();
        console.log(`   Entity:`, entity);
      }
    } catch (e) {
      console.error(`   Error:`, e.message);
    }
  }

  // 4. Test QuantumLeap
  console.log("\n4. Testing QuantumLeap...");
  try {
    const response = await fetch(`${QUANTUMLEAP_URL}/version`);
    console.log(`   ✓ QuantumLeap version check: ${response.status}`);
  } catch (e) {
    console.error(`   ✗ QuantumLeap not reachable:`, e.message);
  }

  // 5. Test Backend
  console.log("\n5. Testing Backend fallback...");
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/health`);
    console.log(`   ✓ Backend health check: ${response.status}`);
    const health = await response.json();
    console.log(`   Health:`, health);
  } catch (e) {
    console.error(`   ✗ Backend not reachable:`, e.message);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Diagnostics complete");
  console.log("=".repeat(80));
}

// Hacer disponible globalmente
window.runDiagnostics = runDiagnostics;

// Iniciar cuando DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
