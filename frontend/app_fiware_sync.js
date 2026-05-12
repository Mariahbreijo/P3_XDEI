/**
 * Smart Air & Noise Monitor - FIWARE Edition
 *
 * Interactive dashboard backed by Orion-LD NGSI-LD entities.
 * Selection from map or ranking keeps all panels synchronized.
 */

const ORION_PROXY_URL = "http://localhost:8000/api/v1/orion-proxy/ngsi-ld/v1/entities?local=true";
const ORION_DIRECT_URL = "http://localhost:1026/ngsi-ld/v1/entities?local=true";
const ORION_URL = "http://localhost:1026";
const BACKEND_URL = "http://localhost:8000";

const appState = {
  entities: [],
  selectedCity: null,
  selectedSensor: null,
};

window.appState = appState;

const uiState = {
  map: null,
  markerLayer: null,
  markers: new Map(),
};

const viewState = {
  activeView: "main",
};

const $ = (selector) => document.querySelector(selector);
const i18n = () => window.appI18n;

function t(key, params = {}) {
  return i18n()?.t?.(key, params) ?? key;
}

function translateAirLevel(code) {
  return i18n()?.translateAirLevel?.(code) ?? code ?? t("status.noData");
}

function translateNoiseLevel(code) {
  return i18n()?.translateNoiseLevel?.(code) ?? code ?? t("status.noData");
}

function translateGeneralLevel(code) {
  return i18n()?.translateGeneralLevel?.(code) ?? code ?? t("status.noData");
}

function setActiveView(viewName) {
  const nextView = viewName === "advanced" || viewName === "detail" ? viewName : "main";
  const changed = viewState.activeView !== nextView;
  viewState.activeView = nextView;
  document.body.dataset.activeView = nextView;

  document.querySelectorAll("[data-view-target]").forEach((button) => {
    const isActive = button.dataset.viewTarget === nextView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (changed) {
    window.dispatchEvent(
      new CustomEvent("fiware:view-changed", {
        detail: { view: nextView },
      })
    );
  }

  if (nextView === "advanced") {
    if (typeof window.initAdvancedMap === "function") {
      window.initAdvancedMap();
    }
    if (typeof window.resizeAdvancedMap === "function") {
      window.resizeAdvancedMap();
    }
  }
}

function bindViewNavigation() {
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.viewTarget));
  });
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

function readNgsiValue(attribute) {
  if (attribute == null) return null;
  if (typeof attribute === "number" || typeof attribute === "string") return attribute;
  if (Array.isArray(attribute)) return attribute;
  if (typeof attribute === "object") {
    if (attribute.value !== undefined) return attribute.value;
    if (attribute.coordinates !== undefined) return attribute.coordinates;
  }
  return attribute;
}

