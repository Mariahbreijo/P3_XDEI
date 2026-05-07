# Análisis de Smart Data Models
## Atributos Estáticos vs Dinámicos para Air Quality y Noise Level

---

## 1. ENTIDAD: AirQualityObserved (Smart Data Models Environment Domain)

### Referencia Oficial
- URL: https://smartdatamodels.org/environment/AirQualityObserved
- Versión: 0.0.1
- Domain: Environment
- Maintainer: FIWARE Foundation

### 1.1 Atributos Estáticos (Static Properties)

Estos atributos definen la **ubicación y configuración del sensor** y **no cambian** durante el ciclo de vida de la entidad (salvo reubicación o recalibración).

#### 1.1.1 Identificación y Geolocalización

```yaml
ID_SENSOR:
  - name: id
  - type: String / URI
  - example: "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01"
  - es_estatico: true
  - frecuencia_cambio: Nunca (a menos que se reetiquete)
  - descripcion: "Identificador único de la observación de aire"

location:
  - name: location
  - type: GeoProperty (Point)
  - example: {"type": "Point", "coordinates": [-3.7038, 40.4168]}
  - es_estatico: true
  - frecuencia_cambio: Muy rara (si sensor se reubica)
  - precisión: WGS84 (EPSG:4326), ±5 metros
  - descripcion: "Coordenadas del sensor en formato GeoJSON"

address:
  - name: address
  - type: Property (Object)
  - fields:
    - streetAddress: "Calle/Avenida"
    - addressLocality: "Madrid"
    - addressCountry: "ES"
    - postalCode: "28001"
    - description: "Dirección descriptiva del sensor"
  - es_estatico: true
  - frecuencia_cambio: Muy rara (cambio de ubicación física)
  - descripcion: "Información administrativa de la localización"

altitudeAboveSeaLevel:
  - name: altitudeAboveSeaLevel
  - type: Property (Number)
  - unit: "m" (metros)
  - example: 650
  - es_estatico: true
  - frecuencia_cambio: Nunca
  - descripcion: "Altura sobre el nivel del mar (afecta presión atmosférica)"
```

#### 1.1.2 Configuración del Dispositivo

```yaml
refDevice:
  - name: refDevice
  - type: Relationship
  - example: "urn:ngsi-ld:Device:airquality-sensor-madrid-01"
  - es_estatico: true
  - frecuencia_cambio: Si sensor se reemplaza (~3-5 años)
  - descripcion: "Referencia a la entidad Device del sensor IoT"
  - includes:
    - deviceType: "AirQualitySensor"
    - manufacturer: "Sensirion"
    - model: "SCD4X"
    - serialNumber: "ABCD123456"
    - calibrationDate: "2026-01-15"
    - warrantyEndDate: "2027-01-15"

refPointOfInterest:
  - name: refPointOfInterest
  - type: Relationship (opcional)
  - example: "urn:ngsi-ld:PointOfInterest:ES-Madrid-plaza-mayor"
  - es_estatico: true
  - frecuencia_cambio: Nunca
  - descripcion: "Referencia a POI (parque, plaza, centro comercial)"

organizationResponsible:
  - name: organizationResponsible
  - type: Property
  - example: "Ayuntamiento de Madrid"
  - es_estatico: true
  - frecuencia_cambio: Rara
  - descripcion: "Entidad responsable del mantenimiento"
```

#### 1.1.3 Metadatos y Contexto

```yaml
sourceType:
  - name: sourceType
  - type: Property
  - values: ["sensor", "station", "mobile", "modelled"]
  - example: "sensor"
  - es_estatico: true
  - frecuencia_cambio: Nunca
  - descripcion: "Tipo de origen del dato"

areaServed:
  - name: areaServed
  - type: Property
  - example: "Centro Histórico de Madrid"
  - es_estatico: true
  - frecuencia_cambio: Muy rara
  - descripcion: "Zona administrativa que representa el sensor"
```

### 1.2 Atributos Dinámicos (Dynamic Properties)

Estos atributos **cambian constantemente** con cada observación del sensor (típicamente cada 1-5 minutos).

#### 1.2.1 Marca de Tiempo y Período

