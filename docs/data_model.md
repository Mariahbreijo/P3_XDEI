# Modelo de Datos NGSI-LD | Aplicación FIWARE de Calidad del Aire y Ruido Urbano

## 1. Propósito

Este documento recoge el subconjunto de entidades NGSI-LD que la implementación actual utiliza y genera por defecto en la demo. Está alineado con las entidades que el código del backend crea y consume (`AirQualityObserved`, `NoiseLevelObserved`).

## 2. Principios

- Seguir la estructura NGSI-LD básica (GeoProperty para `location`, `Property` para mediciones, `Relationship` para dispositivos).
- Incluir `observedAt` o `dateObserved` cuando sea relevante.
- Usar identidades URN del formato `urn:ngsi-ld:<Type>:ES-<City>-<id>` para demo.

Nota: En la versión actual se generan múltiples sensores por ciudad y por barrio (neighborhood). Los IDs de entidad y dispositivos siguen el patrón:

- Entidad: `urn:ngsi-ld:<Type>:ES-<City>-<Neighborhood>-<NN>` (ej. `urn:ngsi-ld:AirQualityObserved:ES-Madrid-Centro-01`)
- Dispositivo / device_id (IoT Agent): `<type>-sensor-<city>-<neighborhood>-<NN>` (ej. `air-sensor-madrid-centro-01`)

Nota adicional: el frontend extrae el nombre de la zona/barrio directamente del `id` de la entidad cuando está disponible (p. ej. `Madrid-Centro-01`) y lo muestra en tooltips y popups del mapa para ayudar a la identificación rápida de ubicaciones. Las etiquetas UI derivadas de estos datos se localizan en español o inglés según el idioma activo.

Cada dispositivo provisionado incluye `static_attributes.location` (GeoProperty) con coordenadas ligeramente diferentes por sensor dentro de la misma zona para permitir clustering en el frontend.

## 3. Entidades usadas en el repositorio

### 3.1 AirQualityObserved

Atributos relevantes observados en el código:
- `id` (ej. `urn:ngsi-ld:AirQualityObserved:ES-Madrid-01`)
- `type`: `AirQualityObserved`
- `location`: `GeoProperty` con `Point` WGS84
- `address`: `Property` con `addressLocality`, `streetAddress`, `addressCountry`
- `refDevice`: `Relationship` (URN del dispositivo)
- `dateObserved`: `Property` (ISO timestamp)
- `CO2`, `PM1`, `PM2_5`, `PM10`, `NO2`, `O3`: `Property` con `value` y `unitCode`
 - `CO2`, `PM1`, `PM2_5`, `PM10`, `NO2`, `O3`: `Property` con `value` y `unitCode` (nota: `O3` está incluido por defecto en los sensores de aire)
- `temperature`, `relativeHumidity`, `airQualityIndex`, `airQualityLevel`

Notas de uso:
- El backend local calcula `airQualityIndex` a partir de `PM2_5`, `PM10`, `NO2`, `O3` con la función `calculate_ica()` en `backend/app/services/ica_calculator.py`.

### 3.2 NoiseLevelObserved

Atributos relevantes observados en el código:
- `id` (ej. `urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05`)
- `type`: `NoiseLevelObserved`
- `location`, `address`, `refDevice`, `dateObserved`
- `LAeq`, `LAmax`, `LA90`: `Property` con `value` y `unitCode`
- `temperature`, `windSpeed`, `noiseLevel` (clasificación calculada)

Notas de uso:
- El backend clasifica `noiseLevel` usando `classify_noise_level()` en `ica_calculator.py`.

## 4. Ejemplos de entidades (demo)

AirQualityObserved ejemplo (usado por `orion_service.bootstrap_demo_entities`):

```json
{
  "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-Centro-01",
  "type": "AirQualityObserved",
  "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}},
  "address": {"type": "Property", "value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
  "PM2_5": {"type": "Property", "value": 28.5, "unitCode": "UG_M3"},
  "PM10": {"type": "Property", "value": 65.4, "unitCode": "UG_M3"},
  "NO2": {"type": "Property", "value": 89.5, "unitCode": "UG_M3"},
  "O3": {"type": "Property", "value": 62.8, "unitCode": "UG_M3"}
}
```

NoiseLevelObserved ejemplo:

```json
{
  "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
  "type": "NoiseLevelObserved",
  "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [2.1734, 41.3851]}},
  "address": {"type": "Property", "value": {"streetAddress": "Av. Diagonal, 452", "addressLocality": "Barcelona", "addressCountry": "ES"}},
  "LAeq": {"type": "Property", "value": 72.5, "unitCode": "2N1"},
  "LAmax": {"type": "Property", "value": 85.2, "unitCode": "2N1"},
  "LA90": {"type": "Property", "value": 68.3, "unitCode": "2N1"}
}
```

## 5. Contratos y convenciones

- `unitCode` usa códigos simples (`UG_M3`, `PPM`, `CEL`, `2N1` para dB).
- Cuando se devuelven entidades desde el backend, se incluye `airQualityIndex` y `airQualityLevel` calculados localmente si no existen en Orion.
- Identificadores de sensor en el store local usan claves legibles (`madrid-air-01`, `barcelona-noise-05`) que se resuelven a URNs por `OrionService.resolve_entity_id()`.

### Frontend: `selectedSensor` (estado temporal)

El frontend mantiene un objeto `selectedSensor` en `window.appState` para facilitar la navegación hacia la vista detalle sin requerir inmediatamente una nueva consulta al backend. Estructura típica (sintética) usada por la UI:

```json
{
  "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
  "city": "Madrid",
  "category": "air",            // "air" | "noise"
  "coordinates": { "lat": 40.4168, "lon": -3.7038 },
  "values": { "pm25": 28.5, "pm10": 65.4, "no2": 89.5 },
  "source": { /* raw NGSI-LD entity if needed */ }
}
```

Notas:
- `selectedSensor` es un estado UI — la fuente de verdad sigue siendo Orion/Backend para datos históricos o consultas detalladas.
- El módulo `sensor_detail.js` consume `selectedSensor` para renderizar nombre, ciudad y tipo de sensor; puede solicitar históricos posteriormente usando `/api/v1/air-quality/{sensor_id}` o el proxy a Orion.

### Frontend: modelos derivados para vista `detail`

Para enriquecer la experiencia en cliente, la vista detalle utiliza modelos derivados calculados localmente.

#### `weeklyHistory` (derivado)

La propiedad `day` es una etiqueta de interfaz, no parte del contrato NGSI-LD. El frontend la genera con i18n y la muestra en español por defecto o en inglés cuando se activa ese idioma.

```json
[
  {
    "day": "Lunes",
    "values": {
      "pm25": 18.2,
      "pm10": 33.5,
      "no2": 21.0,
      "o3": 54.3,
      "ica": 57
    },
    "status": "Moderado"
  }
]
```

Para sensores de ruido:

```json
[
  {
    "day": "Lunes",
    "values": {
      "laeq": 67.4,
      "lamax": 75.8,
      "la90": 61.2
    },
    "status": "Moderado"
  }
]
```

#### `whoAlert` (derivado por métrica OMS)

```json
{
  "key": "pm25",
  "value": 18.2,
  "level": "warning"
}
```

Convención de niveles UI:
- `safe`: valor <= límite OMS.
- `warning`: valor > límite OMS y <= 2x límite.
- `danger`: valor > 2x límite.

#### Límites OMS usados en frontend

```json
{
  "pm25": 15,
  "pm10": 45,
  "no2": 25,
  "o3": 100,
  "laeq": 55
}
```

Unidades:
- `pm25`, `pm10`, `no2`, `o3`: `µg/m³`.
- `laeq`: `dB`.

#### `healthRecommendations` (derivado contextual)

El texto de las recomendaciones también se localiza en la capa frontend; el contenido puede variar entre español e inglés sin cambiar la estructura del dato.

```json
[
  { "icon": "😷", "text": "Usar mascarilla en exteriores" },
  { "icon": "🫧", "text": "Usar purificador de aire" }
]
```

Regla de coherencia:
- Si `mode = air`, se generan recomendaciones respiratorias y de exposición ambiental.
- Si `mode = noise`, se generan recomendaciones acústicas (sin mascarilla/purificador).

---

Si se desea que este documento sea compatible con un catálogo Smart Data Models público, la siguiente iteración añadirá enlaces a las especificaciones oficiales y normalizará nombres de atributos (por ejemplo `pm25` vs `PM2_5`).

---

## 3. ENTIDAD: NoiseLevelObserved (Observación de Niveles de Ruido)

### 3.1 Atributos Estáticos

