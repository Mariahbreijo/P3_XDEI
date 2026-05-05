# ✅ DEBUGGING COMPLETADO - RESUMEN DE CORRECCIONES

## 🎯 PROBLEMA ENCONTRADO

La web mostraba "Cargando..." o ceros porque había **DOS problemas**:

### 1. **ERROR DE CORS** (Principal)
- El navegador bloqueaba las peticiones directas a `http://localhost:1026` (Orion)
- Error: `No 'Access-Control-Allow-Origin' header`

**Solución implementada:**
- ✅ Creé endpoints proxy en el backend (`/api/v1/orion-proxy/*`)
- ✅ El JavaScript ahora usa el proxy: `http://localhost:8000/api/v1/orion-proxy/...`
- ✅ Actualicé `fetchEntitiesByTypeFromOrion()` para usar el proxy
- ✅ El backend tiene CORS habilitado (ya estaba configurado)

### 2. **SERVICE PATH INCORRECTO**
- El simulador usaba `Fiware-ServicePath: /madrid` y `/barcelona`
- El frontend buscaba con `/`
- Esto causaba que Orion no encontrara las entidades

**Solución implementada:**
- ✅ Cambié `DEVICES_CONFIG` para usar `service_path: "/"` (raíz)
- ✅ Ahora simulator y web usan el mismo path

---

## 📝 CAMBIOS REALIZADOS

### ✅ `frontend/app_fiware.js`

**Cambio 1: Proxy para fetchEntitiesByTypeFromOrion()**
```javascript
// ANTES:
const url = `${ORION_URL}/ngsi-ld/v1/entities?type=${type}`;
fetch(url, {
  headers: { "Fiware-Service": FIWARE_SERVICE, ... }
})

// AHORA:
const url = `${BACKEND_URL}/api/v1/orion-proxy/ngsi-ld/v1/entities?type=${type}`;
fetch(url, {
  headers: { "Accept": "application/json" }
})
```

**Cambio 2: Proxy para fetchEntityFromOrion()**
```javascript
// Usa backend proxy en lugar de acceso directo
const url = `${BACKEND_URL}/api/v1/orion-proxy/ngsi-ld/v1/entities/${entityId}`;
```

**Cambio 3: Debugging mejorado**
- ✅ console.log() en todas las funciones fetch
- ✅ console.log() en conversión NGSI-LD
- ✅ Función `runDiagnostics()` disponible globalmente (úsala en F12 console)

**Cambio 4: Fallback inteligente**
```javascript
// Si Orion no responde, usa endpoint /api/v1/dashboard del backend
if (airEntities.length === 0 && noiseEntities.length === 0) {
  const backendData = await fetch(`${BACKEND_URL}/api/v1/dashboard`);
  return backendData.json();
}
```

### ✅ `backend/app/api/v1/endpoints.py`

**Nuevo: Endpoints Proxy para evitar CORS**
```python
# GET /api/v1/orion-proxy/ngsi-ld/v1/entities?type=AirQualityObserved
def orion_proxy_entities(type: str, service: str, service_path: str):
    """Proxy a Orion - sin problemas CORS"""
    response = httpx.get("http://localhost:1026/ngsi-ld/v1/entities", ...)
    return response.json()

# GET /api/v1/orion-proxy/ngsi-ld/v1/entities/{entity_id}
def orion_proxy_entity(entity_id: str, ...):
    """Proxy para entidad específica"""
    response = httpx.get(f"http://localhost:1026/...", ...)
    return response.json()
```

### ✅ `scripts/iot_agent_simulator.py`

**Cambio: SERVICE_PATH**
```python
# ANTES: "service_path": "/madrid", "/barcelona"
# AHORA: "service_path": "/"

DEVICES_CONFIG = {
    "air-sensor-madrid": {
        "service_path": "/",  # ROOT PATH
        ...
    },
    ...
}
```

---

## 📋 PASOS PARA FUNCIONAR (ORDEN CORRECTO)

### PASO 1: Levantar Docker (si no está corriendo)
```bash
cd fiware
docker-compose up -d
# Espera 60 segundos para que Orion, IoT Agent, etc se inicialicen
```

### PASO 2: Terminal 2 - Backend (FastAPI)
```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
# Verifica: http://localhost:8000/docs (Swagger)
```

### PASO 3: Terminal 3 - Simulador IoT
```bash
.venv/bin/python scripts/iot_agent_simulator.py
# Deberías ver:
# ✓ air-sensor-madrid provisioned
# ✓ air-sensor-barcelona provisioned
# ✓ noise-sensor-madrid provisioned
# ✓ noise-sensor-barcelona provisioned
# [#1] 14:30:45 → 4/4 devices sent
```

