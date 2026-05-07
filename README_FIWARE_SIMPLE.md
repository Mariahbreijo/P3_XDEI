# 🚀 FIWARE Smart Air & Noise Monitor - Quick Start

## Lo único que necesitas ejecutar:

```bash
# Terminal 1: Inicia servicios FIWARE
cd fiware
docker-compose up -d

# Espera 30 segundos a que estén listos...

# Terminal 2: Ejecuta el simulador (auto-provisiona + envía datos)
cd ../
.venv/bin/python scripts/iot_agent_simulator.py

# Terminal 3: Abre el navegador
# http://localhost:3000
```

## ✅ Eso es TODO

El simulador:
- ✅ Registra automáticamente los 4 dispositivos en IoT Agent
- ✅ Orion crea automáticamente las entidades AirQualityObserved y NoiseLevelObserved
- ✅ Envía datos aleatorios cada 5 segundos
- ✅ QuantumLeap almacena automáticamente los históricos
- ✅ Tu web recibe datos en tiempo real desde Orion + QuantumLeap

## 📊 Datos que se envían

**Sensores de Aire (Madrid + Barcelona):**
- PM10, PM2.5, NO2, O3, temperatura, humedad

**Sensores de Ruido (Madrid + Barcelona):**
- LAeq, LAmax, LA90, temperatura

Todos con **movimiento realista** (Brownian motion entre límites).

## 🎮 Opciones del simulador

```bash
# 20 iteraciones cada 5 segundos (default)
.venv/bin/python scripts/iot_agent_simulator.py

# 100 iteraciones cada 3 segundos
.venv/bin/python scripts/iot_agent_simulator.py --count 100 --interval 3

# Loop infinito (Ctrl+C para parar)
.venv/bin/python scripts/iot_agent_simulator.py --continuous

# Saltarse provisioning (si ya provistonaste antes)
.venv/bin/python scripts/iot_agent_simulator.py --skip-provision
```

## 🔍 Verificación (opcional)

```bash
# Ver todas las entidades en Orion
curl http://localhost:1026/ngsi-ld/v1/entities \
  -H "Accept: application/ld+json"

# Ver una entidad específica
curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro" \
  -H "Accept: application/ld+json"

# Ver históricos en QuantumLeap
curl "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro/attrs/PM10/value"
```

## 🏗️ Arquitectura

```
🌍 Simulador (números aleatorios)
    ↓ HTTP POST :4041/iot/json
📦 IoT Agent (auto-provisiona + mapea)
    ↓ NGSI-LD
🗂️ Orion-LD :1026 (datos actuales)
    ↓ Suscripción
⏰ QuantumLeap :8668 (históricos)
    ↓ TimescaleDB
🖥️ Frontend :3000 (lee ambos)
```

## 📝 Notas

- Los datos son **100% aleatorios**, generados por el simulador
- No necesitas CSV ni archivo externo
- El provisioning es **automático** la primera vez
- Si ejecutas de nuevo, detecta que ya existen y continúa
- Prueba con `--continuous` para monitoreo infinito
- Ver logs: `docker-compose logs -f orion-ld`

**¡Listo! Tu dashboard FIWARE real está funcionando!** 🎉
