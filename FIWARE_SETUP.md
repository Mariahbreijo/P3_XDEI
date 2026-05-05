# FIWARE Real Architecture - Guía de Instalación

## 📋 Flujo Completo

```
Sensores IoT
    ↓
[HTTP POST :4041/iot/json]  ← IoT Agent HTTP
    ↓
Orion-LD (puerto 1026)  [datos actuales]
    ↓
[Subscription]
    ↓
QuantumLeap (puerto 8668)  [históricos]
    ↓
Frontend (puerto 3000)  [lee Orion + QuantumLeap]
```

---

## 🚀 PASO 1: Iniciar Stack FIWARE (Docker)

Debes tener `docker-compose.yml` con estos servicios:
- **MongoDB** (puerto 27017)
- **Orion-LD** (puerto 1026)
- **IoT Agent HTTP** (puerto 4041)
- **QuantumLeap** (puerto 8668)

### Comando para iniciar:
```bash
cd fiware
docker compose up -d

# Verificar servicios están levantados
docker compose ps
```

### Verificar conectividad:
```bash
# Orion
curl -s http://localhost:1026/version | python3 -m json.tool

# IoT Agent
curl -s http://localhost:4041/version | python3 -m json.tool

# QuantumLeap
curl -s http://localhost:8668/version | python3 -m json.tool
```

---

## 📡 PASO 2: Configurar FIWARE (Dispositivos + Suscripciones)

Ejecuta el script de configuración:

```bash
cd scripts
bash fiware_setup.sh
```

Este script:
1. **Provisiona dispositivos** en IoT Agent (mapeo de atributos)
2. **Crea suscripciones** en Orion para enviar datos a QuantumLeap
3. **Verifica** que todo esté configurado

### Salida esperada:
```
✅ Devices provisioned
✅ Subscriptions created
✅ Setup Complete!
```

---

## 🔌 PASO 3: Ejecutar Simulador de Sensores

El simulador envía datos al IoT Agent por HTTP:

```bash
# Terminal 1
.venv/bin/python scripts/iot_agent_simulator.py --count 20 --interval 5
```

### Salida esperada:
```
🚀 IoT Agent Simulator starting
   IoT Agent: http://localhost:4041
   Fiware-Service: air_noise
   Devices: air-sensor-madrid, noise-sensor-madrid, ...

[#1] 14:30:45
  ✓ air-sensor-madrid: PM10=65.4 PM2.5=28.5 NO2=89.5
  ✓ noise-sensor-madrid: LAeq=72 LAmax=85
  ...
```

---

## 🖥️ PASO 4: Abrir Frontend

En otra terminal:

```bash
# Terminal 2 - Iniciar frontend (si no está corriendo)
cd frontend
python3 -m http.server 3000
```

Abre el navegador:
```
http://localhost:3000
```

### Consola del frontend mostrará:
```
🚀 Fetching current data...
   Orion: http://localhost:1026
   QuantumLeap: http://localhost:8668
   Backend (fallback): http://localhost:8000

✅ Loaded 2 cities
   Orion available: true
   QuantumLeap available: true
```

---

## 🔍 VERIFICACIÓN: Consultas Útiles

### 1. Ver todas las entidades en Orion
```bash
curl -s http://localhost:1026/ngsi-ld/v1/entities \
  -H "Accept: application/ld+json" \
  -H "Fiware-Service: air_noise" | python3 -m json.tool
```

### 2. Ver entidad específica en Orion
```bash
curl -s "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro" \
  -H "Accept: application/ld+json" \
  -H "Fiware-Service: air_noise" | python3 -m json.tool
```

### 3. Ver suscripciones en Orion
```bash
curl -s http://localhost:1026/ngsi-ld/v1/subscriptions \
  -H "Accept: application/ld+json" | python3 -m json.tool
```

### 4. Ver históricos en QuantumLeap
```bash
curl -s "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro/attrs/PM10/value" \
  -H "Fiware-Service: air_noise" | python3 -m json.tool
```

### 5. Ver dispositivos provistos en IoT Agent
```bash
curl -s http://localhost:4041/iot/devices \
  -H "Fiware-Service: air_noise" | python3 -m json.tool
```

---

