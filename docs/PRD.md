# PRD: Product Requirements Document
## Aplicación FIWARE de Monitorización de Calidad del Aire y Ruido Urbano

### Versión: 1.1 | Fecha: 11-05-2026

---

## 1. RESUMEN EJECUTIVO

### Visión
Desarrollar una **plataforma IoT inteligente y escalable** que integre datos en tiempo real de sensores distribuidos en ciudades españolas para monitorizar y visualizar la calidad del aire y la contaminación acústica urbana, permitiendo a usuarios (administraciones, ciudadanos, investigadores) tomar decisiones informadas basadas en datos.

### Objetivo Principal
Crear un **Dashboard geoespacial avanzado** que:
- Visualice métricas ambientales en tiempo real mediante mapas interactivos (Leaflet/OSM)
- Calcule automáticamente índices de calidad del aire (ICA) y niveles de ruido
- Proporcione análisis históricos y predicciones de contaminación
- Integre un asistente IA que interprete métricas en lenguaje natural

Adicionalmente, la entrega incluye una **vista avanzada independiente** (Mapa Geoespacial Avanzado) con:
- Mapa Leaflet a pantalla completa usando OpenStreetMap tiles
- Clustering de sensores con `Leaflet.markercluster` (soporta chunkedLoading, spiderfy, zoomToBounds)
- Capas temáticas separadas para `aire` y `ruido`, con controles para alternar capas
- Filtros por ciudad, barrio/zona, tipo de sensor y thresholds (PM10, PM2_5, LAeq)
- Popups enriquecidos que muestran atributos NGSI-LD en tiempo real y enlaces a historial
- Consumo directo de Orion-LD (`http://localhost:1026/ngsi-ld/v1/entities?local=true`) usando cabeceras FIWARE (`Fiware-Service: air_noise`, `Fiware-ServicePath: /`)

Además de las vistas anteriores, la aplicación incorpora una nueva **vista independiente — "Detalle de sensor"** accesible desde el Mapa Avanzado. Resumen funcional:

- Objetivo: mostrar información focalizada de un sensor seleccionado (nombre, ciudad, tipo) y dar acceso rápido al histórico en pantallas futuras.
- Acceso: al hacer click en un marcador desde la vista Mapa Avanzado se invoca una función local `openSensorDetail(sensor)` que actualiza el estado `selectedSensor` y navega a la vista `detail`.
- Render: el módulo frontend `sensor_detail.js` expone `window.renderSensorDetail()` para poblar la vista con los datos del `selectedSensor`.

Este cambio mantiene el enfoque modular del frontend (vistas separadas) y evita introducir dependencias en el backend: la recuperación adicional de históricos seguirá siendo opcional vía `QuantumLeap` o llamadas a `GET /api/v1/air-quality/{sensor_id}` si se requiere.

La vista `Detalle de sensor` se ha ampliado con capacidades analíticas y de salud pública:

- KPIs dinámicos por tipo de sensor (`AirQualityObserved` y `NoiseLevelObserved`) con fallback `N/D`.
- Simulación de histórico semanal local (`Lunes` a `Domingo`) para continuidad visual cuando no hay histórico remoto.
- Gráfica semanal con `Chart.js` (multiserie, hover interactivo, animaciones y diseño responsive).
- Tarjeta de `Día más perjudicial` con nivel de riesgo destacado.
- Sistema de alertas OMS visual (`safe`, `warning`, `danger`) para `PM2.5`, `PM10`, `NO2`, `O3` y `LAeq`.
- Recomendaciones de salud dinámicas y personalizadas por contexto:
        - Calidad del aire: mascarilla, ventilación, purificador, ejercicio exterior condicionado.
        - Ruido: reducción de exposición, protección auditiva, control de ventanas y descanso acústico.

### Casos de Uso Primarios
1. **Ciudadano**: Consultar calidad del aire y ruido en su zona (app web responsiva)
2. **Administración**: Monitorizar contaminación en tiempo real y tomar medidas preventivas
3. **Investigador**: Acceder a datos históricos para análisis epidemiológico y ambiental
4. **Sensor IoT**: Enviar observaciones a través de IoT Agent (HTTP)

---

## 2. DESCRIPCIÓN DE LA SOLUCIÓN

## NOTAS DE IMPLEMENTACIÓN RECIENTES

- El frontend es una aplicación estática basada en módulos ES (vanilla JS), HTML y CSS — no React/TypeScript en la implementación actual.
- Se actualizó el título de la página a "Centro de Monitorización Ambiental" y se añadió un subtítulo descriptivo para claridad.
- La tipografía del título usa ahora la familia `Rubik` y un estilo con gradiente para mejorar presencia visual.
- El `topnav` se hizo más prominente; el botón directo "Detalle sensor" fue retirado del topbar (la vista `detail` permanece accesible desde el mapa).
- El conmutador de tema muestra emoji (☀️/🌙) y se corrigieron contrastes en modo oscuro.
- El mapa avanzado centra por defecto en España (`setView([43.0, -3.7], 5)`) y las tooltips/popups muestran la zona extraída del `id` de la entidad (p. ej. `Madrid-Centro-01`).
- Se redujo la escala base del UI (`html { font-size: 15px; }`) para mejor ajuste visual en zoom 100%.


