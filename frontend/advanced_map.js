const ORION_DIRECT_URL = "http://localhost:1026/ngsi-ld/v1/entities?local=true";
const ORION_FALLBACK_URL = "http://localhost:8000/api/v1/orion-proxy/ngsi-ld/v1/entities?local=true";

const ORION_HEADERS = {
  Accept: "application/ld+json",
  "Fiware-Service": "air_noise",
  "Fiware-ServicePath": "/",
};

const advancedMapState = {
  initialized: false,
  map: null,
  airCluster: null,
  noiseCluster: null,
  layerControl: null,
  allSensors: [],
  filteredSensors: [],
  markersById: new Map(),
  selectedCity: null,
  filters: {
    city: "all",
    type: "all",
    pm10: null,
    pm25: null,
    laeq: null,
  },
  hasAdjustedBounds: false,
  refreshTimer: null,
};

const $ = (selector) => document.querySelector(selector);

function typeIncludes(entity, needle) {
  const type = entity?.type;
  if (!type) return false;
  if (Array.isArray(type)) return type.some((item) => String(item).includes(needle));
  return String(type).includes(needle);
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

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatValue(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function calculateICA(pm25 = 0, pm10 = 0, no2 = 0, o3 = 0) {
  const pm25Score = Math.min((pm25 / 35) * 100, 100);
  const pm10Score = Math.min((pm10 / 50) * 100, 100);
  const no2Score = Math.min((no2 / 40) * 100, 100);
  const o3Score = Math.min((o3 / 120) * 100, 100);
  return Math.round((pm25Score + pm10Score + no2Score + o3Score) / 4);
}

function classifyAirQuality(value) {
  if (value <= 50) return { label: "Verde", color: "#2dd4bf" };
  if (value <= 100) return { label: "Amarillo", color: "#fbbf24" };
  if (value <= 150) return { label: "Rojo", color: "#ef4444" };
  return { label: "Púrpura", color: "#a855f7" };
}

function classifyNoise(value) {
  if (value < 55) return { label: "Bajo", color: "#2dd4bf", size: 18 };
  if (value < 70) return { label: "Moderado", color: "#fbbf24", size: 24 };
  if (value < 85) return { label: "Alto", color: "#ef4444", size: 30 };
  return { label: "Crítico", color: "#a855f7", size: 36 };
}

function extractCity(entity) {
  const address = readNgsiValue(findAttribute(entity, ["address"]));
  if (!address || typeof address !== "object") return null;
  return String(address.addressLocality || address.addressRegion || address.addressCountry || "").trim() || null;
}

function extractCoordinates(entity) {
  const rawLocation = readNgsiValue(findAttribute(entity, ["location"]));
  const coordinates = rawLocation?.coordinates ?? rawLocation?.value?.coordinates ?? null;

  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const lon = toNumber(coordinates[0]);
  const lat = toNumber(coordinates[1]);
  if (lon == null || lat == null) return null;

  return { lat, lon };
}

function extractTimestamp(entity) {
  const candidates = [
    entity?.observedAt,
    entity?.modifiedAt,
    entity?.createdAt,
    readNgsiValue(findAttribute(entity, ["observedAt"])),
    readNgsiValue(findAttribute(entity, ["modifiedAt"])),
  ].filter(Boolean);

  return candidates[0] ? String(candidates[0]) : "--";
}

function parseSensorEntities(entities) {
  const parsed = [];

  for (const entity of entities || []) {
    const isAir = typeIncludes(entity, "AirQualityObserved");
    const isNoise = typeIncludes(entity, "NoiseLevelObserved");
    if (!isAir && !isNoise) continue;

    const coordinates = extractCoordinates(entity);
    if (!coordinates) continue;

    const city = extractCity(entity) || "Sin ciudad";
    const pm10 = toNumber(readNgsiValue(findAttribute(entity, ["PM10", "pm10"]))) ?? null;
    const pm25 = toNumber(readNgsiValue(findAttribute(entity, ["PM2_5", "PM2.5", "pm2_5"]))) ?? null;
    const no2 = toNumber(readNgsiValue(findAttribute(entity, ["NO2", "no2"]))) ?? null;
    const o3 = toNumber(readNgsiValue(findAttribute(entity, ["O3", "o3"]))) ?? null;
    const laeq = toNumber(readNgsiValue(findAttribute(entity, ["LAeq", "laeq"]))) ?? null;
    const lamax = toNumber(readNgsiValue(findAttribute(entity, ["LAmax", "lamax"]))) ?? null;
    const la90 = toNumber(readNgsiValue(findAttribute(entity, ["LA90", "la90"]))) ?? null;
    const ica = isAir ? calculateICA(pm25 ?? 0, pm10 ?? 0, no2 ?? 0, o3 ?? 0) : null;

    parsed.push({
      id: entity.id,
      rawType: entity.type,
      category: isAir ? "air" : "noise",
      city,
      coordinates,
      timestamp: extractTimestamp(entity),
      source: entity,
      values: { pm10, pm25, no2, o3, laeq, lamax, la90 },
      ica,
      status: isAir ? classifyAirQuality(ica ?? 0).label : classifyNoise(laeq ?? 0).label,
    });
  }

  return parsed;
}

function renderSensorPopup(sensor) {
  const title = sensor.category === "air" ? "Calidad del aire" : "Ruido urbano";
  const airStatus = sensor.category === "air" ? classifyAirQuality(sensor.ica ?? 0) : null;
  const noiseStatus = sensor.category === "noise" ? classifyNoise(sensor.values.laeq ?? 0) : null;
  const rows = sensor.category === "air"
    ? [
        ["ICA", sensor.ica != null ? Math.round(sensor.ica) : "--"],
        ["PM2_5", sensor.values.pm25 != null ? `${formatValue(sensor.values.pm25)} µg/m³` : "--"],
        ["PM10", sensor.values.pm10 != null ? `${formatValue(sensor.values.pm10)} µg/m³` : "--"],
        ["NO2", sensor.values.no2 != null ? `${formatValue(sensor.values.no2)} µg/m³` : "--"],
        ["O3", sensor.values.o3 != null ? `${formatValue(sensor.values.o3)} µg/m³` : "--"],
      ]
    : [
        ["LAeq", sensor.values.laeq != null ? `${formatValue(sensor.values.laeq)} dB` : "--"],
        ["LAmax", sensor.values.lamax != null ? `${formatValue(sensor.values.lamax)} dB` : "--"],
        ["LA90", sensor.values.la90 != null ? `${formatValue(sensor.values.la90)} dB` : "--"],
      ];

  return `
    <div class="sensor-popup">
      <h4>${escapeHtml(sensor.city)}</h4>
      <p>${escapeHtml(title)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(sensor.status)}</p>
      <p><strong>Timestamp:</strong> ${escapeHtml(sensor.timestamp)}</p>
      <div class="popup-grid">
        ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
      <p><strong>Coordenadas:</strong> ${sensor.coordinates.lat.toFixed(5)}, ${sensor.coordinates.lon.toFixed(5)}</p>
      ${airStatus ? `<p><strong>Color aire:</strong> ${escapeHtml(airStatus.label)}</p>` : ""}
      ${noiseStatus ? `<p><strong>Color ruido:</strong> ${escapeHtml(noiseStatus.label)}</p>` : ""}
      <button type="button" class="sensor-detail-button" data-action="open-sensor-detail">Vista en detalle</button>
    </div>
  `;
}

function attachSensorPopupActions(popupElement, sensor) {
  const detailButton = popupElement?.querySelector('[data-action="open-sensor-detail"]');
  if (!detailButton) return;

  detailButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof window.setSelectedCity === "function") {
      window.setSelectedCity(sensor.city);
    }
    if (typeof window.openSensorDetail === "function") {
      window.openSensorDetail(sensor);
    }
  });
}

