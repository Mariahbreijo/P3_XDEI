# FIWARE Persistence Setup Guide

**Objetivo:** Configurar el flujo de datos históricos desde Orion-LD hacia QuantumLeap y poblar la base de datos con datos sintéticos de los últimos 7 días.

## 📋 Contexto Técnico

| Componente | URL | Contenedor | Estado |
|-----------|-----|-----------|--------|
| **Orion-LD** | http://localhost:1026 | `fiware-orion-ld` | Contenedor Bridge NGSI-LD |
| **QuantumLeap** | http://localhost:8668 | `fiware-quantumleap` | Contenedor Time-Series DB (TimescaleDB) |
| **TimescaleDB** | localhost:5432 | `fiware-timescaledb` | PostgreSQL con extensión TimescaleDB |

### Tipos de Entidades

- **AirQualityObserved**: Sensores de calidad del aire (PM2.5, PM10, NO2, CO2, etc.)
- **NoiseLevelObserved**: Sensores de ruido (LAeq, LAmax, LA90)

### Estado Actual

- ✓ Contenedores levantados y "Healthy"
- ✗ **Suscripciones vacías**: `GET /ngsi-ld/v1/subscriptions` devuelve `[]`
- ✗ **Sin histórico**: QuantumLeap no tiene datos almacenados

---

## 🚀 Configuración de Suscripciones

Las suscripciones actúan como **puente de datos**: cuando un sensor se actualiza en Orion-LD, automáticamente notifica a QuantumLeap para que lo almacene.

### Tarea 1: Crear Suscripciones

```bash
# Ejecutar el script de configuración de suscripciones
cd /home/maria/XDEI/P3_MariaJose_Hernandez_Saray_Gonzalez
python3 scripts/fiware_subscriptions.py

# Salida esperada:
# ✓ Subscription created successfully for AirQualityObserved
# ✓ Subscription created successfully for NoiseLevelObserved
```

**¿Qué hace el script?**

1. Crea una suscripción en Orion-LD para entidades tipo `AirQualityObserved`
2. Crea una suscripción en Orion-LD para entidades tipo `NoiseLevelObserved`
3. Configura ambas para notificar a `http://fiware-quantumleap:8668/v1/notify`
4. Usa el contexto NGSI-LD y headers apropiados (`Fiware-Service: common`)

**Opciones del script:**

```bash
# Ver subscripciones existentes sin crear nuevas
python3 scripts/fiware_subscriptions.py --list-only

# Especificar URLs personalizadas
python3 scripts/fiware_subscriptions.py \
  --orion-url http://localhost:1026 \
  --quantumleap-url http://fiware-quantumleap:8668
```

---

## 📊 Inyección de Datos Históricos Semanales

### Tarea 2: Generar y Poblar Históricos

El script `seed_historical_data.py` genera datos sintéticos coherentes para los últimos 7 días:

```bash
# Generar e inyectar datos históricos (7 días)
python3 scripts/seed_historical_data.py

# Salida esperada:
# Processed 24 entities (1 time steps)
# ...
# ✓ Upload complete!
#   Successful: 4032
#   Errors: 0
```

**Características del script:**

✓ **24 sensores**: 6 de aire (Madrid/Barcelona/Valencia) + 4 de ruido (Madrid/Barcelona)  
✓ **168 puntos por sensor**: 7 días × 24 horas = 168 lecturas  
✓ **Variación realista**: Curvas day/night para PM2.5, PM10, ruido  
✓ **Timestamp histórico**: Cada dato incluye `observedAt` con el timestamp pasado  
✓ **Método correcto**: Envía a Orion-LD (no directamente a QuantumLeap)  

**¿Cómo funciona?**

1. Genera 7 días de datos hacia atrás desde la hora actual
2. Para cada hora y sensor:
   - Calcula valores realistas usando curvas sinusoidales (día/noche)
   - Incluye el timestamp correcto en el campo `observedAt`
   - Realiza upsert en Orion-LD
3. Las suscripciones notifican automáticamente a QuantumLeap
4. QuantumLeap almacena los datos en TimescaleDB con timestamp histórico

**Opciones del script:**

```bash
# Generar 14 días de histórico en lugar de 7
python3 scripts/seed_historical_data.py --num-days 14

# Modo dry-run: generar sin subir
python3 scripts/seed_historical_data.py --dry-run

# Personalizar URL de Orion
python3 scripts/seed_historical_data.py --orion-url http://localhost:1026

# Todas las opciones
python3 scripts/seed_historical_data.py \
  --num-days 14 \
  --batch-size 100 \
  --fiware-service common \
  --fiware-servicepath /
```

---

## ✅ Validación Final

### Verificar Suscripciones

```bash
# Listar subscripciones en Orion-LD
curl -X GET \
  http://localhost:1026/ngsi-ld/v1/subscriptions \
  -H "Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Salida esperada: Array con 2 suscripciones
# [
#   {
#     "id": "...",
#     "type": "Subscription",
#     "entities": [{"type": "AirQualityObserved"}],
#     "notification": {...},
#     "status": "active"
#   },
#   {
#     "id": "...",
#     "type": "Subscription",
#     "entities": [{"type": "NoiseLevelObserved"}],
#     "notification": {...},
#     "status": "active"
#   }
# ]
```

