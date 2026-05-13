# Issue: Configuración de Persistencia FIWARE (Orion v2 API + QuantumLeap)

## 📋 Objetivo

Configurar el flujo de datos históricos desde Orion (NGSI v2 API) hacia QuantumLeap y poblar la base de datos con datos sintéticos de los últimos 7 días.

## 🎯 Contexto Técnico

### Arquitectura Actual

| Componente | URL | Contenedor | API | Estado |
|-----------|-----|-----------|-----|--------|
| **Orion** | http://localhost:1026 | `fiware-orion-ld` | v2 | ✓ Healthy |
| **QuantumLeap** | http://localhost:8668 | `fiware-quantumleap` | REST | ✓ Healthy |
| **TimescaleDB** | localhost:5432 | `fiware-timescaledb` | PostgreSQL | ✓ Healthy |
| **MongoDB** | localhost:27017 | `fiware-mongodb` | NoSQL | ✓ Healthy |

### Tipos de Entidades

- **AirQualityObserved**: Sensores de calidad del aire (PM2.5, PM10, NO2, CO2, temperatura, humedad)
- **NoiseLevelObserved**: Sensores de ruido (LAeq, LAmax, LA90, temperatura, velocidad del viento)

### Estado Actual del Sistema

```
✓ Contenedores están "Healthy"
✓ Orion responde en /v2/version (API v2)
✗ GET /v2/subscriptions devuelve [] (NO HAY SUSCRIPCIONES)
✗ QuantumLeap no tiene datos históricos almacenados
⚠️ El flujo de datos está desconectado: Orion ≠X QuantumLeap
```

## 📝 Tareas Requeridas

### ✅ Tarea 1: Creación de Suscripciones (Puente de Datos)

**Descripción:**
Crear un script que establezca las suscripciones necesarias en Orion (v2 API) para que notifique automáticamente a QuantumLeap cada vez que se actualice una entidad.

**Requisitos:**
- ✓ Suscripción para entidades tipo `AirQualityObserved`
- ✓ Suscripción para entidades tipo `NoiseLevelObserved`
- ✓ Endpoint de notificación: `http://fiware-quantumleap:8668/v1/notify` (dentro de red Docker)
- ✓ Formato NGSI v2 (sin @context, headers simplificados)
- ✓ Headers: `Fiware-Service: common`, `Fiware-ServicePath: /`
- ✓ Status: `active`
- ✓ Endpoint: POST `/v2/subscriptions`

**Archivo:** `scripts/fiware_subscriptions.py`

**Uso:**
```bash
python3 scripts/fiware_subscriptions.py
python3 scripts/fiware_subscriptions.py --list-only
```

**Formato de suscripción (NGSI v2):**
```json
{
  "description": "Subscription for AirQualityObserved entities to QuantumLeap",
  "subject": {
    "entities": [{"type": "AirQualityObserved"}]
  },
  "notification": {
    "http": {
      "url": "http://fiware-quantumleap:8668/v1/notify"
    }
  },
  "status": "active"
}
```

### ✅ Tarea 2: Script de Inyección de Históricos Semanales

**Descripción:**
Crear un script independiente que genere un pasado coherente para los 24 sensores (7 días de datos).

**Requisitos:**
- ✓ Genera datos para cada sensor cubriendo los últimos 7 días (intervalos de 1 hora)
- ✓ **Método correcto:** Envía a Orion (v2 API) mediante PATCH /v2/entities/{id}/attrs
- ✓ Formato NGSI v2 (sin @context, headers simplificados)
- ✓ **Campo obligatorio:** `dateObserved` con timestamp histórico correcto
- ✓ Coherencia: PM2.5, PM10, LAeq varían con patrones realistas day/night
- ✓ 24 sensores: 6 calidad del aire + 4 ruido (Madrid, Barcelona, Valencia)
- ✓ Total: 168 puntos × 24 sensores = 4,032 registros históricos

**Lógica de Generación:**

```python
# Day/Night Variation Curves
PM2.5:    15-45 µg/m³   (pico a las 13:00)
PM10:     30-80 µg/m³   (pico a las 13:00)
NO2:      20-70 µg/m³   (pico a las 10:00)
LAeq:     60-78 dB      (pico a las 19:00)
Ruido:    Patrón realista con spike en hora punta
```

**Archivo:** `scripts/seed_historical_data.py`

**Uso:**
```bash
python3 scripts/seed_historical_data.py
python3 scripts/seed_historical_data.py --num-days 14
python3 scripts/seed_historical_data.py --dry-run
```

**Formato NGSI v2 de entidad:**
```json
{
  "id": "urn:ngsi-ld:AirQualityObserved:Madrid:001",
  "type": "AirQualityObserved",
  "PM2_5": {"type": "Number", "value": 35.5},
  "PM10": {"type": "Number", "value": 65.0},
  "NO2": {"type": "Number", "value": 50.0},
  "dateObserved": {"type": "DateTime", "value": "2026-05-06T10:00:00Z"},
  "location": {"type": "geo:point", "value": "-3.7038,40.4168"}
}
```

### ✅ Tarea 3: Validación Final

**Descripción:**
Proporcionar comandos curl para validar el flujo de datos.

**Validaciones incluidas:**

1. **Verificar suscripciones:**
   ```bash
   curl -X GET http://localhost:1026/v2/subscriptions \
     -H "Fiware-Service: common"
   # Debe devolver 2 suscripciones (AirQualityObserved + NoiseLevelObserved)
   ```

