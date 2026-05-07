# ARQUITECTURA: Diagrama de Flujo de Datos
## Aplicación FIWARE de Monitorización Ambiental

---

## 1. VISTA DE ALTO NIVEL: Flujo de Datos End-to-End

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      CAPA DE SENSORES DISTRIBUIDOS                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Sensor Air 01]        [Sensor Air 02]      [Sensor Noise 01]             │
│   CO2, PM2.5             CO2, PM10            LAeq, LAmax                   │
│   @ Madrid               @ Barcelona          @ Madrid                      │
│                                                                              │
└────────────┬───────────────────────────────────────────────────┬────────────┘
             │                                                   │
             │  HTTP: POST /api/observation                   │
             │  Payload: {"CO2": 420.5, "timestamp": "..."}    │
             │                                                   │
┌────────────▼────────────────────────────────────────────────────────────────┐
│                    CAPA DE INGESTA (IoT Agent)                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  IoT Agent (HTTP)                                               │    │
│  │  ├─ Transforma HTTP a NGSI-LD                                   │    │
│  │  ├─ Valida contra Smart Data Models                             │    │
│  │  └─ → POST /ngsi-ld                                             │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Transformación de ejemplo:                                             │
│  INPUT:  {"sensor_id": "madrid-01", "CO2": 420.5}                      │
│  OUTPUT: {                                                              │
│    "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",                │
│    "type": "AirQualityObserved",                                        │
│    "CO2": {"type": "Property", "value": 420.5, "unitCode": "PPM"},     │
│    "dateObserved": "2026-04-27T14:30:00Z"                              │
│  }                                                                       │
│                                                                          │
└────────────┬──────────────────────────────────────────────┬─────────────┘
             │                                              │
             │ Batch PUT/PATCH /ngsi-ld/v1/entities        │
             │ (POST en Orion Context Broker)             │
             │                                              │
┌────────────▼──────────────────────────────────────────────▼──────────────┐
│              CAPA CONTEXTUAL (Orion-LD Context Broker)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Orion-LD v1.3+                                                 │  │
│  │  ├─ RESTful API NGSI-LD (JSON-LD)                               │  │
│  │  ├─ Entities:                                                   │  │
│  │  │  • urn:ngsi-ld:AirQualityObserved:ES-Madrid-01              │  │
│  │  │  • urn:ngsi-ld:AirQualityObserved:ES-Barcelona-02           │  │
│  │  │  • urn:ngsi-ld:NoiseLevelObserved:ES-Madrid-noise-01        │  │
│  │  ├─ Notificaciones por cambios                                 │  │
│  │  ├─ Query NGSIV2 (Compatibility)                               │  │
│  │  └─ Subscriptions (triggers)                                   │  │
│  │                                                                 │  │
│  │  Última observación (Last Value):                              │  │
│  │  {                                                              │  │
│  │    "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",       │  │
│  │    "type": "AirQualityObserved",                              │  │
│  │    "location": {...},                                          │  │
│  │    "PM2_5": {"value": 28.5, "observedAt": "2026-04-27T..."},  │  │
│  │    "PM10": {"value": 65.4, "observedAt": "2026-04-27T..."},   │  │
│  │    "NO2": {"value": 89.5, "observedAt": "2026-04-27T..."},    │  │
│  │    ...                                                          │  │
│  │  }                                                              │  │
│  │                                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Endpoints principales:                                                 │
│  ├─ POST   /ngsi-ld/v1/entities                (crear)                 │
│  ├─ PATCH  /ngsi-ld/v1/entities/{id}/attrs    (actualizar)             │
│  ├─ GET    /ngsi-ld/v1/entities/{id}          (obtener)                │
│  ├─ GET    /ngsi-ld/v1/entities               (listar)                 │
│  ├─ POST   /ngsi-ld/v1/subscriptions          (notificaciones)         │
│  └─ FIWARE-ServicePath: /environment/air,     /environment/noise       │
│                                                                          │
└────────────┬──────────────────────────────┬──────────────────────────────┘
             │                              │
             │ Notificación HTTP             │ Query HTTP (Pull)
             │ en tiempo real               │ Cada 1-5 minutos
             │                              │
    ┌────────▼────────────────────────────┐ │
    │  Orion-LD / QuantumLeap             │ │
    │  Notificación HTTP                  │ │
    └────────┬────────────────────────────┘ │
             │                              │
             │ Consume notificación HTTP    │ Query REST
             │                              │
