# DOCUMENTACIÓN INDEX
## Índice Completo - Smart Air & Noise Monitor

---

## 📖 Estructura de Documentación

### 🎯 INICIO RÁPIDO
- **[README.md](../README.md)** - Descripción general, estructura, quick start
- **[QUICKSTART.md](../QUICKSTART.md)** - Inicio en 15 minutos, troubleshooting
- **[Este archivo]** - Índice y navegación

---

## 🏗️ ARQUITECTURA Y DISEÑO

### 1️⃣ **data_model.md** ⭐ COMIENZA AQUÍ
**Modelo de Datos NGSI-LD completo**

Contenido:
- Especificación de entidades AirQualityObserved y NoiseLevelObserved
- Atributos estáticos (ubicación, dispositivo) y dinámicos (mediciones)
- Ejemplos JSON listos para usar
- Umbrales WHO 2021 y EU Directive 2002/49/CE
- Estrategia de persistencia histórica

**Uso**: Referencia técnica para desarrolladores FIWARE

---

### 2️⃣ **smart_data_models_analysis.md** ⭐ LÉELO SEGUNDO
**Análisis de Atributos Estáticos vs Dinámicos**

Contenido:
- Desglose detallado de cada atributo
- Frecuencia de actualización (cada 1-5 min, etc)
- Precisión y unidades de medida
- Fórmulas de cálculo (ICA, clasificación de ruido)
- Implicaciones para arquitectura (almacenamiento, caché)

**Uso**: Entender qué cambia constantemente vs qué es fijo

---

### 3️⃣ **architecture_dataflow.md** ⭐ VISUALIZA AQUÍ
**Flujo Completo de Datos End-to-End**

Contenido:
- Diagrama ASCII del flujo: Sensor → Orion → QuantumLeap → Backend → Frontend
- Timeline de 5 minutos mostrando latencias
- Tabla de integraciones y dependencias
- Puntos de monitoreo y observabilidad
- Estrategia de índices y particionamiento

**Uso**: Entender cómo fluyen los datos a través del sistema

---

### 4️⃣ **interface_proposal.md** ⭐ DISEÑO DEL DASHBOARD
**Propuesta Completa de Interfaz UI/UX**

Contenido:
- Layout responsivo (Mobile, Tablet, Desktop)
- Componentes detallados: Mapa Leaflet, Widgets, Gráficos ChartJS
- Ejemplo de markup HTML/CSS
- Componentes React recomendados
- Paleta de colores (verde/amarillo/naranja/rojo)
- User flows y experiencia

**Uso**: Referencia para diseño e implementación frontend

---

### 5️⃣ **PRD.md** - Product Requirements Document
**Requisitos de Producto**

Contenido:
- Visión y objetivos del proyecto
- Casos de uso principales
- Funcionalidades clave por módulo
- KPIs y métricas
- Timeline de fases (MVP, fase 2, 3, 4)
- Criterios de aceptación
- Riesgos identificados

**Uso**: Referencia para stakeholders, PM, testing

---

## 🛠️ IMPLEMENTACIÓN (Próximas Fases)

### Backend (FastAPI)
- **Estructura de carpetas**: `/backend`
- **Endpoints principales**: 
  - `/api/v1/air-quality`
  - `/api/v1/noise-level`
  - `/api/v1/forecast`
  - `/api/v1/ai/interpret`

### Frontend (React)
- **Estructura de componentes**: `/frontend/src/components`
- **Servicios API**: `/frontend/src/services`
- **Hooks personalizados**: `/frontend/src/hooks`

### FIWARE Stack
- **Docker Compose**: `/fiware/docker-compose.yml`
- **Configuración**: `/fiware/orion-config.json`, etc

---

## 📊 GLOSARIO DE TÉRMINOS

