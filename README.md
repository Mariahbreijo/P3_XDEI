# README.md
## Aplicación FIWARE para Monitorización de Calidad del Aire y Ruido Urbano

### 🌍 Descripción General

**Smart Air & Noise Monitor** es una plataforma IoT avanzada que integra datos en tiempo real de sensores distribuidos en ciudades españolas para monitorizar y visualizar la calidad del aire y la contaminación acústica urbana.

**Stack Tecnológico:**
- **Backend FIWARE**: Orion-LD, QuantumLeap, IoT Agents
- **Base de Datos**: CrateDB (series temporales), PostgreSQL (estáticos)
- **Backend API**: FastAPI (Python 3.11+)
- **Frontend**: React 18 + TypeScript
- **Visualización**: Leaflet + ChartJS + ThreeJS (experimental)
- **Data Science**: Pandas, GeoPandas, Scikit-learn, TensorFlow
- **IA**: OpenAI API o LLaMA local

---

## 📁 Estructura del Proyecto

```
P3_MariaJose_Hernandez_Saray_Gonzalez/
├── docs/                           # Documentación
│   ├── data_model.md              # Modelos NGSI-LD (AirQualityObserved, NoiseLevelObserved)
│   ├── PRD.md                     # Product Requirements Document
│   ├── smart_data_models_analysis.md  # Análisis atributos estáticos/dinámicos
│   ├── architecture_dataflow.md   # Diagrama de flujo de datos
│   ├── interface_proposal.md      # Propuesta de interfaz del Dashboard
│   └── README.md                  # Este archivo
│
├── frontend/                       # Aplicación React
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Map/
│   │   │   ├── Widgets/
│   │   │   │   ├── AirQualityWidget.tsx
│   │   │   │   ├── NoiseWidget.tsx
│   │   │   │   └── StatusWidget.tsx
│   │   │   ├── Charts/
│   │   │   │   ├── PMLineChart.tsx
│   │   │   │   ├── ComparisonBarChart.tsx
│   │   │   │   ├── RadarChart.tsx
│   │   │   │   └── NoiseAreaChart.tsx
│   │   │   ├── SensorDetail/
│   │   │   └── AIChat/
│   │   ├── services/
│   │   │   ├── api.ts            # Llamadas a Backend API
│   │   │   ├── orionService.ts   # (opcional) Llamadas directas a Orion
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── useAirQuality.ts
│   │   │   ├── useNoiseLevels.ts
│   │   │   └── useSensors.ts
│   │   ├── types/
│   │   │   ├── entities.ts       # Tipos para AirQualityObserved, etc.
│   │   │   └── api.ts
│   │   ├── styles/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                        # API FastAPI + Lógica
│   ├── app/
│   │   ├── main.py               # Punto de entrada
│   │   ├── config.py             # Configuración (env vars)
│   │   ├── core/
│   │   │   ├── ngsi_ld.py       # Utilitarios NGSI-LD
│   │   │   └── constants.py      # Constantes (umbrales, etc)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── air_quality.py
│   │   │   │   │   ├── noise_level.py
│   │   │   │   │   ├── sensors.py
│   │   │   │   │   ├── forecast.py
│   │   │   │   │   └── ai.py
│   │   │   │   └── dependencies.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── orion_service.py     # Integración Orion-LD
│   │   │   ├── quantumleap_service.py # Históricos
│   │   │   ├── ica_calculator.py    # Cálculo de ICA
│   │   │   ├── ml_predictor.py      # Predicción ML
│   │   │   ├── llm_agent.py         # Agente LLM
│   │   │   ├── alert_service.py     # Gestión de alertas
│   │   │   └── redis_cache.py       # Caché
│   │   ├── models/
│   │   │   ├── schemas.py          # Pydantic schemas
│   │   │   └── database.py         # Modelos SQLAlchemy
│   │   ├── ml/
│   │   │   ├── models/
│   │   │   │   └── ica_forecast_v2.pkl
│   │   │   ├── predictor.py
│   │   │   └── anomaly_detector.py
│   │   └── middleware/
│   │       └── auth.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── fiware/                        # Configuración FIWARE
│   ├── docker-compose.yml        # Stack FIWARE completo
│   ├── orion-ld-config.json      # Configuración Orion-LD
│   ├── quantumleap-config.yaml   # Configuración QuantumLeap
│   ├── iot-agent-config.json     # Configuración IoT Agent
│   └── cratedb-config.yaml       # CrateDB config
│
├── data/                         # Datos y datasets
│   ├── openaq-madrid-2024.csv    # Dataset OpenAQ (aire)
│   ├── barcelona-noise-2024.csv  # Dataset ruido Barcelona
│   ├── seeds/
│   │   ├── sensor_locations.json # Ubicaciones iniciales
│   │   └── sample_observations.json
│   └── exports/                  # Datos exportados
│
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisitos
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Git

### 1. Clonar y Setup

```bash
cd P3_MariaJose_Hernandez_Saray_Gonzalez

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configurar variables de entorno