┌────────────▼──────────────────────────────▼──────────────────────────────┐
│        CAPA DE PERSISTENCIA (QuantumLeap + CrateDB/InfluxDB)             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────┐                              │
│  │  QuantumLeap (NGSI v2 Time Series)  │                              │
│  │                                      │                              │
│  │  • Listening a Orion subscriptions  │                              │
│  │  • Convierte entidades NGSI a      │                              │
│  │    registros con timestamp          │                              │
│  │  • Persiste en base de datos        │                              │
│  │  • API REST para históricos         │                              │
│  │                                      │                              │
│  │  GET /v2/entities/{id}/attrs/{attr} │                              │
│  │    ?fromDate=2026-04-26T00:00:00Z   │                              │
│  │    &toDate=2026-04-27T23:59:59Z     │                              │
│  │    &limit=1000                      │                              │
│  └──────────────────────────────────────┘                              │
│                            │                                            │
│             ┌──────────────▼──────────────┐                            │
│             │   Base de Datos Series      │                            │
│             │   Temporales (Tablas)       │                            │
│             │                              │                            │
│             │  CrateDB / InfluxDB          │                            │
│             │  ├─ etAirQualityObserved    │                            │
│             │  │  (entity_id, timestamp,  │                            │
│             │  │   CO2, PM2_5, NO2, O3)   │                            │
│             │  ├─ etNoiseLevelObserved    │                            │
│             │  │  (entity_id, timestamp,  │                            │
│             │  │   LAeq, LAmax, LA90)     │                            │
│             │  └─ Índices en timestamp    │                            │
│             │                              │                            │
│             │  Retención: 3-5 años        │                            │
│             └──────────────────────────────┘                            │
│                                                                          │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             │ Query SQL: SELECT timestamp, CO2, PM2_5 
             │           FROM etAirQualityObserved
             │           WHERE timestamp > now() - interval 30 days
             │
