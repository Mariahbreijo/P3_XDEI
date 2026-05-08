/**
 * SENSOR DETAIL VIEW MODULE
 * 
 * Vista de detalle avanzada para sensores/zonas geográficas
 * Inspirada en dashboards tipo AirVisual/AirGradient
 * 
 * Funcionalidades:
 * - Evolución semanal interactiva
 * - KPIs de aire y ruido
 * - Alertas comparadas con OMS
 * - Recomendaciones de salud dinámicas
 * - Gráficos interactivos con Chart.js
 */

// ============================================================================
// REFERENCIAS OMS
// ============================================================================

const WHO_LIMITS = {
  air: {
    PM2_5: { annual: 5, unit: 'µg/m³' },
    PM10: { annual: 15, unit: 'µg/m³' },
    NO2: { annual: 10, unit: 'µg/m³' },
    O3: { eightHour: 100, unit: 'µg/m³' }
  },
  noise: {
    recommended: { day: 55, unit: 'dB', context: 'urbano diurno' }
  }
};

// ============================================================================
// GENERACIÓN DE DATOS SEMANALES SIMULADOS
// ============================================================================

/**
 * Genera histórico semanal simulado coherente
 * @param {Object} sensor - Sensor actual
 * @param {String} type - 'air' o 'noise'
 * @returns {Array} Datos semanales
 */
function generateWeeklyHistory(sensor, type = 'air') {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const daysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weeklyData = [];

  // Usar valores actuales como base y generar variaciones realistas
  const basePM25 = sensor.PM2_5 || 15;
  const basePM10 = sensor.PM10 || 25;
  const baseNO2 = sensor.NO2 || 20;
  const baseO3 = sensor.O3 || 60;
  const baseLAeq = sensor.LAeq || 65;

  // Generar tendencia realista (incremento hacia mitad de semana)
  for (let i = 0; i < 7; i++) {
    let pm25, pm10, no2, o3, laeq;

    // Patrón realista: mayor contaminación miércoles-viernes
    const trendMultiplier = 1 + (i >= 2 && i <= 4 ? 0.3 : -0.1 + Math.random() * 0.2);
    const randomVariation = 0.85 + Math.random() * 0.3;

    if (type === 'air') {
      pm25 = Math.round(basePM25 * trendMultiplier * randomVariation);
      pm10 = Math.round(basePM10 * trendMultiplier * randomVariation * (1 + Math.random() * 0.1));
      no2 = Math.round(baseNO2 * trendMultiplier * randomVariation * (0.9 + Math.random() * 0.2));
      o3 = Math.round(baseO3 * (0.8 + Math.random() * 0.4));

      const ica = calculateICA(pm25, pm10, no2, o3);

      weeklyData.push({
        day: daysShort[i],
        dayFull: days[i],
        index: i,
        PM2_5: pm25,
        PM10: pm10,
        NO2: no2,
        O3: o3,
        ICA: ica,
        timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      });
    } else if (type === 'noise') {
      laeq = Math.round(baseLAeq * trendMultiplier * randomVariation);
      const LAmax = Math.round(laeq + 5 + Math.random() * 10);
      const LA90 = Math.round(laeq - 3 - Math.random() * 5);

      weeklyData.push({
        day: daysShort[i],
        dayFull: days[i],
        index: i,
        LAeq: laeq,
        LAmax: LAmax,
        LA90: LA90,
        timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      });
    }
  }

  return weeklyData;
}

/**
 * Calcula ICA (Índice de Calidad del Aire) según valores
 * @param {Number} pm25 - PM2.5 µg/m³
 * @param {Number} pm10 - PM10 µg/m³
 * @param {Number} no2 - NO2 µg/m³
 * @param {Number} o3 - O3 µg/m³
 * @returns {Number} ICA (0-500+)
 */
function calculateICA(pm25, pm10, no2, o3) {
  // Escala aproximada ICA (USA): 0-50 (Bueno), 51-100 (Moderado), 101-150 (Insalubre grupos sensibles), 151-200 (Insalubre), 201-300 (Muy insalubre), 301+ (Peligroso)
  const icaPM25 = pm25 * 2; // PM2.5 es factor principal
  const icaPM10 = pm10 * 1.5;
  const icaNO2 = no2 * 0.5;
  const icaO3 = o3 * 0.3;

  return Math.round((icaPM25 + icaPM10 + icaNO2 + icaO3) / 4);
}