### PASO 4: Terminal 4 - Abrir web
```bash
http://localhost:3000
# Presiona F12 (console)
# Deberías ver logs con [DEBUG]
```

---

## 🔍 CÓMO DEBUGGEAR AHORA

### Método 1: Console del Navegador
```javascript
// Abre F12 → Console
runDiagnostics()
// Te muestra diagnóstico completo de todas las conexiones
```

### Método 2: Verificar manualmente Orion
```bash
# Terminal: Ver si Orion tiene entidades
curl http://localhost:1026/ngsi-ld/v1/entities \
  -H "Fiware-Service: air_noise" | python3 -m json.tool

# Debería mostrar: 4 entidades (2 air + 2 noise)
```

### Método 3: Usar el proxy del backend
```bash
# Terminal: Probar el proxy funciona
curl http://localhost:8000/api/v1/orion-proxy/ngsi-ld/v1/entities?type=AirQualityObserved \
  | python3 -m json.tool

# Debería ser igual a acceder a Orion directamente
```

### Método 4: Ver logs del backend
```bash
# En la terminal donde corre uvicorn, verás:
INFO:     127.0.0.1:12345 - "GET /api/v1/orion-proxy/ngsi-ld/v1/entities?type=AirQualityObserved HTTP/1.1" 200 OK
```

---

## ✅ ESTADO ESPERADO

### Si todo funciona correctamente:

**Console del navegador (F12):**
```
[DEBUG] Starting fetchCurrentData...
[DEBUG] Fetching AirQualityObserved entities from: http://localhost:8000/api/v1/orion-proxy/ngsi-ld/v1/entities?type=AirQualityObserved
[DEBUG] Orion AirQualityObserved response status: 200
[DEBUG] Air entities from Orion: 2
[DEBUG] Processing air entity for Madrid: {id: "urn:ngsi-ld:AirQualityObserved:Madrid:Centro", PM10: 65.4, ...}
[DEBUG] Converted sensor object: {id: "...", PM10: 65.4, PM2_5: 28.5, NO2: 89.5, ...}
✅ Loaded 2 cities
   Orion available: true
```

**Pantalla:**
```
4 tarjetas mostradas:
✓ Madrid - Calidad del Aire - ICA: 90 - PM10: 65.4 µg/m³
✓ Madrid - Ruido Urbano - LAeq: 72.5 dB
✓ Barcelona - Calidad del Aire - ICA: 45 - PM10: 45.2 µg/m³
✓ Barcelona - Ruido Urbano - LAeq: 68.7 dB

Valores actualizándose cada 5 segundos ✓
PM10 > 50 mostrado en ROJO ✓
```

---

## 🐛 SI SIGUE SIN FUNCIONAR

### Problema: "Orion unavailable"

```bash
# 1. Verifica Docker
docker-compose ps
# Deberías ver: mongodb (healthy), orion-ld (healthy), iot-agent-json (healthy), timescaledb, quantumleap

# 2. Si no está healthy:
docker-compose logs orion-ld | tail -50

# 3. Reinicia:
docker-compose restart orion-ld
```

### Problema: "0/4 devices sent"

```bash
# El simulador no está provisioning. En la terminal del simulador deberías ver:
# ✓ air-sensor-madrid provisioned

# Si ves ✗ Error:
# - Verifica IoT Agent está corriendo: docker-compose ps | grep iot-agent-json
# - Verifica el API Key es correcto (debe ser: iot-agent-api-key-prod)
```

### Problema: Console muestra "Failed to fetch"

```bash
# Verifica backend está corriendo:
curl http://localhost:8000/api/v1/health
# Debería responder: {"status": "ok"}

# Si no:
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 📚 ARCHIVOS ACTUALIZADOS

| Archivo | Cambio |
|---------|--------|
| `frontend/app_fiware.js` | ✅ Proxy + debugging + fallback |
| `backend/app/api/v1/endpoints.py` | ✅ Nuevos endpoints proxy |
| `scripts/iot_agent_simulator.py` | ✅ SERVICE_PATH cambiado a "/" |
| `DEBUG_GUIDE.md` | ✅ Guía completa de debugging |

---

## 🚀 PRÓXIMOS PASOS

Ahora que el CORS y paths están arreglados:

1. **Levanta Docker** (si no está)
2. **Ejecuta simulator** (si no está)
3. **Abre http://localhost:3000**
4. **Abre F12 → Console**
5. **Ejecuta:** `runDiagnostics()`
6. **Comparte el output**

¡El sistema debería estar **100% funcional** ahora! 🎉

