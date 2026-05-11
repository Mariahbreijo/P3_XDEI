const DEFAULT_LOCALE = "es";
const STORAGE_KEY = "app_locale";

const DICTIONARY = {
  es: {
    theme: {
      light: "Modo claro",
      dark: "Modo oscuro",
      toggleAria: "Alternar tema",
    },
    header: {
      eyebrow: "FIWARE · NGSI-LD · Smart Data Models",
      title: "Centro de Monitorización Ambiental",
      subtitle: "Análisis integral de calidad del aire y contaminación acústica",
    },
    nav: {
      main: "Panel principal",
      advanced: "Mapa avanzado",
    },
    pills: {
      orion: "Orion-LD Ready",
      quantumleap: "QuantumLeap",
      leaflet: "Leaflet + ChartJS",
    },
    hero: {
      label: "Panel Inicial",
      title: "Monitorización urbana en tiempo real",
      lead: "Consulta de un vistazo el estado del aire y del ruido urbano. Las métricas se muestran con palabras sencillas para que cualquier persona pueda entenderlas sin conocimientos técnicos.",
    },
    labels: {
      airIndex: "ICA",
      noiseAverage: "Ruido medio",
      generalStatus: "Estado general",
      map: "Mapa",
      ranking: "Ranking",
      selected: "Selección",
      guide: "Guía rápida",
      architecture: "Arquitectura",
      advancedSection: "Sección avanzada",
      detailSection: "Vista de sensor",
      activeCity: "Ciudad activa",
      airQuality: "Calidad del aire",
      urbanNoise: "Ruido urbano",
      sensorName: "Nombre",
      city: "Ciudad",
      sensorType: "Tipo de sensor",
      kpis: "KPIs",
      dynamicIndicators: "Indicadores dinámicos",
      week: "Semana",
      weeklySummary: "Resumen semanal",
      worstDay: "Día más perjudicial",
    },
    sections: {
      mapTitle: "Ubicación de sensores",
      rankingTitle: "Ciudades ordenadas por ICA",
      selectedTitle: "Detalle de la ciudad activa",
      guideTitle: "Qué significa cada métrica",
    },
    status: {
      loading: "Cargando...",
      loadingOrion: "Cargando datos de Orion...",
      waitingOrion: "Esperando Orion",
      noData: "Sin datos",
      noDataShort: "N/D",
      globalView: "Vista agregada de todas las ciudades detectadas en Orion-LD.",
      activeCityPrefix: "Ciudad activa",
      visibleSensors: "{{count}} sensores visibles · Aire {{air}} · Ruido {{noise}}",
      noVisibleSensors: "No hay sensores visibles en Orion-LD",
      noCities: "No hay ciudades con entidades NGSI-LD parseables.",
      noContent: "No hay datos para mostrar.",
      selectSensor: "Selecciona un sensor",
      activeCitySynced: "Ciudad activa sincronizada: {{city}}. Los sensores de esa ciudad se resaltan en el mapa.",
      noActiveCity: "Sin ciudad activa. Selecciona un sensor o una ciudad desde el dashboard.",
      consultingOrion: "Consultando Orion-LD...",
      noEnoughWeeklyData: "No hay datos semanales suficientes.",
      noWeeklyData: "No hay datos semanales suficientes.",
      metricSafe: "La concentración de {{metric}} actualmente cumple con la directriz de la OMS.",
      metricWarning: "Advertencia: {{metric}} está por encima del límite OMS.",
      metricDanger: "Peligro: {{metric}} supera ampliamente el límite OMS.",
    },
    trend: {
      up: "al alza",
      down: "a la baja",
      stable: "estable",
    },
    days: {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    },
    levels: {
      air: {
        GOOD: "Bueno",
        MODERATE: "Moderado",
        POOR: "Malo",
        VERY_POOR: "Crítico",
      },
      noise: {
        QUIET: "Silencioso",
        MODERATE: "Moderado",
        LOUD: "Alto",
        VERY_LOUD: "Muy alto",
      },
      risk: {
        low: "Bajo",
        medium: "Moderado",
        high: "Alto",
        critical: "Muy alto",
      },
      who: {
        safe: "Seguro",
        warning: "Advertencia",
        danger: "Peligro",
        unknown: "N/D",
      },
      general: {
        GOOD: "Bueno",
        MODERATE: "Moderado",
        POOR: "Malo",
        VERY_POOR: "Crítico",
      },
    },
    advanced: {
      title: "Mapa Geoespacial Avanzado",
      lead: "Vista independiente a pantalla completa con clustering dinámico, capas temáticas de aire y ruido, y filtros conectados a Orion-LD.",
      refresh: "Actualizar Orion",
      loading: "Cargando sensores...",
      filters: "Filtros",
      city: "Ciudad",
      cityAll: "Todas",
      sensorType: "Tipo de sensor",
      typeAll: "Todos",
      airQuality: "Calidad del aire",
      noiseUrban: "Ruido urbano",
      pm10Above: "PM10 > valor",
      pm25Above: "PM2_5 > valor",
      laeqAbove: "LAeq > valor",
      pm10Hint: "PM10: introduce valores entre 0 y 300 µg/m³ (ejemplo: 50).",
      pm25Hint: "PM2_5: introduce valores entre 0 y 200 µg/m³ (ejemplo: 35).",
      laeqHint: "LAeq: introduce valores entre 30 y 120 dB (ejemplo: 70).",
      recommendedValues: "Guía de valores recomendados:",
      layers: "Capas",
      airGood: "Aire bueno",
      airModerate: "Aire moderado",
      airPoor: "Aire malo",
      airCritical: "Aire crítico",
      noiseLayer: "Ruido urbano",
      sync: "Sincronización",
      citySynced: "Ciudad activa sincronizada: {{city}}. Los sensores de esa ciudad se resaltan en el mapa.",
      noCity: "Sin ciudad activa. Selecciona un sensor o una ciudad desde el dashboard.",
      detailButton: "Vista en detalle",
      popupStatus: "Estado:",
      popupTimestamp: "Timestamp:",
      popupCoordinates: "Coordenadas:",
      popupAirColor: "Color aire:",
      popupNoiseColor: "Color ruido:",
      popupAir: "Calidad del aire",
      popupNoise: "Ruido urbano",
      popupAirState: "Estado aire",
      popupNoiseState: "Estado ruido",
    },
    detail: {
      title: "Detalle de sensor",
      lead: "Información básica del sensor seleccionado.",
      back: "Volver al mapa",
      metric: "métrica",
      dynamicIndicators: "Indicadores dinámicos",
      week: "Semana",
      weeklySummary: "Resumen semanal",
      worstDay: "Día más perjudicial",
      risk: "Riesgo {{level}}",
      enoughData: "No hay datos semanales suficientes.",
      recommendations: "Recomendaciones de salud",
      selectSensor: "Selecciona un sensor",
      noData: "N/D",
      noValues: "No hay datos para mostrar.",
      chart: {
        air: "µg/m³",
        noise: "dB",
      },
      metricTitle: {
        air: "Calidad del aire",
        noise: "Ruido urbano",
      },
      day: "Día",
      status: "Estado",
      acousticStatus: "Estado acústico",
      alert: "equiv.",
      avg: "Promedio",
      max: "Máximo",
      min: "Mínimo",
      trend: "Tendencia",
    },
    guide: {
      airTitle: "Métricas de aire",
      airLead: "Estas medidas ayudan a saber si el aire es más limpio o si puede afectar a la salud.",
      noiseTitle: "Métricas de ruido",
      noiseLead: "Estas medidas describen cuánto ruido hay y cómo cambia a lo largo del tiempo.",
      air: {
        ica: { label: "ICA", text: "Índice general que resume la calidad del aire en un número fácil de interpretar." },
        pm25: { label: "PM2.5", text: "Partículas muy pequeñas que pueden llegar profundamente a los pulmones." },
        pm10: { label: "PM10", text: "Partículas un poco más grandes, como polvo o suciedad en suspensión." },
        no2: { label: "NO2", text: "Gas contaminante relacionado sobre todo con tráfico y combustión." },
        o3: { label: "O3", text: "Ozono troposférico, que puede aumentar en días soleados y calurosos." },
      },
      noise: {
        laeq: { label: "LAeq", text: "Nivel medio de ruido en un periodo. Sirve para saber el ruido habitual." },
        lamax: { label: "LAmax", text: "Valor más alto de ruido registrado en ese intervalo." },
        la90: { label: "LA90", text: "Ruido de fondo: el nivel que se mantiene durante buena parte del tiempo." },
        db: { label: "dB", text: "Unidad usada para medir el sonido. Cuanto más sube, más fuerte se percibe." },
      },
    },
    architecture: {
      title: "Flujo de datos",
      banner: "Sensor → IoT Agent → Orion-LD → QuantumLeap → Backend API → Dashboard",
    },
    charts: {
      air: { pm25: "PM2.5", pm10: "PM10", no2: "NO2", o3: "O3" },
      noise: { laeq: "LAeq", lamax: "LAmax", la90: "LA90" },
    },
    recommendations: {
      title: "Recomendaciones de salud",
      air: {
        danger: ["Evitar ejercicio exterior", "Cerrar ventanas", "Usar mascarilla en exteriores", "Usar purificador de aire"],
        warning: ["Evitar ejercicio intenso al aire libre", "Ventilar en horas de menor tráfico", "Considerar mascarilla en trayectos largos"],
        safe: ["Actividad normal si niveles bajos", "Disfrutar actividades al aire libre", "Abrir ventanas para ventilar"],
        unknown: ["Sin datos suficientes para recomendaciones específicas"],
      },
      noise: {
        danger: ["Evitar zonas con tráfico intenso y focos de ruido", "Usar protección auditiva en exteriores prolongados", "Cerrar ventanas y reducir fuentes de ruido en casa", "Limitar el tiempo de exposición continua al ruido"],
        warning: ["Reducir permanencia en áreas ruidosas", "Priorizar actividades en interiores silenciosos", "Evitar exposición a ruido durante la noche"],
        safe: ["Actividad normal en entorno acústico aceptable", "Priorizar rutas y zonas urbanas tranquilas", "Mantener buena higiene del sueño en ambientes silenciosos"],
        unknown: ["Sin datos suficientes para recomendaciones específicas"],
      },
    },
  },
  en: {
    theme: {
      light: "Light mode",
      dark: "Dark mode",
      toggleAria: "Toggle theme",
    },
    header: {
      eyebrow: "FIWARE · NGSI-LD · Smart Data Models",
      title: "Environmental Monitoring Center",
      subtitle: "Integrated analysis of air quality and urban noise pollution",
    },
    nav: {
      main: "Main dashboard",
      advanced: "Advanced map",
    },
    pills: {
      orion: "Orion-LD Ready",
      quantumleap: "QuantumLeap",
      leaflet: "Leaflet + ChartJS",
    },
    hero: {
      label: "Overview",
      title: "Real-time urban monitoring",
      lead: "Check the state of air quality and urban noise at a glance. Metrics are shown in plain language so anyone can understand them without technical knowledge.",
    },
    labels: {
      airIndex: "AQI",
      noiseAverage: "Average noise",
      generalStatus: "Overall status",
      map: "Map",
      ranking: "Ranking",
      selected: "Selection",
      guide: "Quick guide",
      architecture: "Architecture",
      advancedSection: "Advanced section",
      detailSection: "Sensor view",
      activeCity: "Active city",
      airQuality: "Air quality",
      urbanNoise: "Urban noise",
      sensorName: "Name",
      city: "City",
      sensorType: "Sensor type",
      kpis: "KPIs",
      dynamicIndicators: "Dynamic indicators",
      week: "Week",
      weeklySummary: "Weekly summary",
      worstDay: "Worst day",
    },
    sections: {
      mapTitle: "Sensor locations",
      rankingTitle: "Cities ordered by AQI",
      selectedTitle: "Active city details",
      guideTitle: "What each metric means",
    },
    status: {
      loading: "Loading...",
      loadingOrion: "Loading Orion data...",
      waitingOrion: "Waiting for Orion",
      noData: "No data",
      noDataShort: "N/A",
      globalView: "Aggregated view of all cities detected in Orion-LD.",
      activeCityPrefix: "Active city",
      visibleSensors: "{{count}} visible sensors · Air {{air}} · Noise {{noise}}",
      noVisibleSensors: "No visible sensors in Orion-LD",
      noCities: "No cities with parseable NGSI-LD entities.",
      noContent: "No data to display.",
      selectSensor: "Select a sensor",
      activeCitySynced: "Synchronized active city: {{city}}. Sensors in that city are highlighted on the map.",
      noActiveCity: "No active city. Select a sensor or a city from the dashboard.",
      consultingOrion: "Querying Orion-LD...",
      noEnoughWeeklyData: "Not enough weekly data.",
      noWeeklyData: "Not enough weekly data.",
      metricSafe: "The {{metric}} concentration currently meets the WHO guideline.",
      metricWarning: "Warning: {{metric}} is above the WHO threshold.",
      metricDanger: "Danger: {{metric}} is far above the WHO threshold.",
    },
    trend: {
      up: "up",
      down: "down",
      stable: "stable",
    },
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
    levels: {
      air: {
        GOOD: "Good",
        MODERATE: "Moderate",
        POOR: "Poor",
        VERY_POOR: "Critical",
      },
      noise: {
        QUIET: "Quiet",
        MODERATE: "Moderate",
        LOUD: "Loud",
        VERY_LOUD: "Very loud",
      },
      risk: {
        low: "Low",
        medium: "Moderate",
        high: "High",
        critical: "Very high",
      },
      who: {
        safe: "Safe",
        warning: "Warning",
        danger: "Danger",
        unknown: "N/A",
      },
      general: {
        GOOD: "Good",
        MODERATE: "Moderate",
        POOR: "Poor",
        VERY_POOR: "Critical",
      },
    },
    advanced: {
      title: "Advanced geospatial map",
      lead: "A full-screen standalone view with dynamic clustering, air and noise themed layers, and filters connected to Orion-LD.",
      refresh: "Refresh Orion",
      loading: "Loading sensors...",
      filters: "Filters",
      city: "City",
      cityAll: "All",
      sensorType: "Sensor type",
      typeAll: "All",
      airQuality: "Air quality",
      noiseUrban: "Urban noise",
      pm10Above: "PM10 above value",
      pm25Above: "PM2_5 above value",
      laeqAbove: "LAeq above value",
      pm10Hint: "PM10: enter values between 0 and 300 µg/m³ (example: 50).",
      pm25Hint: "PM2_5: enter values between 0 and 200 µg/m³ (example: 35).",
      laeqHint: "LAeq: enter values between 30 and 120 dB (example: 70).",
      recommendedValues: "Recommended values guide:",
      layers: "Layers",
      airGood: "Good air",
      airModerate: "Moderate air",
      airPoor: "Poor air",
      airCritical: "Critical air",
      noiseLayer: "Urban noise",
      sync: "Synchronization",
      citySynced: "Synchronized active city: {{city}}. Sensors in that city are highlighted on the map.",
      noCity: "No active city. Select a sensor or a city from the dashboard.",
      detailButton: "View details",
      popupStatus: "Status:",
      popupTimestamp: "Timestamp:",
      popupCoordinates: "Coordinates:",
      popupAirColor: "Air color:",
      popupNoiseColor: "Noise color:",
      popupAir: "Air quality",
      popupNoise: "Urban noise",
      popupAirState: "Air status",
      popupNoiseState: "Noise status",
    },
    detail: {
      title: "Sensor details",
      lead: "Basic information for the selected sensor.",
      back: "Back to map",
      metric: "metric",
      dynamicIndicators: "Dynamic indicators",
      week: "Week",
      weeklySummary: "Weekly summary",
      worstDay: "Worst day",
      risk: "Risk {{level}}",
      enoughData: "Not enough weekly data.",
      recommendations: "Health recommendations",
      selectSensor: "Select a sensor",
      noData: "N/A",
      noValues: "No data to display.",
      chart: {
        air: "µg/m³",
        noise: "dB",
      },
      metricTitle: {
        air: "Air quality",
        noise: "Urban noise",
      },
      day: "Day",
      status: "Status",
      acousticStatus: "Acoustic status",
      alert: "equiv.",
      avg: "Average",
      max: "Maximum",
      min: "Minimum",
      trend: "Trend",
    },
    guide: {
      airTitle: "Air metrics",
      airLead: "These measurements help determine whether the air is cleaner or could affect health.",
      noiseTitle: "Noise metrics",
      noiseLead: "These measurements describe how loud the environment is and how it changes over time.",
      air: {
        ica: { label: "AQI", text: "General index that summarizes air quality in an easy-to-read number." },
        pm25: { label: "PM2.5", text: "Very small particles that can reach deep into the lungs." },
        pm10: { label: "PM10", text: "Slightly larger particles such as dust or suspended dirt." },
        no2: { label: "NO2", text: "Pollutant gas mostly linked to traffic and combustion." },
        o3: { label: "O3", text: "Tropospheric ozone, which can increase on sunny and hot days." },
      },
      noise: {
        laeq: { label: "LAeq", text: "Average noise level over a period. It helps describe everyday noise." },
        lamax: { label: "LAmax", text: "Highest noise value recorded in that interval." },
        la90: { label: "LA90", text: "Background noise: the level present for most of the time." },
        db: { label: "dB", text: "Unit used to measure sound. The higher it goes, the louder it feels." },
      },
    },
    architecture: {
      title: "Data flow",
      banner: "Sensor → IoT Agent → Orion-LD → QuantumLeap → Backend API → Dashboard",
    },
    charts: {
      air: { pm25: "PM2.5", pm10: "PM10", no2: "NO2", o3: "O3" },
      noise: { laeq: "LAeq", lamax: "LAmax", la90: "LA90" },
    },
    recommendations: {
      title: "Health recommendations",
      air: {
        danger: ["Avoid outdoor exercise", "Keep windows closed", "Use a mask outdoors", "Use an air purifier"],
        warning: ["Avoid intense outdoor exercise", "Ventilate during low-traffic hours", "Consider a mask for long trips"],
        safe: ["Normal activity if levels are low", "Enjoy outdoor activities", "Open windows for ventilation"],
        unknown: ["Not enough data for specific recommendations"],
      },
      noise: {
        danger: ["Avoid areas with heavy traffic and noise sources", "Use hearing protection during long outdoor exposure", "Close windows and reduce noise sources at home", "Limit continuous exposure to noise"],
        warning: ["Reduce time spent in noisy areas", "Prefer quiet indoor activities", "Avoid exposure to noise at night"],
        safe: ["Normal activity in an acceptable acoustic environment", "Prefer calm city routes and areas", "Maintain good sleep hygiene in quiet spaces"],
        unknown: ["Not enough data for specific recommendations"],
      },
    },
  },
};