/**
 * Obtiene categoría de calidad del aire
 * @param {Number} ica - Índice ICA
 * @returns {Object} {category, color, bgColor}
 */
function getICACategory(ica) {
  if (ica <= 50) return { category: 'Bueno', color: '#2ecc71', bgColor: '#d5f4e6' };
  if (ica <= 100) return { category: 'Moderado', color: '#f39c12', bgColor: '#fef5e7' };
  if (ica <= 150) return { category: 'Insalubre (sensibles)', color: '#e74c3c', bgColor: '#fadbd8' };
  if (ica <= 200) return { category: 'Insalubre', color: '#c0392b', bgColor: '#f5b7b1' };
  if (ica <= 300) return { category: 'Muy insalubre', color: '#8b0000', bgColor: '#ebcccc' };
  return { category: 'Peligroso', color: '#4a0000', bgColor: '#d7bebe' };
}

// ============================================================================
// ANÁLISIS DE ALERTAS OMS
// ============================================================================

/**
 * Calcula alertas comparadas con límites OMS
 * @param {Array} weeklyData - Datos semanales
 * @param {String} type - 'air' o 'noise'
 * @returns {Array} Alertas detectadas
 */
function calculateWHOAlerts(weeklyData, type = 'air') {
  const alerts = [];

  if (type === 'air') {
    const latestDay = weeklyData[weeklyData.length - 1];
    const avgWeek = calculateWeeklyAverages(weeklyData);

    // PM2.5
    if (avgWeek.PM2_5 > WHO_LIMITS.air.PM2_5.annual) {
      const ratio = (avgWeek.PM2_5 / WHO_LIMITS.air.PM2_5.annual).toFixed(1);
      alerts.push({
        pollutant: 'PM2.5',
        level: 'warning',
        message: `Promedio semanal: ${avgWeek.PM2_5} µg/m³ (${ratio}x límite OMS)`,
        recommendation: 'Limitar actividad exterior, usar mascarilla si sale'
      });
    }

    // PM10
    if (avgWeek.PM10 > WHO_LIMITS.air.PM10.annual) {
      const ratio = (avgWeek.PM10 / WHO_LIMITS.air.PM10.annual).toFixed(1);
      alerts.push({
        pollutant: 'PM10',
        level: 'warning',
        message: `Promedio semanal: ${avgWeek.PM10} µg/m³ (${ratio}x límite OMS)`,
        recommendation: 'Mantener ventanas cerradas'
      });
    }

    // NO2
    if (avgWeek.NO2 > WHO_LIMITS.air.NO2.annual) {
      alerts.push({
        pollutant: 'NO2',
        level: 'caution',
        message: `Nivel de NO2 elevado: ${avgWeek.NO2} µg/m³`,
        recommendation: 'Evitar zonas con tráfico intenso'
      });
    }

    // O3
    if (latestDay.O3 > WHO_LIMITS.air.O3.eightHour) {
      alerts.push({
        pollutant: 'O3',
        level: 'caution',
        message: `Ozono presente: ${latestDay.O3} µg/m³`,
        recommendation: 'Reducir ejercicio intenso'
      });
    }

    // Buenas noticias
    if (alerts.length === 0) {
      alerts.push({
        pollutant: 'General',
        level: 'good',
        message: 'Calidad del aire dentro de parámetros OMS',
        recommendation: 'Condiciones favorables para actividades al aire libre'
      });
    }
  } else if (type === 'noise') {
    const avgLAeq = weeklyData.reduce((acc, day) => acc + day.LAeq, 0) / weeklyData.length;

    if (avgLAeq > WHO_LIMITS.noise.recommended.day) {
      const excess = Math.round(avgLAeq - WHO_LIMITS.noise.recommended.day);
      alerts.push({
        pollutant: 'Ruido',
        level: 'warning',
        message: `Nivel de ruido: ${Math.round(avgLAeq)} dB (${excess} dB sobre recomendado)`,
        recommendation: 'Usar protección auditiva en exteriores'
      });
    } else {
      alerts.push({
        pollutant: 'Ruido',
        level: 'good',
        message: `Nivel de ruido: ${Math.round(avgLAeq)} dB (aceptable)`,
        recommendation: 'Niveles de ruido controlados'
      });
    }
  }

  return alerts;
}