2. **Verificar datos históricos en QuantumLeap:**
   ```bash
   curl -X GET "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001" \
     -H "Fiware-Service: common"
   # Debe devolver registros con datos históricos
   ```

3. **Filtrar por rango de tiempo:**
   ```bash
   curl -X GET "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?fromDate=2026-05-06T00:00:00Z&toDate=2026-05-13T23:59:59Z" \
     -H "Fiware-Service: common"
   ```

**Documento:** `docs/FIWARE_PERSISTENCE_SETUP.md`

## 🚫 Restricciones

- ✓ **NO modificar** `fiware/docker-compose.yml`
- ✓ **NO modificar** `frontend/index.html`
- ✓ Scripts deben ser ejecutables de forma aislada
- ✓ Deben usar sólo dependencias existentes (`httpx`, `requests`, etc.)

## 📦 Archivos Generados

| Archivo | Descripción |
|---------|-----------|
| `scripts/fiware_subscriptions.py` | Crea suscripciones Orion-LD → QuantumLeap |
| `scripts/seed_historical_data.py` | Genera e inyecta 7 días de datos históricos |
| `docs/FIWARE_PERSISTENCE_SETUP.md` | Guía completa de setup, validación y troubleshooting |

## 🧪 Criterios de Aceptación

- [ ] Script `fiware_subscriptions.py` crea 2 suscripciones exitosamente
- [ ] `GET /ngsi-ld/v1/subscriptions` devuelve ambas suscripciones (status: active)
- [ ] Script `seed_historical_data.py` genera 4,032 registros sin errores
- [ ] `GET /v1/entities/{sensor}` en QuantumLeap devuelve datos históricos
- [ ] Filtros de rango temporal funcionan correctamente
- [ ] Actualización en tiempo real sincroniza correctamente Orion-LD → QuantumLeap
- [ ] Documentación en `FIWARE_PERSISTENCE_SETUP.md` es completa y ejecutable

## 🔗 Flujo de Datos Esperado

```
1. seed_historical_data.py
   └─→ PATCH /v2/entities/{id}/attrs (Orion v2)
       └─→ MongoDB (almacenamiento)
       └─→ Dispara Suscripciones
           └─→ POST /v1/notify (QuantumLeap)
               └─→ TimescaleDB (histórico)

2. Frontend / API
   └─→ GET /v1/entities/{sensor} (QuantumLeap)
       └─→ Devuelve datos históricos con timestamps
```

## 📚 Referencias Técnicas

- **NGSI v2 Spec:** https://fiware.github.io/specifications/ngsiv2/stable/
- **Orion Docs:** https://fiware-orion.readthedocs.io/
- **Orion v2 API:** https://fiware-orion.readthedocs.io/en/master/user/walkthrough_apiv2/
- **QuantumLeap Docs:** https://quantumleap.readthedocs.io/
- **Smart Data Models:** https://github.com/smart-data-models

## 📊 Recursos Estimados

- **Puntos de datos generados:** 4,032 registros (7 días × 24 horas × 24 sensores)
- **Tamaño DB:** ~500 KB (datos + índices)
- **Tiempo de inyección:** ~2-5 minutos (depende de rendimiento Docker)
- **Tiempo de respuesta API:** <100 ms (con índices QL)

---

**Rama:** `feature/datos_historicos`  
**Prioridad:** Alta  
**Tipo:** Feature/Configuration

## 🧩 Estado Real de la Rama

La rama `feature/datos_historicos` ya no contiene solo la especificación inicial: ahora incluye la configuración operativa completa para persistencia histórica en FIWARE.

### Backend y entorno

- `backend/.env` sincronizado a `FIWARE_SERVICE=common` y `FIWARE_SERVICEPATH=/`.
- `backend/app/config.py` usa `common` como valor por defecto para evitar divergencias entre API y scripts.
- El proxy Orion del backend reenvía siempre `Fiware-Service: common` y `Fiware-ServicePath: /`.

### Frontend

- `frontend/app_fiware_sync.js` y `frontend/advanced_map.js` consumen el proxy del backend con `common`.
- El frontend ya no depende de un fetch directo a Orion para cargar sensores.
- `location` se interpreta tanto como `geo:point` en cadena `lat,lon` como en formato con `coordinates`, lo que cubre el payload real emitido por Orion.

### QuantumLeap y TimescaleDB

- `fiware/docker-compose.yml` mantiene la configuración de QuantumLeap con backend Timescale/PostgreSQL.
- `fiware/init_timescaledb/01_init.sql` crea `common` y `mtcommon` para cubrir variantes de QuantumLeap y preparar `md_ets_metadata`.
- Se conserva el montaje de `health.py` corregido para la versión de QuantumLeap usada en esta rama.

### Scripts operativos

- `scripts/fiware_subscriptions.py` crea suscripciones NGSI v2 con `idPattern: ".*"`.
- `scripts/seed_historical_data.py` ya incorpora preflight de QuantumLeap mediante `/v2/notify` y valida persistencia antes de cargar el lote completo.
- `scripts/fiware_setup.sh`, `scripts/iot_agent_simulator.py` y `scripts/manual_iot_agent_smoke_test.py` están alineados con `common` y `/`.

### Validación práctica

- QuantumLeap responde `healthy`.
- `/health` devuelve `pass`.
- El proxy del backend recupera entidades de Orion con el tenant correcto.
- El frontend ya no queda bloqueado por CORS al depender del proxy.

## 📌 Nota Operativa

Si se modifica `backend/.env`, hay que reiniciar el proceso del backend para que `load_dotenv()` reevalúe los valores. El frontend solo necesita recarga de navegador.