function createMarkerIcon(sensor, selectedCity) {
  const selected = selectedCity && selectedCity === sensor.city;
  const style = sensor.category === "air"
    ? classifyAirQuality(sensor.ica ?? 0)
    : classifyNoise(sensor.values.laeq ?? 0);
  const size = sensor.category === "air" ? (selected ? 26 : 20) : (style.size + (selected ? 4 : 0));

  return L.divIcon({
    className: `sensor-marker ${selected ? "sensor-marker-selected" : ""}`.trim(),
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${style.color};box-shadow:0 0 0 6px rgba(255,255,255,0.04);opacity:${selected ? 1 : 0.94};"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function applyMapFilters(sensor) {
  const { city, type, pm10, pm25, laeq } = advancedMapState.filters;

  if (city !== "all" && sensor.city !== city) return false;
  if (type !== "all" && sensor.category !== type) return false;
  if (pm10 != null && sensor.category === "air" && (sensor.values.pm10 == null || sensor.values.pm10 <= pm10)) return false;
  if (pm25 != null && sensor.category === "air" && (sensor.values.pm25 == null || sensor.values.pm25 <= pm25)) return false;
  if (laeq != null && sensor.category === "noise" && (sensor.values.laeq == null || sensor.values.laeq <= laeq)) return false;

  return true;
}

function buildAirLayer(sensor, selectedCity) {
  const marker = L.marker([sensor.coordinates.lat, sensor.coordinates.lon], {
    icon: createMarkerIcon(sensor, selectedCity),
    keyboard: true,
    riseOnHover: true,
  });

  marker.bindTooltip(`${sensor.city} · Aire`, {
    direction: "top",
    sticky: true,
    className: "sensor-tooltip",
    opacity: 0.98,
  });
  marker.bindPopup(renderSensorPopup(sensor), { maxWidth: 360, className: "sensor-popup" });
  marker.on("click", () => {
    if (typeof window.setSelectedCity === "function") {
      window.setSelectedCity(sensor.city);
    }
  });
  marker.on("popupopen", (event) => {
    const popupElement = event.popup?.getElement?.();
    if (popupElement) {
      attachSensorPopupActions(popupElement, sensor);
    }
  });
  marker.on("mouseover", () => marker.openTooltip());
  marker.on("mouseout", () => marker.closeTooltip());

  return marker;
}

function buildNoiseLayer(sensor, selectedCity) {
  const marker = L.marker([sensor.coordinates.lat, sensor.coordinates.lon], {
    icon: createMarkerIcon(sensor, selectedCity),
    keyboard: true,
    riseOnHover: true,
  });

  marker.bindTooltip(`${sensor.city} · Ruido`, {
    direction: "top",
    sticky: true,
    className: "sensor-tooltip",
    opacity: 0.98,
  });
  marker.bindPopup(renderSensorPopup(sensor), { maxWidth: 360, className: "sensor-popup" });
  marker.on("click", () => {
    if (typeof window.setSelectedCity === "function") {
      window.setSelectedCity(sensor.city);
    }
  });
  marker.on("popupopen", (event) => {
    const popupElement = event.popup?.getElement?.();
    if (popupElement) {
      attachSensorPopupActions(popupElement, sensor);
    }
  });
  marker.on("mouseover", () => marker.openTooltip());
  marker.on("mouseout", () => marker.closeTooltip());

  return marker;
}

function ensureMap() {
  if (advancedMapState.map) return advancedMapState.map;

  const map = L.map("advanced-map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([40.4168, -3.7038], 5);

  const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  });

  advancedMapState.airCluster = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 18,
  });

  advancedMapState.noiseCluster = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 18,
  });

  advancedMapState.airCluster.on("clusterclick", (event) => event.layer.zoomToBounds());
  advancedMapState.noiseCluster.on("clusterclick", (event) => event.layer.zoomToBounds());

  baseLayer.addTo(map);
  advancedMapState.airCluster.addTo(map);
  advancedMapState.noiseCluster.addTo(map);

  advancedMapState.layerControl = L.control.layers(null, {
    "Calidad del aire": advancedMapState.airCluster,
    "Ruido urbano": advancedMapState.noiseCluster,
  }, { collapsed: false }).addTo(map);

  advancedMapState.map = map;
  return map;
}