/**
 * Calcula promedios semanales
 * @param {Array} weeklyData - Datos semanales
 * @returns {Object} Promedios
 */
function calculateWeeklyAverages(weeklyData) {
  const sum = weeklyData.reduce((acc, day) => {
    return {
      PM2_5: acc.PM2_5 + (day.PM2_5 || 0),
      PM10: acc.PM10 + (day.PM10 || 0),
      NO2: acc.NO2 + (day.NO2 || 0),
      O3: acc.O3 + (day.O3 || 0),
      ICA: acc.ICA + (day.ICA || 0)
    };
  }, { PM2_5: 0, PM10: 0, NO2: 0, O3: 0, ICA: 0 });

  return {
    PM2_5: Math.round(sum.PM2_5 / weeklyData.length),
    PM10: Math.round(sum.PM10 / weeklyData.length),
    NO2: Math.round(sum.NO2 / weeklyData.length),
    O3: Math.round(sum.O3 / weeklyData.length),
    ICA: Math.round(sum.ICA / weeklyData.length)
  };
}

// ============================================================================
// CÁLCULO DEL DÍA MÁS PERJUDICIAL
// ============================================================================

/**
 * Encuentra el día con peor índice de la semana
 * @param {Array} weeklyData - Datos semanales
 * @returns {Object} Día más perjudicial con detalles
 */
function calculateWorstDay(weeklyData) {
  let worstDay = weeklyData[0];
  let maxValue = weeklyData[0].ICA || weeklyData[0].LAeq;

  weeklyData.forEach(day => {
    const value = day.ICA || day.LAeq;
    if (value > maxValue) {
      maxValue = value;
      worstDay = day;
    }
  });

  const category = getICACategory(worstDay.ICA);

  return {
    day: worstDay.dayFull,
    dayShort: worstDay.day,
    index: maxValue,
    severity: category.category,
    color: category.color,
    bgColor: category.bgColor,
    metrics: {
      PM2_5: worstDay.PM2_5,
      PM10: worstDay.PM10,
      NO2: worstDay.NO2,
      O3: worstDay.O3,
      LAeq: worstDay.LAeq
    }
  };
}

// ============================================================================
// RECOMENDACIONES DE SALUD DINÁMICAS
// ============================================================================

/**
 * Genera recomendaciones de salud según nivel de contaminación
 * @param {Array} weeklyData - Datos semanales
 * @param {String} type - 'air' o 'noise'
 * @returns {Array} Recomendaciones
 */
function generateHealthRecommendations(weeklyData, type = 'air') {
  const recommendations = [];
  const avg = calculateWeeklyAverages(weeklyData);

  if (type === 'air') {
    const avgICA = avg.ICA;
    const category = getICACategory(avgICA);

    if (avgICA <= 50) {
      recommendations.push('✓ Calidad del aire excelente');
      recommendations.push('✓ Ideal para ejercicio al aire libre');
      recommendations.push('✓ Perfectas condiciones para actividades outdoor');
      recommendations.push('✓ Abre ventanas para ventilar');
    } else if (avgICA <= 100) {
      recommendations.push('• Calidad del aire aceptable');
      recommendations.push('• Puedes hacer ejercicio moderado al aire libre');
      recommendations.push('• Mantén ventanas abiertas en horas de menos tráfico');
      recommendations.push('• Grupos sensibles: evita esfuerzo intenso');
    } else if (avgICA <= 150) {
      recommendations.push('⚠ Calidad del aire moderadamente insalubre');
      recommendations.push('⚠ Personas sensibles: reducir actividad exterior');
      recommendations.push('⚠ Otros grupos: puedes hacer ejercicio moderado');
      recommendations.push('⚠ Considera usar mascarilla en espacios públicos');
      recommendations.push('⚠ Mantén puertas y ventanas cerradas');
    } else if (avgICA <= 200) {
      recommendations.push('⛔ Calidad del aire insalubre');
      recommendations.push('⛔ Evitar actividad exterior intensa');
      recommendations.push('⛔ Usar mascarilla N95 si sale');
      recommendations.push('⛔ Mantener ventanas cerradas');
      recommendations.push('⛔ Usar purificador de aire en interiores');
    } else {
      recommendations.push('🛑 Calidad del aire muy insalubre/peligrosa');
      recommendations.push('🛑 Evitar salir al exterior');
      recommendations.push('🛑 Usar purificador de aire de alta capacidad');
      recommendations.push('🛑 Personas sensibles: permanecer en interiores');
      recommendations.push('🛑 Usar mascarilla N95 si es necesario salir');
    }

    // Recomendaciones específicas por contaminante
    if (avg.PM2_5 > WHO_LIMITS.air.PM2_5.annual * 2) {
      recommendations.push('⚠ PM2.5 muy elevado: usar purificador');
    }
    if (avg.NO2 > WHO_LIMITS.air.NO2.annual * 2) {
      recommendations.push('⚠ NO2 elevado: limitar ejercicio en zonas de tráfico');
    }
  } else if (type === 'noise') {
    const avgLAeq = weeklyData.reduce((acc, day) => acc + day.LAeq, 0) / weeklyData.length;

    if (avgLAeq <= 55) {
      recommendations.push('✓ Niveles de ruido saludables');
      recommendations.push('✓ Ambiente tranquilo para descansar');
    } else if (avgLAeq <= 70) {
      recommendations.push('• Niveles de ruido moderados');
      recommendations.push('• Puede afectar concentración prolongada');
      recommendations.push('• Considera usar tapones para dormir');
    } else {
      recommendations.push('⚠ Niveles de ruido elevados');
      recommendations.push('⚠ Usar protección auditiva si se expone frecuentemente');
      recommendations.push('⚠ Riesgo de daño auditivo con exposición prolongada');
    }
  }

  return recommendations;
}

