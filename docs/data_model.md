# Modelo de Datos NGSI-LD | Aplicación FIWARE de Calidad del Aire y Ruido Urbano

## 1. Propósito

Este documento describe el contrato de datos que usa la implementación actual. La fuente de verdad sigue siendo Orion-LD, mientras que el backend calcula derivados como `airQualityIndex`, `airQualityLevel` y `noiseLevel` cuando la entidad no los trae ya resueltos.

## 2. Convenciones generales

- Entidades NGSI-LD con identificadores URN: `urn:ngsi-ld:<Type>:ES-<City>-<Neighborhood>-<NN>`.
- `location` se modela como `GeoProperty` con un `Point` WGS84.
- `address`, métricas y estados se modelan como `Property`.
- `refDevice` se modela como `Relationship` cuando hay dispositivo asociado.
- Los atributos de medida usan `unitCode` y valores numéricos simples para facilitar el consumo en frontend.

## 3. Entidades principales

### 3.1 `AirQualityObserved`

Entidad de observación de aire usada por la demo y por el bootstrap de Orion.

Atributos usados por el código actual:
- `id`
- `type = AirQualityObserved`
- `location`
- `address`
- `refDevice`
- `dateObserved`
- `CO2`
- `PM1`
- `PM2_5`
- `PM10`
- `NO2`
- `O3`
- `temperature`
- `relativeHumidity`
- `airQualityIndex` derivado por el backend cuando procede
- `airQualityLevel` derivado por el backend cuando procede

Ejemplo mínimo:

```json
{
  "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
  "type": "AirQualityObserved",
  "location": {
    "type": "GeoProperty",
    "value": { "type": "Point", "coordinates": [-3.7038, 40.4168] }
  },
  "address": {
    "type": "Property",
    "value": {
      "streetAddress": "Plaza Mayor",
      "addressLocality": "Madrid",
      "addressCountry": "ES"
    }
  },
  "refDevice": {
    "type": "Relationship",
    "object": "urn:ngsi-ld:Device:airquality-sensor-madrid-01"
  },
  "dateObserved": {
    "type": "Property",
    "value": "2026-04-27T14:30:00Z"
  },
  "PM2_5": { "type": "Property", "value": 28.5, "unitCode": "UG_M3" },
  "PM10": { "type": "Property", "value": 65.4, "unitCode": "UG_M3" },
  "NO2": { "type": "Property", "value": 89.5, "unitCode": "UG_M3" },
  "O3": { "type": "Property", "value": 62.8, "unitCode": "UG_M3" }
}
```

### 3.2 `NoiseLevelObserved`

Entidad de observación de ruido usada por la demo y por el bootstrap de Orion.

Atributos usados por el código actual:
- `id`
- `type = NoiseLevelObserved`
- `location`
- `address`
- `refDevice`
- `dateObserved`
- `LAeq`
- `LAmax`
- `LA90`
- `temperature`
- `windSpeed`
- `noiseLevel` derivado por el backend cuando procede

Ejemplo mínimo:

```json
{
  "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
  "type": "NoiseLevelObserved",
  "location": {
    "type": "GeoProperty",
    "value": { "type": "Point", "coordinates": [2.1734, 41.3851] }
  },
  "address": {
    "type": "Property",
    "value": {
      "streetAddress": "Av. Diagonal, 452",
      "addressLocality": "Barcelona",
      "addressCountry": "ES"
    }
  },
  "refDevice": {
    "type": "Relationship",
    "object": "urn:ngsi-ld:Device:noise-sensor-barcelona-05"
  },
  "dateObserved": {
    "type": "Property",
    "value": "2026-04-27T14:30:00Z"
  },
  "LAeq": { "type": "Property", "value": 72.5, "unitCode": "2N1" },
  "LAmax": { "type": "Property", "value": 85.2, "unitCode": "2N1" },
  "LA90": { "type": "Property", "value": 68.3, "unitCode": "2N1" }
}
```

## 4. Modelos derivados de frontend

### 4.1 `selectedSensor`

El frontend mantiene un objeto temporal `selectedSensor` en `window.appState` para abrir la vista detalle sin una nueva consulta inmediata.

```json
{
  "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
  "city": "Madrid",
  "category": "air",
  "coordinates": { "lat": 40.4168, "lon": -3.7038 },
  "values": { "pm25": 28.5, "pm10": 65.4, "no2": 89.5 },
  "source": {}
}
```

### 4.2 `weeklyHistory`

Histórico semanal sintético usado solo para visualización en la vista detalle.

Ejemplo aire:

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

Ejemplo ruido:

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

### 4.3 `whoAlert`

Estado visual por métrica para la vista detalle.

```json
{
  "key": "pm25",
  "value": 18.2,
  "level": "warning"
}
```

Niveles UI:
- `safe`: valor por debajo del límite OMS.
- `warning`: valor por encima del límite, pero sin llegar al doble.
- `danger`: valor igual o superior al doble del límite.

Límites usados en frontend:

```json
{
  "pm25": 15,
  "pm10": 45,
  "no2": 25,
  "o3": 100,
  "laeq": 55
}
```

### 4.4 `healthRecommendations`

La vista detalle usa recomendaciones generadas en backend con Gemini cuando está disponible. La UI mantiene fallback local para no bloquear la experiencia.

```json
[
  { "text": "Limita la actividad al aire libre" },
  { "text": "Mantente informado sobre la evolución de los niveles" }
]
```

Regla funcional:
- Si `mode = air`, las recomendaciones deben hablar de exposición respiratoria, ventilación y calidad del aire.
- Si `mode = noise`, deben hablar de protección auditiva, reducción de exposición y descanso acústico.

## 5. Contrato de recomendaciones IA

El backend expone `POST /api/v1/recommendations` y devuelve un objeto normalizado:

```json
{
  "used_llm": true,
  "alert_message": "...",
  "summary": "...",
  "recommendations": ["...", "..."]
}
```

Si Gemini no está disponible o la clave no está configurada, el backend responde con el fallback local y `used_llm = false`.

## 6. Persistencia histórica

QuantumLeap se consulta para históricos cuando está disponible.

- Aire: `PM2_5`, `PM10`, `NO2`, `O3`, `airQualityIndex`, `airQualityLevel`
- Ruido: `LAeq`, `LAmax`, `LA90`, `noiseLevel`

## 7. Notas de implementación

- El backend normaliza `AirQualityObserved` y `NoiseLevelObserved` desde Orion-LD.
- El frontend muestra las unidades en pantalla: `µg/m³` para contaminantes y `dB` para ruido.
- La zona o barrio puede derivarse del `id` de la entidad y mostrarse en tooltips y popups.
- La integración LLM está pensada para funcionar con Gemini, pero conserva una ruta compatible con OpenAI para futuras variantes.
