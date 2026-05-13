# Issue: Configuración de Persistencia FIWARE (Orion-LD + QuantumLeap)

## 📋 Objetivo

Configurar el flujo de datos históricos desde Orion-LD hacia QuantumLeap y poblar la base de datos con datos sintéticos de los últimos 7 días.

## 🎯 Contexto Técnico

### Arquitectura Actual

| Componente | URL | Contenedor | Estado |
|-----------|-----|-----------|--------|
| **Orion-LD** | http://localhost:1026 | `fiware-orion-ld` | ✓ Healthy |
| **QuantumLeap** | http://localhost:8668 | `fiware-quantumleap` | ✓ Healthy |
| **TimescaleDB** | localhost:5432 | `fiware-timescaledb` | ✓ Healthy |
| **MongoDB** | localhost:27017 | `fiware-mongodb` | ✓ Healthy |

### Tipos de Entidades

- **AirQualityObserved**: Sensores de calidad del aire (PM2.5, PM10, NO2, CO2, temperatura, humedad)
- **NoiseLevelObserved**: Sensores de ruido (LAeq, LAmax, LA90, temperatura, velocidad del viento)

### Estado Actual del Sistema

```
✓ Contenedores están "Healthy"
✗ GET /ngsi-ld/v1/subscriptions devuelve [] (NO HAY SUSCRIPCIONES)
✗ QuantumLeap no tiene datos históricos almacenados
⚠️ El flujo de datos está desconectado: Orion-LD ≠X QuantumLeap
```

## 📝 Tareas Requeridas

### ✅ Tarea 1: Creación de Suscripciones (Puente de Datos)

**Descripción:**
Crear un script que establezca las suscripciones necesarias en Orion-LD para que notifique automáticamente a QuantumLeap cada vez que se actualice una entidad.

**Requisitos:**
- ✓ Suscripción para entidades tipo `AirQualityObserved`
- ✓ Suscripción para entidades tipo `NoiseLevelObserved`
- ✓ Endpoint de notificación: `http://fiware-quantumleap:8668/v1/notify` (dentro de red Docker)
- ✓ Formato NGSI-LD con contexto correcto
- ✓ Headers: `Fiware-Service: common`, `Fiware-ServicePath: /`
- ✓ Status: `active`

**Archivo:** `scripts/fiware_subscriptions.py`

**Uso:**
```bash
python3 scripts/fiware_subscriptions.py
python3 scripts/fiware_subscriptions.py --list-only
```

### ✅ Tarea 2: Script de Inyección de Históricos Semanales

**Descripción:**
Crear un script independiente que genere un pasado coherente para los 24 sensores (7 días de datos).

**Requisitos:**
- ✓ Genera datos para cada sensor cubriendo los últimos 7 días (intervalos de 1 hora)
- ✓ **Método crítico:** Envía a Orion-LD (NO directamente a QuantumLeap)
- ✓ Usa `POST /ngsi-ld/v1/entityOperations/upsert` con formato NGSI-LD
- ✓ **Campo obligatorio:** `observedAt` con timestamp histórico correcto
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

### ✅ Tarea 3: Validación Final

**Descripción:**
Proporcionar comandos curl para validar el flujo de datos.

**Validaciones incluidas:**

1. **Verificar suscripciones:**
   ```bash
   curl -X GET http://localhost:1026/ngsi-ld/v1/subscriptions \
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
   └─→ POST /ngsi-ld/v1/entityOperations/upsert (Orion-LD)
       └─→ MongoDB (almacenamiento)
       └─→ Dispara Suscripciones
           └─→ POST /v1/notify (QuantumLeap)
               └─→ TimescaleDB (histórico)

2. Frontend / API
   └─→ GET /v1/entities/{sensor} (QuantumLeap)
       └─→ Devuelve datos históricos con timestamps
```

## 📚 Referencias Técnicas

- **NGSI-LD Spec:** https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.04.01_60/gs_cim_009v010401p.pdf
- **Orion-LD Docs:** https://fiware-orion-ld.readthedocs.io/
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