// ============================================================================
// RENDERIZADO DE GRÁFICOS CON CHART.JS
// ============================================================================

let sensorDetailChart = null;

/**
 * Renderiza gráfico semanal interactivo
 * @param {String} canvasId - ID del canvas
 * @param {Array} weeklyData - Datos semanales
 * @param {String} type - 'air' o 'noise'
 */
function renderWeeklyChart(canvasId, weeklyData, type = 'air') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Destruir gráfico anterior si existe
  if (sensorDetailChart) {
    sensorDetailChart.destroy();
  }

  const days = weeklyData.map(d => d.day);

  let datasets = [];
  if (type === 'air') {
    datasets = [
      {
        label: 'PM2.5 (µg/m³)',
        data: weeklyData.map(d => d.PM2_5),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#e74c3c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      {
        label: 'PM10 (µg/m³)',
        data: weeklyData.map(d => d.PM10),
        borderColor: '#f39c12',
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f39c12',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      {
        label: 'NO2 (µg/m³)',
        data: weeklyData.map(d => d.NO2),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3498db',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ];
  } else if (type === 'noise') {
    datasets = [
      {
        label: 'LAeq (dB)',
        data: weeklyData.map(d => d.LAeq),
        borderColor: '#9b59b6',
        backgroundColor: 'rgba(155, 89, 182, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#9b59b6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      {
        label: 'LAmax (dB)',
        data: weeklyData.map(d => d.LAmax),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#e74c3c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ];
  }

  sensorDetailChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12, weight: 'bold' },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          borderRadius: 8,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 }
          }
        },
        x: {
          grid: {
            drawBorder: false,
            display: false
          },
          ticks: {
            font: { size: 11 }
          }
        }
      }
    }
  });
}

// ============================================================================
// RENDERIZADO DE LA VISTA COMPLETA
// ============================================================================

/**
 * Renderiza toda la vista de detalle del sensor
 * @param {Object} sensor - Datos del sensor
 * @param {String} selectedCity - Ciudad seleccionada
 * @param {String} type - 'air' o 'noise'
 * @param {String} appState - Estado global de la app
 */