| Término | Definición | Referencia |
|---------|-----------|-----------|
| **NGSI-LD** | Estándar abierto para Context Information Management en JSON-LD | data_model.md |
| **Orion-LD** | Context Broker que almacena entidades NGSI-LD | architecture_dataflow.md |
| **QuantumLeap** | Servicio que persiste datos temporales en bases de datos | architecture_dataflow.md |
| **CrateDB** | Base de datos de series temporales optimizada para FIWARE | architecture_dataflow.md |
| **IoT Agent** | Adaptador que convierte protocolos IoT (MQTT, HTTP) a NGSI-LD | architecture_dataflow.md |
| **ICA** | Índice de Calidad del Aire (0-500) basado en EPA/AQI | data_model.md |
| **LAeq** | Nivel equivalente de presión sonora ponderado A (dB) | data_model.md |
| **GeoProperty** | Tipo de dato NGSI-LD para geolocalización (GeoJSON) | data_model.md |
| **Atributo Estático** | Dato que no cambia (ubicación, dispositivo) | smart_data_models_analysis.md |
| **Atributo Dinámico** | Dato que cambia con cada observación (mediciones) | smart_data_models_analysis.md |

---

## 🔗 CONEXIONES ENTRE DOCUMENTOS

```
data_model.md (INICIO)
    ↓ Define atributos
smart_data_models_analysis.md (Análisis)
    ↓ ¿Qué cambia constantemente?
architecture_dataflow.md (Flujo)
    ↓ ¿Cómo se transmiten?
backend/ + frontend/ (Implementación)
    ↓
interface_proposal.md (UI/UX)
    ↓
PRD.md (Validación)
```

---

## 🎓 LECTURAS RECOMENDADAS POR ROL

### Para Arquitecto FIWARE
1. data_model.md (NGSI-LD)
2. architecture_dataflow.md (Flujo)
3. PRD.md (Requisitos)
4. Consultar: FIWARE docs oficiales

### Para Desarrollador Backend
1. data_model.md (Entidades)
2. smart_data_models_analysis.md (Atributos)
3. architecture_dataflow.md (Integraciones)
4. backend/app (Código)

### Para Desarrollador Frontend
1. interface_proposal.md (UI/UX)
2. data_model.md (Estructura datos)
3. smart_data_models_analysis.md (Qué actualizar)
4. frontend/src (Código React)

### Para Data Scientist
1. smart_data_models_analysis.md (Características)
2. architecture_dataflow.md (Dónde leer datos)
3. backend/ml (Modelos)
4. data/exports (Datasets)

### Para Product Manager
1. PRD.md (Requisitos)
2. interface_proposal.md (Funcionalidades)
3. README.md (Contexto)
4. QUICKSTART.md (Demo)

---

## ✅ CHECKLIST DE LECTURA

Marca tu progreso:

- [ ] **Principiante**: README.md → QUICKSTART.md
- [ ] **Técnico**: data_model.md → architecture_dataflow.md
- [ ] **Diseñador**: interface_proposal.md → PRD.md
- [ ] **DevOps**: Consultar `/fiware/docker-compose.yml`
- [ ] **Full-Stack**: Todos los anteriores + código

---

## 🔍 BÚSQUEDA RÁPIDA

### Necesito entender...

**"¿Cómo fluyen los datos desde el sensor al dashboard?"**
→ Ver: `architecture_dataflow.md` Sección 1 (Flujo Alto Nivel)

**"¿Qué es un atributo dinámico?"**
→ Ver: `smart_data_models_analysis.md` Sección 1.2 (AirQualityObserved Dinámicos)

**"¿Cómo se calcula el ICA?"**
→ Ver: `data_model.md` Sección 2.2.4 + `PRD.md` Sección 3.1.1

**"¿Dónde está el código del Dashboard?"**
→ Ver: `README.md` Sección "Estructura del Proyecto" + `interface_proposal.md` Sección 8

**"¿Cuánta latencia debería haber?"**
→ Ver: `architecture_dataflow.md` Tabla de Integraciones (Sección 3)

