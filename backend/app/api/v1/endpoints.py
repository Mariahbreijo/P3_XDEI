from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
import httpx

from app.config import get_settings

from app.services.ica_calculator import calculate_ica, classify_ica, classify_noise_level
from app.services.quantumleap_service import quantumleap_service
from app.services.orion_service import orion_service
from app.services.store import AIR_HISTORY, NOISE_HISTORY, get_sensor, list_air_sensors, list_noise_sensors

settings = get_settings()
router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/sensors")
def sensors() -> dict[str, list[dict]]:
    return {"air": list_air_sensors(), "noise": list_noise_sensors()}


@router.post("/bootstrap")
def bootstrap() -> dict[str, object]:
    return {"status": "ok", "result": orion_service.bootstrap_demo_entities()}


@router.get("/air-quality")
def air_quality() -> dict[str, object]:
    sensor = list_air_sensors()[0]
    ica = sensor["airQualityIndex"]["value"]
    return {
        "sensor": sensor,
        "metrics": {
            "airQualityIndex": ica,
            "airQualityLevel": sensor["airQualityLevel"]["value"],
            "mainPollutants": {
                "PM2_5": sensor["PM2_5"]["value"],
                "PM10": sensor["PM10"]["value"],
                "NO2": sensor["NO2"]["value"],
                "O3": sensor["O3"]["value"],
            },
            "summary": f"ICA {ica} - {classify_ica(ica)}",
        },
    }


@router.get("/air-quality/{sensor_id}")
def air_quality_detail(sensor_id: str) -> dict[str, object]:
    sensor = get_sensor(sensor_id)
    if not sensor or sensor["type"] != "AirQualityObserved":
        raise HTTPException(status_code=404, detail="Air quality sensor not found")
    ica = calculate_ica(sensor["PM2_5"]["value"], sensor["PM10"]["value"], sensor["NO2"]["value"], sensor["O3"]["value"])
    sensor["airQualityIndex"] = {"type": "Property", "value": ica, "unitCode": "C62"}
    sensor["airQualityLevel"] = {"type": "Property", "value": classify_ica(ica)}
    history = AIR_HISTORY
    if quantumleap_service.is_available():
        try:
            history = quantumleap_service.query_entity_attrs(sensor["id"], ["PM2_5", "PM10", "NO2", "O3"])
        except Exception:
            history = AIR_HISTORY
    return {"sensor": sensor, "history": history}


@router.get("/noise-level")
def noise_level() -> dict[str, object]:
    sensor = list_noise_sensors()[0]
    leq = sensor["LAeq"]["value"]
    return {
        "sensor": sensor,
        "metrics": {
            "LAeq": leq,
            "noiseLevel": sensor["noiseLevel"]["value"],
            "averageNoiseDb": leq,
            "summary": f"LAeq {leq} dB - {classify_noise_level(leq)}",
        },
    }


@router.get("/noise-level/{sensor_id}")
def noise_level_detail(sensor_id: str) -> dict[str, object]:
    sensor = get_sensor(sensor_id)
    if not sensor or sensor["type"] != "NoiseLevelObserved":
        raise HTTPException(status_code=404, detail="Noise sensor not found")
    leq = float(sensor["LAeq"]["value"])
    sensor["noiseLevel"] = {"type": "Property", "value": classify_noise_level(leq)}
    history = NOISE_HISTORY
    if quantumleap_service.is_available():
        try:
            history = quantumleap_service.query_entity_attrs(sensor["id"], ["LAeq", "LAmax", "LA90"])
        except Exception:
            history = NOISE_HISTORY
    return {"sensor": sensor, "history": history}


