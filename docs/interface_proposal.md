# PROPUESTA DE INTERFAZ
## Dashboard Principal - Calidad del Aire y Ruido Urbano

---

## 1. ESTRUCTURA GENERAL DEL DASHBOARD

### 1.1 Layout Responsivo (3 breakpoints)

#### Desktop (1200px+) - Vista Completa
```
┌─────────────────────────────────────────────────────────────────┐
│ 🏢 AIR & NOISE MONITOR  [Madrid ▼]  🔔 👤 ⚙️                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌──────────────────────┐    │
│  │                              │  │  WIDGETS COLUMN 1    │    │
│  │                              │  ├──────────────────────┤    │
│  │                              │  │                      │    │
│  │       MAPA LEAFLET           │  │  🌡️ ICA INDEX        │    │
│  │       (60% viewport)         │  │  ┌────────────────┐  │    │
│  │                              │  │  │ 65 / 500 ✅    │  │    │
│  │    [Markers Sensores]        │  │  │ GOOD           │  │    │
│  │    [Heatmap PM2.5]           │  │  │                │  │    │
│  │    [Controles Capas]         │  │  │ PM2.5:  28.5   │  │    │
│  │                              │  │  │ PM10:   65.4   │  │    │
│  │                              │  │  │ NO2:    89.5   │  │    │
│  │                              │  │  │ O3:     62.8   │  │    │
│  │                              │  │  └────────────────┘  │    │
│  │                              │  │                      │    │
│  │                              │  ├──────────────────────┤    │
│  │                              │  │                      │    │
│  │                              │  │  📢 NOISE LEVEL      │    │
│  │                              │  │  ┌────────────────┐  │    │
│  │                              │  │  │ 72.5 dB 🟡     │  │    │
│  │                              │  │  │ MODERATE       │  │    │
│  │                              │  │  │                │  │    │
│  │                              │  │  │ LAeq:  72.5 dB │  │    │
│  │                              │  │  │ LAmax: 85.2 dB │  │    │
│  │                              │  │  │ LA90:  68.3 dB │  │    │
│  │                              │  │  └────────────────┘  │    │
│  │                              │  │                      │    │
│  │                              │  ├──────────────────────┤    │
│  │                              │  │                      │    │
│  │                              │  │  🌡️ GENERAL STATE    │    │
│  │                              │  │  Aire:  ✅ GOOD      │    │
│  │                              │  │  Ruido: 🟡 MODERATE  │    │
│  │                              │  │  Temp:  22.5°C       │    │
│  │                              │  │  Humedad: 65%        │    │
│  │                              │  │                      │    │
│  └──────────────────────────────┘  └──────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐    │
│  │ GRÁFICOS (ChartJS) - Últimas 24 horas                 │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  [Línea: PM2.5/PM10]  [Barras: Comparativa]  [Radar]   │    │
│  │                                                         │    │
│  │  ┌──────────────────┐  ┌──────────────────┐           │    │
│  │  │ 100 ──────/──── │  │ 80               │           │    │
│  │  │ 75  ────╱    \──│  │ 60  ▲   ▲   ▲    │           │    │
│  │  │ 50 ╱────        │  │ 40  │   │   │    │           │    │
│  │  │ 25 │            │  │ 20  │   │   │    │           │    │
│  │  │ 0  └────────────│  │ 0   └───┴───┴────│           │    │
│  │  │    0 6 12 18 24h│  │    M B B  D B    │           │    │
│  │  └──────────────────┘  └──────────────────┘           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tablet (768px - 1199px) - Vista Adaptada
```
┌────────────────────────────────────────────────────┐
│ AIR & NOISE  [Madrid ▼]  🔔 👤 ⚙️                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │         MAPA LEAFLET (100% ancho)          │   │
│  │         (Más pequeño, controles touch)     │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌──────────────────┐  ┌──────────────────┐      │
│  │  ICA INDEX       │  │  NOISE LEVEL     │      │
│  │  65 / 500 ✅     │  │  72.5 dB 🟡      │      │
│  │  GOOD            │  │  MODERATE        │      │
│  └──────────────────┘  └──────────────────┘      │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  GRÁFICOS (Stack vertical)                 │   │
│  │  [Línea PM2.5]                            │   │
│  │  [Barras Comparativa]                     │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
└────────────────────────────────────────────────────┘
```

#### Mobile (< 768px) - Vista Móvil
```
┌──────────────────────────────┐
│ 🏢 [Madrid ▼] 🔔 👤 ⚙️      │
├──────────────────────────────┤
│                              │
│   MAPA LEAFLET               │
│   (50% altura, scrollable)   │
│   Tap para detalles          │
│                              │
│   [Marker aire azul]         │
│   [Marker ruido rojo]        │
│                              │
├──────────────────────────────┤
│  ICA INDEX                   │
│  65 / 500 ✅                 │
│  GOOD                        │
│                              │
│  PM2.5: 28.5 µg/m³           │
│  PM10:  65.4 µg/m³           │
├──────────────────────────────┤
│  NOISE LEVEL                 │
│  72.5 dB 🟡                  │
│  MODERATE                    │
│                              │
│  LAeq: 72.5 dB               │
│  LAmax: 85.2 dB              │
├──────────────────────────────┤
│  GRÁFICO 1                   │
│  (Línea, scrollable)         │
├──────────────────────────────┤
│  GRÁFICO 2                   │
│  (Barras, scrollable)        │
└──────────────────────────────┘
```

---

## 2. MAPA INTERACTIVO (Leaflet + OpenStreetMap)

### 2.1 Capas Base y Overlay

```javascript
// Layer Control
┌─────────────────────────────┐
│ ☐ Base Maps                 │
│  ☑ OpenStreetMap (default) │
│  ☐ Satellite                │
│  ☐ Terrain                  │
├─────────────────────────────┤
│ ☐ Overlay Layers            │
│  ☑ Air Quality Sensors      │
│  ☑ Noise Sensors            │
│  ☑ PM2.5 Heatmap            │
│  ☐ Traffic Data             │
│  ☐ Population Density       │
│  ☐ Administrative Limits    │
└─────────────────────────────┘
```

### 2.2 Marcadores (Markers)

#### Sensores de Aire
```javascript
{
  icon: {
    shape: "circle",
    color: getColorByICA(value),  // Azul gradiente verde/rojo
    fillOpacity: 0.8,
    weight: 2,
    radius: 8
  },
  popup: `
    <strong>Air Quality Sensor</strong>
    <br/>ID: madrid-air-01
    <br/>Location: Plaza Mayor
    <br/>ICA: 65 (GOOD) ✅
    <br/>PM2.5: 28.5 µg/m³
    <br/>Last Update: 14:30
    <br/><a href="#detail/madrid-air-01">View Details</a>
  `,
  tooltip: "Madrid - Air Quality: 65",
  animation: pulse  // Si hay alerta crítica
}
```

**Color Mapping (Gradiente ICA):**
```
0-50:    🟢 Verde (#2ecc71)
51-100:  🟡 Amarillo (#f39c12)
101-150: 🟠 Naranja (#e67e22)
151+:    🔴 Rojo (#e74c3c)
```

#### Sensores de Ruido
```javascript
{
  icon: {
    shape: "square",
    color: getColorByNoiseLevel(LAeq),  // Rojo gradiente
    fillOpacity: 0.8,
    weight: 2,
    size: 10
  },
  popup: `
    <strong>Noise Level Sensor</strong>
    <br/>ID: barcelona-noise-05
    <br/>Location: Av. Diagonal
    <br/>LAeq: 72.5 dB 🟡
    <br/>Level: MODERATE
    <br/>Last Update: 14:30
    <br/><a href="#detail/barcelona-noise-05">View Details</a>
  `,
  tooltip: "Barcelona - Noise: 72.5 dB"
}
```

**Color Mapping (Nivel de Ruido):**
```
< 55 dB:   🟢 Verde (#27ae60)
55-70 dB:  🟡 Amarillo (#f39c12)
70-85 dB:  🟠 Naranja (#e67e22)
> 85 dB:   🔴 Rojo (#c0392b)
```

### 2.3 Heatmap (PM2.5 Concentración)

```javascript
// Heatmap Layer (opcional, heavy computation)
{
  gradient: {
    0.0: '#2ecc71',   // Verde (bajo)
    0.3: '#f39c12',   // Amarillo
    0.6: '#e67e22',   // Naranja
    1.0: '#e74c3c'    // Rojo (alto)
  },
  dataPoints: [
    {lat: 40.4168, lng: -3.7038, intensity: 28.5},
    {lat: 41.3851, lng: 2.1734, intensity: 15.2},
    // ... más puntos interpolados
  ],
  radius: 50,  // pixels
  blur: 25,
  maxZoom: 15
}
```

### 2.4 Interactividad del Mapa

#### Controles
```
┌─────────────────┐
│  + │ - (Zoom)   │
│  ⊡ Full Screen  │
│  🧭 Locate Me    │
│  ⟳ Reset View   │
│  ▶️ Animate      │ (Timeline)
│  📊 Data Layers │ (Dropdown)
└─────────────────┘
```

#### Eventos
- **Marker Click**: Abre popup + carga panel lateral
- **Marker Hover**: Tooltip + highlight en gráficos
- **Zoom In**: Muestra más detalles de sensores cercanos
- **Date Range Change**: Anima evolución histórica
- **Filter Change**: Redibuja marcadores según criterio

---

## 3. WIDGETS LATERALES (Column 1)

### 3.1 Widget ICA (Índice de Calidad del Aire)

```html
┌─────────────────────────────┐
│ 🌡️ AIR QUALITY INDEX        │
├─────────────────────────────┤
│                             │
│      ╱━━━━━━━━━╲            │
│    ╱             ╲          │
│   │      65       │         │
│   │     / 500     │         │
│    ╲             ╱          │
│      ╲━━━━━━━━━╱            │
│                             │
│  Status: ✅ GOOD             │
│  [Color: Verde]             │
│                             │
│  PRIMARY POLLUTANTS:        │
│  ├─ PM2.5:  28.5 µg/m³     │
│  │         [=====>  ]       │
│  │         (Good)           │
│  │                          │
│  ├─ PM10:   65.4 µg/m³     │
│  │         [=======>  ]     │
│  │         (Good)           │
│  │                          │
│  ├─ NO2:    89.5 µg/m³     │
│  │         [========>  ]    │
│  │         (Good)           │
│  │                          │
│  └─ O3:     62.8 µg/m³     │
│           [=======>  ]      │
│           (Good)            │
│                             │
│  Last Update: 14:30 UTC    │
│  📍 Madrid, Plaza Mayor    │
│  🔗 More Details »          │
│                             │
└─────────────────────────────┘
```

**Componentes Técnicos:**
```jsx
<AirQualityWidget>
  <CircularGauge 
    value={65}
    maxValue={500}
    thresholds={[50, 100, 150]}
    colors={['#2ecc71', '#f39c12', '#e67e22', '#e74c3c']}
    animated={true}
    duration={600}
  />
  <StatusBadge 
    status="GOOD" 
    color="#2ecc71"
    icon="✅"
  />
  <ContaminantBar 
    name="PM2.5"
    value={28.5}
    unit="µg/m³"
    threshold={35}
    who2021={[15, 35, 75]}
  />
  {/* Más bars para PM10, NO2, O3 */}
</AirQualityWidget>
```

### 3.2 Widget Nivel de Ruido

```html
┌─────────────────────────────┐
│ 📢 NOISE LEVEL              │
├─────────────────────────────┤
│                             │
│   ┌──────────────────┐     │
│   │                  │     │
│   │  72.5 dB        │     │
│   │    🟡            │     │
│   │  MODERATE        │     │
│   │                  │     │
│   └──────────────────┘     │
│                             │
│  NOISE METRICS:             │
│  ├─ LAeq:  72.5 dB (avg)   │
│  ├─ LAmax: 85.2 dB (peak)  │
│  ├─ LA90:  68.3 dB (bg)    │
│  ├─ LC:    79.1 dB         │
│  └─ Freq:  1000 Hz (dom.)  │
│                             │
│  CLASSIFICATION:            │
│  🟢 < 55 dB:  Quiet        │
│  🟡 55-70 dB: Moderate ✓   │
│  🟠 70-85 dB: Loud         │
│  🔴 > 85 dB:  Very Loud    │
│                             │
│  RECOMMENDATION:            │
│  "Noise levels are moderate │
│   in this area. Sensitive  │
│   groups may experience    │
│   slight discomfort."       │
│                             │
│  Last Update: 14:30 UTC    │
│  🔗 More Details »          │
│                             │
└─────────────────────────────┘
```

**Componentes Técnicos:**
```jsx
<NoiseWidget>
  <MeterGauge 
    value={72.5}
    minValue={20}
    maxValue={140}
    unit="dB"
    thresholds={[55, 70, 85]}
    colors={['#27ae60', '#f39c12', '#e67e22', '#c0392b']}
  />
  <NoiseLevel 
    level="MODERATE"
    color="#f39c12"
  />
  <MetricRow 
    metric="LAeq"
    value={72.5}
    unit="dB"
    description="Equivalent Level"
  />
  {/* Más rows para LAmax, LA90, LC */}
</NoiseWidget>
```

### 3.3 Widget Estado General

```html
┌─────────────────────────────┐
│ 🌍 GENERAL STATUS           │
├─────────────────────────────┤
│                             │
│  AIR QUALITY                │
│  ✅ GOOD (ICA: 65)          │
│  │████████░░░░░░░░│ 65/500 │
│                             │
│  NOISE LEVEL                │
│  🟡 MODERATE (LAeq: 72.5)   │
│  │████████░░░░░░░░│ 72/140 │
│                             │
│  WEATHER CONDITIONS         │
│  🌡️  Temperature: 22.5°C    │
│  💨 Humidity: 65%           │
│  🌬️  Wind: 3.2 m/s (NE)     │
│  🔽 Pressure: 1013 mbar     │
│                             │
│  ALERTS & WARNINGS          │
│  ✅ No active alerts        │
│                             │
│  📍 LOCATION                │
│  Madrid, Spain              │
│  Plaza Mayor, Centro        │
│                             │
│  ⏰ Last Update             │
│  14:30:15 UTC (2 min ago)   │
│  🔄 Auto-refresh: ON        │
│                             │
│  🔗 View History »          │
│  🔗 Forecasts »             │
│  🔗 Settings »              │
│                             │
└─────────────────────────────┘
```

---

## 4. GRÁFICOS CHARTJS (Fila Inferior)

### 4.1 Línea: Evolución PM2.5 y PM10 (Últimas 24h)

```javascript
{
  type: 'line',
  data: {
    labels: ['00:00', '02:00', '04:00', ..., '23:00'],
    datasets: [
      {
        label: 'PM2.5 (µg/m³)',
        data: [25.2, 28.5, 31.2, 26.8, 23.5, ...],
        borderColor: '#3498db',  // Azul
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'PM10 (µg/m³)',
        data: [62.1, 65.4, 68.9, 64.2, 58.3, ...],
        borderColor: '#e74c3c',  // Rojo
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      }
    ]
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        min: 0,
        max: 250,
        ticks: { color: '#666' }
      }
    },
    plugins: {
      legend: { position: 'top' },
      title: { text: 'PM Levels - Last 24 Hours' }
    }
  }
}
```

### 4.2 Barras: Comparativa entre Sensores

```javascript
{
  type: 'bar',
  data: {
    labels: ['Madrid Center', 'Madrid North', 'Barcelona', 'Valencia'],
    datasets: [
      {
        label: 'PM2.5',
        data: [28.5, 22.3, 15.2, 18.6],
        backgroundColor: '#3498db'
      },
      {
        label: 'PM10',
        data: [65.4, 58.2, 42.1, 51.3],
        backgroundColor: '#e74c3c'
      },
      {
        label: 'NO2',
        data: [89.5, 72.4, 58.3, 65.1],
        backgroundColor: '#f39c12'
      }
    ]
  }
}
```

### 4.3 Radar: Perfil de Contaminantes

```javascript
{
  type: 'radar',
  data: {
    labels: ['CO2', 'PM2.5', 'PM10', 'NO2', 'O3', 'SO2'],
    datasets: [
      {
        label: 'Current',
        data: [420, 28.5, 65.4, 89.5, 62.8, 5.2],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.25)',
        fill: true
      },
      {
        label: 'WHO Threshold',
        data: [350, 35, 50, 40, 100, 8],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        fill: true,
        borderDash: [5, 5]
      }
    ]
  }
}
```

### 4.4 Área: Nivel de Ruido Horario

```javascript
{
  type: 'line',
  data: {
    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'LAeq (dB)',
        data: [62.1, 58.3, 55.2, 52.1, 54.8, 62.3, 70.5, 75.2, 73.8, 72.5, ...],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.3)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'WHO Threshold (70dB)',
        data: Array(24).fill(70),
        borderColor: '#f39c12',
        borderDash: [5, 5],
        fill: false
      }
    ]
  }
}
```

---

## 5. PANEL LATERAL EXPANDIBLE (Detalle del Sensor)

```html
┌─────────────────────────┐
│ ✕ SENSOR DETAILS        │
├─────────────────────────┤
│                         │
│ 📍 LOCATION             │
│ Plaza Mayor, 1          │
│ Madrid 28001, ES        │
│                         │
│ 📊 DEVICE INFO          │
│ Type: AirQualitySensor │
│ Manufacturer: Sensirion │
│ Model: SCD4X            │
│ Serial: ABCD123456      │
│                         │
│ 📈 CURRENT VALUES       │
│ CO2:        420.5 ppm   │
│ PM1:        12.3 µg/m³  │
│ PM2.5:      28.5 µg/m³  │
│ PM10:       65.4 µg/m³  │
│ NO2:        89.5 µg/m³  │
│ O3:         62.8 µg/m³  │
│ Temp:       22.5°C      │
│ Humidity:   65%         │
│                         │
│ 🕐 HISTORY              │
│ ┌───────────────────┐   │
│ │ Last 7 days data  │   │
│ │ Export: [CSV JSON]│   │
│ └───────────────────┘   │
│                         │
│ ✅ HEALTH CHECK         │
│ Last Update: 2 min ago  │
│ Signal Strength: ⬜⬜⬜⬛  │
│ Battery: 87%            │
│ Uptime: 45 days         │
│                         │
│ 🔔 ALERTS               │
│ Subscribe to alerts     │
│ [☐] Email notifications │
│ [☑] Push notifications  │
│                         │
│ [View Full Stats]       │
│                         │
└─────────────────────────┘
```

---

## 6. INTERACCIONES Y ANIMACIONES

### 6.1 Transiciones
- **Cambio de valor crítico**: Fade + color change (500ms)
- **Actualización de gráfico**: Smooth line animation (300ms)
- **Aparición de alerta**: Slide in + glow (200ms)

### 6.2 Estados de Carga
```
Inicial:     [skeleton screens] placeholder
Cargando:    [pulsing animation] "..."
Errores:     [alert box] "Failed to load data"
Vacío:       [empty state] "No sensors available"
```

### 6.3 Responsividad a Toques (Mobile)
- **Swipe left/right**: Cambiar entre tabs
- **Pinch**: Zoom en mapa
- **Long press**: Opciones contextuales
- **Double tap**: Zoom a región

---

## 7. PALETA DE COLORES

```css
:root {
  /* Status Colors */
  --color-good: #2ecc71;        /* Verde */
  --color-moderate: #f39c12;    /* Amarillo */
  --color-poor: #e67e22;        /* Naranja */
  --color-very-poor: #e74c3c;   /* Rojo */
  
  /* Neutral */
  --color-bg: #f8f9fa;
  --color-card-bg: #ffffff;
  --color-text: #333333;
  --color-text-muted: #777777;
  --color-border: #e0e0e0;
  
  /* Accent */
  --color-primary: #3498db;     /* Azul */
  --color-secondary: #9b59b6;   /* Púrpura */
  
  /* Chart Colors */
  --chart-pm25: #3498db;
  --chart-pm10: #e74c3c;
  --chart-no2: #f39c12;
  --chart-o3: #1abc9c;
}
```

---

## 8. COMPONENTES REUTILIZABLES

```jsx
// Componentes recomendados
<AirQualityWidget />
<NoiseWidget />
<StatusBadge status="GOOD" />
<ContaminantBar name="PM2.5" value={28.5} />
<MeterGauge value={72.5} />
<CircularGauge value={65} />
<SensorMarker type="air" ica={65} />
<AlertNotification message="..." />
<ChartContainer type="line|bar|radar" />
<SensorDetailPanel sensor={...} />
```

---

## 9. EXPERIENCIA DEL USUARIO (User Flow)

```
1. LANDING
   ├─ Detectar geolocalización del usuario
   ├─ Cargar sensores cercanos (radio 5km)
   └─ Mostrar ciudad más cercana

2. EXPLORACIÓN
   ├─ Click en marker → Panel detalle
   ├─ Hover sobre marker → Tooltip
   ├─ Zoom en región → Mostrar más sensores
   └─ Filtrar por tipo de contaminante

3. ANÁLISIS
   ├─ Seleccionar período histórico
   ├─ Comparar múltiples sensores
   ├─ Descargar datos
   └─ Ver predicción

4. ALERTAS
   ├─ Configurar notificaciones
   ├─ Seleccionar umbrales
   └─ Recibir alertas en email/SMS
```

---

## 10. ACCESSIBILIDAD (WCAG 2.1 AA)

- ✅ Contraste mínimo 4.5:1 (texto)
- ✅ Navegación por teclado (Tab, Enter, Arrow keys)
- ✅ Labels en formularios
- ✅ ARIA roles y descriptions
- ✅ Alt text en imágenes
- ✅ Soporte para screen readers
- ✅ Tamaño mínimo de elementos interactivos: 44x44px

