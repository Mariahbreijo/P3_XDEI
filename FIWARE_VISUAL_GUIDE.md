# 🚀 SISTEMA FIWARE - GUÍA RÁPIDA (Español)

## ¿Cómo funciona?

```
┌─────────────────────────────────────────────────────────────────┐
│                      TU SIMULADOR PYTHON                        │
│  (genera números aleatorios: PM10, PM2.5, NO2, LAeq, etc)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP POST :4041/iot/json
                         │ (auto-provisiona + envía datos)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 IoT AGENT (Puerto 4041)                         │
│  ✓ Registra dispositivos automáticamente                        │
│  ✓ Mapea object_id → nombres NGSI-LD (PM10, LAeq, etc)        │
│  ✓ Crea entidades en Orion                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ NGSI-LD Format
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ORION-LD (Puerto 1026)                             │
│  📦 Context Broker                                              │
│  ✓ Almacena ESTADO ACTUAL de entidades                         │
│  ✓ Entidades: AirQualityObserved, NoiseLevelObserved           │
│  ✓ Atributos: PM10, PM2.5, NO2, O3, LAeq, LAmax, LA90          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Suscripción: "Notifícame cambios"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           QUANTUMLEAP (Puerto 8668)                             │
│  ⏰ Time Series Database                                         │
│  ✓ Almacena HISTÓRICOS                                          │
│  ✓ Base de datos: TimescaleDB (PostgreSQL)                      │
│  ✓ Gráficas con datos históricos                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         │ fetch datos actuales           │ fetch históricos
         │ /ngsi-ld/v1/entities          │ /v1/entities/.../attrs/
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              TU PÁGINA WEB (Puerto 3000)                        │
│  🖥️  Frontend (app_fiware.js)                                    │
│  ✓ Lee DATOS ACTUALES de Orion (tiempo real)                   │
│  ✓ Lee HISTÓRICOS de QuantumLeap (gráficas)                    │
│  ✓ Muestra 4 sensores: Madrid aire, Madrid ruido,              │
│    Barcelona aire, Barcelona ruido                              │
│  ✓ PM10 > 50 = "Malo" en rojo                                   │
│  ✓ Métrica con explicaciones educativas                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 PASO 1: Arrancar Docker

```bash
cd fiware
docker-compose up -d

# Esperar 30-60 segundos...
docker-compose ps
```

✅ Servicios que se inician:
- MongoDB (base de datos de Orion)
- Orion-LD (Context Broker)
- IoT Agent JSON (convierte HTTP → NGSI-LD)
- TimescaleDB (base de datos de históricos)
- QuantumLeap (API Time Series)

## 📡 PASO 2: Ejecutar Simulador

```bash
cd ../
.venv/bin/python scripts/iot_agent_simulator.py
```

✅ Qué hace automáticamente:
1. **PROVISIONA** 4 dispositivos en IoT Agent
2. **MAPEA** atributos (pm10 → PM10, laeq → LAeq, etc)
3. **ENVÍA** números aleatorios cada 5 segundos
4. **CREA** entidades en Orion automáticamente
5. **GUARDA** históricos en QuantumLeap automáticamente

## 🖥️ PASO 3: Ver Resultados

```bash
# Abre tu navegador
http://localhost:3000
```

✅ Verás:
- Tarjetas de 4 ciudades (Madrid + Barcelona, aire + ruido)
- Datos ACTUALES desde Orion (PM10, LAeq, etc)
- Métricas con EXPLICACIONES educativas
- PM10 > 50 → "Malo" en ROJO

---

## 🔧 OPCIONES AVANZADAS

### Ejecutar indefinidamente

```bash
.venv/bin/python scripts/iot_agent_simulator.py --continuous
# Ctrl+C para parar
```

### Cambiar intervalo

```bash
# Enviar datos cada 3 segundos, 100 veces
.venv/bin/python scripts/iot_agent_simulator.py --count 100 --interval 3
```

### Saltarse provisioning (si ya provistonaste)

```bash
.venv/bin/python scripts/iot_agent_simulator.py --skip-provision
```

---

## 🔍 VERIFICACIÓN MANUAL

### Ver todas las entidades en Orion

```bash
curl http://localhost:1026/ngsi-ld/v1/entities \
  -H "Accept: application/ld+json" | python3 -m json.tool
```

**Esperado:**
```json
[
  {
    "id": "urn:ngsi-ld:AirQualityObserved:Madrid:Centro",
    "type": "AirQualityObserved",
    "PM10": {"type": "Property", "value": 65.4},
    "PM2_5": {"type": "Property", "value": 28.5},
    ...
  },
  ...
]
```

### Ver una entidad específica

```bash
curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro" \
  -H "Accept: application/ld+json" | python3 -m json.tool