@router.get("/dashboard")
def dashboard() -> dict[str, object]:
    # Get all sensors organized by city
    all_air = list_air_sensors()
    all_noise = list_noise_sensors()
    
    # Build city summaries (match by location)
    cities = {}
    
    # Process air sensors
    for sensor in all_air:
        loc = sensor.get("address", {}).get("value", {})
        city_name = loc.get("addressLocality", "Unknown")
        if city_name not in cities:
            cities[city_name] = {"name": city_name, "air": None, "noise": None}
        
        # Calculate ICA
        ica = calculate_ica(
            sensor["PM2_5"]["value"],
            sensor["PM10"]["value"],
            sensor["NO2"]["value"],
            sensor["O3"]["value"],
        )
        sensor["airQualityIndex"] = {"type": "Property", "value": ica, "unitCode": "C62"}
        sensor["airQualityLevel"] = {"type": "Property", "value": classify_ica(ica)}
        
        cities[city_name]["air"] = {
            "sensor": sensor,
            "metrics": {
                "airQualityIndex": ica,
                "airQualityLevel": classify_ica(ica),
                "mainPollutants": {
                    "PM2_5": sensor["PM2_5"]["value"],
                    "PM10": sensor["PM10"]["value"],
                    "NO2": sensor["NO2"]["value"],
                    "O3": sensor["O3"]["value"],
                },
            },
        }
    
    # Process noise sensors
    for sensor in all_noise:
        loc = sensor.get("address", {}).get("value", {})
        city_name = loc.get("addressLocality", "Unknown")
        if city_name not in cities:
            cities[city_name] = {"name": city_name, "air": None, "noise": None}
        
        leq = float(sensor["LAeq"]["value"])
        sensor["noiseLevel"] = {"type": "Property", "value": classify_noise_level(leq)}
        
        cities[city_name]["noise"] = {
            "sensor": sensor,
            "metrics": {
                "LAeq": leq,
                "noiseLevel": classify_noise_level(leq),
                "LAmax": sensor["LAmax"]["value"],
                "LA90": sensor["LA90"]["value"],
            },
        }
    
    # Build response
    city_list = list(cities.values())
    
    # Main headline from first complete data
    headline_air = city_list[0]["air"] if city_list and city_list[0]["air"] else None
    headline_noise = city_list[0]["noise"] if city_list and city_list[0]["noise"] else None
    
    return {
        "headline": {
            "airQualityIndex": headline_air["metrics"]["airQualityIndex"] if headline_air else 0,
            "airQualityLevel": headline_air["metrics"]["airQualityLevel"] if headline_air else "GOOD",
            "noiseLevelDb": headline_noise["metrics"]["LAeq"] if headline_noise else 0,
            "noiseLevel": headline_noise["metrics"]["noiseLevel"] if headline_noise else "QUIET",
        },
        "cities": city_list,
        "airHistory": AIR_HISTORY,
        "noiseHistory": NOISE_HISTORY,
    }


# ==================== ORION PROXY (CORS FIX) ====================
@router.get("/orion-proxy/ngsi-ld/v1/entities")
def orion_proxy_entities(
    type: str | None = Query(None),
    local: bool = Query(False),
    service: str | None = Query(None),
    service_path: str | None = Query(None),
) -> Any:
    """
    Proxy endpoint para acceder a Orion sin problemas de CORS.
    El navegador hace fetch a esto en lugar de directamente a Orion.
    
    Uso desde JavaScript:
    fetch('/api/v1/orion-proxy/ngsi-ld/v1/entities?local=true')
    fetch('/api/v1/orion-proxy/ngsi-ld/v1/entities?type=AirQualityObserved')
    """
    try:
        orion_url = "http://localhost:1026"
        url = f"{orion_url}/ngsi-ld/v1/entities"
        
        # Build params
        params = {}
        if type:
            params["type"] = type
        if local:
            params["local"] = "true"
        
        # Build headers with defaults from settings if not provided
        headers = {
            "Accept": "application/ld+json",
        }
        svc = service or settings.fiware_service
        svc_path = service_path or settings.fiware_servicepath
        if svc:
            headers["Fiware-Service"] = svc
        if svc_path:
            headers["Fiware-ServicePath"] = svc_path
        
        response = httpx.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Orion returned {response.status_code}", "detail": response.text}
    
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Orion not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orion-proxy/ngsi-ld/v1/entities/{entity_id}")
def orion_proxy_entity(
    entity_id: str,
    service: str | None = Query(settings.fiware_service, alias="fiware-service"),
    service_path: str | None = Query(settings.fiware_servicepath, alias="fiware-servicepath"),
) -> Any:
    """
    Proxy para obtener una entidad específica de Orion.
    
    Uso desde JavaScript:
    fetch('/api/v1/orion-proxy/ngsi-ld/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:Centro')
    """
    try:
        orion_url = "http://localhost:1026"
        url = f"{orion_url}/ngsi-ld/v1/entities/{entity_id}"
        
        headers = {
            "Accept": "application/ld+json",
        }
        if service:
            headers["Fiware-Service"] = service
        if service_path:
            headers["Fiware-ServicePath"] = service_path
        
        response = httpx.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return {"error": f"Entity {entity_id} not found"}
        else:
            return {"error": f"Orion returned {response.status_code}", "detail": response.text}
    
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Orion not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