### 2.1 Componentes Principales

#### Stack FIWARE
```
Sensor IoT → IoT Agent (HTTP) → Orion-LD Context Broker → QuantumLeap → CrateDB/InfluxDB
                                            ↓
                                    Backend API (FastAPI)
                                            ↓
                                    Frontend (React + Leaflet + ChartJS)
```

#### Tecnologías por Capa

| Capa | Componente | Tecnología | Propósito |
|------|-----------|-----------|----------|
| **Ingesta** | IoT Agent | HTTP Protocol | Recibir datos de sensores |
| **Broker** | Orion-LD | NGSI-LD | Gestionar entidades contextuales |
| **Persistencia** | QuantumLeap | CrateDB/InfluxDB | Series temporales históricas |
| **Backend** | API REST | FastAPI + Python | Procesamiento y lógica de negocio |
| **ML/Analytics** | Data Science | Pandas, GeoPandas, Scikit-learn, TensorFlow | Predicción y análisis |
| **IA** | Agent LLM | OpenAI/LLaMA | Interpretación de métricas |
| **Frontend** | Dashboard | Vanilla JS (ES modules), HTML/CSS | Interfaz web responsiva (implementación actual)
| **Visualización** | Mapas | Leaflet + OpenStreetMap | Geolocalización de sensores |
| **Gráficos** | Analytics | ChartJS | Series temporales y análisis |
| **3D** | Experimental | ThreeJS | Visualización inmersiva (futuro) |
| **Dashboards** | Grafana | Grafana | Dashboards operacionales |

---

## 3. FUNCIONALIDADES CLAVE

### 3.0 Vista de Detalle de Sensor

Requisitos funcionales de la vista `detail`:

- Mostrar identidad del sensor (nombre, ciudad, tipo).
- Renderizar KPIs específicos:
        - Aire: `PM2.5`, `PM10`, `NO2`, `O3`, `ICA`.
        - Ruido: `LAeq`, `LAmax`, `LA90`, estado acústico.
- Mostrar resumen semanal (`promedio`, `máximo`, `mínimo`, `tendencia`) y tabla de evolución.
- Dibujar gráfica semanal según el tipo de sensor seleccionado en el mapa (sin selector manual adicional).
- Evaluar cumplimiento OMS por métrica y exponer estado visual en tarjeta KPI y banner general.
- Generar recomendaciones de salud coherentes con el tipo de contaminación activa.

### 3.1 Panel Inicial (Dashboard Principal)

#### 3.1.1 Widget de Índice de Calidad del Aire (ICA)
```
┌─────────────────────────────────┐
│  CALIDAD DEL AIRE GENERAL       │
├─────────────────────────────────┤
│  ICA: 65 / 500                  │
│  Estado: ✅ BUENO               │
│                                 │
│  PM2.5: 28.5 µg/m³              │
│  PM10:  65.4 µg/m³              │
│  NO2:   89.5 µg/m³              │
│  O3:    62.8 µg/m³              │
└─────────────────────────────────┘
```

**Cálculo de ICA (EPA/AQI Índice estadounidense adaptado a UE):**
```
ICA = MAX(
  subindex(PM2.5),
  subindex(PM10),
  subindex(NO2),
  subindex(O3)
)

Umbrales de Estado (WHO 2021):
- GOOD:       0-50   (Verde)    → Apto para actividades al aire libre
- MODERATE:  51-100  (Amarillo) → Grupos sensibles deben precaver
- POOR:      101-150 (Naranja)  → Recomendación de reducir actividad
- VERY_POOR: >150    (Rojo)     → Riesgo para la salud general
```


---

## 11. RIESGOS IDENTIFICADOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Sensors IoT sin conectividad | ALTA | ALTO | Fallback local + retry |
| Orion-LD lentitud con >10k entidades | MEDIA | ALTO | Indexación, particionamiento |
| Precisión de ML baja con pocos datos | MEDIA | MEDIO | Transfer learning, datasynthesis |
| Latencia de QuantumLeap > 5min | BAJA | MEDIO | Caché Redis, batching |

---

## 12. TIMELINE PROPUESTO

```
Semana 1-2:  Infraestructura FIWARE, Docker Compose setup
Semana 3-4:  Backend API + Cálculos, Dashboard MVP
Semana 5-6:  Mapas Leaflet, Gráficos ChartJS
Semana 7-8:  Testing, Documentación, Preparación producción
```

---

## 13. REFERENCIAS Y RECURSOS

- FIWARE Catalogue: https://catalogue.fiware.org/
- Orion-LD Docs: https://github.com/FIWARE/context.Orion-LD
- QuantumLeap: https://github.com/smartsenseslab/ngsi-timeseries-api
- Smart Data Models: https://smartdatamodels.org/environment/AirQualityObserved
- OpenAQ Dataset: https://openaq.org/
- Leaflet.js: https://leafletjs.com/
- Chart.js: https://www.chartjs.org/

