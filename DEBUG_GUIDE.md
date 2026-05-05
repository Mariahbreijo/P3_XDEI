# 🔍 GUÍA DE DEBUGGING - Web muestra "Cargando..." o ceros

## 🚨 EL PROBLEMA

- El script Python envía datos correctamente (recibes 204)
- Pero la web muestra ceros o "Cargando..."

## 🔧 DIAGNÓSTICO EN 5 PASOS

### PASO 1: Abre la Consola del Navegador

1. Abre http://localhost:3000 en tu navegador
2. Presiona `F12` (o `Cmd+Option+I` en Mac)
3. Ve a la pestaña **Console**

### PASO 2: Busca errores de red

En la consola deberías ver líneas como:

```
[DEBUG] Starting fetchCurrentData...
[DEBUG] Fetching AirQualityObserved entities from: http://localhost:1026/ngsi-ld/v1/entities?type=AirQualityObserved
[DEBUG] Orion AirQualityObserved response status: 200
[DEBUG] Orion returned 0 AirQualityObserved entities
```

Si ves `response status: 404` o `500`, hay un problema.

### PASO 3: Ejecuta el Diagnóstico Completo

En la consola del navegador, copia-pega:

```javascript
runDiagnostics()
```

Presiona Enter. Verás algo como:

```
================================================================================
🔍 FIWARE DIAGNOSTICS
================================================================================

1. Testing Orion connectivity...
   ✓ Orion version check: 200
   Version: {version: "1.4.0", ...}

2. Checking for entities in Orion...

   Querying type: AirQualityObserved
   Response status: 200
   Entities found: 2
   Sample entity: {id: "urn:ngsi-ld:AirQualityObserved:Madrid:Centro", type: "AirQualityObserved", ...}
```

## 🎯 QUÉ SIGNIFICA CADA RESULTADO

### ✅ TODO BIEN

```
Entities found: 4  (deberías ver 2 air + 2 noise = 4 total)
Sample entity: {...}  con atributos: PM10, PM2_5, NO2, O3
```

**Solución:** Actualiza la página (Ctrl+F5 o Cmd+Shift+R)

---

### ❌ ORION NO RESPONDE

```
✗ Orion not reachable: Failed to fetch
```

**Causas:**
1. Docker no está corriendo
2. Orion está caído
3. Puerto 1026 está cerrado

**Solución:**
```bash
cd fiware
docker-compose ps

# Debería mostrar:
# NAME                COMMAND             STATUS
# orion-ld           "/bin/sh -c ..."    Up (healthy)
# mongodb            "docker-entrypoint" Up (healthy)

# Si no está:
docker-compose restart orion-ld
```

---

### ❌ ORION RESPONDE PERO SIN ENTIDADES

```
Entities found: 0
```

**Posibles causas:**
1. El simulador no está corriendo
2. El simulador está fallando en provisioning
3. Los datos no se están enviando

**Solución:**
```bash
# Terminal donde corre el simulador - deberías ver:
# ✓ air-sensor-madrid provisioned
# ✓ air-sensor-barcelona provisioned
# ✓ noise-sensor-madrid provisioned
# ✓ noise-sensor-barcelona provisioned

# Luego:
# [#1] 14:30:45 → 4/4 devices sent
# [#2] 14:30:50 → 4/4 devices sent

# Si ves "0/4 devices sent", hay problema en el envío
```

---

### ❌ ENTIDADES EXISTEN PERO CON CEROS

```
Sample entity: {
  id: "urn:ngsi-ld:AirQualityObserved:Madrid:Centro",
  type: "AirQualityObserved",
  PM10: {type: "Property", value: 0},
  PM2_5: {type: "Property", value: 0},
  ...
}
```

**Causa:** El script Python está enviando ceros

**Solución:**
Revisa que el script esté generando números aleatorios correctamente:
```bash
# En la terminal del simulador, deberías ver cada 5 iteraciones:
# → Madrid Air: PM10=65.4, PM2.5=28.5, NO2=89.5, O3=62.8
# → Madrid Noise: LAeq=72.5, LAmax=85.2

# Si ves: PM10=0, PM2.5=0 - hay bug en random_walk()
```

---

## 📊 CHECKLIST DE DEBUGGING

```
┌─ ORION
│  ├─ Docker corriendo?
│  │  └─ docker-compose ps → orion-ld (healthy)
│  │
│  ├─ Orion responde?
│  │  └─ runDiagnostics() → "✓ Orion version check: 200"
│  │
│  └─ Entidades creadas?
│     └─ runDiagnostics() → "Entities found: 4"
│
├─ IOT AGENT
│  ├─ Disponible?
│  │  └─ runDiagnostics() → ver logs
│  │
│  ├─ Provisioning funcionó?
│  │  └─ Terminal simulador → "✓ 4 devices provisioned"
│  │
│  └─ Atributos correctos?
│     └─ Buscar en runDiagnostics() → "PM10", "LAeq"
│
└─ SIMULADOR
   ├─ Corriendo?
   │  └─ Terminal visible con "STEP 2: Sending data"
   │
   ├─ Generando datos?
   │  └─ Ver "PM10=65.4, PM2.5=28.5" cada 5 iteraciones
   │
   └─ Enviando al IoT Agent?
      └─ Ver "[#1] 14:30:45 → 4/4 devices sent"
```

---

## 🐛 PROBLEMAS ESPECÍFICOS

### Problema: "Fiware-Service" no es correcto

El JavaScript usa:
```javascript
const FIWARE_SERVICE = "air_noise";
```

El script Python usa:
```python
FIWARE_SERVICE = "air_noise"
```

✅ **Deben coincidir**. Si cambiaste uno, cambia el otro también.

---

### Problema: Headers faltantes