let currentLocale = DEFAULT_LOCALE;

function resolvePath(locale, key) {
  const segments = String(key).split(".");
  let value = DICTIONARY[locale];

  for (const segment of segments) {
    if (!value || typeof value !== "object") return undefined;
    value = value[segment];
  }

  return value;
}

function formatTemplate(template, params = {}) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, token) => {
    const replacement = params[token];
    return replacement == null ? "" : String(replacement);
  });
}

function t(key, params = {}) {
  const current = resolvePath(currentLocale, key);
  if (current != null) return typeof current === "string" ? formatTemplate(current, params) : current;

  const fallback = resolvePath(DEFAULT_LOCALE, key);
  if (fallback != null) return typeof fallback === "string" ? formatTemplate(fallback, params) : fallback;

  return key;
}

function getLocale() {
  return currentLocale;
}

function translateEnum(group, code) {
  if (!code) return t("status.noData");
  return t(`levels.${group}.${code}`) || code;
}

function translateAirLevel(code) {
  return translateEnum("air", code);
}

function translateNoiseLevel(code) {
  return translateEnum("noise", code);
}

function translateGeneralLevel(code) {
  return translateEnum("general", code);
}

function translateRiskLevel(code) {
  if (!code) return t("status.noDataShort");
  return t(`levels.risk.${code}`) || code;
}