```json
{
  "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-noise-sensor-05",
  "type": "NoiseLevelObserved",

  "location": {
    "type": "GeoProperty",
    "value": {
      "type": "Point",
      "coordinates": [2.1734, 41.3851]
    }
  },

  "address": {
    "type": "Property",
    "value": {
      "streetAddress": "Av. Diagonal, 452",
      "addressLocality": "Barcelona",
      "addressCountry": "ES",
      "postalCode": "08006"
    }
  },

  "refDevice": {
    "type": "Relationship",
    "object": "urn:ngsi-ld:Device:noise-sensor-barcelona-05",
    "value": {
      "deviceType": "NoiseLevelSensor",
      "manufacturer": "Svantek",
      "model": "SV971",
      "calibrationDate": "2026-01-15"
    }
  },

  "refPointOfInterest": {
    "type": "Relationship",
    "object": "urn:ngsi-ld:PointOfInterest:ES-Barcelona-av-diagonal"
  }
}
```

### 3.2 Atributos Dinámicos

```json
{
  "dateObserved": {
    "type": "Property",
    "value": "2026-04-27T14:30:00Z"
  },

  "LAeq": {
    "type": "Property",
    "value": 72.5,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel de presión sonora equivalente ponderado A (dB)"
  },

  "LAmax": {
    "type": "Property",
    "value": 85.2,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel máximo de presión sonora ponderado A"
  },

  "LAmin": {
    "type": "Property",
    "value": 62.1,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel mínimo de presión sonora ponderado A"
  },

  "LA90": {
    "type": "Property",
    "value": 68.3,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel percentil 90 (ruido de fondo)"
  },

  "LC": {
    "type": "Property",
    "value": 79.1,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel de presión sonora ponderado C (riesgo de daño auditivo)"
  },

  "LIN": {
    "type": "Property",
    "value": 80.5,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Nivel de presión sonora lineal (sin ponderación)"
  },

  "measuringPeriod": {
    "type": "Property",
    "value": 300,
    "unitCode": "SEC",
    "description": "Período de medición en segundos"
  },

  "noiseLevel": {
    "type": "Property",
    "value": "MODERATE",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Clasificación: QUIET (<55dB), MODERATE (55-70dB), LOUD (70-85dB), VERY_LOUD (>85dB)"
  },

  "noisePollutionLevel": {
    "type": "Property",
    "value": 72.5,
    "unitCode": "2N1",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Índice de contaminación acústica (similar a LAeq pero con contexto ambiental)"
  },

  "frequency": {
    "type": "Property",
    "value": {
      "ranges": [
        {"frequency": "125Hz", "level": 65.2},
        {"frequency": "250Hz", "level": 68.5},
        {"frequency": "500Hz", "level": 71.2},
        {"frequency": "1000Hz", "level": 73.8},
        {"frequency": "2000Hz", "level": 70.5},
        {"frequency": "4000Hz", "level": 68.1},
        {"frequency": "8000Hz", "level": 62.3}
      ]
    },
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Análisis de frecuencias en bandas de octava"
  },

  "dominantFrequency": {
    "type": "Property",
    "value": 1000,
    "unitCode": "HZ",
    "observedAt": "2026-04-27T14:30:00Z"
  },

  "temperature": {
    "type": "Property",
    "value": 20.3,
    "unitCode": "CEL",
    "observedAt": "2026-04-27T14:30:00Z",
    "description": "Temperatura ambiente (afecta velocidad del sonido)"
  },

  "windSpeed": {
    "type": "Property",
    "value": 3.2,
    "unitCode": "M_S",
    "observedAt": "2026-04-27T14:30:00Z"
  },

  "timeWeighting": {
    "type": "Property",
    "value": "FAST",
    "description": "Ponderación temporal: FAST (125ms), SLOW (1s), IMPULSE (35ms)"
  }
}
```

### 3.3 Ejemplo Completo

```json
{
  "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-noise-05",
  "type": "NoiseLevelObserved",
  "location": {
    "type": "GeoProperty",
    "value": {
      "type": "Point",
      "coordinates": [2.1734, 41.3851]
    }
  },
  "address": {
    "type": "Property",
    "value": {
      "streetAddress": "Av. Diagonal, 452",
      "addressLocality": "Barcelona",
      "addressCountry": "ES"
    }
  },
  "dateObserved": {
    "type": "Property",
    "value": "2026-04-27T14:30:00Z"
  },
  "LAeq": {
    "type": "Property",
    "value": 72.5,
    "unitCode": "2N1"
  },
  "LAmax": {
    "type": "Property",
    "value": 85.2,
    "unitCode": "2N1"
  },
  "LA90": {
    "type": "Property",
    "value": 68.3,
    "unitCode": "2N1"
  },
  "noiseLevel": {
    "type": "Property",
    "value": "MODERATE"
  }
}
```

