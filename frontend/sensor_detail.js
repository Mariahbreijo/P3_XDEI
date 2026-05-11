const $ = (selector) => document.querySelector(selector);

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
    return;
  }

  nameEl.textContent = sensorDisplayName(sensor);
  cityEl.textContent = sensor.city || "--";
  typeEl.textContent = sensorTypeLabel(sensor);
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