function updateCitySelector(sensors) {
  const select = $("#advanced-filter-city");
  if (!select) return;

  const cities = Array.from(new Set(sensors.map((sensor) => sensor.city))).sort((left, right) => left.localeCompare(right, "es"));
  const currentValue = select.value || "all";
  select.innerHTML = [`<option value="all">Todas</option>`, ...cities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)].join("");
  select.value = cities.includes(currentValue) ? currentValue : "all";
}

function syncSelectionLabel() {
  const label = $("#advanced-map-selection");
  if (!label) return;

  const selectedCity = advancedMapState.selectedCity || window.appState?.selectedCity || null;
  label.textContent = selectedCity ? `Ciudad activa sincronizada: ${selectedCity}. Los sensores de esa ciudad se resaltan en el mapa.` : "Sin ciudad activa. Selecciona un sensor o una ciudad desde el dashboard.";
}

function updateStatus(message) {
  const status = $("#advanced-map-status");
  if (status) status.textContent = message;
}

function updateClusterLayers() {
  if (!advancedMapState.map) return;

  const selectedCity = advancedMapState.selectedCity || window.appState?.selectedCity || null;
  advancedMapState.airCluster.clearLayers();
  advancedMapState.noiseCluster.clearLayers();
  advancedMapState.markersById.clear();

  const filteredSensors = advancedMapState.allSensors.filter(applyMapFilters);
  advancedMapState.filteredSensors = filteredSensors;

  let airCount = 0;
  let noiseCount = 0;

  for (const sensor of filteredSensors) {
    const marker = sensor.category === "air"
      ? buildAirLayer(sensor, selectedCity)
      : buildNoiseLayer(sensor, selectedCity);

    advancedMapState.markersById.set(sensor.id, marker);
    if (sensor.category === "air") {
      advancedMapState.airCluster.addLayer(marker);
      airCount += 1;
    } else {
      advancedMapState.noiseCluster.addLayer(marker);
      noiseCount += 1;
    }
  }

  if (filteredSensors.length > 0 && !advancedMapState.hasAdjustedBounds) {
    const bounds = L.latLngBounds(filteredSensors.map((sensor) => [sensor.coordinates.lat, sensor.coordinates.lon]));
    advancedMapState.map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 13 });
    advancedMapState.hasAdjustedBounds = true;
  }

  updateStatus(`${filteredSensors.length} sensores visibles · Aire ${airCount} · Ruido ${noiseCount}`);
  syncSelectionLabel();

  requestAnimationFrame(() => advancedMapState.map.invalidateSize());
}