```yaml
dateObserved:
  - name: dateObserved
  - type: Property
  - format: ISO 8601 (2026-04-27T14:30:00Z)
  - es_dinamico: true
  - frecuencia_cambio: Cada observación (1-5 minutos)
  - descripcion: "Timestamp de la medición"

observationPeriod:
  - name: observationPeriod
  - type: Property (Integer)
  - unit: "s" (segundos)
  - example: 300
  - es_dinamico: true
  - frecuencia_cambio: Cada observación
  - descripcion: "Duración de la ventana de medición (típicamente 5 min)"
```

#### 1.2.2 Concentraciones de Contaminantes (Principal)

```yaml
CO2:
  - name: CO2
  - type: Property
  - unit: "PPM" (ppm - partes por millón)
  - range: [0, 5000]
  - example: 420.5
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±2%
  - descripcion: "Dióxido de carbono en la atmósfera"
  - importancia: MEDIA (indicador de calidad general)

PM1:
  - name: PM1
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 1000]
  - example: 12.3
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±1 µg/m³
  - descripcion: "Materia particulada < 1 micrón"
  - importancia: BAJA

PM2_5 (CRÍTICO):
  - name: PM2_5
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 2500]
  - example: 28.5
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±1 µg/m³
  - umbrales_who_2021:
    - Good:     [0, 15]
    - Moderate: [15, 35]
    - Poor:     [35, 75]
    - Very Poor: [75, ∞]
  - descripcion: "Materia particulada fina (2.5 µm) - Más peligrosa"
  - importancia: CRÍTICA
  - health_impact: "Entra en alvéolos pulmonares"

PM10 (CRÍTICO):
  - name: PM10
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 5000]
  - example: 65.4
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±2.5 µg/m³
  - umbrales_who_2021:
    - Good:     [0, 25]
    - Moderate: [25, 50]
    - Poor:     [50, 100]
    - Very Poor: [100, ∞]
  - descripcion: "Materia particulada gruesa (< 10 µm)"
  - importancia: CRÍTICA

NO (SECUNDARIO):
  - name: NO
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 500]
  - example: 45.2
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±1.5 µg/m³
  - descripcion: "Óxido de nitrógeno"
  - importancia: MEDIA (precursor de NO2)

NO2 (CRÍTICO):
  - name: NO2
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 500]
  - example: 89.5
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±2 µg/m³
  - umbrales_who_2021:
    - Good:     [0, 10]
    - Moderate: [10, 40]
    - Poor:     [40, 100]
    - Very Poor: [100, ∞]
  - descripcion: "Dióxido de nitrógeno (contaminante de tráfico)"
  - importancia: CRÍTICA
  - source: "Vehículos, plantas de energía"

NOx:
  - name: NOx
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 1000]
  - example: 134.7
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - descripcion: "Óxidos de nitrógeno totales (NO + NO2)"
  - importancia: MEDIA (información agregada)

SO2:
  - name: SO2
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 200]
  - example: 5.2
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±0.5 µg/m³
  - umbrales_who_2021:
    - Good:     [0, 8]
    - Moderate: [8, 26]
    - Poor:     [26, 50]
    - Very Poor: [50, ∞]
  - descripcion: "Dióxido de azufre (industria, calefacción)"
  - importancia: MEDIA

O3 (CRÍTICO):
  - name: O3
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 500]
  - example: 62.8
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - umbrales_who_2021:
    - Good:     [0, 50]
    - Moderate: [50, 100]
    - Poor:     [100, 150]
    - Very Poor: [150, ∞]
  - descripcion: "Ozono troposférico (contaminante secundario)"
  - importancia: CRÍTICA
  - formation: "NO2 + sunlight"

Benzene:
  - name: Benzene
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - range: [0, 50]
  - example: 2.1
  - es_dinamico: true
  - frecuencia_cambio: Cada 5-15 minutos (menos sensible)
  - precision: ±0.1 µg/m³
  - descripcion: "Compuesto orgánico volátil (carcinogénico)"
  - importancia: MEDIA
  - health_impact: "Cáncer de sangre/pulmón"

toluene:
  - name: toluene
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - example: 5.3
  - es_dinamico: true
  - frecuencia_cambio: Cada 5-15 minutos
  - descripcion: "Compuesto orgánico volátil"
  - importancia: BAJA

xylene:
  - name: xylene
  - type: Property
  - unit: "UG_M3" (µg/m³)
  - example: 3.7
  - es_dinamico: true
  - frecuencia_cambio: Cada 5-15 minutos
  - descripcion: "Compuesto orgánico volátil"
  - importancia: BAJA
```