┌────────────▼──────────────────────────────────────────────────────────┐
│           CAPA DE LÓGICA DE NEGOCIO (Backend API)                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  FastAPI (Python)                                            │    │
│  │                                                              │    │
│  │  MÓDULOS:                                                    │    │
│  │  ├─ API REST                                                │    │
│  │  │  GET /api/v1/air-quality              (estado actual)   │    │
│  │  │  GET /api/v1/air-quality/{sensor_id}/historical        │    │
│  │  │  GET /api/v1/noise-level              (estado actual)   │    │
│  │  │  GET /api/v1/noise-level/{sensor_id}/historical        │    │
│  │  │  GET /api/v1/sensors                  (listar todos)    │    │
│  │  │  GET /api/v1/ica/forecast             (predicción 72h)  │    │
│  │  │                                                          │    │
│  │  ├─ Caché (Redis)                                          │    │
│  │  │  ├─ Última observación por sensor    (TTL: 5 min)      │    │
│  │  │  ├─ ICA calculado                    (TTL: 5 min)      │    │
│  │  │  └─ Predicción ML                    (TTL: 1 hora)     │    │
│  │  │                                                          │    │
│  │  ├─ Cálculo ICA (Transformación)                           │    │
│  │  │  input:  PM2_5, PM10, NO2, O3                          │    │
│  │  │  formula: ICA = MAX(subindex_PM25, subindex_PM10, ...) │    │
│  │  │  output: ICA score (0-500) + nivel (GOOD/MODERATE/...) │    │
│  │  │                                                          │    │
│  │  ├─ Machine Learning                                       │    │
│  │  │  ├─ ARIMA/Prophet: Forecast 72h                        │    │
│  │  │  ├─ Isolation Forest: Detección anomalías              │    │
│  │  │  ├─ Correlation: Correlación con meteorología          │    │
│  │  │  └─ Model: /ml/models/ica_forecast_v2.pkl             │    │
│  │  │                                                          │    │
│  │  ├─ Agente LLM                                             │    │
│  │  │  POST /api/v1/ai/interpret                             │    │
│  │  │  {                                                       │    │
│  │  │    \"query\": \"¿Por qué está alto PM2.5 en Madrid?\",  │    │
│  │  │    \"sensor_id\": \"madrid-01\",                        │    │
│  │  │    \"context_hours\": 24                               │    │
│  │  │  }                                                       │    │
│  │  │  → Llama a OpenAI GPT-4 o LLaMA local                  │    │
│  │  │  → Contexto: datos sensor, histórico, predicción       │    │
│  │  │                                                          │    │
│  │  ├─ Alertas (Business Logic)                              │    │
│  │  │  ├─ Si ICA > 150 → Email + Push                        │    │
│  │  │  ├─ Si LAeq > 85 dB nocturno → Alerta                 │    │
│  │  │  └─ Si tendencia creciente 3 horas → Warning          │    │
│  │  │                                                          │    │
│  │  └─ Integración Grafana                                   │    │
│  │     POST /api/v1/grafana/datasource-proxy                 │    │
│  │                                                              │    │
│  │  Dependencias internas:                                     │    │
│  │  ├─ requests (HTTP calls a Orion, QuantumLeap)            │    │
│  │  ├─ redis (caché)                                         │    │
│  │  ├─ pandas, numpy (cálculos)                              │    │
│  │  ├─ scikit-learn (anomalías, predicción)                  │    │
│  │  ├─ prophet (ARIMA/Prophet)                               │    │
│  │  ├─ openai (LLM API)                                      │    │
│  │  └─ psycopg2 (PostgreSQL para usuarios/alertas)           │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
└────────────┬────────────────────────────────────────────────────────┘
             │
             │ HTTP REST API
             │ Respuestas JSON
             │