function translateWhoLevel(code) {
  if (!code) return t("levels.who.unknown");
  return t(`levels.who.${code}`) || code;
}

function syncThemeToggle() {
  const themeButton = document.getElementById("theme-toggle");
  if (!themeButton) return;

  const isLight = document.body.classList.contains("theme-light");
  themeButton.textContent = isLight ? t("theme.light") : t("theme.dark");
  themeButton.setAttribute("aria-label", t("theme.toggleAria"));
  themeButton.setAttribute("aria-pressed", isLight ? "true" : "false");
}

function syncLocaleToggle() {
  const localeButton = document.getElementById("locale-toggle");
  if (!localeButton) return;

  const nextLocale = currentLocale === "es" ? "en" : "es";
  localeButton.textContent = nextLocale === "en" ? "English" : "Español";
  localeButton.setAttribute("aria-label", currentLocale === "es" ? "Switch to English" : "Cambiar a español");
  localeButton.setAttribute("aria-pressed", currentLocale === "es" ? "true" : "false");
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    element.textContent = t(key, element.dataset);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    if (key) element.title = t(key, element.dataset);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (key) element.setAttribute("placeholder", t(key, element.dataset));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (key) element.setAttribute("aria-label", t(key, element.dataset));
  });

  document.querySelectorAll("[data-i18n-option]").forEach((element) => {
    const key = element.dataset.i18nOption;
    if (key) element.textContent = t(key, element.dataset);
  });

  syncThemeToggle();
  syncLocaleToggle();
}

function setLocale(locale) {
  const nextLocale = locale === "en" ? "en" : "es";
  currentLocale = nextLocale;
  localStorage.setItem(STORAGE_KEY, nextLocale);
  applyStaticTranslations();

  window.dispatchEvent(
    new CustomEvent("fiware:locale-changed", {
      detail: { locale: nextLocale },
    })
  );
}

function initLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  currentLocale = saved === "en" ? "en" : DEFAULT_LOCALE;
  applyStaticTranslations();
}

window.appI18n = {
  t,
  getLocale,
  setLocale,
  applyStaticTranslations,
  syncThemeToggle,
  syncLocaleToggle,
  translateAirLevel,
  translateNoiseLevel,
  translateGeneralLevel,
  translateRiskLevel,
  translateWhoLevel,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLocale);
} else {
  initLocale();
}