---

## 4. TABLA COMPARATIVA: Atributos Estáticos vs Dinámicos

### AirQualityObserved

| Atributo | Tipo | Actualización | Fuente | Unidad |
|----------|------|---------------|--------|--------|
| `location` | GeoProperty | Una vez | Configuración | WGS84 |
| `address` | Property | Una vez | Configuración | Texto |
| `refDevice` | Relationship | Una vez | Configuración | URI |
| `CO2` | Property | 5-15 min | Sensor | PPM |
| `PM2_5` | Property | 1-5 min | Sensor | μg/m³ |
| `NO2` | Property | 1-5 min | Sensor | μg/m³ |
| `airQualityIndex` | Property | 1-5 min | Calculado | Índice |
| `airQualityLevel` | Property | 1-5 min | Derivado | Categoría |

### NoiseLevelObserved

| Atributo | Tipo | Actualización | Fuente | Unidad |
|----------|------|---------------|--------|--------|
| `location` | GeoProperty | Una vez | Configuración | WGS84 |
| `address` | Property | Una vez | Configuración | Texto |
| `refDevice` | Relationship | Una vez | Configuración | URI |
| `LAeq` | Property | 1-5 min | Sensor | dB |
| `LAmax` | Property | 1-5 min | Sensor | dB |
| `LA90` | Property | 1-5 min | Sensor | dB |
| `noiseLevel` | Property | 1-5 min | Calculado | Categoría |
| `frequency` | Property | 15-60 min | Sensor | Hz/dB |

---

## 5. MODELO JSON-LD Context

```json
{
  "@context": {
    "ngsi-ld": "https://uri.etsi.org/ngsi-ld/",
    "fiware": "https://schema.lab.fiware.org/",
    "saref": "https://saref.etsi.org/core/",
    "smartdatamodels": "https://smartdatamodels.org/",
    "sdm-env": "https://smartdatamodels.org/environment/",

    "AirQualityObserved": "https://smartdatamodels.org/environment/AirQualityObserved",
    "NoiseLevelObserved": "https://smartdatamodels.org/environment/NoiseLevelObserved",

    "CO2": "https://smartdatamodels.org/environment/CO2",
    "PM2_5": "https://smartdatamodels.org/environment/PM2_5",
    "PM10": "https://smartdatamodels.org/environment/PM10",
    "NO2": "https://smartdatamodels.org/environment/NO2",
    "O3": "https://smartdatamodels.org/environment/O3",
    "airQualityIndex": "https://smartdatamodels.org/environment/airQualityIndex",

    "LAeq": "https://smartdatamodels.org/environment/LAeq",
    "LAmax": "https://smartdatamodels.org/environment/LAmax",
    "noiseLevel": "https://smartdatamodels.org/environment/noiseLevel"
  }
}
```

---

## 6. Convenciones de Nomenclatura

- **Entidades**: PascalCase con prefijo `urn:ngsi-ld:` (ej: `urn:ngsi-ld:AirQualityObserved:ES-Madrid-01`)
- **Atributos**: camelCase, coincidiendo con Smart Data Models
- **Unidades**: Se especifican en `unitCode` (UNECE Code39 o similar)
- **Timestamps**: ISO 8601 en UTC (ej: `2026-04-27T14:30:00Z`)
- **Geolocalización**: GeoJSON Point en formato `[longitude, latitude]`

---

## 7. Estrategia de Persistencia Histórica (QuantumLeap)

Las siguientes entidades se envían automáticamente a QuantumLeap para almacenamiento en CrateDB:

```
Topic: /fiware/data/environment/air
Entity: AirQualityObserved
Attributes to persist:
  - CO2, PM2_5, PM10, NO2, O3
  - temperature, relativeHumidity
  - airQualityIndex, airQualityLevel
  - Timestamp: dateObserved

Topic: /fiware/data/environment/noise
Entity: NoiseLevelObserved
Attributes to persist:
  - LAeq, LAmax, LA90
  - noiseLevel, noisePollutionLevel
  - Timestamp: dateObserved
```

---

## 8. Referencias Normativas

- **NGSI-LD**: https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.01.01_60/gs_CIM_009v010101p.pdf
- **Smart Data Models Environment**: https://smartdatamodels.org/environment/
- **UNECE Units of Measure**: https://www.unece.org/cefact/recommendations/
- **ICA Cálculo (WHO 2021)**: https://www.who.int/publications/i/item/9789240034228