┌────────────▼────────────────────────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN (Frontend)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  React 18 + TypeScript                                      │ │
│  │                                                              │ │
│  │  COMPONENTES:                                               │ │
│  │  ├─ Dashboard Principal                                    │ │
│  │  │  ├─ Mapa Leaflet + OSM                                 │ │
│  │  │  │  ├─ Markers: sensores aire (azules)                │ │
│  │  │  │  ├─ Markers: sensores ruido (rojos)                │ │
│  │  │  │  ├─ Heatmap: concentración PM2.5                   │ │
│  │  │  │  └─ GeoJSON: límites administrativos               │ │
│  │  │  │                                                      │ │
│  │  │  ├─ Widget ICA (índice aire)                           │ │
│  │  │  │  ├─ Gauge circular (0-500)                         │ │
│  │  │  │  ├─ Color dinámico (Verde/Amarillo/Naranja/Rojo)  │ │
│  │  │  │  └─ Desglace: PM2.5, PM10, NO2, O3                 │ │
│  │  │  │                                                      │ │
│  │  │  ├─ Widget Ruido (LAeq)                               │ │
│  │  │  │  ├─ Medidor dB                                     │ │
│  │  │  │  ├─ Clasificación (QUIET/MODERATE/LOUD)            │ │
│  │  │  │  └─ Histórico últimas 6 horas                      │ │
│  │  │  │                                                      │ │
│  │  │  ├─ ChartJS (Gráficos)                                │ │
│  │  │  │  ├─ Línea: PM2.5/PM10 últimas 24h                  │ │
│  │  │  │  ├─ Barras: Comparativa sensores                   │ │
│  │  │  │  ├─ Radar: Perfil de gases                         │ │
│  │  │  │  └─ Área: Ruido horario                            │ │
│  │  │  │                                                      │ │
│  │  │  └─ Panel Histórico                                   │ │
│  │  │     ├─ Date Range Picker (últimos 7/30/90 días)       │ │
│  │  │     ├─ Exportar CSV/JSON                              │ │
│  │  │     └─ Comparativa temporal                           │ │
│  │  │                                                      │ │
│  │  ├─ Vista Detalle Sensor                                │ │
│  │  │  ├─ Metadatos (ubicación, tipo, fabricante)          │ │
│  │  │  ├─ Últimas 10 observaciones                         │ │
│  │  │  ├─ Estadísticas (min, max, media)                   │ │
│  │  │  └─ Estado de salud (uptime, última transmisión)     │ │
│  │  │                                                      │ │
│  │  ├─ Chat IA Experimental                                │ │
│  │  │  ├─ Input: \"¿Por qué está alto PM2.5?\"             │ │
│  │  │  ├─ Contexto: sensor actual, histórico, predicción   │ │
│  │  │  └─ Output: Respuesta LLM interpretada                │ │
│  │  │                                                      │ │
│  │  └─ Configuración                                       │ │
│  │     ├─ Preferencias de notificación                      │ │
│  │     ├─ Sensores favoritos                                │ │
│  │     └─ Filtros de visualización                          │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Estado (React Query):                                            │
│  ├─ useQuery: Cargar sensores (5 min)                           │
│  ├─ useQuery: Cargar última observación (1 min)                 │
│  ├─ useQuery: Cargar histórico (on demand)                      │
│  ├─ useQuery: Cargar predicción (1 hora)                        │
│  └─ Subscription WebSocket: Real-time updates (opcional)        │
│                                                                    │
│  Responsive Design:                                               │
│  ├─ Mobile (320px): Stack vertical, mapa pequeño               │
│  ├─ Tablet (768px): 2 columnas, mapa más grande                │
│  └─ Desktop (1200px+): 3 columnas, layout completo              │
│                                                                    │
│  Performance:                                                      │
│  ├─ Code Splitting: Dashboard, Detalle, Chat IA                 │
│  ├─ Lazy Loading: Mapas, gráficos                               │
│  ├─ Caching: React Query con staleTime = 5 min                  │
│  └─ CDN: Distribución de assets estáticos                        │
│                                                                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTP/WebSocket
             │ browser
             │
    ┌────────▼────────┐
    │   Navegador Web │
    │   (Desktop)     │
    │   (Mobile)      │
    └─────────────────┘
```

---

## 2. CICLO DE DATOS DETALLADO (5 minutos)

```
T+0s:     [SENSOR] Toma medición
          └─→ CO2=420.5, PM2.5=28.5, Temp=22.5°C
             Almacena localmente si no hay conexión

T+5s:     [IOT AGENT] Envía datos
          ├─ HTTP POST
          └─→ {"sensor_id": "madrid-01", "CO2": 420.5, ...}

T+15s:    [ORION-LD] Recibe y actualiza
          ├─ PUT /ngsi-ld/v1/entities/{id}/attrs
          ├─ Valida contra schema NGSI-LD
          └─→ Entidad actualizada, nueva versión generada

T+20s:    [QUANTUM LEAP] Captura cambio
          ├─ Triggered por notificación HTTP
          ├─ Convierte a registro temporal
          └─→ INSERT en CrateDB con timestamp

T+30s:    [BACKEND] Lee y calcula
          ├─ GET /ngsi-ld/v1/entities (caché Redis)
          ├─ Cálculo ICA: MAX(PM2.5, PM10, NO2, O3)
          ├─ Verifica umbrales de alerta
          └─→ Almacena en caché

T+45s:    [FRONTEND] Actualiza display
          ├─ Polling cada 60s o WebSocket
          ├─ GET /api/v1/air-quality
          ├─ Activa animación de cambio
          └─→ ICA widget: 65, estado: GOOD