# Frontend
cd ../frontend
npm install
```

### 2. Iniciar Stack FIWARE

```bash
cd fiware
docker-compose up -d

# Verificar servicios
docker-compose ps

# Logs
docker-compose logs -f orion
```

### 3. Iniciar Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# API en http://localhost:8000/docs (Swagger)
```

### 4. Iniciar Frontend

```bash
cd frontend
npm start
# Navegador: http://localhost:3000
```

### 5. Verificar Integración

```bash
# Test Orion-LD
curl -X GET http://localhost:1026/ngsi-ld/v1/entities \
  -H 'Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

# Test Backend API
curl -X GET http://localhost:8000/api/v1/sensors

# Test QuantumLeap
curl -X GET http://localhost:8668/v2/entities
```

---

## 📚 Documentación Principal

| Documento | Propósito |
|-----------|----------|
| [data_model.md](docs/data_model.md) | Especificación completa de entidades NGSI-LD (AirQualityObserved, NoiseLevelObserved) con atributos, umbrales y ejemplos JSON |
| [PRD.md](docs/PRD.md) | Requisitos del producto, casos de uso, KPIs, timeline y criterios de aceptación |
| [smart_data_models_analysis.md](docs/smart_data_models_analysis.md) | Análisis detallado de qué atributos son estáticos vs dinámicos, frecuencias de actualización |
| [architecture_dataflow.md](docs/architecture_dataflow.md) | Diagrama de flujo de datos end-to-end, desde sensor hasta dashboard, con latencias |
| [interface_proposal.md](docs/interface_proposal.md) | Mockups del Dashboard, componentes React, layout responsivo, paleta de colores |

---

## 🔄 Flujo de Datos (Resumen)

```
Sensor IoT 
  ↓ (MQTT/HTTP)
IoT Agent 
  ↓ (NGSI-LD)
Orion-LD Context Broker
  ↓↓ (Subscripción)
QuantumLeap → CrateDB (Series Temporales)
  ↓ (Query)
Backend API (FastAPI)
  ├─ Caché (Redis)
  ├─ Cálculos (ICA)
  ├─ ML (Predicción)
  └─ LLM (IA)
  ↓ (REST JSON)
Frontend (React)
  ├─ Dashboard
  ├─ Mapas (Leaflet)
  ├─ Gráficos (ChartJS)
  └─ Notificaciones
```

---

## 🎯 Métricas Clave (KPIs)

| Métrica | Objetivo | Comentario |
|---------|----------|-----------|
| Latencia Sensor → Dashboard | < 30 segundos | End-to-end |
| Disponibilidad Sistema | 99.5% | Uptime mensual |
| Precisión de Sensores | ±2% | Error permitido |
| ICA Actualización | Cada 5 min | Desde última observación |
| Usuarios Activos Mensuales | 1000+ | Q2 2026 |
| Datos Descargados/mes | 500+ archivos | Exportaciones |

---

## 📊 Índice de Calidad del Aire (ICA)

### Fórmula
```
ICA = MAX(
  subindex(PM2.5),
  subindex(PM10),
  subindex(NO2),
  subindex(O3)
)
```

