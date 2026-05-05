from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from app.services.ica_calculator import calculate_ica, classify_ica, classify_noise_level
from app.services.orion_service import orion_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


SENSOR_STORE: dict[str, dict[str, Any]] = {
    "madrid-air-01": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
        "type": "AirQualityObserved",
        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}},
        "address": {
            "type": "Property",
            "value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"},
        },
        "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:airquality-sensor-madrid-01"},
        "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
        "CO2": {"type": "Property", "value": 420.5, "unitCode": "PPM"},
        "PM1": {"type": "Property", "value": 12.3, "unitCode": "UG_M3"},
        "PM2_5": {"type": "Property", "value": 28.5, "unitCode": "UG_M3"},
        "PM10": {"type": "Property", "value": 65.4, "unitCode": "UG_M3"},
        "NO2": {"type": "Property", "value": 89.5, "unitCode": "UG_M3"},
        "O3": {"type": "Property", "value": 62.8, "unitCode": "UG_M3"},
        "temperature": {"type": "Property", "value": 22.5, "unitCode": "CEL"},
        "relativeHumidity": {"type": "Property", "value": 65.0, "unitCode": "P1"},
    },
    "barcelona-noise-05": {
        "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
        "type": "NoiseLevelObserved",
        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [2.1734, 41.3851]}},
        "address": {
            "type": "Property",
            "value": {"streetAddress": "Av. Diagonal, 452", "addressLocality": "Barcelona", "addressCountry": "ES"},
        },
        "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:noise-sensor-barcelona-05"},
        "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
        "LAeq": {"type": "Property", "value": 72.5, "unitCode": "2N1"},
        "LAmax": {"type": "Property", "value": 85.2, "unitCode": "2N1"},
        "LA90": {"type": "Property", "value": 68.3, "unitCode": "2N1"},
        "temperature": {"type": "Property", "value": 20.3, "unitCode": "CEL"},
        "windSpeed": {"type": "Property", "value": 3.2, "unitCode": "M_S"},
    },
    "corunna-air-01": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Corunna-01",
        "type": "AirQualityObserved",
        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-8.3881, 43.3704]}},
        "address": {
            "type": "Property",
            "value": {"streetAddress": "Puerto de A Coruña", "addressLocality": "A Coruña", "addressCountry": "ES"},
        },
        "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:airquality-sensor-corunna-01"},
        "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
        "CO2": {"type": "Property", "value": 390.2, "unitCode": "PPM"},
        "PM1": {"type": "Property", "value": 8.1, "unitCode": "UG_M3"},
        "PM2_5": {"type": "Property", "value": 18.3, "unitCode": "UG_M3"},
        "PM10": {"type": "Property", "value": 35.5, "unitCode": "UG_M3"},
        "NO2": {"type": "Property", "value": 42.1, "unitCode": "UG_M3"},
        "O3": {"type": "Property", "value": 55.2, "unitCode": "UG_M3"},
        "temperature": {"type": "Property", "value": 16.8, "unitCode": "CEL"},
        "relativeHumidity": {"type": "Property", "value": 72.5, "unitCode": "P1"},
    },
    "alicante-noise-01": {
        "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
        "type": "NoiseLevelObserved",
        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-0.4861, 38.3452]}},
        "address": {
            "type": "Property",
            "value": {"streetAddress": "Avenida Constitución, 1", "addressLocality": "Alicante", "addressCountry": "ES"},
        },
        "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:noise-sensor-alicante-01"},
        "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
        "LAeq": {"type": "Property", "value": 68.2, "unitCode": "2N1"},
        "LAmax": {"type": "Property", "value": 81.5, "unitCode": "2N1"},
        "LA90": {"type": "Property", "value": 62.1, "unitCode": "2N1"},
        "temperature": {"type": "Property", "value": 24.5, "unitCode": "CEL"},
        "windSpeed": {"type": "Property", "value": 1.8, "unitCode": "M_S"},
    },
    "bilbao-air-02": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
        "type": "AirQualityObserved",
        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-2.9385, 43.2630]}},
        "address": {
            "type": "Property",
            "value": {"streetAddress": "Gran Vía, 1", "addressLocality": "Bilbao", "addressCountry": "ES"},
        },
        "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:airquality-sensor-bilbao-02"},
        "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
        "CO2": {"type": "Property", "value": 425.1, "unitCode": "PPM"},
        "PM1": {"type": "Property", "value": 10.5, "unitCode": "UG_M3"},
        "PM2_5": {"type": "Property", "value": 24.2, "unitCode": "UG_M3"},
        "PM10": {"type": "Property", "value": 58.3, "unitCode": "UG_M3"},
        "NO2": {"type": "Property", "value": 76.8, "unitCode": "UG_M3"},
        "O3": {"type": "Property", "value": 48.9, "unitCode": "UG_M3"},
        "temperature": {"type": "Property", "value": 19.2, "unitCode": "CEL"},
        "relativeHumidity": {"type": "Property", "value": 68.0, "unitCode": "P1"},
    },
}