function typeIncludes(entity, needle) {
  const type = entity?.type;
  if (!type) return false;
  if (Array.isArray(type)) return type.some((item) => String(item).includes(needle));
  return String(type).includes(needle);
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function normalizeCityName(value) {
  if (!value) return null;
  return String(value).trim();
}

function extractCity(entity) {
  const address = readNgsiValue(findAttribute(entity, ["address"]));
  if (!address || typeof address !== "object") return null;

  return normalizeCityName(address.addressLocality || address.addressRegion || address.addressCountry);
}

function extractCoordinates(entity) {
  const rawLocation = readNgsiValue(findAttribute(entity, ["location"]));
  const coordinates = rawLocation?.coordinates ?? rawLocation?.value?.coordinates ?? null;

  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const lon = toNumber(coordinates[0]);
  const lat = toNumber(coordinates[1]);
  if (lon == null || lat == null) return null;

  return [lon, lat];
}

function calculateICA(pm25 = 0, pm10 = 0, no2 = 0, o3 = 0) {
  const pm25Score = Math.min((pm25 / 35) * 100, 100);
  const pm10Score = Math.min((pm10 / 50) * 100, 100);
  const no2Score = Math.min((no2 / 40) * 100, 100);
  const o3Score = Math.min((o3 / 120) * 100, 100);
  return Math.round((pm25Score + pm10Score + no2Score + o3Score) / 4);
}

function classifyICA(value) {
  if (value <= 50) return "GOOD";
  if (value <= 100) return "MODERATE";
  if (value <= 150) return "POOR";
  return "VERY_POOR";
}

function classifyNoiseLevel(value) {
  if (value < 55) return "QUIET";
  if (value < 70) return "MODERATE";
  if (value < 85) return "LOUD";
  return "VERY_LOUD";
}

function statusLabelFromScores(airLevel, noiseLevel) {
  const severity = Math.max(
    { GOOD: 0, MODERATE: 1, POOR: 2, VERY_POOR: 3 }[airLevel] ?? 0,
    { QUIET: 0, MODERATE: 1, LOUD: 2, VERY_LOUD: 3 }[noiseLevel] ?? 0
  );

  if (severity === 0) return translateGeneralLevel("GOOD");
  if (severity === 1) return translateGeneralLevel("MODERATE");
  if (severity === 2) return translateGeneralLevel("POOR");
  return translateGeneralLevel("VERY_POOR");
}

function emptyCitySummary(name) {
  return {
    name,
    coordinates: null,
    air: null,
    noise: null,
    airCount: 0,
    noiseCount: 0,
    ica: null,
    airLevel: null,
    noiseLevelDb: null,
    noiseLevel: null,
    overallLabel: null,
  };
}

function aggregateCitySummaries(entities) {
  const grouped = new Map();

  for (const entity of entities || []) {
    const cityName = extractCity(entity);
    if (!cityName) continue;

    const isAir = typeIncludes(entity, "AirQualityObserved");
    const isNoise = typeIncludes(entity, "NoiseLevelObserved");
    if (!isAir && !isNoise) continue;

    const current = grouped.get(cityName) || {
      name: cityName,
      coordinatesSamples: [],
      airSamples: [],
      noiseSamples: [],
      airCount: 0,
      noiseCount: 0,
    };

    const coordinates = extractCoordinates(entity);
    if (coordinates) current.coordinatesSamples.push(coordinates);

    if (isAir) {
      current.airCount += 1;
      current.airSamples.push({
        PM10: toNumber(readNgsiValue(findAttribute(entity, ["PM10", "pm10"]))),
        PM2_5: toNumber(readNgsiValue(findAttribute(entity, ["PM2_5", "PM2.5", "pm2_5"]))),
        NO2: toNumber(readNgsiValue(findAttribute(entity, ["NO2", "no2"]))),
        O3: toNumber(readNgsiValue(findAttribute(entity, ["O3", "o3"]))),
      });
    }

    if (isNoise) {
      current.noiseCount += 1;
      current.noiseSamples.push({
        LAeq: toNumber(readNgsiValue(findAttribute(entity, ["LAeq", "laeq"]))),
        LAmax: toNumber(readNgsiValue(findAttribute(entity, ["LAmax", "lamax"]))),
        LA90: toNumber(readNgsiValue(findAttribute(entity, ["LA90", "la90"]))),
      });
    }

    grouped.set(cityName, current);
  }

  const cities = Array.from(grouped.values())
    .map((city) => {
      const air = city.airSamples.length
        ? {
            PM10: average(city.airSamples.map((sample) => sample.PM10)),
            PM2_5: average(city.airSamples.map((sample) => sample.PM2_5)),
            NO2: average(city.airSamples.map((sample) => sample.NO2)),
            O3: average(city.airSamples.map((sample) => sample.O3)),
          }
        : null;

      const noise = city.noiseSamples.length
        ? {
            LAeq: average(city.noiseSamples.map((sample) => sample.LAeq)),
            LAmax: average(city.noiseSamples.map((sample) => sample.LAmax)),
            LA90: average(city.noiseSamples.map((sample) => sample.LA90)),
          }
        : null;

      const lon = average(city.coordinatesSamples.map((sample) => sample[0]));
      const lat = average(city.coordinatesSamples.map((sample) => sample[1]));
      const coordinates = lon != null && lat != null ? [lon, lat] : null;

      const ica = air ? calculateICA(air.PM2_5 ?? 0, air.PM10 ?? 0, air.NO2 ?? 0, air.O3 ?? 0) : null;
      const airLevel = ica != null ? classifyICA(ica) : null;
      const noiseLevelDb = noise?.LAeq ?? null;
      const noiseLevel = noiseLevelDb != null ? classifyNoiseLevel(noiseLevelDb) : null;
      const overallLabel = statusLabelFromScores(airLevel || "GOOD", noiseLevel || "QUIET");

      return {
        name: city.name,
        coordinates,
        air,
        noise,
        airCount: city.airCount,
        noiseCount: city.noiseCount,
        ica,
        airLevel,
        noiseLevelDb,
        noiseLevel,
        overallLabel,
      };
    })
    .sort((left, right) => {
      const leftScore = left.ica ?? Number.POSITIVE_INFINITY;
      const rightScore = right.ica ?? Number.POSITIVE_INFINITY;
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.name.localeCompare(right.name, "es");
    });

  return cities;
}

function buildGlobalSummary(cities) {
  const airCities = cities.filter((city) => city.air);
  const noiseCities = cities.filter((city) => city.noise);

  const air = airCities.length
    ? {
        PM10: average(airCities.map((city) => city.air.PM10)),
        PM2_5: average(airCities.map((city) => city.air.PM2_5)),
        NO2: average(airCities.map((city) => city.air.NO2)),
        O3: average(airCities.map((city) => city.air.O3)),
      }
    : null;

  const noise = noiseCities.length
    ? {
        LAeq: average(noiseCities.map((city) => city.noise.LAeq)),
        LAmax: average(noiseCities.map((city) => city.noise.LAmax)),
        LA90: average(noiseCities.map((city) => city.noise.LA90)),
      }
    : null;

  const ica = air ? calculateICA(air.PM2_5 ?? 0, air.PM10 ?? 0, air.NO2 ?? 0, air.O3 ?? 0) : null;
  const airLevel = ica != null ? classifyICA(ica) : null;
  const noiseLevelDb = noise?.LAeq ?? null;
  const noiseLevel = noiseLevelDb != null ? classifyNoiseLevel(noiseLevelDb) : null;

  return {
    name: "Promedio global",
    coordinates: null,
    air,
    noise,
    airCount: airCities.reduce((sum, city) => sum + city.airCount, 0),
    noiseCount: noiseCities.reduce((sum, city) => sum + city.noiseCount, 0),
    ica,
    airLevel,
    noiseLevelDb,
    noiseLevel,
    overallLabel: statusLabelFromScores(airLevel || "GOOD", noiseLevel || "QUIET"),
  };
}

async function fetchEntitiesFromOrion() {
  const requests = [
    {
      url: ORION_PROXY_URL,
      options: { headers: { Accept: "application/ld+json" } },
    },
    {
      url: ORION_DIRECT_URL,
      options: {
        headers: {
          Accept: "application/ld+json",
          "Fiware-Service": "air_noise",
          "Fiware-ServicePath": "/",
        },
      },
    },
  ];

  for (const request of requests) {
    try {
      const response = await fetch(request.url, request.options);
      if (!response.ok) continue;
      const entities = await response.json();
      if (Array.isArray(entities)) return entities;
    } catch (error) {
      console.warn(`Orion fetch failed for ${request.url}:`, error.message);
    }
  }

  return [];
}

function resolveDefaultCity(cities) {
  if (appState.selectedCity && cities.some((city) => city.name === appState.selectedCity)) {
    return appState.selectedCity;
  }

  const madrid = cities.find((city) => city.name.toLowerCase() === "madrid");
  if (madrid) return madrid.name;

  return cities[0]?.name ?? null;
}

function buildDashboardModel() {
  const cities = aggregateCitySummaries(appState.entities);
  const global = buildGlobalSummary(cities);
  const selectedCity = cities.find((city) => city.name === appState.selectedCity) || null;

  return {
    cities,
    global,
    selected: selectedCity || global,
    cleanest: cities[0] || null,
    dirtiest: cities[cities.length - 1] || null,
  };
}

function setSelectedCity(cityName) {
  const nextCity = cityName ? String(cityName) : null;
  if (appState.selectedCity === nextCity) return;
  appState.selectedCity = nextCity;
  updateUI();
}

function setSelectedSensor(sensor) {
  appState.selectedSensor = sensor ? { ...sensor } : null;
  window.dispatchEvent(
    new CustomEvent("fiware:selected-sensor-changed", {
      detail: { sensor: appState.selectedSensor },
    })
  );
}

function openSensorDetail(sensor) {
  if (!sensor) return;
  if (sensor.city) {
    setSelectedCity(sensor.city);
  }
  setSelectedSensor(sensor);
  setActiveView("detail");

  if (typeof window.renderSensorDetail === "function") {
    window.renderSensorDetail();
  }
}

function ensureMap() {
  if (uiState.map) return uiState.map;

  const map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([40.4168, -3.7038], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  uiState.markerLayer = L.layerGroup().addTo(map);
  uiState.map = map;
  return map;
}

function markerColor(city) {
  if (!city?.ica) return "#60a5fa";
  if (city.ica <= 50) return "#2dd4bf";
  if (city.ica <= 100) return "#fbbf24";
  if (city.ica <= 150) return "#fb923c";
  return "#ef4444";
}

function createCityTooltip(city) {
  const parts = [];
  if (city.ica != null) parts.push(`ICA ${Math.round(city.ica)}`);
  if (city.noiseLevelDb != null) parts.push(`${city.noiseLevelDb.toFixed(1)} dB`);
  return `${city.name}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

function setLoadingState(message) {
  const selectors = ["#air-index", "#noise-index", "#general-status", "#general-detail"];
  selectors.forEach((selector) => {
    const element = $(selector);
    if (element) element.textContent = message;
  });

  const airStatus = $("#air-status");
  const noiseStatus = $("#noise-status");
  if (airStatus) airStatus.textContent = message;
  if (noiseStatus) noiseStatus.textContent = message;
}

function renderKPIs(model) {
  const focus = model.selected || model.global;

  const airIndex = $("#air-index");
  const airStatus = $("#air-status");
  const noiseIndex = $("#noise-index");
  const noiseStatus = $("#noise-status");
  const generalStatus = $("#general-status");
  const generalDetail = $("#general-detail");

  if (airIndex) airIndex.textContent = focus.ica != null ? Math.round(focus.ica).toString() : "--";
  if (airStatus) airStatus.textContent = translateAirLevel(focus.airLevel);
  if (noiseIndex) noiseIndex.textContent = focus.noiseLevelDb != null ? `${focus.noiseLevelDb.toFixed(1)} dB` : "-- dB";
  if (noiseStatus) noiseStatus.textContent = translateNoiseLevel(focus.noiseLevel);
  if (generalStatus) generalStatus.textContent = focus.overallLabel || t("status.noData");
  if (generalDetail) {
    generalDetail.textContent =
      focus.name === "Promedio global"
        ? t("status.globalView")
        : `${t("status.activeCityPrefix")}: ${focus.name}`;
  }
}

function renderMap(model) {
  const map = ensureMap();
  const layer = uiState.markerLayer;
  if (!layer) return;

  layer.clearLayers();
  uiState.markers.clear();

  const selectedCity = model.selected?.name ?? null;
  const bounds = [];

  for (const city of model.cities) {
    if (!Array.isArray(city.coordinates)) continue;

    const isSelected = city.name === selectedCity;
    const marker = L.circleMarker(city.coordinates.slice().reverse(), {
      radius: isSelected ? 11 : 8,
      color: isSelected ? "#ffffff" : markerColor(city),
      weight: isSelected ? 3 : 2,
      fillColor: markerColor(city),
      fillOpacity: isSelected ? 0.95 : 0.8,
      className: isSelected ? "city-marker city-marker-selected" : "city-marker",
      riseOnHover: true,
    });

    marker.bindTooltip(createCityTooltip(city), {
      direction: "top",
      sticky: true,
      opacity: 0.96,
      className: "city-tooltip",
    });

    marker.on("click", () => setSelectedCity(city.name));
    marker.on("mouseover", () => marker.openTooltip());
    marker.on("mouseout", () => marker.closeTooltip());

    marker.addTo(layer);
    uiState.markers.set(city.name, marker);
    bounds.push(city.coordinates.slice().reverse());
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11 });
  } else {
    map.setView([40.4168, -3.7038], 5);
  }

  requestAnimationFrame(() => map.invalidateSize());
}

function renderRanking(model) {
  const rankingList = $("#ranking-list");
  const cleanestCard = $("#city-cleanest");
  const dirtiestCard = $("#city-dirtiest");

  if (cleanestCard) {
    cleanestCard.innerHTML = model.cleanest
      ? `<strong>${model.cleanest.name}</strong><span>ICA ${Math.round(model.cleanest.ica ?? 0)}</span>`
      : `<strong>${t("status.noData")}</strong><span>${t("status.waitingOrion")}</span>`;
  }

  if (dirtiestCard) {
    dirtiestCard.innerHTML = model.dirtiest
      ? `<strong>${model.dirtiest.name}</strong><span>ICA ${Math.round(model.dirtiest.ica ?? 0)}</span>`
      : `<strong>${t("status.noData")}</strong><span>${t("status.waitingOrion")}</span>`;
  }

  if (!rankingList) return;

  if (model.cities.length === 0) {
    rankingList.innerHTML = `<li class="ranking-empty">${t("status.noCities")}</li>`;
    return;
  }

  const selectedCity = model.selected?.name ?? null;
  rankingList.innerHTML = model.cities
    .map((city, index) => {
      const selectedClass = city.name === selectedCity ? "ranking-item selected" : "ranking-item";
      const airText = city.ica != null ? `ICA ${Math.round(city.ica)}` : t("status.noData");
      const noiseText = city.noiseLevelDb != null ? `${city.noiseLevelDb.toFixed(1)} dB` : t("status.noData");
      return `
        <button class="${selectedClass}" data-city="${city.name}" type="button">
          <span class="ranking-rank">${index + 1}</span>
          <span class="ranking-main">
            <strong>${city.name}</strong>
            <small>${airText} · ${noiseText}</small>
          </span>
          <span class="ranking-score">${city.overallLabel || "--"}</span>
        </button>
      `;
    })
    .join("");

  rankingList.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => setSelectedCity(button.dataset.city));
  });
}

function renderSelectedCity(model) {
  const container = $("#selected-city-details");
  if (!container) return;

  const city = model.selected || model.global;
  if (!city) {
    container.innerHTML = `<p class="empty-state">${t("status.noContent")}</p>`;
    return;
  }

  const air = city.air;
  const noise = city.noise;

  const formatAirValue = (value) => (value != null ? `${formatNumber(value)} µg/m³` : "--");
  const formatNoiseValue = (value) => (value != null ? `${formatNumber(value)} dB` : "--");

  container.innerHTML = `
    <article class="selected-summary">
      <div>
        <p class="label">${t("labels.activeCity")}</p>
        <h3>${city.name}</h3>
      </div>
      <div class="selected-grid">
        <div class="selected-stat">
          <span>${t("labels.airIndex")}</span>
          <strong>${city.ica != null ? Math.round(city.ica) : "--"}</strong>
          <small>${translateAirLevel(city.airLevel)}</small>
        </div>
        <div class="selected-stat">
          <span>${t("labels.noiseAverage")}</span>
          <strong>${city.noiseLevelDb != null ? `${city.noiseLevelDb.toFixed(1)} dB` : "--"}</strong>
          <small>${translateNoiseLevel(city.noiseLevel)}</small>
        </div>
        <div class="selected-stat">
          <span>${t("labels.generalStatus")}</span>
          <strong>${city.overallLabel || "--"}</strong>
          <small>${city.airCount} ${t("labels.airQuality")} · ${city.noiseCount} ${t("labels.urbanNoise")}</small>
        </div>
      </div>
      <div class="selected-metrics">
        <div>
          <p class="metric-title">${t("labels.airQuality")}</p>
          <ul>
            <li><span>PM10</span><strong>${formatAirValue(air?.PM10)}</strong></li>
            <li><span>PM2_5</span><strong>${formatAirValue(air?.PM2_5)}</strong></li>
            <li><span>NO2</span><strong>${formatAirValue(air?.NO2)}</strong></li>
            <li><span>O3</span><strong>${formatAirValue(air?.O3)}</strong></li>
          </ul>
        </div>
        <div>
          <p class="metric-title">${t("labels.urbanNoise")}</p>
          <ul>
            <li><span>LAeq</span><strong>${formatNoiseValue(noise?.LAeq)}</strong></li>
            <li><span>LAmax</span><strong>${formatNoiseValue(noise?.LAmax)}</strong></li>
            <li><span>LA90</span><strong>${formatNoiseValue(noise?.LA90)}</strong></li>
          </ul>
        </div>
      </div>
    </article>
  `;
}

function updateUI() {
  const model = buildDashboardModel();

  if (!appState.selectedCity) {
    appState.selectedCity = resolveDefaultCity(model.cities);
  }

  const selected = model.cities.find((city) => city.name === appState.selectedCity) || model.global;
  const normalizedModel = { ...model, selected };

  renderKPIs(normalizedModel);
  renderMap(normalizedModel);
  renderRanking(normalizedModel);
  renderSelectedCity(normalizedModel);

  window.dispatchEvent(
    new CustomEvent("fiware:selected-city-changed", {
      detail: {
        city: appState.selectedCity,
        model: normalizedModel,
      },
    })
  );
}

async function bootstrap() {
  document.body.dataset.activeView = document.body.dataset.activeView || "main";
  bindViewNavigation();
  setActiveView(document.body.dataset.activeView);

  setLoadingState(t("status.loadingOrion"));
  appState.entities = await fetchEntitiesFromOrion();

  if (!appState.entities.length) {
    appState.selectedCity = null;
    appState.selectedSensor = null;
    const emptyModel = {
      cities: [],
      global: emptyCitySummary("Promedio global"),
      selected: emptyCitySummary("Promedio global"),
      cleanest: null,
      dirtiest: null,
    };
    renderKPIs(emptyModel);
    renderMap(emptyModel);
    renderRanking(emptyModel);
    renderSelectedCity(emptyModel);
    return;
  }

  appState.selectedCity = resolveDefaultCity(aggregateCitySummaries(appState.entities));
  updateUI();
}

window.addEventListener("fiware:locale-changed", () => {
  if (appState.entities.length) {
    updateUI();
  } else {
    setLoadingState(t("status.loadingOrion"));
  }
});

async function runDiagnostics() {
  console.log("\n" + "=".repeat(80));
  console.log("FIWARE DIAGNOSTICS");
  console.log("=".repeat(80));

  try {
    const response = await fetch(`${ORION_URL}/version`);
    console.log(`Orion status: ${response.status}`);
    console.log(await response.json());
  } catch (error) {
    console.error("Orion not reachable:", error.message);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/health`);
    console.log(`Backend status: ${response.status}`);
    console.log(await response.json());
  } catch (error) {
    console.error("Backend not reachable:", error.message);
  }

  console.log("=".repeat(80));
}

window.runDiagnostics = runDiagnostics;
window.updateUI = updateUI;
window.setSelectedCity = setSelectedCity;
window.setSelectedSensor = setSelectedSensor;
window.openSensorDetail = openSensorDetail;
window.refreshDashboard = bootstrap;
window.setActiveView = setActiveView;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