Si ves en la consola:
```
[ERROR] Orion unavailable: Failed to fetch
```

**Verifica:**
El JavaScript debe enviar:
```javascript
headers: {
  "Accept": "application/ld+json",
  "Fiware-Service": "air_noise",
  "Fiware-ServicePath": "/",  // IMPORTANTE!
}
```

---

### Problema: Atributos con nombre incorrecto

El script Python mapea:
```python
"pm10" → "PM10"
"pm25" → "PM2_5"
"laeq" → "LAeq"
```

El JavaScript busca:
```javascript
PM10: extractPropertyValue(entity.PM10),
PM2_5: extractPropertyValue(entity.PM2_5),
LAeq: extractPropertyValue(entity.LAeq),
```

✅ **Deben coincidir exactamente** (mayúsculas/minúsculas importan)

---

## 📋 LOGS QUE DEBES VER

### Terminal del Simulador

```bash
$ python scripts/iot_agent_simulator.py

============================================================
🚀 IoT Agent Simulator - Auto-Provisioning & Data Sending
============================================================

📋 STEP 1: Provisioning devices...
   IoT Agent: http://localhost:4041
   Orion: http://localhost:1026
   Fiware-Service: air_noise

  ✓ air-sensor-madrid provisioned
  ✓ air-sensor-barcelona provisioned
  ✓ noise-sensor-madrid provisioned
  ✓ noise-sensor-barcelona provisioned

✅ All devices provisioned successfully

📡 STEP 2: Sending data...

[#1] 14:30:45 → 4/4 devices sent
[#2] 14:30:50 → 4/4 devices sent
[#3] 14:30:55 → 4/4 devices sent
  → Madrid Air: PM10=65.4, PM2.5=28.5, NO2=89.5, O3=62.8
  → Madrid Noise: LAeq=72.5, LAmax=85.2
```

### Consola del Navegador

```javascript
[DEBUG] Starting fetchCurrentData...
[DEBUG] Fetching AirQualityObserved entities from: http://localhost:1026/ngsi-ld/v1/entities?type=AirQualityObserved
[DEBUG] Orion AirQualityObserved response status: 200
[DEBUG] Air entities from Orion: 2
[DEBUG] Processing air entity for Madrid: {id: "urn:ngsi-ld:AirQualityObserved:Madrid:Centro", PM10: 65.4, ...}
[DEBUG] Converted sensor object: {id: "...", PM10: 65.4, PM2_5: 28.5, ...}
✅ Loaded 2 cities
   Orion available: true
   QuantumLeap available: false
```

---

## 🆘 Si NADA FUNCIONA

Ejecuta esto paso a paso:

### 1. Reinicia Docker

```bash
cd fiware
docker-compose down
docker-compose up -d
# Espera 60 segundos
docker-compose ps
```

### 2. Reinicia el Simulador

```bash
cd ../
# Si está corriendo: Ctrl+C
python scripts/iot_agent_simulator.py
```

### 3. Limpia caché del navegador

- Presiona `Ctrl+Shift+Delete` (o `Cmd+Shift+Delete` en Mac)
- Selecciona "Todo el tiempo"
- Click en "Limpiar datos"
- Actualiza http://localhost:3000

### 4. Ejecuta el Diagnóstico

- Abre Console (F12)
- Escribe: `runDiagnostics()`
- Presiona Enter
- Captura el output completo

### 5. Comparte el Resultado

Si sigues sin ver datos, comparte el output de:
```bash
# Terminal 1: Docker logs
docker-compose logs orion-ld | tail -50

# Terminal 2: Simulador logs
python scripts/iot_agent_simulator.py 2>&1 | head -100

# Terminal 3: Diagnóstico del navegador (Copy-paste console output)
```

---

## 📞 COMMON RESPONSES

### "Connection refused" en puerto 1026

```bash
# Verificar que Orion está corriendo
docker-compose ps
# Si no está en la lista, hacer:
docker-compose up -d orion-ld
# Esperar 30 segundos
docker-compose logs orion-ld | tail -20
```

### "No entities found" pero el simulador envía 4/4

```bash
# Verificar que el provisioning funcionó
curl http://localhost:4041/iot/devices \
  -H "Fiware-Service: air_noise" | python3 -m json.tool

# Debería mostrar 4 dispositivos con sus atributos
```

### "Attribute names mismatch"

Compara exactamente (mayúsculas/minúsculas):

| Evento | Python | Orion | JavaScript |
|--------|--------|-------|-----------|
| PM10   | pm10   | PM10  | PM10 ✓    |
| PM2.5  | pm25   | PM2_5 | PM2_5 ✓   |
| LAeq   | laeq   | LAeq  | LAeq ✓    |

Si alguno no coincide, el valor será `null` → `0` en la UI.

---

## ✅ ESTADO FINAL CORRECTO

```
Terminal 1 (Docker):
✓ mongodb (healthy)
✓ orion-ld (healthy)
✓ iot-agent-json (healthy)
✓ timescaledb (healthy)
✓ quantumleap (healthy)

Terminal 2 (Simulador):
✓ 4 devices provisioned
✓ 4/4 devices sent (iteraciones)
✓ PM10=65.4, LAeq=72.5 (valores reales)

Terminal 3 (Navegador F12):
✓ Air entities from Orion: 2
✓ Noise entities from Orion: 2
✓ Converted sensor object: {PM10: 65.4, ...}
✓ Loaded 2 cities

Pantalla:
✓ 4 tarjetas (Madrid Air, Madrid Noise, Barcelona Air, Barcelona Noise)
✓ Valores: PM10=65.4, LAeq=72.5, etc
✓ Actualizándose cada 5 segundos
```

---

**¡Si ves todo esto, estás 100% funcional!** 🚀