#### 1.2.3 Parámetros Meteorológicos (Contexto)

```yaml
temperature:
  - name: temperature
  - type: Property
  - unit: "CEL" (Celsius)
  - range: [-40, 60]
  - example: 22.5
  - es_dinamico: true
  - frecuencia_cambio: Cada 5 minutos
  - precision: ±0.5°C
  - importancia: MEDIA
  - razon: "Afecta dispersión de contaminantes"

relativeHumidity:
  - name: relativeHumidity
  - type: Property
  - unit: "P1" (%)
  - range: [0, 100]
  - example: 65.0
  - es_dinamico: true
  - frecuencia_cambio: Cada 5 minutos
  - precision: ±2%
  - importancia: MEDIA

atmosphericPressure:
  - name: atmosphericPressure
  - type: Property
  - unit: "MBAR" (milibares)
  - range: [900, 1100]
  - example: 1013.25
  - es_dinamico: true
  - frecuencia_cambio: Cada 10 minutos
  - precision: ±1 mbar
  - importancia: BAJA
```

#### 1.2.4 Índices Calculados (Derivados)

```yaml
airQualityIndex (ICA):
  - name: airQualityIndex
  - type: Property
  - unit: "C62" (Índice adimensional 0-500)
  - range: [0, 500]
  - example: 65.0
  - es_dinamico: true
  - frecuencia_cambio: Cada 5 minutos
  - descripcion: "Índice agregado de calidad del aire"
  - formula: |
    ICA = MAX(
      subindex(PM2.5),
      subindex(PM10),
      subindex(NO2),
      subindex(O3)
    )
    Basado en EPA/AQI adaptado a WHO 2021
  - importancia: CRÍTICA
  - computed_by: "Backend API"

airQualityLevel:
  - name: airQualityLevel
  - type: Property
  - values: ["GOOD", "MODERATE", "POOR", "VERY_POOR"]
  - example: "GOOD"
  - es_dinamico: true
  - frecuencia_cambio: Cada 5 minutos
  - mapeo:
    - "GOOD":      ICA 0-50
    - "MODERATE":  ICA 51-100
    - "POOR":      ICA 101-150
    - "VERY_POOR": ICA > 150
  - importancia: CRÍTICA
  - computed_by: "Backend API"
```

#### 1.2.5 Metadatos de Medición

```yaml
accuracy:
  - name: accuracy
  - type: Property
  - unit: "%"
  - example: 2.0
  - es_dinamico: true
  - frecuencia_cambio: Por medición
  - descripcion: "Precisión de la lectura (margen de error)"

observedAt:
  - name: observedAt
  - type: Property
  - format: ISO 8601
  - es_dinamico: true
  - frecuencia_cambio: Cada observación
  - descripcion: "Timestamp de cuando se tomó la medición"

providedBy:
  - name: providedBy
  - type: Relationship
  - example: "urn:ngsi-ld:Device:sensor-madrid-01"
  - es_dinamico: true
  - frecuencia_cambio: Cada observación
  - descripcion: "Dispositivo que generó la observación"
```

---

## 2. ENTIDAD: NoiseLevelObserved (Smart Data Models Environment Domain)

### Referencia Oficial
- URL: https://smartdatamodels.org/environment/NoiseLevelObserved
- Versión: 0.0.1
- Domain: Environment
- Compliance: EU Directive 2002/49/CE

### 2.1 Atributos Estáticos

#### 2.1.1 Identificación y Ubicación