**"¿Cómo conecto un nuevo sensor?"**
→ Ver: `QUICKSTART.md` Sección "Cargar Datos de Prueba"

**"¿Qué significa 'NGSI-LD'?"**
→ Ver: `data_model.md` Sección 1 (Descripción General)

**"¿Cuándo cambian los atributos?"**
→ Ver: `smart_data_models_analysis.md` Tabla Comparativa

**"¿Cuáles son los criterios de aceptación?"**
→ Ver: `PRD.md` Sección 9 (Criterios de Aceptación)

**"¿Qué colores usar en el UI?"**
→ Ver: `interface_proposal.md` Sección 7 (Paleta de Colores)

---

## 📞 RECURSOS EXTERNOS

### FIWARE Official
- Catalogue: https://catalogue.fiware.org/
- Orion-LD Docs: https://github.com/FIWARE/context.Orion-LD
- QuantumLeap: https://github.com/smartsenseslab/ngsi-timeseries-api

### Smart Data Models
- Domain Environment: https://smartdatamodels.org/environment/
- AirQualityObserved: https://smartdatamodels.org/environment/AirQualityObserved
- NoiseLevelObserved: https://smartdatamodels.org/environment/NoiseLevelObserved

### Datos Públicos
- OpenAQ: https://openaq.org/ (Calidad del aire)
- Barcelona Noise Data: https://dades.bcn.cat/ (Ruido urbano)

### Estándares
- WHO Air Quality Guidelines 2021: https://www.who.int/publications/i/item/9789240034228
- EU Noise Directive 2002/49/CE: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=celex%3A32002L0049

### Librerías
- Leaflet.js: https://leafletjs.com/
- Chart.js: https://www.chartjs.org/
- FastAPI: https://fastapi.tiangolo.com/

---

## 🗂️ ARCHIVOS Y UBICACIONES

```
docs/
├── data_model.md                    ← NGSI-LD entities
├── smart_data_models_analysis.md    ← Static vs Dynamic
├── architecture_dataflow.md         ← Data flow diagram
├── interface_proposal.md            ← UI/UX design
├── PRD.md                           ← Requirements
└── INDEX.md                         ← Este archivo

backend/
├── app/services/orion_service.py    ← Integración Orion
├── app/services/ica_calculator.py   ← Cálculo ICA
├── app/services/ml_predictor.py     ← Predicción ML
└── app/api/v1/endpoints/            ← Endpoints REST

frontend/
├── src/components/Dashboard.tsx     ← Componente principal
├── src/components/Map/              ← Leaflet integration
├── src/components/Widgets/          ← ICA, Noise widgets
├── src/components/Charts/           ← ChartJS charts
└── src/services/api.ts              ← API client

fiware/
├── docker-compose.yml               ← Stack FIWARE
├── orion-ld-config.json
├── quantumleap-config.yaml
└── iot-agent-config.json
```

---

## 📅 VERSIONES DE DOCUMENTOS

| Documento | Versión | Fecha | Cambios |
|-----------|---------|-------|---------|
| data_model.md | 1.0 | 2026-04-27 | Inicial |
| PRD.md | 1.0 | 2026-04-27 | Inicial |
| smart_data_models_analysis.md | 1.0 | 2026-04-27 | Inicial |
| architecture_dataflow.md | 1.0 | 2026-04-27 | Inicial |
| interface_proposal.md | 1.0 | 2026-04-27 | Inicial |

---

## 🚀 PRÓXIMAS ACTUALIZACIONES

- [ ] Data loading script (Python)
- [ ] Docker Compose v2.0
- [ ] API Swagger YAML spec
- [ ] Frontend Component storybook
- [ ] ML Model training guide
- [ ] Deployment guide (Kubernetes)
- [ ] Monitoring & Observability setup

---

**Última actualización**: 27-04-2026
**Documentación Versión**: 1.0.0-alpha
**Maintainer**: FIWARE Smart Cities

