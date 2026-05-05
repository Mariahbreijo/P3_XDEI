#!/usr/bin/env python3
"""Multi-city sensor simulator for NGSI-LD (Orion-LD).

Sends PATCH updates to /ngsi-ld/v1/entities/<ID>/attrs for all 5 cities
every N seconds using strict NGSI-LD Property format.

Cities:
  - Madrid: Air Quality (AirQualityObserved)
  - Barcelona: Noise Level (NoiseLevelObserved)
  - A Coruña: Air Quality (AirQualityObserved)
  - Alicante: Noise Level (NoiseLevelObserved)
  - Bilbao: Air Quality (AirQualityObserved)

Usage:
  python3 scripts/sensor_simulator_multi_city.py --count 20 --interval 5
"""
from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime
from urllib.parse import quote

import httpx

NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"

# City configurations with entity IDs and types
CITIES = {
    "madrid": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
        "type": "air",
        "name": "Madrid",
        "pm10_range": (10, 80),
        "pm25_range": (5, 40),
        "no2_range": (20, 100),
    },
    "barcelona": {
        "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
        "type": "noise",
        "name": "Barcelona",
        "laeq_range": (60, 80),
    },
    "corunna": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Corunna-01",
        "type": "air",
        "name": "A Coruña",
        "pm10_range": (15, 50),
        "pm25_range": (8, 30),
        "no2_range": (20, 60),
    },
    "alicante": {
        "id": "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
        "type": "noise",
        "name": "Alicante",
        "laeq_range": (55, 75),
    },
    "bilbao": {
        "id": "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
        "type": "air",
        "name": "Bilbao",
        "pm10_range": (20, 70),
        "pm25_range": (10, 35),
        "no2_range": (30, 90),
    },
}


def iso_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def make_air_payload(pm10: float, pm25: float, no2: float) -> dict:
    return {
        "PM10": {"type": "Property", "value": round(pm10, 1)},
        "PM2_5": {"type": "Property", "value": round(pm25, 1)},
        "NO2": {"type": "Property", "value": round(no2, 1)},
        "dateObserved": {"type": "Property", "value": iso_now()},
    }


def make_noise_payload(laeq: float) -> dict:
    return {"LAeq": {"type": "Property", "value": int(round(laeq))}, "dateObserved": {"type": "Property", "value": iso_now()}}


def random_walk(prev: float, min_v: float, max_v: float, step: float) -> float:
    step_val = random.uniform(-step, step)
    val = prev + step_val
    return max(min_v, min(max_v, val))


def upsert_entity(client: httpx.Client, entity_id: str, entity: dict, attrs: dict) -> int:
    create_resp = client.post("/ngsi-ld/v1/entities", json=entity)
    if create_resp.status_code in (201, 204):
        return create_resp.status_code
    if create_resp.status_code == 409:
        encoded_id = quote(entity_id, safe="")
        update_resp = client.put(f"/ngsi-ld/v1/entities/{encoded_id}/attrs", json=attrs)
        if update_resp.status_code in (200, 204):
            return update_resp.status_code
        if update_resp.status_code == 404:
            # Fallback for Orion-LD versions that don't expose PUT /entities/{id}/attrs
            fallback_resp = client.post("/ngsi-ld/v1/entityOperations/upsert", json=[entity])
            fallback_resp.raise_for_status()
            return fallback_resp.status_code
        update_resp.raise_for_status()
    create_resp.raise_for_status()
    return create_resp.status_code


def run_simulator(
    orion_url: str,
    count: int = 20,
    interval: float = 5.0,
):
    # No tenant headers: operate against NGSI-LD entities directly
    headers = {
        "Content-Type": "application/ld+json",
        # Do not send Link header if we include @context inline in the payload
    }

    # Initialize values for each city
    state = {}
    for city_key, city_cfg in CITIES.items():
        if city_cfg["type"] == "air":
            state[city_key] = {
                "pm10": random.uniform(*city_cfg["pm10_range"]),
                "pm25": random.uniform(*city_cfg["pm25_range"]),
                "no2": random.uniform(*city_cfg["no2_range"]),
            }
        else:  # noise
            state[city_key] = {
                "laeq": random.uniform(*city_cfg["laeq_range"]),
            }

    with httpx.Client(base_url=orion_url.rstrip("/"), headers=headers, timeout=10.0) as client:
        for i in range(1, count + 1):
            # Update state for each city
            for city_key, city_cfg in CITIES.items():
                if city_cfg["type"] == "air":
                    state[city_key]["pm10"] = random_walk(state[city_key]["pm10"], *city_cfg["pm10_range"], step=8.0)
                    state[city_key]["pm25"] = random_walk(state[city_key]["pm25"], *city_cfg["pm25_range"], step=4.0)
                    state[city_key]["no2"] = random_walk(state[city_key]["no2"], *city_cfg["no2_range"], step=10.0)

                    payload = make_air_payload(state[city_key]["pm10"], state[city_key]["pm25"], state[city_key]["no2"])
                    # Build full entity for deterministic upsert: POST first, then PUT attrs on 409
                    entity = {
                        "id": city_cfg["id"],
                        "type": "AirQualityObserved",
                        **payload,
                        "@context": NGSI_LD_CONTEXT,
                    }
                    try:
                        status_code = upsert_entity(client, city_cfg["id"], entity, payload)
                        print(f"[#{i}] {city_cfg['name']} air upsert OK (HTTP {status_code})")
                    except Exception as exc:
                        print(f"[#{i}] Failed UPSERT {city_cfg['name']} air: {exc}", file=sys.stderr)

                else:  # noise
                    state[city_key]["laeq"] = random_walk(state[city_key]["laeq"], *city_cfg["laeq_range"], step=6.0)

                    payload = make_noise_payload(state[city_key]["laeq"])
                    entity = {
                        "id": city_cfg["id"],
                        "type": "NoiseLevelObserved",
                        **payload,
                        "@context": NGSI_LD_CONTEXT,
                    }
                    try:
                        status_code = upsert_entity(client, city_cfg["id"], entity, payload)
                        print(f"[#{i}] {city_cfg['name']} noise upsert OK (HTTP {status_code})")
                    except Exception as exc:
                        print(f"[#{i}] Failed UPSERT {city_cfg['name']} noise: {exc}", file=sys.stderr)

            if i < count:
                time.sleep(interval)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Simulate multi-city sensors and send NGSI-LD PATCH updates to Orion-LD")
    p.add_argument("--orion-url", default="http://localhost:1026", help="Base URL of Orion-LD (default: http://localhost:1026)")
    p.add_argument("--count", type=int, default=20, help="Number of updates to send (default: 20)")
    p.add_argument("--interval", type=float, default=5.0, help="Seconds between updates (default: 5.0)")
    # Tenants removed: simulator will not send Fiware-Service headers
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    print(f"Multi-city simulator starting: orion={args.orion_url} count={args.count} interval={args.interval}s")
    print(f"Cities: {', '.join(cfg['name'] for cfg in CITIES.values())}")
    try:
        run_simulator(
            args.orion_url,
            count=args.count,
            interval=args.interval,
        )
    except KeyboardInterrupt:
        print("Interrupted by user")