```yaml
ID_SENSOR:
  - name: id
  - type: String / URI
  - example: "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-noise-05"
  - es_estatico: true
  - frecuencia_cambio: Nunca
  - descripcion: "Identificador único"

location:
  - name: location
  - type: GeoProperty (Point)
  - example: {"type": "Point", "coordinates": [2.1734, 41.3851]}
  - es_estatico: true
  - frecuencia_cambio: Muy rara
  - precision: WGS84, ±3 metros
  - descripcion: "Coordenadas del micrófono"

address:
  - name: address
  - type: Property (Object)
  - fields:
    - streetAddress: "Av. Diagonal, 452"
    - addressLocality: "Barcelona"
    - addressCountry: "ES"
  - es_estatico: true
  - frecuencia_cambio: Muy rara
```

#### 2.1.2 Configuración del Dispositivo

```yaml
refDevice:
  - name: refDevice
  - type: Relationship
  - example: "urn:ngsi-ld:Device:noise-sensor-barcelona-05"
  - es_estatico: true
  - frecuencia_cambio: Si se reemplaza (~10 años)
  - includes:
    - deviceType: "NoiseLevelSensor"
    - manufacturer: "Svantek"
    - model: "SV971"
    - frequency_range: "10 Hz - 200 kHz"
    - calibrationDate: "2026-01-15"
    - microphoneType: "1/2 inch prepolarized condenser"

measurementHeightAboveGround:
  - name: measurementHeightAboveGround
  - type: Property
  - unit: "m" (metros)
  - example: 1.5
  - es_estatico: true
  - frecuencia_cambio: Muy rara
  - descripcion: "Altura del micrófono sobre el suelo (típicamente 1.5m)"

refPointOfInterest:
  - name: refPointOfInterest
  - type: Relationship
  - example: "urn:ngsi-ld:PointOfInterest:ES-Barcelona-av-diagonal"
  - es_estatico: true

sensorLocation:
  - name: sensorLocation
  - type: Property
  - values: ["facade", "free_field", "traffic_area", "residential"]
  - example: "free_field"
  - es_estatico: true
  - descripcion: "Clasificación del tipo de ubicación"
```

### 2.2 Atributos Dinámicos

#### 2.2.1 Marca de Tiempo

```yaml
dateObserved:
  - name: dateObserved
  - type: Property
  - format: ISO 8601
  - example: "2026-04-27T14:30:00Z"
  - es_dinamico: true
  - frecuencia_cambio: Cada observación (1-5 minutos)
```

#### 2.2.2 Métricas de Ruido Estándar (CRÍTICAS)

```yaml
LAeq (PRINCIPAL):
  - name: LAeq
  - type: Property
  - unit: "2N1" (dB)
  - range: [20, 140]
  - example: 72.5
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±0.5 dB
  - descripcion: "Nivel equivalente de presión sonora ponderado A"
  - definicion: "Promedio energético del ruido sobre período (típicamente 1 hora)"
  - umbrales_eu_2002_49:
    - Quiet:     < 55 dB
    - Moderate: 55-70 dB
    - Loud:     70-85 dB
    - Very Loud: > 85 dB
  - importancia: CRÍTICA
  - uso_regulatorio: "Base para cumplimiento normativo EU"

LAmax:
  - name: LAmax
  - type: Property
  - unit: "2N1" (dB)
  - range: [20, 140]
  - example: 85.2
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - precision: ±1 dB
  - descripcion: "Nivel máximo de presión sonora ponderado A"
  - definicion: "Pico más alto detectado en el período"
  - importancia: CRÍTICA
  - uso: "Detectar eventos ruidosos (aviones, sirenas, trenes)"

LAmin:
  - name: LAmin
  - type: Property
  - unit: "2N1" (dB)
  - example: 62.1
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - descripcion: "Nivel mínimo de presión sonora ponderado A"
  - importancia: MEDIA
  - uso: "Caracterizar ruido de fondo"

LA90 (PERCENTIL):
  - name: LA90
  - type: Property
  - unit: "2N1" (dB)
  - example: 68.3
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - descripcion: "Nivel percentil 90 (ruido de fondo)"
  - definicion: "Nivel superado 90% del tiempo (ruido base)"
  - importancia: MEDIA
  - uso: "Ruido de fondo característico"

LC:
  - name: LC
  - type: Property
  - unit: "2N1" (dB)
  - range: [20, 140]
  - example: 79.1
  - es_dinamico: true
  - frecuencia_cambio: Cada 1-5 minutos
  - descripcion: "Nivel de presión sonora ponderado C"
  - importancia: MEDIA
  - uso: "Detectar riesgo de daño auditivo (baja frecuencia)"
  - nota: "Ponderación diferente: menos atenuación de bajos"

LIN:
  - name: LIN
  - type: Property
  - unit: "2N1" (dB)
  - example: 80.5
  - es_dinamico: true
  - descripcion: "Nivel de presión sonora lineal (sin ponderación)"
  - importancia: BAJA
  - uso: "Análisis técnico de frecuencias"
```

