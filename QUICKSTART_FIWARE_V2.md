# 🚀 Guía de Inicio Rápido: FIWARE Persistence (v2 API - Completado)

## 📋 Estado Actual

✅ **Scripts completamente funcionales y listos para usar**

Todos los scripts han sido actualizados y validados para ser 100% compatibles con la API v2 de Orion:

- ✓ `scripts/fiware_subscriptions.py` - Crea suscripciones v2
- ✓ `scripts/seed_historical_data.py` - Inyecta datos históricos
- ✓ `quickstart_persistence.sh` - Automatiza todo el proceso
- ✓ Documentación actualizada a v2

---

## 🎯 Ejecución Rápida (Recomendado)

### Paso 1: Levantar los contenedores Docker

Si no están corriendo:

```bash
cd /home/maria/XDEI/P3_MariaJose_Hernandez_Saray_Gonzalez
docker-compose -f fiware/docker-compose.yml up -d

# Esperar a que estén Healthy (30-60 segundos)
docker-compose -f fiware/docker-compose.yml ps
```

### Paso 2: Ejecutar el Quickstart (TODO AUTOMÁTICO)

```bash
./quickstart_persistence.sh
```

El script va a:
1. ✅ Verificar conectividad con Orion (v2 API)
2. ✅ Verificar conectividad con QuantumLeap
3. ✅ Crear 2 suscripciones automáticamente
4. ✅ Preguntar si deseas continuar
5. ✅ Inyectar 4,032 registros históricos
6. ✅ Mostrar próximos pasos

---

## 📝 Ejecución Manual (Si lo prefieres)

### 1. Crear suscripciones

```bash
python3 scripts/fiware_subscriptions.py

# Salida esperada:
# ════════════════════════════════════════════════════════
# FIWARE Subscription Creator (v2 API)
# ════════════════════════════════════════════════════════
# ...
# ✓ Subscription created successfully for AirQualityObserved
# ✓ Subscription created successfully for NoiseLevelObserved
```

### 2. Inyectar datos históricos

```bash
python3 scripts/seed_historical_data.py

# Salida esperada:
# ════════════════════════════════════════════════════════
# Historical Data Seeding for FIWARE NGSI v2
# ════════════════════════════════════════════════════════
# ...
# Processed 24 entities (1 time steps)
# ...
# ✓ Upload complete!
#   Successful: 4032
#   Errors: 0
```

---

## ✅ Validación del Setup

### 1. Verificar Suscripciones (v2 API)

```bash
curl -s http://localhost:1026/v2/subscriptions | jq .

# Debería mostrar 2 suscripciones:
# [
#   {
#     "id": "...",
#     "description": "Subscription for AirQualityObserved entities to QuantumLeap",
#     "subject": {
#       "entities": [
#         {
#           "type": "AirQualityObserved",
#           "idPattern": ".*"
#         }
#       ]
#     },
#     "notification": {
#       "http": {"url": "http://fiware-quantumleap:8668/v1/notify"}
#     },
#     "status": "active"
#   },
#   {...suscripción para NoiseLevelObserved...}
# ]
```

### 2. Verificar Datos Históricos en QuantumLeap

```bash
curl -s http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001 | jq .

# Debería devolver datos históricos con estructura:
# {
#   "entityId": "urn:ngsi-ld:AirQualityObserved:Madrid:001",
#   "entityType": "AirQualityObserved",
#   "index": [...timestamps...],
#   "values": {
#     "PM2_5": [...valores...],
#     "PM10": [...valores...],
#     "dateObserved": [...timestamps...]
#   }
# }
```

### 3. Ver Últimos 10 Registros

```bash
curl -s 'http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?lastN=10' | jq .
```

### 4. Filtrar por Rango de Tiempo

```bash
curl -s 'http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?fromDate=2026-05-06T00:00:00Z&toDate=2026-05-13T23:59:59Z' | jq .
```

---

## 🔧 Opciones Avanzadas

### Generar más días de histórico

```bash
# 14 días en lugar de 7
python3 scripts/seed_historical_data.py --num-days 14
```

### Modo Prueba (sin subir datos)

