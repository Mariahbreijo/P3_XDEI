# Vista de Detalle de Sensor - Documentación

## Descripción General

La vista de detalle de sensor es una tercera página que se abre al hacer click en un sensor del mapa o en una ciudad del ranking. Proporciona una experiencia avanzada tipo **AirVisual/AirGradient** con análisis semanal profundo, alertas OMS y recomendaciones de salud dinámicas.

## Características Principales

### 1. **Navegación**
- La vista se abre al hacer click en un sensor del mapa avanzado
- También se puede abrir desde el ranking de ciudades
- Botón "← Volver al mapa" para regresar
- Sincronización con appState global

### 2. **Estructura Visual**

#### Header de Detalle
- Nombre del sensor/zona
- Ciudad y tipo de sensor
- Estado general (Bueno, Moderado, Malo, etc.)
- Última actualización

#### KPIs Superiores (Aire)
```
- PM2.5 (µg/m³) - con referencia OMS
- PM10 (µg/m³) - con referencia OMS
- NO2 (µg/m³) - con referencia OMS
- O3 (µg/m³) - con referencia OMS
- ICA (Índice) - métrica principal
```

#### KPIs Superiores (Ruido)
```
- LAeq (dB) - promedio energético
- LAmax (dB) - pico máximo
- LA90 (dB) - nivel de fondo (90% del tiempo)
```

#### Evolución Semanal
- Gráfico interactivo Chart.js con múltiples líneas
- Lunes → Domingo
- Selector de tipo (Aire/Ruido)
- Transiciones suaves entre datasets
- Tooltips con valores exactos al pasar mouse

#### Día Más Perjudicial
- Card destacada mostrando el día con peor índice
- Nivel de riesgo asociado
- Métricas específicas del día
- Color dinámico según severidad

#### Alertas OMS
- Comparación automática con límites de la OMS
- Ejemplos:
  - PM2.5 supera 3.6x el límite OMS
  - NO2 por encima de niveles recomendados
  - O3 dentro de rango aceptable
- Alertas visuales (amarillo, naranja, rojo)
- Recomendaciones prácticas para cada alerta

#### Recomendaciones de Salud
Generadas dinámicamente según nivel de contaminación:
- **Aire Bueno**: Recomendaciones positivas (ejercicio al aire libre)
- **Aire Moderado**: Precauciones para grupos sensibles
- **Aire Malo**: Mascarilla, limitar actividad exterior
- **Aire Crítico**: Evitar salir, usar purificador

#### Estadísticas Semanales
- Promedios de la semana para todos los contaminantes
- Valores máximos y mínimos
- Tendencias semanales

### 3. **Datos Semanales Simulados**

Función: `generateWeeklyHistory(sensor, type)`

Genera 7 días de datos coherentes y realistas:
- Variaciones basadas en el valor actual del sensor
- Tendencia realista (mayor contaminación mitad de semana)
- Relaciones coherentes entre PM2.5 y PM10
- ICA calculado dinámicamente

Ejemplo de salida:
```javascript
[
  { day: "Lun", dayFull: "Lunes", PM2_5: 16, PM10: 28, NO2: 18, O3: 58, ICA: 45 },
  { day: "Mar", dayFull: "Martes", PM2_5: 18, PM10: 31, NO2: 20, O3: 62, ICA: 51 },
  { day: "Mié", dayFull: "Miércoles", PM2_5: 24, PM10: 39, NO2: 28, O3: 75, ICA: 68 },
  // ... hasta domingo
]
```

### 4. **Cálculo de ICA**

La escala utilizada (aproximada USA):
```
0-50       : Bueno
51-100     : Moderado
101-150    : Insalubre (grupos sensibles)
151-200    : Insalubre
201-300    : Muy insalubre
301+       : Peligroso
```

### 5. **Referencias OMS Implementadas**

```javascript
WHO_LIMITS = {
  air: {
    PM2_5: 5 µg/m³ (anual),
    PM10: 15 µg/m³ (anual),
    NO2: 10 µg/m³ (anual),
    O3: 100 µg/m³ (8h)
  },
  noise: {
    55 dB (recomendado urbano diurno)
  }
}
```

## Funciones Principales

### `renderSensorDetail(sensor, selectedCity, type, appState)`
Renderiza la vista completa del sensor en el contenedor `#app`.

```javascript
window.openSensorDetail(sensor, 'Madrid', 'air');
```