#### 2.2.3 Índices Derivados

```yaml
noiseLevel (CLASIFICACIÓN):
  - name: noiseLevel
  - type: Property
  - values: ["QUIET", "MODERATE", "LOUD", "VERY_LOUD"]
  - example: "MODERATE"
  - es_dinamico: true
  - frecuencia_cambio: Cada 5 minutos
  - mapeo_from_LAeq:
    - "QUIET":     LAeq < 55 dB
    - "MODERATE":  LAeq 55-70 dB
    - "LOUD":      LAeq 70-85 dB
    - "VERY_LOUD": LAeq > 85 dB
  - importancia: CRÍTICA
  - computed_by: "Backend API"

noisePollutionLevel:
  - name: noisePollutionLevel
  - type: Property
  - unit: "2N1" (dB)
  - example: 72.5
  - es_dinamico: true
  - descripcion: "Índice de contaminación acústica con corrección contextual"
  - formula: |
    NPL = LAeq + correction_factor
    Factores:
    - Hora del día (penalización nocturna +5-10 dB)
    - Zona (residencial, industrial, comercial)
    - Tipo de ruido (tráfico, industria, obra, otros)
  - importancia: CRÍTICA
```

#### 2.2.4 Análisis de Frecuencia

```yaml
frequency:
  - name: frequency
  - type: Property (Object con bandas de octava)
  - example: |
    {
      "ranges": [
        {"frequency": "125Hz", "level": 65.2},
        {"frequency": "250Hz", "level": 68.5},
        {"frequency": "500Hz", "level": 71.2},
        {"frequency": "1000Hz", "level": 73.8},
        {"frequency": "2000Hz", "level": 70.5},
        {"frequency": "4000Hz", "level": 68.1},
        {"frequency": "8000Hz", "level": 62.3}
      ]
    }
  - es_dinamico: true
  - frecuencia_cambio: Cada 15-60 minutos
  - precision: ±0.5 dB por banda
  - descripcion: "Análisis de bandas de octava (ISO 266)"
  - importancia: MEDIA
  - uso: "Identificar fuente de ruido (tráfico, industria, construcción)"

dominantFrequency:
  - name: dominantFrequency
  - type: Property
  - unit: "HZ"
  - example: 1000
  - es_dinamico: true
  - frecuencia_cambio: Cada 15-60 minutos
  - descripcion: "Frecuencia con mayor nivel sonoro"
  - importancia: MEDIA
  - uso: "Caracterizar tipo de ruido"
```

#### 2.2.5 Parámetros Ambientales (Contexto)

```yaml
temperature:
  - name: temperature
  - type: Property
  - unit: "CEL"
  - range: [-40, 60]
  - example: 20.3
  - es_dinamico: true
  - frecuencia_cambio: Cada 5-10 minutos
  - precision: ±0.5°C
  - razon: "Afecta velocidad del sonido en aire"

windSpeed:
  - name: windSpeed
  - type: Property
  - unit: "M_S" (m/s)
  - range: [0, 30]
  - example: 3.2
  - es_dinamico: true
  - frecuencia_cambio: Cada 5-10 minutos
  - razon: "Viento amplifica o atenúa propagación del sonido"

precipitation:
  - name: precipitation
  - type: Property (opcional)
  - unit: "MM" (milímetros)
  - es_dinamico: true
  - razon: "Lluvia atenúa ruido de tráfico"
```

#### 2.2.6 Parámetros de Medición

