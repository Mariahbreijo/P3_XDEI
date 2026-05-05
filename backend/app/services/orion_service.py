from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()

NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"
REQUEST_HEADERS = {
    "Content-Type": "application/ld+json",
    "Link": f'<{NGSI_LD_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
    "Fiware-Service": settings.fiware_service,
    "Fiware-ServicePath": settings.fiware_servicepath,
}


class OrionService:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.orion_url).rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def resolve_entity_id(self, entity_id: str) -> str:
        if entity_id.startswith("urn:ngsi-ld:"):
            return entity_id

        aliases = {
            "madrid-air-01": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
            "barcelona-noise-05": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
        }
        return aliases.get(entity_id, entity_id)

    def is_available(self) -> bool:
        try:
            with httpx.Client(timeout=3.0) as client:
                response = client.get(self._url("/version"))
                return response.status_code < 500
        except httpx.HTTPError:
            return False

    def list_entities(self) -> list[dict[str, Any]]:
        with httpx.Client(timeout=5.0, headers=REQUEST_HEADERS) as client:
            response = client.get(self._url("/ngsi-ld/v1/entities"))
            response.raise_for_status()
            return response.json()

    def bootstrap_demo_entities(self) -> dict[str, str]:
        demo_entities = [
            {
                "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
                "type": "AirQualityObserved",
                "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}},
                "address": {"type": "Property", "value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
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
            {
                "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
                "type": "NoiseLevelObserved",
                "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [2.1734, 41.3851]}},
                "address": {"type": "Property", "value": {"streetAddress": "Av. Diagonal, 452", "addressLocality": "Barcelona", "addressCountry": "ES"}},
                "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:noise-sensor-barcelona-05"},
                "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
                "LAeq": {"type": "Property", "value": 72.5, "unitCode": "2N1"},
                "LAmax": {"type": "Property", "value": 85.2, "unitCode": "2N1"},
                "LA90": {"type": "Property", "value": 68.3, "unitCode": "2N1"},
                "temperature": {"type": "Property", "value": 20.3, "unitCode": "CEL"},
                "windSpeed": {"type": "Property", "value": 3.2, "unitCode": "M_S"},
            },
            {
                "id": "urn:ngsi-ld:AirQualityObserved:ES-Corunna-01",
                "type": "AirQualityObserved",
                "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-8.3881, 43.3704]}},
                "address": {"type": "Property", "value": {"streetAddress": "Puerto de A Coruña", "addressLocality": "A Coruña", "addressCountry": "ES"}},
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
            {
                "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
                "type": "NoiseLevelObserved",
                "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-0.4861, 38.3452]}},
                "address": {"type": "Property", "value": {"streetAddress": "Avenida Constitución, 1", "addressLocality": "Alicante", "addressCountry": "ES"}},
                "refDevice": {"type": "Relationship", "object": "urn:ngsi-ld:Device:noise-sensor-alicante-01"},
                "dateObserved": {"type": "Property", "value": "2026-04-27T14:30:00Z"},
                "LAeq": {"type": "Property", "value": 68.2, "unitCode": "2N1"},
                "LAmax": {"type": "Property", "value": 81.5, "unitCode": "2N1"},
                "LA90": {"type": "Property", "value": 62.1, "unitCode": "2N1"},
                "temperature": {"type": "Property", "value": 24.5, "unitCode": "CEL"},
                "windSpeed": {"type": "Property", "value": 1.8, "unitCode": "M_S"},
            },
            {
                "id": "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
                "type": "AirQualityObserved",
                "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [-2.9385, 43.2630]}},
                "address": {"type": "Property", "value": {"streetAddress": "Gran Vía, 1", "addressLocality": "Bilbao", "addressCountry": "ES"}},
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
        ]

        with httpx.Client(timeout=5.0, headers=REQUEST_HEADERS) as client:
            results = {}
            for entity in demo_entities:
                response = client.post(self._url("/ngsi-ld/v1/entities"), json=entity)
                if response.status_code in (201, 204):
                    results[entity["id"]] = "created"
                    continue
                if response.status_code == 409:
                    update = client.put(self._url(f"/ngsi-ld/v1/entities/{entity['id']}/attrs"), json=entity)
                    update.raise_for_status()
                    results[entity["id"]] = "updated"
                    continue
                response.raise_for_status()
                results[entity["id"]] = "created"
            return results

    def get_entity(self, entity_id: str) -> dict[str, Any]:
        with httpx.Client(timeout=5.0, headers=REQUEST_HEADERS) as client:
            response = client.get(self._url(f"/ngsi-ld/v1/entities/{self.resolve_entity_id(entity_id)}"))
            response.raise_for_status()
            return response.json()

    def upsert_entity(self, entity: dict[str, Any]) -> None:
        entity_id = entity["id"]
        with httpx.Client(timeout=5.0, headers=REQUEST_HEADERS) as client:
            response = client.put(self._url(f"/ngsi-ld/v1/entities/{entity_id}/attrs"), json=entity)
            response.raise_for_status()

    def create_entity(self, entity: dict[str, Any]) -> None:
        with httpx.Client(timeout=5.0, headers=REQUEST_HEADERS) as client:
            response = client.post(self._url("/ngsi-ld/v1/entities"), json=entity)
            response.raise_for_status()


orion_service = OrionService()