### `generateWeeklyHistory(sensor, type)`
Genera datos semanales simulados coherentes.

```javascript
const weeklyData = window.sensorDetailModule.generateWeeklyHistory(sensor, 'air');
```

### `calculateWorstDay(weeklyData)`
Encuentra el día con peor índice y devuelve detalles.

```javascript
const worstDay = window.sensorDetailModule.calculateWorstDay(weeklyData);
// { day: "Miércoles", severity: "Insalubre", color: "#e74c3c", ... }
```

### `calculateWHOAlerts(weeklyData, type)`
Genera alertas comparadas con límites OMS.

```javascript
const alerts = window.sensorDetailModule.calculateWHOAlerts(weeklyData, 'air');
// [ { pollutant: "PM2.5", level: "warning", message: "...", recommendation: "..." } ]
```

### `generateHealthRecommendations(weeklyData, type)`
Genera recomendaciones de salud dinámicas.

```javascript
const recommendations = window.sensorDetailModule.generateHealthRecommendations(weeklyData, 'air');
// [ "✓ Calidad del aire excelente", "✓ Ideal para ejercicio al aire libre", ... ]
```

### `renderWeeklyChart(canvasId, weeklyData, type)`
Renderiza gráfico interactivo con Chart.js.

```javascript
window.sensorDetailModule.renderWeeklyChart('sensorDetailChart', weeklyData, 'air');
```

## Integración

### Desde el Mapa
```javascript
// En advanced_map.js o donde se manejen clicks en markers
marker.on('click', function(e) {
  openSensorDetail(sensor, city, type);
});
```

### Desde el Ranking
```javascript
// Cuando el usuario hace click en una ciudad del ranking
cityElement.addEventListener('click', () => {
  openSensorDetail(sensor, cityName, 'air');
});
```

### Volver a Vista Anterior
```javascript
// El botón "Volver al mapa" llama:
closeSensorDetail();
```

## Sincronización con Orion-LD

La vista se sincroniza automáticamente cuando hay nuevos datos:
- Cada 5 segundos verifica si hay datos actualizados
- Si la vista está abierta, redibujaGráficos con datos frescos
- Los datos generados semanalmente usan valores actuales del sensor

## Responsive Design

- **Desktop**: Grid de 5 KPIs en fila, gráfico amplio
- **Tablet**: Grid adaptativo de 3-4 KPIs
- **Mobile**: Stack vertical de componentes, gráfico responsivo

## Estilos Incluidos

Archivo: `sensor_detail.css`

Características:
- Diseño moderno con gradientes suaves
- Animaciones de fade-in y hover
- Colores dinámicos según gravedad
- Espaciado limpio y legible
- Sombras sutiles para profundidad

## Ejemplos de Uso

### Ejemplo 1: Abrir detalle desde script
```javascript
const sensor = {
  id: 'sensor-madrid-1',
  name: 'Madrid Centro - Sensor Aire',
  PM2_5: 18,
  PM10: 32,
  NO2: 22,
  O3: 65
};

openSensorDetail(sensor, 'Madrid Centro', 'air');
```

### Ejemplo 2: Generar análisis semanal
```javascript
const weeklyData = window.sensorDetailModule.generateWeeklyHistory(sensor, 'air');
const worstDay = window.sensorDetailModule.calculateWorstDay(weeklyData);
const alerts = window.sensorDetailModule.calculateWHOAlerts(weeklyData, 'air');
const recommendations = window.sensorDetailModule.generateHealthRecommendations(weeklyData, 'air');

console.log(`Peor día: ${worstDay.day}`);
console.log(`Alertas: ${alerts.length}`);
```

## Archivos Incluidos

1. **sensor_detail.js** - Módulo principal con toda la lógica
2. **sensor_detail.css** - Estilos responsive
3. **sensor_detail_integration.js** - Integración con app existente
4. **index.html** - Actualizado con scripts y CSS

## Notas Técnicas

- Sin frameworks (vanilla JavaScript)
- Chart.js para gráficos
- Estado global sincronizado con `appState`
- Compatible con FIWARE Orion-LD
- Datos simulados manteniendo coherencia
- ICA calculado dinámicamente según contaminantes

## Futuras Mejoras

- [ ] Histórico persistente de sensores
- [ ] Exportar reportes en PDF
- [ ] Comparación con otros sensores
- [ ] Predicciones de calidad de aire
- [ ] Integración con APIs de calidad de aire externas
- [ ] Notificaciones de alertas