## 🎯 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `scripts/iot_agent_simulator.py` | Simula sensores → IoT Agent |
| `scripts/fiware_setup.sh` | Provisiona dispositivos + suscripciones |
| `frontend/app_fiware.js` | Frontend FIWARE (lee Orion + QuantumLeap) |
| `frontend/index.html` | HTML (usa app_fiware.js) |
| `fiware/docker-compose.yml` | Stack FIWARE (Orion, IoT Agent, QuantumLeap) |

---

## 📊 Flujo de Datos en Detalle

### A) Entrada de datos (Simulador → Orion)
```
1. Simulador genera: {"pm10": 65.4, "pm25": 28.5, ...}
2. POST http://localhost:4041/iot/json?i=air-sensor-madrid&k=iot-agent-api-key-prod
3. IoT Agent mapea: PM10 → urn:ngsi-ld:AirQualityObserved:Madrid:Centro
4. Orion almacena entidad actualizada
```

### B) Replicación a histórico (Orion → QuantumLeap)
```
1. Suscripción en Orion detecta cambio en PM10
2. POST http://localhost:8668/v1/notify
3. QuantumLeap almacena en TimescaleDB/CrateDB
4. Frontend puede consultar históricos
```

### C) Lectura en Frontend (Orion + QuantumLeap)
```
1. Frontend carga: app_fiware.js
2. fetchEntitiesByTypeFromOrion("AirQualityObserved")
   → Lee datos ACTUALES de Orion
3. fetchHistoryFromQuantumLeap(entityId, "PM10")
   → Lee HISTÓRICOS para gráficas
4. Renderiza tarjetas con ambas fuentes
```

---

## ⚡ Troubleshooting

### Problema: "Orion connection refused"
```bash
# Verificar que Orion está levantado
docker ps | grep orion
docker logs orion-ld  # Ver logs

# Si no está, inicia servicios
cd fiware && docker compose up -d
```

### Problema: "IoT Agent endpoint not found"
```bash
# Verificar provisión de dispositivos
curl -s http://localhost:4041/iot/devices -H "Fiware-Service: air_noise" | python3 -m json.tool

# Si está vacío, ejecuta
bash scripts/fiware_setup.sh
```

### Problema: "QuantumLeap no tiene datos históricos"
```bash
# Verificar suscripciones en Orion
curl -s http://localhost:1026/ngsi-ld/v1/subscriptions -H "Accept: application/ld+json" | python3 -m json.tool

# Ver si las notificaciones se envían (logs de QuantumLeap)
docker logs quantumleap
```

### Problema: Frontend muestra "Cargando..."
```bash
# Abrir consola del navegador (F12)
# Ver qué endpoints está intentando acceder
# Verificar CORS headers:
curl -I http://localhost:1026/ngsi-ld/v1/entities
```

---

## 🎓 Conceptos Clave

- **IoT Agent**: Traduce datos de sensores (HTTP) a NGSI-LD
- **Orion**: Context Broker (almacena estado actual de entidades)
- **Suscripción**: Regla que envía notificaciones cuando cambian atributos
- **QuantumLeap**: Time Series Database (almacena histórico)
- **NGSI-LD**: Estándar para describir entidades inteligentes

---

## 🔗 Recursos

- [FIWARE Documentation](https://fiware-tutorials.readthedocs.io/)
- [Orion-LD API](https://github.com/FIWARE/context.Orion-LD)
- [IoT Agent HTTP](https://github.com/FIWARE/iotagent-node-lib)
- [QuantumLeap](https://github.com/orchestracities/ngsi-timeseries-api)

---

## ✅ Checklist de Validación

- [ ] Docker services levantados (`docker compose ps`)
- [ ] Orion responde en `http://localhost:1026/version`
- [ ] IoT Agent responde en `http://localhost:4041/version`
- [ ] QuantumLeap responde en `http://localhost:8668/version`
- [ ] Dispositivos provistos (`bash fiware_setup.sh` ejecutado)
- [ ] Suscripciones creadas (verificar en Orion)
- [ ] Simulador ejecutándose (`python iot_agent_simulator.py`)
- [ ] Frontend abierto en `http://localhost:3000`
- [ ] Datos visibles en frontend (5 ciudades, etiquetas claras)
- [ ] PM10 > 50 muestra "Malo" en rojo
- [ ] Gráficas muestran históricos de QuantumLeap