### Verificar Datos Históricos en QuantumLeap

```bash
# Listar sensores disponibles en QuantumLeap
curl -X GET \
  http://localhost:8668/v1/entities \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Obtener datos históricos de un sensor específico (últimos 7 días)
curl -X GET \
  "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Salida esperada: Objeto con datos de PM2.5, PM10, NO2, etc. a través del tiempo

# Ver los últimos 10 registros históricos
curl -X GET \
  "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?lastN=10" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Filtrar por rango de tiempo (ISO 8601)
curl -X GET \
  "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?fromDate=2026-05-06T00:00:00Z&toDate=2026-05-13T23:59:59Z" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"
```

### Verificar Sincronización

```bash
# 1. Actualizar un sensor en tiempo real
curl -X PATCH \
  http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001/attrs \
  -H "Content-Type: application/ld+json" \
  -H "Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /" \
  -d '{
    "PM2_5": {"type": "Property", "value": 35.5},
    "dateObserved": {"type": "Property", "value": "2026-05-13T14:30:00Z"}
  }'

# 2. Esperar 2 segundos (tiempo de notificación)
sleep 2

# 3. Verificar que QuantumLeap recibió el dato
curl -X GET \
  "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?lastN=1" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Debería mostrar PM2_5: 35.5
```

---

## 🐳 Estructura Docker

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
│                 (fiware-network)                     │
└─────────────────────────────────────────────────────┘
       │                    │                │
       ▼                    ▼                ▼
  ┌─────────┐         ┌──────────┐    ┌────────────┐
  │ MongoDB │         │ Orion-LD │    │ IoT Agent  │
  │ :27017  │────────▶│ :1026    │◀───│ :4041      │
  └─────────┘         └──────────┘    └────────────┘
       │                    │
       │                    │ Suscripción
       │                    ▼
       │             ┌──────────────────┐
       │             │ QuantumLeap      │
       │             │ :8668            │
       │             └──────────────────┘
       │                    │
       └────────────────────▼
                ┌──────────────────┐
                │  TimescaleDB     │
                │  :5432           │
                │  (PostgreSQL)    │
                └──────────────────┘
```

---

## 📝 Archivos Generados

| Script | Descripción |
|--------|-----------|
| `scripts/fiware_subscriptions.py` | Crea suscripciones Orion-LD → QuantumLeap |
| `scripts/seed_historical_data.py` | Genera e inyecta datos históricos (7 días) |
| `docs/FIWARE_PERSISTENCE_SETUP.md` | Este documento |

---

## 🔄 Flujo de Datos Completo

```
1. Simulador de Sensores (sensor_simulator.py o real)
   │
   ▼
2. POST/PATCH → Orion-LD (:1026)
   │
   ├─▶ Almacena en MongoDB
   │
   └─▶ Dispara Suscripción
       │
       ▼
3. Notificación → QuantumLeap (:8668)
   │
   ├─▶ Procesa NGSI-LD
   │
   └─▶ Almacena en TimescaleDB (:5432)
       │
       ▼
4. API Frontend
   │
   └─▶ GET /v1/entities/... desde QuantumLeap
```

---

## 🛠️ Troubleshooting

### ¿Las suscripciones no aparecen?

```bash
# Verificar que Orion-LD está corriendo
curl http://localhost:1026/version

# Verificar conectividad
docker exec fiware-orion-ld curl http://fiware-quantumleap:8668/version

# Revisar logs
docker logs fiware-orion-ld
docker logs fiware-quantumleap
```

### ¿QuantumLeap no recibe datos?

```bash
# Verificar que TimescaleDB está corriendo
docker exec fiware-timescaledb pg_isready -U postgres

# Revisar subscripción en detalle
curl -X GET http://localhost:1026/ngsi-ld/v1/subscriptions/{subscription-id} \
  -H "Link: <https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"" \
  -H "Fiware-Service: common" \
  -H "Fiware-ServicePath: /"

# Verificar logs de QuantumLeap
docker logs fiware-quantumleap | tail -50
```

### Script de históricos falla

```bash
# Ejecutar en dry-run para ver qué hace
python3 scripts/seed_historical_data.py --dry-run

# Verificar conectividad a Orion-LD
curl http://localhost:1026/version

# Habilitar debug (revisar código para ver opciones)
python3 scripts/seed_historical_data.py --batch-size 1
```

---

## 📚 Referencias

- [FIWARE Orion-LD Documentation](https://fiware-orion-ld.readthedocs.io/)
- [FIWARE QuantumLeap Documentation](https://quantumleap.readthedocs.io/)
- [NGSI-LD Specification](https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.04.01_60/gs_cim_009v010401p.pdf)
- [Smart Data Models](https://github.com/smart-data-models)