```bash
# Verifica que el script funciona sin enviar nada a Orion
python3 scripts/seed_historical_data.py --dry-run
```

### URLs Personalizadas

```bash
# Si tu Orion está en otra URL
python3 scripts/seed_historical_data.py --orion-url http://mi-servidor:1026
python3 scripts/fiware_subscriptions.py --orion-url http://mi-servidor:1026
```

### Solo Listar Suscripciones

```bash
python3 scripts/fiware_subscriptions.py --list-only
```

---

## 🐛 Troubleshooting

### ¿No puedo ejecutar el quickstart?

```bash
# Verificar permisos
chmod +x quickstart_persistence.sh

# Ejecutar con bash explícito
bash quickstart_persistence.sh
```

### ¿Orion no responde?

```bash
# Verificar que está corriendo
docker ps | grep orion

# Ver logs
docker logs fiware-orion-ld | tail -50

# Reiniciar contenedores
docker-compose -f fiware/docker-compose.yml restart
```

### ¿QuantumLeap no recibe datos?

```bash
# Verificar TimescaleDB
docker exec fiware-timescaledb pg_isready -U postgres

# Ver logs de QuantumLeap
docker logs fiware-quantumleap | tail -50

# Verificar suscripciones
curl -s http://localhost:1026/v2/subscriptions | jq '.[] | {id, status}'
```

### Scripts fallan con BadRequest

```bash
# Validar que idPattern está en las suscripciones
curl -s http://localhost:1026/v2/subscriptions | jq '.[] | .subject.entities'

# Debería mostrar: [{"type": "AirQualityObserved", "idPattern": ".*"}]
```

---

## 📊 Resumen de Cambios (NGSI-LD → NGSI v2)

| Aspecto | NGSI-LD | NGSI v2 |
|--------|---------|---------|
| **Subscriptions** | `/ngsi-ld/v1/subscriptions` | `/v2/subscriptions` |
| **Entities** | `/ngsi-ld/v1/entityOperations/upsert` | `PATCH /v2/entities/{id}/attrs` |
| **Headers** | Link + application/ld+json | application/json |
| **Context** | @context requerido | No requerido |
| **idPattern** | No requerido | ✅ **Obligatorio** (corregido) |
| **Timestamp** | observedAt (Property) | dateObserved (DateTime) |

---

## 📚 Archivos Importantes

| Archivo | Descripción |
|---------|-----------|
| `scripts/fiware_subscriptions.py` | Crea suscripciones (v2 API) |
| `scripts/seed_historical_data.py` | Inyecta datos históricos |
| `quickstart_persistence.sh` | Automatización completa |
| `docs/FIWARE_PERSISTENCE_SETUP.md` | Documentación técnica detallada |
| `ISSUE_FIWARE_PERSISTENCE.md` | Especificación de requisitos |

---

## ✨ Características Implementadas

✅ Suscripciones automáticas (AirQualityObserved + NoiseLevelObserved)  
✅ 4,032 registros históricos (7 días × 24 sensores)  
✅ Patrones realistas day/night (PM2.5, PM10, LAeq)  
✅ Timestamps históricos precisos (dateObserved)  
✅ Sincronización automática Orion → QuantumLeap  
✅ Compatible 100% con NGSI v2 API  
✅ Manejo robusto de errores  
✅ Logging detallado  
✅ Modo dry-run para pruebas  
✅ Documentación completa  

---

## 🎯 Próximos Pasos

1. **Ejecuta el quickstart:**
   ```bash
   ./quickstart_persistence.sh
   ```

2. **Valida que todo funciona:**
   ```bash
   curl http://localhost:1026/v2/subscriptions | jq '. | length'
   # Debería mostrar: 2
   ```

3. **Verifica los datos históricos:**
   ```bash
   curl http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?lastN=1 | jq .
   ```

4. **Consulta la documentación:**
   - [docs/FIWARE_PERSISTENCE_SETUP.md](docs/FIWARE_PERSISTENCE_SETUP.md)
   - [ISSUE_FIWARE_PERSISTENCE.md](ISSUE_FIWARE_PERSISTENCE.md)

---

**Todo está configurado y listo para ejecutarse. ¡Adelante! 🚀**