```

### Ver históricos en QuantumLeap

```bash
curl "http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro/attrs/PM10/value?lastN=10"
```

**Esperado:**
```json
[65.4, 67.2, 63.8, 68.1, ...]  # Últimos 10 valores de PM10
```

### Ver dispositivos provistonados

```bash
curl http://localhost:4041/iot/devices \
  -H "Fiware-Service: air_noise" | python3 -m json.tool
```

---

## 📊 DATOS QUE SE GENERAN

### Sensores de Aire (2 ciudades × 2 atributos)

| Dispositivo | Atributos |
|-------------|-----------|
| air-sensor-madrid | PM10, PM2.5, NO2, O3, temperatura, humedad |
| air-sensor-barcelona | PM10, PM2.5, NO2, O3, temperatura, humedad |

**Rango realista:**
- PM10: 20-90 µg/m³
- PM2.5: 8-60 µg/m³
- NO2: 30-150 µg/m³
- O3: 18-100 µg/m³

### Sensores de Ruido (2 ciudades)

| Dispositivo | Atributos |
|-------------|-----------|
| noise-sensor-madrid | LAeq, LAmax, LA90, temperatura |
| noise-sensor-barcelona | LAeq, LAmax, LA90, temperatura |

**Rango realista:**
- LAeq: 50-85 dB
- LAmax: 65-100 dB
- LA90: 45-80 dB

### Movimiento Realista

Todos los valores usan **Brownian motion** (caminata aleatoria):
- Cambios suaves y realistas
- Dentro de límites físicos
- Simula variabilidad temporal

---

## 🛑 DETENER TODO

### Opción 1: Solo el simulador

```bash
Ctrl+C  # en terminal donde corre el simulador
```

### Opción 2: Todo (incluyendo Docker)

```bash
cd fiware
docker-compose down

# Para limpiar completamente (borra datos)
docker-compose down -v
```

---

## 🐛 TROUBLESHOOTING

### "Connection refused" en puerto 4041

```bash
# Verificar que IoT Agent está levantado
docker-compose ps | grep iot-agent-json

# Ver logs
docker-compose logs iot-agent-json
```

### "Orion version failed"

```bash
# Verificar MongoDB
docker-compose logs mongodb

# Reiniciar Orion
docker-compose restart orion-ld
```

### "QuantumLeap no guarda datos"

```bash
# Verificar suscripción existe
curl http://localhost:1026/ngsi-ld/v1/subscriptions \
  -H "Accept: application/ld+json"

# Ver logs de QuantumLeap
docker-compose logs quantumleap
```

### Frontend muestra "Cargando..." indefinidamente

```bash
# Abrir consola del navegador (F12)
# Buscar errores CORS o de conexión

# Verificar Orion responde
curl http://localhost:1026/version
```

---

## 📚 ARCHIVOS CLAVE

| Archivo | Propósito |
|---------|-----------|
| `scripts/iot_agent_simulator.py` | 📡 Simulador (auto-provisiona + envía datos) |
| `frontend/app_fiware.js` | 🖥️ Lee Orion + QuantumLeap |
| `fiware/docker-compose.yml` | 🐳 Servicios FIWARE |
| `README_FIWARE_SIMPLE.md` | 📖 Guía simple |
| `FIWARE_SETUP.md` | 📚 Documentación completa |

---

## ✅ CHECKLIST

- [ ] Docker instalado y corriendo
- [ ] `docker-compose up -d` ejecutado
- [ ] Orion responde en puerto 1026
- [ ] IoT Agent responde en puerto 4041
- [ ] `python iot_agent_simulator.py` ejecutado
- [ ] Frontend abierto en http://localhost:3000
- [ ] Veo tarjetas de 4 sensores (Madrid + Barcelona)
- [ ] Datos actualizándose cada 5 segundos
- [ ] PM10 > 50 muestra "Malo" en rojo

**¡TODO LISTO!** 🎉

---

## 🎓 CONCEPTOS FIWARE

- **IoT Agent**: Convierte datos de sensores (HTTP, MQTT) a NGSI-LD estándar
- **Orion**: Context Broker que almacena estado actual (like a NoSQL database)
- **Suscripción**: Regla que notifica a otros servicios cuando cambian datos
- **QuantumLeap**: Time Series Database para históricos y análisis
- **NGSI-LD**: Estándar europeo para entidades inteligentes (ISO/IEC 11582)