function resizeAdvancedMap() {
  if (!advancedMapState.map) return;
  requestAnimationFrame(() => advancedMapState.map.invalidateSize(true));
}

function readFiltersFromUI() {
  const city = $("#advanced-filter-city")?.value || "all";
  const type = $("#advanced-filter-type")?.value || "all";
  const pm10 = Number.parseFloat($("#advanced-filter-pm10")?.value || "");
  const pm25 = Number.parseFloat($("#advanced-filter-pm25")?.value || "");
  const laeq = Number.parseFloat($("#advanced-filter-laeq")?.value || "");

  advancedMapState.filters = {
    city,
    type,
    pm10: Number.isFinite(pm10) ? pm10 : null,
    pm25: Number.isFinite(pm25) ? pm25 : null,
    laeq: Number.isFinite(laeq) ? laeq : null,
  };
}

function applyUIFilters() {
  readFiltersFromUI();
  updateClusterLayers();
}

async function fetchEntitiesFromOrion() {
  const requests = [
    { url: ORION_DIRECT_URL, options: { headers: ORION_HEADERS } },
    { url: ORION_FALLBACK_URL, options: { headers: ORION_HEADERS } },
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

async function refreshAdvancedMap() {
  const refreshButton = $("#advanced-map-refresh");
  if (refreshButton) refreshButton.disabled = true;

  updateStatus("Consultando Orion-LD...");
  try {
    const entities = await fetchEntitiesFromOrion();
    advancedMapState.allSensors = parseSensorEntities(entities);
    updateCitySelector(advancedMapState.allSensors);
    readFiltersFromUI();
    advancedMapState.hasAdjustedBounds = false;
    updateClusterLayers();

    if (!advancedMapState.allSensors.length) {
      updateStatus("No hay sensores visibles en Orion-LD");
    }
  } finally {
    if (refreshButton) refreshButton.disabled = false;
  }
}

function handleSelectedCityChange(event) {
  advancedMapState.selectedCity = event?.detail?.city || window.appState?.selectedCity || null;
  syncSelectionLabel();
  updateClusterLayers();
}

function bindAdvancedControls() {
  const controls = [
    "#advanced-filter-city",
    "#advanced-filter-type",
    "#advanced-filter-pm10",
    "#advanced-filter-pm25",
    "#advanced-filter-laeq",
  ];

  for (const selector of controls) {
    const element = $(selector);
    if (!element) continue;
    element.addEventListener("input", applyUIFilters);
    element.addEventListener("change", applyUIFilters);
  }

  const refreshButton = $("#advanced-map-refresh");
  if (refreshButton) refreshButton.addEventListener("click", refreshAdvancedMap);
}

async function initAdvancedMap() {
  if (advancedMapState.initialized) return;
  const mapContainer = $("#advanced-map");
  if (!mapContainer || typeof window.L === "undefined" || typeof window.L.markerClusterGroup !== "function") return;

  advancedMapState.initialized = true;
  advancedMapState.selectedCity = window.appState?.selectedCity || null;

  ensureMap();
  bindAdvancedControls();
  syncSelectionLabel();
  window.addEventListener("fiware:selected-city-changed", handleSelectedCityChange);

  await refreshAdvancedMap();

  if (advancedMapState.refreshTimer) clearInterval(advancedMapState.refreshTimer);
  advancedMapState.refreshTimer = window.setInterval(refreshAdvancedMap, 120000);
}

window.addEventListener("fiware:view-changed", (event) => {
  if (event?.detail?.view === "advanced") {
    if (advancedMapState.map) {
      advancedMapState.map.setView([40.4168, -3.7038], 6);
    }
    resizeAdvancedMap();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdvancedMap);
} else {
  initAdvancedMap();
}

window.initAdvancedMap = initAdvancedMap;
window.parseSensorEntities = parseSensorEntities;
window.buildAirLayer = buildAirLayer;
window.buildNoiseLayer = buildNoiseLayer;
window.renderSensorPopup = renderSensorPopup;
window.applyMapFilters = applyMapFilters;
window.updateClusterLayers = updateClusterLayers;
window.resizeAdvancedMap = resizeAdvancedMap;