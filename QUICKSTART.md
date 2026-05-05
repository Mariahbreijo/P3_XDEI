# QUICKSTART.md
## Guía Rápida de Inicio - Smart Air & Noise Monitor

Esta guía te ayudará a tener el proyecto corriendo en 15 minutos.

---

## ⚡ Inicio en 3 pasos

### Paso 1: Iniciar Stack FIWARE (Docker)
```bash
cd fiware
docker-compose up -d
```

**Espera 1-2 minutos para que los servicios se inicialicen**

Verifica con:
```bash
docker-compose ps
# Deberías ver 5+ contenedores "Up"
```

### Paso 2: Iniciar Backend
```bash
cd backend
source .venv/bin/activate
python -m pip install -r requirements.txt  # Primera vez solo
uvicorn app.main:app --reload --port 8000
```

**Accede a**: http://localhost:8000/docs (Swagger UI)

### Paso 3: Iniciar Frontend
```bash
cd frontend
npm install  # Primera vez solo
npm start
```

**Accede a**: http://localhost:3000

---

## 📍 URLs de Servicios

| Servicio | URL | Propósito |
|----------|-----|----------|
| Dashboard | http://localhost:3000 | UI principal |
| API Backend | http://localhost:8000 | REST API |
| Swagger Docs | http://localhost:8000/docs | Documentación interactiva |
| Orion-LD | http://localhost:1026 | Context Broker |
| QuantumLeap | http://localhost:8668 | Series temporales |
| Grafana | http://localhost:3001 | Dashboards (opcional) |
| CrateDB | http://localhost:4200 | Base de datos |

---

## 🧪 Verificar Integración FIWARE

### 1. Test Orion-LD
```bash
curl -X GET http://localhost:1026/ngsi-ld/v1/entities \
  -H 'Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
```

### 2. Crear una entidad de prueba
```bash
curl -X POST http://localhost:1026/ngsi-ld/v1/entities \
  -H 'Content-Type: application/ld+json' \
  -d '{
    "id": "urn:ngsi-ld:AirQualityObserved:test-01",
    "type": "AirQualityObserved",
    "location": {
      "type": "GeoProperty",
      "value": {
        "type": "Point",
        "coordinates": [-3.7038, 40.4168]
      }
    },
    "PM2_5": {
      "type": "Property",
      "value": 25.5,
      "unitCode": "UG_M3"
    },
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"
  }'
```

### 3. Leer la entidad
```bash
curl -X GET http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:test-01 \
  -H 'Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
```

---

## 📊 Cargar Datos de Prueba

### Opción A: Script Python

```bash
cd backend
python scripts/seed_sensors.py
python scripts/seed_observations.py
```

### Opción B: Manualmente vía curl

```bash
# Crear sensor de aire
curl -X POST http://localhost:8000/api/v1/sensors \
  -H 'Content-Type: application/json' \
  -d '{
    "sensor_id": "madrid-air-01",
    "type": "AirQualityObserved",
    "location": {"type": "Point", "coordinates": [-3.7038, 40.4168]},
    "address": {
      "streetAddress": "Plaza Mayor",
      "addressLocality": "Madrid",
      "addressCountry": "ES"
    }
  }'

# Crear observación
curl -X POST http://localhost:8000/api/v1/observations \
  -H 'Content-Type: application/json' \
  -d '{
    "sensor_id": "madrid-air-01",
    "CO2": 420.5,
    "PM2_5": 28.5,
    "PM10": 65.4,
    "NO2": 89.5,
    "O3": 62.8,
    "temperature": 22.5,
    "humidity": 65.0
  }'
```

---

## 🗺️ Ver Datos en el Dashboard

1. Accede a http://localhost:3000
2. El mapa debe mostrar marcadores azules (aire) y rojos (ruido)
3. Haz click en un marcador para ver detalles
4. Los widgets laterales deben mostrar:
   - **ICA**: 65 (GOOD) ✅
   - **Ruido**: 72.5 dB (MODERATE) 🟡

---

## 🔧 Variables de Entorno (Backend)

Copia y edita `backend/.env`:

```bash
# Orion-LD
ORION_URL=http://localhost:1026
ORION_FIWARE_SERVICE=fiware-service
ORION_FIWARE_SERVICEPATH=/environment

# QuantumLeap
QUANTUMLEAP_URL=http://localhost:8668

# PostgreSQL (alertas)
DATABASE_URL=postgresql://user:password@localhost:5432/air_quality

# Redis (caché)
REDIS_URL=redis://localhost:6379/0

# OpenAI (LLM - opcional)
OPENAI_API_KEY=sk-xxxxxxxxxx

# Otros
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000"]
```

---

## 📱 API Endpoints Principales

### Air Quality
```
GET /api/v1/air-quality              # Estado actual todos los sensores
GET /api/v1/air-quality/{sensor_id}  # Estado actual un sensor
GET /api/v1/air-quality/{sensor_id}/historical?days=7  # Histórico
```

### Noise Level
```
GET /api/v1/noise-level
GET /api/v1/noise-level/{sensor_id}
GET /api/v1/noise-level/{sensor_id}/historical?days=7
```

### Predictivo
```
GET /api/v1/ica/forecast?hours=72    # Predicción 72h
GET /api/v1/noise/forecast?hours=24  # Predicción 24h
```

### IA
```
POST /api/v1/ai/interpret
{
  "query": "¿Por qué está alto el PM2.5?",
  "sensor_id": "madrid-air-01",
  "context_hours": 24
}
```

---

## 🐛 Troubleshooting

### "Connection refused" en Orion-LD
```bash
# Verificar que Docker está corriendo
docker ps

# Reiniciar servicios
cd fiware
docker-compose restart
```

### Backend no conecta a Orion
```bash
# Verificar conectividad
docker-compose exec backend ping orion

# Verificar logs
docker-compose logs orion | tail -20
```

### Frontend no carga datos
```bash
# Verificar que Backend está corriendo
curl http://localhost:8000/api/v1/sensors

# Ver console del navegador (F12) para errores CORS
```

### Base de datos vacía
```bash
# Cargar datos de prueba
python backend/scripts/seed_sensors.py
python backend/scripts/seed_observations.py
```

---

## 📚 Documentación Completa

Para más detalles, consulta:
- [data_model.md](docs/data_model.md) - Especificación NGSI-LD
- [architecture_dataflow.md](docs/architecture_dataflow.md) - Flujo de datos
- [interface_proposal.md](docs/interface_proposal.md) - UI/UX
- [PRD.md](docs/PRD.md) - Requisitos completos

---

## 🎓 Próximos Pasos

1. **Explorar Dashboard**: Navega por el mapa, zoom, filtros
2. **Ver Históricos**: Selecciona rangos de fechas, exporta CSV
3. **Crear Alertas**: Configura notificaciones (email)
4. **ML Predicción**: Llama al endpoint de forecast
5. **Chat IA**: Haz preguntas sobre contaminación

---

## 💡 Tips

- **Hot Reload**: Frontend y Backend recargan automáticamente en cambios
- **Logs Detallados**: Set `LOG_LEVEL=DEBUG` en .env
- **Cache**: Clear Redis con `redis-cli FLUSHALL`
- **Datos Frescos**: Ejecuta `seed_observations.py` con datos nuevos cada hora
- **Monitor**: Abre `localhost:3001` (Grafana) para ver métricas del sistema

---

## 🚨 Primeros Errores Esperados (Normal)

```
WARNING: CORS error - browser can't reach backend
→ Espera a que Backend esté listo (10 segundos)

ERR: Connection to Orion refused
→ Espera a que Docker Compose inicie todos los servicios

WARN: No sensores found
→ Ejecuta `seed_sensors.py` para crear datos de prueba

INFO: Cache miss
→ Normal en primera carga, se rellenará el caché
```

---

## ✅ Validación Final

Marca como completo cuando veas:
- ✅ Dashboard carga en http://localhost:3000
- ✅ Mapa con markers de sensores
- ✅ ICA widget muestra valor (verde/amarillo/rojo)
- ✅ Ruido widget muestra dB
- ✅ Gráficos animan suavemente
- ✅ Click en marker abre detalles

**Si todo está verde: ¡Felicidades! 🎉 Proyecto listo para desarrollo**

---

**Tiempo estimado**: 15 minutos ⏱️
**Última actualización**: 27-04-2026