function renderSensorDetail(sensor, selectedCity, type = 'air', appState = {}) {
  // Generar datos semanales
  const weeklyData = generateWeeklyHistory(sensor, type);
  const worstDay = calculateWorstDay(weeklyData);
  const alerts = calculateWHOAlerts(weeklyData, type);
  const recommendations = generateHealthRecommendations(weeklyData, type);
  const avgMetrics = calculateWeeklyAverages(weeklyData);

  // Obtener categoría general
  const generalCategory = getICACategory(avgMetrics.ICA);

  // Construir HTML
  let html = `
    <div id="sensorDetailContainer" class="sensor-detail-view">
      <!-- HEADER CON BOTÓN VOLVER -->
      <div class="detail-header">
        <button id="backToMapBtn" class="btn-back" onclick="closeSensorDetail()">
          ← Volver al mapa
        </button>
        <div class="header-info">
          <h1 class="sensor-name">${sensor.name || 'Sensor'}</h1>
          <p class="sensor-location">${selectedCity} • ${type === 'air' ? 'Calidad del Aire' : 'Contaminación Acústica'}</p>
          <div class="last-update">
            Última actualización: ${new Date().toLocaleTimeString()}
          </div>
        </div>
        <div class="status-badge" style="background-color: ${generalCategory.bgColor}; color: ${generalCategory.color};">
          ${generalCategory.category}
        </div>
      </div>

      <!-- KPIs SUPERIORES -->
      <div class="kpis-section">
        <div class="kpis-grid">
  `;

  if (type === 'air') {
    const latestDay = weeklyData[weeklyData.length - 1];
    html += `
          <div class="kpi-card">
            <div class="kpi-label">PM2.5</div>
            <div class="kpi-value">${latestDay.PM2_5}</div>
            <div class="kpi-unit">µg/m³</div>
            <div class="kpi-reference">OMS: ${WHO_LIMITS.air.PM2_5.annual}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">PM10</div>
            <div class="kpi-value">${latestDay.PM10}</div>
            <div class="kpi-unit">µg/m³</div>
            <div class="kpi-reference">OMS: ${WHO_LIMITS.air.PM10.annual}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">NO2</div>
            <div class="kpi-value">${latestDay.NO2}</div>
            <div class="kpi-unit">µg/m³</div>
            <div class="kpi-reference">OMS: ${WHO_LIMITS.air.NO2.annual}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">O3</div>
            <div class="kpi-value">${latestDay.O3}</div>
            <div class="kpi-unit">µg/m³</div>
            <div class="kpi-reference">OMS: ${WHO_LIMITS.air.O3.eightHour}</div>
          </div>
          <div class="kpi-card main-ica">
            <div class="kpi-label">ICA</div>
            <div class="kpi-value">${latestDay.ICA}</div>
            <div class="kpi-unit">Index</div>
            <div class="kpi-reference">${generalCategory.category}</div>
          </div>
    `;
  } else {
    const latestDay = weeklyData[weeklyData.length - 1];
    html += `
          <div class="kpi-card">
            <div class="kpi-label">LAeq</div>
            <div class="kpi-value">${latestDay.LAeq}</div>
            <div class="kpi-unit">dB</div>
            <div class="kpi-reference">Recom: ${WHO_LIMITS.noise.recommended.day}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">LAmax</div>
            <div class="kpi-value">${latestDay.LAmax}</div>
            <div class="kpi-unit">dB</div>
            <div class="kpi-reference">Pico máximo</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">LA90</div>
            <div class="kpi-value">${latestDay.LA90}</div>
            <div class="kpi-unit">dB</div>
            <div class="kpi-reference">90% del tiempo</div>
          </div>
    `;
  }

  html += `
        </div>
      </div>

      <!-- GRÁFICO SEMANAL -->
      <div class="chart-section">
        <div class="section-header">
          <h2>Evolución Semanal</h2>
          <div class="selector-group">
            <select id="detailTypeSelector" onchange="changeDetailView('${selectedCity}', '${sensor.id || sensor.name}', event)">
              <option value="air" ${type === 'air' ? 'selected' : ''}>🌍 Aire</option>
              <option value="noise" ${type === 'noise' ? 'selected' : ''}>🔊 Ruido</option>
            </select>
          </div>
        </div>
        <canvas id="sensorDetailChart" style="max-height: 300px;"></canvas>
      </div>

      <!-- DÍA MÁS PERJUDICIAL -->
      <div class="worst-day-section">
        <div class="worst-day-card" style="background-color: ${worstDay.bgColor}; border-left: 4px solid ${worstDay.color};">
          <div class="worst-day-title" style="color: ${worstDay.color};">
            ⚠️ Día más perjudicial: ${worstDay.day}
          </div>
          <div class="worst-day-severity" style="color: ${worstDay.color};">
            ${worstDay.severity}
          </div>
          <div class="worst-day-index">
            Índice: <strong style="color: ${worstDay.color};">${worstDay.index}</strong>
          </div>
          <div class="worst-day-metrics">
            ${type === 'air' 
              ? `PM2.5: ${worstDay.metrics.PM2_5} µg/m³ | PM10: ${worstDay.metrics.PM10} µg/m³ | NO2: ${worstDay.metrics.NO2} µg/m³`
              : `LAeq: ${worstDay.metrics.LAeq} dB | LAmax: ${worstDay.metrics.LAmax} dB`
            }
          </div>
        </div>
      </div>

      <!-- ALERTAS OMS -->
      <div class="alerts-section">
        <h2>🚨 Alertas vs. Referencias OMS</h2>
        <div class="alerts-container">
  `;

  alerts.forEach(alert => {
    const levelClass = alert.level === 'good' ? 'alert-good' : alert.level === 'caution' ? 'alert-caution' : 'alert-warning';
    const icon = alert.level === 'good' ? '✓' : alert.level === 'caution' ? '⚠' : '⛔';
    html += `
          <div class="alert-card ${levelClass}">
            <div class="alert-icon">${icon}</div>
            <div class="alert-content">
              <div class="alert-pollutant">${alert.pollutant}</div>
              <div class="alert-message">${alert.message}</div>
              <div class="alert-recommendation">💡 ${alert.recommendation}</div>
            </div>
          </div>
    `;
  });

  html += `
        </div>
      </div>

      <!-- RECOMENDACIONES DE SALUD -->
      <div class="recommendations-section">
        <h2>💚 Recomendaciones de Salud</h2>
        <div class="recommendations-list">
  `;

  recommendations.forEach(rec => {
    html += `<div class="recommendation-item">${rec}</div>`;
  });

  html += `
        </div>
      </div>

      <!-- ESTADÍSTICAS SEMANALES -->
      <div class="stats-section">
        <h2>📊 Estadísticas Semanales</h2>
        <div class="stats-grid">
  `;

  if (type === 'air') {
    html += `
          <div class="stat-card">
            <div class="stat-label">PM2.5 Promedio</div>
            <div class="stat-value">${avgMetrics.PM2_5} µg/m³</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">PM10 Promedio</div>
            <div class="stat-value">${avgMetrics.PM10} µg/m³</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">NO2 Promedio</div>
            <div class="stat-value">${avgMetrics.NO2} µg/m³</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">ICA Promedio</div>
            <div class="stat-value">${avgMetrics.ICA}</div>
          </div>
    `;
  } else {
    const avgLAeq = weeklyData.reduce((acc, day) => acc + day.LAeq, 0) / weeklyData.length;
    const maxLAmax = Math.max(...weeklyData.map(d => d.LAmax));
    html += `
          <div class="stat-card">
            <div class="stat-label">LAeq Promedio</div>
            <div class="stat-value">${Math.round(avgLAeq)} dB</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">LAmax Máximo</div>
            <div class="stat-value">${maxLAmax} dB</div>
          </div>
    `;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  // Inyectar HTML
  const container = document.getElementById('app');
  if (container) {
    container.innerHTML = html;
    // Renderizar gráfico después de inyectar
    setTimeout(() => {
      renderWeeklyChart('sensorDetailChart', weeklyData, type);
    }, 100);
  }
}

/**
 * Cierra la vista de detalle y vuelve a la vista anterior
 */
function closeSensorDetail() {
  // Restaurar vista anterior (puede ser dashboard o mapa)
  if (window.appState && window.appState.previousView) {
    window.appState.previousView();
  } else if (window.renderMap) {
    window.renderMap();
  } else if (window.renderDashboard) {
    window.renderDashboard();
  }
}

/**
 * Cambia entre vista de aire y ruido
 */
function changeDetailView(city, sensorId, event) {
  const newType = event.target.value;
  // Redibujar con nuevo tipo
  if (window.appState && window.appState.currentSensor) {
    renderSensorDetail(window.appState.currentSensor, city, newType, window.appState);
  }
}

// ============================================================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================================================

window.sensorDetailModule = {
  renderSensorDetail,
  generateWeeklyHistory,
  calculateWorstDay,
  calculateWHOAlerts,
  generateHealthRecommendations,
  renderWeeklyChart,
  closeSensorDetail,
  changeDetailView,
  calculateICA,
  getICACategory,
  calculateWeeklyAverages
};
