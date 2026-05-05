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
        "type": "air",
        "name": "Madrid",
        "center": (40.4168, -3.7038),
        "neighborhoods": ["Centro", "Norte", "Sur", "Este", "Oeste"],
        "pm10_range": (10, 80),
        "pm25_range": (5, 40),
        "no2_range": (20, 100),
    },
    "barcelona": {
        "type": "noise",
        "name": "Barcelona",
        "center": (41.3851, 2.1734),
        "neighborhoods": ["Centro", "Norte", "Sur", "Eixample"],
        "laeq_range": (60, 80),
    },
    "corunna": {
        "type": "air",
        "name": "A Coruña",
        "center": (43.3623, -8.4115),
        "neighborhoods": ["Centro", "Ensanche", "Riazor"],
        "pm10_range": (15, 50),
        "pm25_range": (8, 30),
        "no2_range": (20, 60),
    },
    "alicante": {
        "type": "noise",
        "name": "Alicante",
        "center": (38.3452, -0.4810),
        "neighborhoods": ["Centro", "Playa", "Mercado"],
        "laeq_range": (55, 75),
    },
    "bilbao": {
        "type": "air",
        "name": "Bilbao",
        "center": (43.2630, -2.9350),
        "neighborhoods": ["Centro", "Abando", "Deusto"],
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
    per_neighborhood: int = 2,
):
    # No tenant headers: operate against NGSI-LD entities directly
    headers = {
        "Content-Type": "application/ld+json",
        # Do not send Link header if we include @context inline in the payload
    }

    # Build entities list: multiple sensors per neighborhood with slight coordinate jitter
    entities: list[dict] = []
    state: dict = {}
    for city_key, city_cfg in CITIES.items():
        lat_center, lon_center = city_cfg["center"]
        neighs = city_cfg.get("neighborhoods", ["Centro"])[:]
        # If neighborhoods smaller than requested per_neighborhood, repeat with suffix
        for neigh in neighs:
            for idx in range(1, per_neighborhood + 1):
                nid = f"urn:ngsi-ld:{'AirQualityObserved' if city_cfg['type']=='air' else 'NoiseLevelObserved'}:ES-{city_cfg['name'].replace(' ', '')}-{neigh.replace(' ', '')}-{idx:02d}"
                # jitter coords slightly (approx +/- ~0.01 degrees)
                jitter_lat = lat_center + random.uniform(-0.008, 0.008)
                jitter_lon = lon_center + random.uniform(-0.008, 0.008)
                ent = {
                    "id": nid,
                    "city": city_cfg["name"],
                    "neighborhood": neigh,
                    "type": city_cfg["type"],
                    "coords": (jitter_lat, jitter_lon),
                }
                # initial sensor values
                if city_cfg["type"] == "air":
                    ent.update(
                        {
                            "pm10": random.uniform(*city_cfg["pm10_range"]),
                            "pm25": random.uniform(*city_cfg["pm25_range"]),
                            "no2": random.uniform(*city_cfg["no2_range"]),
                        }
                    )
                else:
                    ent.update({"laeq": random.uniform(*city_cfg["laeq_range"])})
                entities.append(ent)

    # create a per-entity state copy for random walks
    for ent in entities:
        state[ent["id"]] = {k: v for k, v in ent.items() if k in ("pm10", "pm25", "no2", "laeq")}

    with httpx.Client(base_url=orion_url.rstrip("/"), headers=headers, timeout=10.0) as client:
        for i in range(1, count + 1):
            # Update each entity (sensor) state and push updates
            for ent in entities:
                eid = ent["id"]
                # Use entity-local state
                if ent["type"] == "air":
                    # perform random walk on the per-entity values
                    ckey = ent["city"].lower()
                    state[eid]["pm10"] = random_walk(state[eid]["pm10"], *CITIES[ckey]["pm10_range"], step=6.0) if "pm10" in state[eid] else random.uniform(10, 80)
                    state[eid]["pm25"] = random_walk(state[eid]["pm25"], *CITIES[ckey]["pm25_range"], step=3.0) if "pm25" in state[eid] else random.uniform(5, 40)
                    state[eid]["no2"] = random_walk(state[eid]["no2"], *CITIES[ckey]["no2_range"], step=8.0) if "no2" in state[eid] else random.uniform(20, 100)

                    payload = make_air_payload(state[eid]["pm10"], state[eid]["pm25"], state[eid]["no2"])
                    # Build full entity for deterministic upsert: include location on first create
                    lat, lon = ent["coords"]
                    entity = {
                        "id": eid,
                        "type": "AirQualityObserved",
                        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [lon, lat]}},
                        **payload,
                        "dateObserved": {"type": "Property", "value": iso_now()},
                        "@context": NGSI_LD_CONTEXT,
                    }
                    try:
                        status_code = upsert_entity(client, eid, entity, payload)
                        print(f"[#{i}] {ent['city']} {ent['neighborhood']} air upsert OK {eid} (HTTP {status_code})")
                    except Exception as exc:
                        print(f"[#{i}] Failed UPSERT {eid} air: {exc}", file=sys.stderr)

                else:  # noise
                    ckey = ent["city"].lower()
                    state[eid]["laeq"] = random_walk(state[eid]["laeq"], *CITIES[ckey]["laeq_range"], step=5.0) if "laeq" in state[eid] else random.uniform(55, 80)

                    payload = make_noise_payload(state[eid]["laeq"])
                    lat, lon = ent["coords"]
                    entity = {
                        "id": eid,
                        "type": "NoiseLevelObserved",
                        "location": {"type": "GeoProperty", "value": {"type": "Point", "coordinates": [lon, lat]}},
                        **payload,
                        "dateObserved": {"type": "Property", "value": iso_now()},
                        "@context": NGSI_LD_CONTEXT,
                    }
                    try:
                        status_code = upsert_entity(client, eid, entity, payload)
                        print(f"[#{i}] {ent['city']} {ent['neighborhood']} noise upsert OK {eid} (HTTP {status_code})")
                    except Exception as exc:
                        print(f"[#{i}] Failed UPSERT {eid} noise: {exc}", file=sys.stderr)

            if i < count:
                time.sleep(interval)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Simulate multi-city sensors and send NGSI-LD PATCH updates to Orion-LD")
    p.add_argument("--orion-url", default="http://localhost:1026", help="Base URL of Orion-LD (default: http://localhost:1026)")
    p.add_argument("--count", type=int, default=20, help="Number of updates to send (default: 20)")
    p.add_argument("--interval", type=float, default=5.0, help="Seconds between updates (default: 5.0)")
    p.add_argument("--per-neighborhood", type=int, default=2, help="Number of sensors to create per neighborhood (default: 2)")
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
            per_neighborhood=args.per_neighborhood,
        )
    except KeyboardInterrupt:
        print("Interrupted by user")
