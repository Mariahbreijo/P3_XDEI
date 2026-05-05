#!/usr/bin/env python3
"""Sensor simulator for NGSI-LD (Orion-LD).

Sends PATCH updates to /ngsi-ld/v1/entities/<ID>/attrs every N seconds
using strict NGSI-LD Property format. Defaults to 20 updates at 5s.

Usage:
  python3 scripts/sensor_simulator.py --count 20 --interval 5

By default targets the demo entities used by the backend bootstrap:
  urn:ngsi-ld:AirQualityObserved:ES-Madrid-01
  urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05
"""
from __future__ import annotations

import argparse
import random
import sys
import time
from datetime import datetime

import httpx

NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"


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


def run_simulator(
    orion_url: str,
    air_id: str,
    noise_id: str,
    count: int = 20,
    interval: float = 5.0,
    fiware_service: str | None = None,
    fiware_servicepath: str | None = None,
):
    headers = {
        "Content-Type": "application/ld+json",
        "Link": f"<{NGSI_LD_CONTEXT}>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"",
    }
    if fiware_service:
        headers["Fiware-Service"] = fiware_service
    if fiware_servicepath:
        headers["Fiware-ServicePath"] = fiware_servicepath

    air_pm10 = random.uniform(10, 60)
    air_pm25 = random.uniform(5, 30)
    air_no2 = random.uniform(20, 80)
    noise_laeq = random.uniform(50, 75)

    with httpx.Client(base_url=orion_url.rstrip("/"), headers=headers, timeout=10.0) as client:
        for i in range(1, count + 1):
            air_pm10 = random_walk(air_pm10, 0.0, 200.0, step=8.0)
            air_pm25 = random_walk(air_pm25, 0.0, 120.0, step=4.0)
            air_no2 = random_walk(air_no2, 0.0, 300.0, step=10.0)
            noise_laeq = random_walk(noise_laeq, 40.0, 90.0, step=6.0)

            air_payload = make_air_payload(air_pm10, air_pm25, air_no2)
            noise_payload = make_noise_payload(noise_laeq)

            try:
                air_url = f"/ngsi-ld/v1/entities/{air_id}/attrs"
                r_air = client.patch(air_url, json=air_payload)
                r_air.raise_for_status()
            except Exception as exc:  # pragma: no cover - runtime network
                print(f"[#{i}] Failed PATCH air {air_id}: {exc}", file=sys.stderr)
            else:
                print(f"[#{i}] PATCH air {air_id}: PM10={air_payload['PM10']['value']} PM2_5={air_payload['PM2_5']['value']} NO2={air_payload['NO2']['value']}")

            try:
                noise_url = f"/ngsi-ld/v1/entities/{noise_id}/attrs"
                r_noise = client.patch(noise_url, json=noise_payload)
                r_noise.raise_for_status()
            except Exception as exc:  # pragma: no cover - runtime network
                print(f"[#{i}] Failed PATCH noise {noise_id}: {exc}", file=sys.stderr)
            else:
                print(f"[#{i}] PATCH noise {noise_id}: LAeq={noise_payload['LAeq']['value']}dB")

            if i < count:
                time.sleep(interval)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Simulate sensors and send NGSI-LD PATCH updates to Orion-LD")
    p.add_argument("--orion-url", default="http://localhost:1026", help="Base URL of Orion-LD (default: http://localhost:1026)")
    p.add_argument("--air-id", default="urn:ngsi-ld:AirQualityObserved:ES-Madrid-01", help="Entity ID for AirQualityObserved")
    p.add_argument("--noise-id", default="urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05", help="Entity ID for NoiseLevelObserved")
    p.add_argument("--count", type=int, default=20, help="Number of updates to send (default: 20)")
    p.add_argument("--interval", type=float, default=5.0, help="Seconds between updates (default: 5.0)")
    p.add_argument("--fiware-service", default=None, help="Fiware-Service header value (optional)")
    p.add_argument("--fiware-servicepath", default=None, help="Fiware-ServicePath header value (optional)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    print(f"Simulator starting: orion={args.orion_url} air={args.air_id} noise={args.noise_id} count={args.count} interval={args.interval}s")
    try:
        run_simulator(
            args.orion_url,
            args.air_id,
            args.noise_id,
            count=args.count,
            interval=args.interval,
            fiware_service=args.fiware_service,
            fiware_servicepath=args.fiware_servicepath,
        )
    except KeyboardInterrupt:
        print("Interrupted by user")
