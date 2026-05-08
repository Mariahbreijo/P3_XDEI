/**
 * SENSOR DETAIL INTEGRATION
 * 
 * Integra sensor_detail.js con app_fiware_sync.js y advanced_map.js
 * Maneja navegación y sincronización de estado global
 */

// ============================================================================
// ESTADO GLOBAL EXTENDIDO
// ============================================================================

const appState = window.appState || {};

// Guardar referencias a funciones originales
const originalViews = {
  dashboard: window.renderDashboard || null,
  advancedMap: window.renderAdvancedMap || null
};

// Nueva propiedad para trackear vista actual
appState.currentView = 'dashboard'; // 'dashboard', 'map', 'sensor-detail'
appState.currentSensor = null;
appState.currentType = 'air'; // 'air' o 'noise'
appState.previousView = null;

// Hacer appState global accesible
window.appState = appState;

// ============================================================================
// FUNCIONES DE NAVEGACIÓN
// ============================================================================

/**
 * Abre la vista de detalle de un sensor
 * @param {Object} sensor - Datos del sensor
 * @param {String} city - Ciudad del sensor
 * @param {String} type - 'air' o 'noise'
 */
function openSensorDetail(sensor, city, type = 'air') {
  console.log(`[SensorDetail] Abriendo detalle: ${city} - ${sensor.name} (${type})`);

  // Guardar estado actual
  appState.previousView = appState.currentView;
  appState.currentView = 'sensor-detail';
  appState.currentSensor = sensor;
  appState.currentType = type;

  // Cambiar vista en el documento
  document.body.setAttribute('data-active-view', 'sensor-detail');

  // Renderizar
  if (window.sensorDetailModule && window.sensorDetailModule.renderSensorDetail) {
    window.sensorDetailModule.renderSensorDetail(sensor, city, type, appState);
  } else {
    console.error('[SensorDetail] Módulo no disponible');
  }
}

/**
 * Cierra vista de detalle y regresa a la anterior
 */
function closeSensorDetail() {
  console.log(`[SensorDetail] Cerrando detalle, volviendo a: ${appState.previousView}`);

  if (appState.previousView === 'dashboard') {
    goToDashboard();
  } else if (appState.previousView === 'advanced-map') {
    goToAdvancedMap();
  } else {
    goToDashboard(); // Por defecto
  }
}

/**
 * Navega al dashboard principal
 */
function goToDashboard() {
  appState.currentView = 'dashboard';
  document.body.setAttribute('data-active-view', 'dashboard');
  document.body.setAttribute('data-active-view', 'main'); // Para compatibilidad con estilos existentes
  
  if (originalViews.dashboard && typeof originalViews.dashboard === 'function') {
    originalViews.dashboard();
  }
}

/**
 * Navega al mapa avanzado
 */
function goToAdvancedMap() {
  appState.currentView = 'advanced-map';
  document.body.setAttribute('data-active-view', 'advanced');
  
  if (originalViews.advancedMap && typeof originalViews.advancedMap === 'function') {
    originalViews.advancedMap();
  }
}

// ============================================================================
// HOOKS PARA SENSORES EN EL MAPA
// ============================================================================

/**
 * Intercepta clicks en sensores del mapa avanzado
 * Se integra con Leaflet markers
 */
function setupMapSensorClickHandlers() {
  // Este código se ejecutará después de que advanced_map.js haya iniciado
  setTimeout(() => {
    document.addEventListener('sensor-selected', (event) => {
      const { sensor, city, type } = event.detail || {};
      if (sensor && city) {
        openSensorDetail(sensor, city, type || 'air');
      }
    });
  }, 500);
}

// ============================================================================
// INTEGRACIÓN CON RANKING
// ============================================================================

/**
 * Permite clicks en ciudades del ranking para abrir detalle
 */
function setupRankingClickHandlers() {
  document.addEventListener('city-selected', (event) => {
    const { city, sensor, type } = event.detail || {};
    if (sensor && city) {
      openSensorDetail(sensor, city, type || 'air');
    }
  });
}

// ============================================================================
// VISTA DE DETALLE EN TIEMPO REAL
// ============================================================================

/**
 * Sincroniza datos del sensor en tiempo real desde Orion
 * Se ejecuta cada vez que hay datos nuevos
 */
function syncSensorDetailWithOrion() {
  if (appState.currentView === 'sensor-detail' && appState.currentSensor) {
    const updatedSensor = window.appState.sensors?.find(
      s => s.id === appState.currentSensor.id
    );
    
    if (updatedSensor) {
      appState.currentSensor = updatedSensor;
      // Redibujar con datos actualizados
      if (window.sensorDetailModule) {
        window.sensorDetailModule.renderSensorDetail(
          updatedSensor,
          appState.selectedCity,
          appState.currentType,
          appState
        );
      }
    }
  }
}

// ============================================================================
// RESPONSIVE Y MODO MÓVIL
// ============================================================================

/**
 * Inyecta el selector de vista en dispositivos móviles
 */
function setupMobileViewToggle() {
  if (window.innerWidth < 768) {
    // En móvil, añadir navegación de vista rápida
    const header = document.querySelector('header.topbar');
    if (header && !document.querySelector('.mobile-view-toggle')) {
      const toggle = document.createElement('div');
      toggle.className = 'mobile-view-toggle';
      toggle.innerHTML = `
        <button onclick="goToDashboard()" class="view-btn">📊 Dashboard</button>
        <button onclick="goToAdvancedMap()" class="view-btn">🗺 Mapa</button>
      `;
      header.appendChild(toggle);
    }
  }
}

// ============================================================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================================================

window.openSensorDetail = openSensorDetail;
window.closeSensorDetail = closeSensorDetail;
window.goToDashboard = goToDashboard;
window.goToAdvancedMap = goToAdvancedMap;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[SensorDetail] Inicializando integración...');
  
  setupMapSensorClickHandlers();
  setupRankingClickHandlers();
  setupMobileViewToggle();
  
  // Escuchar cambios en appState.sensors desde Orion
  setInterval(syncSensorDetailWithOrion, 5000);
  
  console.log('[SensorDetail] Integración completada');
});

// Auto-setup si DOMContentLoaded ya pasó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[SensorDetail] DOM ya cargado, inicializando...');
  });
} else {
  console.log('[SensorDetail] Inicializando directamente...');
  setupMapSensorClickHandlers();
  setupRankingClickHandlers();
  setupMobileViewToggle();
  setInterval(syncSensorDetailWithOrion, 5000);
}