```yaml
measuringPeriod:
  - name: measuringPeriod
  - type: Property
  - unit: "SEC" (segundos)
  - example: 300
  - es_dinamico: true
  - descripcion: "Duración de la ventana de medición"
  - tipico: "300s = 5 minutos"

timeWeighting:
  - name: timeWeighting
  - type: Property
  - values: ["FAST", "SLOW", "IMPULSE"]
  - example: "FAST"
  - es_dinamico: true
  - descripcion: "Constante de tiempo de ponderación"
  - definicion:
    - "FAST (F)": 125 ms - Captura fluctuaciones rápidas
    - "SLOW (S)": 1000 ms - Promedia fluctuaciones
    - "IMPULSE (I)": 35 ms - Para impactos cortos

frequencyWeighting:
  - name: frequencyWeighting
  - type: Property
  - values: ["A", "C", "Z"]
  - example: "A"
  - es_dinamico: true
  - descripcion: "Ponderación de frecuencia aplicada"
  - definicion:
    - "A": Standard para ruido ambiental (ISO 61672)
    - "C": Sonómetro de rango completo
    - "Z": Sin ponderación (lineal)
```

---

## 3. RESUMEN COMPARATIVO

### Atributos Estáticos (Nunca cambian o cambian raramente)
- `id`, `location`, `address`, `refDevice`, `altitudeAboveSeaLevel`, `measurementHeightAboveGround`
- `organizationResponsible`, `areaServed`, `sourceType`, `sensorLocation`
- **Frecuencia de cambio**: Una vez en configuración inicial, o muy raramente
- **Actualización**: Manual (reubicación de sensor, cambio de dispositivo)

### Atributos Dinámicos (Cambian con cada observación)
- **Observacionales**: `CO2`, `PM2_5`, `PM10`, `NO2`, `O3`, `LAeq`, `LAmax`, `LA90`
- **Meteorológicos**: `temperature`, `relativeHumidity`, `atmosphericPressure`, `windSpeed`
- **Calculados**: `airQualityIndex`, `airQualityLevel`, `noiseLevel`, `noisePollutionLevel`
- **Metadatos**: `dateObserved`, `observedAt`, `accuracy`, `providedBy`
- **Frecuencia de cambio**: Cada 1-5 minutos (observaciones), cada 5-15 minutos (índices)
- **Actualización**: Automática (sensores → IoT Agent → Orion-LD)

---

## 4. IMPLICACIONES PARA ARQUITECTURA

### 4.1 Estrategia de Almacenamiento

```
REAL-TIME (Orion-LD):
- Almacena última observación de cada entidad
- Mantiene atributos estáticos + últimos dinámicos
- Actualización: Cada 1-5 minutos
- Retención: 7 días (o últimas 1000 observaciones)

TIME-SERIES (CrateDB via QuantumLeap):
- Almacena TODOS los atributos dinámicos con histórico
- Cada nueva observación genera nueva fila
- Actualización: Cada 1-5 minutos
- Retención: 1-5 años según política

STATIC REFERENCE (MongoDB/PostgreSQL):
- Almacena atributos estáticos de sensores
- Actualización: Manual/rara
- Cached en memoria (Redis)
```

### 4.2 Frecuencia de Sincronización

| Componente | Atributos Estáticos | Atributos Dinámicos | Frecuencia |
|-----------|---------------------|-------------------|-----------|
| Sensor IoT | Enviada 1x | Continuamente | 1-5 min |
| IoT Agent | Almacenada 1x | Transforma cada obs | 1-5 min |
| Orion-LD | Persiste 1x | Actualiza cada obs | 1-5 min |
| QuantumLeap | No persiste | Persiste todo | 1-5 min |
| Backend Cache | Carga 1x/día | Valida < 1min | 5-15 min |
| Frontend | Carga 1x | Refresh cada obs | 5-15 min |

### 4.3 Optimizaciones

- **Caché de estáticos**: Los datos estáticos se cachean en Redis/memoria tras primer acceso
- **Difusión de dinámicos**: Solo atributos dinámicos se envían en MQTT/HTTP para reducir ancho de banda
- **Indexación**: Índices en `location`, `address.addressLocality` para búsquedas rápidas