T+300s:   Repetir ciclo
```

---

## 3. TABLA DE INTEGRACIONES Y DEPENDENCIAS

| Componente | Tipo | Protocolo | Formato | Frecuencia | Latencia Objetivo |
|-----------|------|-----------|---------|-----------|------------------|
| Sensor → IoT Agent | Push | HTTP | JSON | 5 min | < 5s |
| IoT Agent → Orion | Push | HTTP REST | NGSI-LD | 5 min | < 10s |
| Orion → QuantumLeap | Sub/Notify | HTTP | JSON | Evento | < 10s |
| QuantumLeap → CrateDB | Sync | SQL | Tabular | Evento | < 1s |
| Backend → Orion | Pull | HTTP REST | NGSI-LD | 60s (caché) | < 500ms |
| Backend → CrateDB | Pull | HTTP/SQL | JSON/SQL | On demand | < 1s |
| Frontend → Backend | Pull | HTTP REST | JSON | 60s | < 2s |
| User → Frontend | - | HTTP/WebSocket | HTML/JSON | Interactive | < 100ms |

---

## 4. PUNTOS DE MONITOREO Y OBSERVABILIDAD

```
┌─ MÉTRICAS A MONITOREAR:

├─ Ingesta:
│  ├─ Mensajes/s en IoT Agent
│  ├─ Latencia HTTP
│  ├─ Tasa de error (payload inválido)
│  └─ Fallos de conexión sensor

├─ Orion-LD:
│  ├─ Queries/s
│  ├─ Latencia GET/PATCH
│  ├─ Entidades activas
│  └─ Memória de broker

├─ QuantumLeap:
│  ├─ Registros/s inserttados
│  ├─ Latencia de inserción
│  ├─ Tamaño de DB
│  └─ Errores de persistencia

├─ Backend:
│  ├─ Latencia de API
│  ├─ Hit rate de caché (Redis)
│  ├─ Errores 5xx
│  └─ Consumo de CPU (ML)

└─ Frontend:
   ├─ Page Load Time
   ├─ Time to Interactive
   ├─ Core Web Vitals
   └─ Errores JavaScript
```

---

## 5. CONFIGURACIÓN DE ÍNDICES Y PARTICIONAMIENTO

### Orion-LD
```yaml
Índices en MongoDB:
├─ Entity ID (PK)
├─ Type (Compound)
├─ Location (Geospatial 2dsphere)
├─ dateObserved (Temporal)
└─ FIWARE-ServicePath
```

### CrateDB
```yaml
Particionamiento por tiempo:
├─ Tablas: etAirQualityObserved (por mes)
├─ Primary Key: (entity_id, timestamp)
├─ Índices:
│  ├─ (timestamp) - queries históricas
│  ├─ (entity_id) - por sensor
│  └─ (location) - geoespaciales
└─ Retención: Archiving después 1 año
```

---

## 6. FLUJO DE ALERTAS Y NOTIFICACIONES

```
┌─ Condición: ICA > 150 (VERY_POOR)

├─ Trigger: Backend calcula y detecta
│  └─→ Consulta BlackList de usuarios suscritos

├─ Acción:
│  ├─ Email via SendGrid (inmediato)
│  ├─ Push Notification via Firebase (inmediato)
│  ├─ SMS via Twilio (opcional, 1 min)
│  └─ Log en DB para reporte

└─ User Experience:
   ├─ En Dashboard: Badge rojo con contador
   ├─ En Mobile: Notificación push
   └─ Histórico: Alert Center (últimas 24h)
```

---

## 7. RESUMEN: Flujo de datos críticos

1. **Ingesta rápida**: Sensor → IoT Agent → Orion (< 15 segundos)
2. **Persistencia inmediata**: Orion → QuantumLeap → CrateDB (< 10 segundos)
3. **Cálculos**: Backend consulta cada 60s, cachea 5 minutos
4. **Visualización**: Frontend actualiza cada 60s o en tiempo real (WebSocket)
5. **Alertas**: Detección y envío en < 30 segundos
6. **Históricos**: QuantumLeap + CrateDB permiten queries de años