### Clasificación
- **GOOD (0-50)**: Verde - Apto para actividades al aire libre
- **MODERATE (51-100)**: Amarillo - Grupos sensibles precalentar
- **POOR (101-150)**: Naranja - Reducir actividades al aire libre
- **VERY_POOR (>150)**: Rojo - Riesgo para la salud general

*Basado en EPA AQI adaptado a WHO 2021 guidelines*

---

## 📢 Nivel de Ruido

### Métrica Principal: LAeq (dB)
Nivel equivalente de presión sonora ponderado A

### Clasificación (EU Directive 2002/49/CE)
- **QUIET**: < 55 dB
- **MODERATE**: 55-70 dB
- **LOUD**: 70-85 dB
- **VERY LOUD**: > 85 dB

### Métricas Adicionales
- **LAmax**: Pico máximo
- **LA90**: Percentil 90 (ruido de fondo)
- **LC**: Riesgo de daño auditivo (baja frecuencia)

---

## 🔐 Seguridad y Privacidad

### GDPR Compliance
- Datos de ubicación exacta anonimizados (precisión 1km)
- Retención máxima: 5 años (después archivado)
- Usuario puede solicitar eliminación

### Autenticación
- OAuth2 + JWT (Fase 2)
- API Key para sensores (Fase 1)

### Roles
- **Admin**: Gestión de sensores, alertas globales
- **Analyst**: Acceso a históricos y exportaciones
- **Citizen**: Consulta pública (sin autenticación)

---

## 📦 Dependencias Principales

### Backend (FastAPI)
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
requests==2.31.0
redis==5.0.0
pandas==2.1.3
scikit-learn==1.3.2
prophet==1.1.5
tensorflow==2.14.0
openai==1.3.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
```

### Frontend (React)
```
react==18.2.0
react-dom==18.2.0
typescript==5.3.3
leaflet==1.9.4
chart.js==4.4.0
react-query==3.39.3
axios==1.6.2
tailwindcss==3.3.6
```

---

## 🧪 Testing

### Backend
```bash
cd backend
pytest tests/unit -v
pytest tests/integration -v
pytest tests/e2e -v
```

### Frontend
```bash
cd frontend
npm test
npm run coverage
```

---

## 📈 Roadmap

### FASE 1 (MVP - EN CURSO)
- ✅ Modelos NGSI-LD
- ✅ Dashboard básico
- ✅ Integración Orion-LD + QuantumLeap
- ✅ Cálculo ICA simple
- Semana 1-4

### FASE 2 (4 semanas)
- Históricos (últimos 30 días)
- Alertas por email/push
- Predicción ML básica
- Autenticación

### FASE 3 (4 semanas)
- Agente LLM
- Dashboard Grafana
- Análisis geoespacial
- Exportación de reportes

### FASE 4 (4 semanas)
- Visualización 3D (ThreeJS)
- ML avanzado (LSTM)
- API pública
- App móvil

---

## 🤝 Contribución

1. Fork el repositorio
2. Crea rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a rama (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📞 Soporte y Contacto

- **Issues**: GitHub Issues
- **Email**: [tu-email@fiware.org]
- **Docs**: Ver carpeta `/docs`

---

## 📄 Licencia

Este proyecto está bajo licencia **AGPL-3.0** (heredada de FIWARE)

---

## 🙏 Agradecimientos

- FIWARE Foundation
- Smart Data Models Initiative
- OpenAQ (datos públicos)
- Comunidad IoT española

---

## 📋 Requisitos Cumplidos

- ✅ Modelos NGSI-LD (AirQualityObserved, NoiseLevelObserved)
- ✅ Orion-LD Context Broker
- ✅ IoT Agent (HTTP)
- ✅ QuantumLeap + CrateDB
- ✅ Backend FastAPI
- ✅ Frontend React con Leaflet y ChartJS
- ✅ Cálculo de ICA en tiempo real
- ✅ Visualización de ruido
- ✅ Indicador de estado general
- ✅ (Próx) ML + LLM Agent
- ✅ (Próx) Grafana Dashboards
- ✅ (Próx) ThreeJS 3D

---

**Última actualización**: 27-04-2026 | Versión: 1.0.0-alpha