AIR_HISTORY = [
    {"timestamp": "2026-04-27T12:30:00Z", "PM2_5": 22.4, "PM10": 48.8, "NO2": 61.2, "O3": 49.7},
    {"timestamp": "2026-04-27T13:30:00Z", "PM2_5": 25.8, "PM10": 55.2, "NO2": 72.1, "O3": 56.8},
    {"timestamp": "2026-04-27T14:30:00Z", "PM2_5": 28.5, "PM10": 65.4, "NO2": 89.5, "O3": 62.8},
]

NOISE_HISTORY = [
    {"timestamp": "2026-04-27T12:30:00Z", "LAeq": 64.1, "LAmax": 76.2, "LA90": 60.3},
    {"timestamp": "2026-04-27T13:30:00Z", "LAeq": 68.7, "LAmax": 81.4, "LA90": 63.2},
    {"timestamp": "2026-04-27T14:30:00Z", "LAeq": 72.5, "LAmax": 85.2, "LA90": 68.3},
]


def _air_response(sensor_id: str) -> dict[str, Any]:
    sensor = deepcopy(SENSOR_STORE[sensor_id])
    ica = calculate_ica(
        sensor["PM2_5"]["value"],
        sensor["PM10"]["value"],
        sensor["NO2"]["value"],
        sensor["O3"]["value"],
    )
    sensor["airQualityIndex"] = {"type": "Property", "value": ica, "unitCode": "C62", "observedAt": _now()}
    sensor["airQualityLevel"] = {"type": "Property", "value": classify_ica(ica), "observedAt": _now()}
    return sensor


def _noise_response(sensor_id: str) -> dict[str, Any]:
    sensor = deepcopy(SENSOR_STORE[sensor_id])
    leq = float(sensor["LAeq"]["value"])
    sensor["noiseLevel"] = {"type": "Property", "value": classify_noise_level(leq), "observedAt": _now()}
    return sensor


def list_air_sensors() -> list[dict[str, Any]]:
    if orion_service.is_available():
        try:
            entities = orion_service.list_entities()
            air_entities = [entity for entity in entities if entity.get("type") == "AirQualityObserved"]
            if air_entities:
                return air_entities
        except Exception:
            pass

    # Return all air sensors from local store
    return [
        _air_response("madrid-air-01"),
        _air_response("corunna-air-01"),
        _air_response("bilbao-air-02"),
    ]


def list_noise_sensors() -> list[dict[str, Any]]:
    if orion_service.is_available():
        try:
            entities = orion_service.list_entities()
            noise_entities = [entity for entity in entities if entity.get("type") == "NoiseLevelObserved"]
            if noise_entities:
                return noise_entities
        except Exception:
            pass

    # Return all noise sensors from local store
    return [
        _noise_response("barcelona-noise-05"),
        _noise_response("alicante-noise-01"),
    ]


def get_sensor(sensor_id: str) -> dict[str, Any] | None:
    if orion_service.is_available():
        try:
            return orion_service.get_entity(sensor_id)
        except Exception:
            pass

    if sensor_id == "madrid-air-01":
        return _air_response(sensor_id)
    if sensor_id == "barcelona-noise-05":
        return _noise_response(sensor_id)
    return None
