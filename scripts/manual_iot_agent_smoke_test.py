#!/usr/bin/env python3
"""Manual smoke test for FIWARE IoT Agent -> Orion.

Provision one demo device, send a single observation, and poll Orion until
it reflects the new value.

Usage:
  python3 scripts/manual_iot_agent_smoke_test.py
  python3 scripts/manual_iot_agent_smoke_test.py --service air_noise
"""
from __future__ import annotations

import argparse
import sys
import time
from dataclasses import dataclass

import httpx

NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"


@dataclass(frozen=True)
class DeviceConfig:
    device_id: str
    entity_id: str
    entity_type: str
    service_path: str
    payload: dict[str, float]


DEVICE = DeviceConfig(
    device_id="manual-air-smoke-01",
    entity_id="urn:ngsi-ld:AirQualityObserved:Madrid:Centro",
    entity_type="AirQualityObserved",
    service_path="/",
    payload={
        "pm10": 123.4,
        "pm25": 45.6,
        "no2": 78.9,
        "o3": 34.5,
        "temperature": 21.7,
        "humidity": 58.2,
    },
)


def build_headers(service: str, service_path: str) -> dict[str, str]:
    return {
        "Content-Type": "application/ld+json",
        "Link": f'<{NGSI_LD_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
        "Fiware-Service": service,
        "Fiware-ServicePath": service_path,
    }


def provision_service_group(client: httpx.Client, service: str) -> None:
    payload = {
        "services": [
            {
                "apikey": "iot-agent-api-key-prod",
                "cbroker": "http://orion-ld:1026",
                "resource": "/iot/json",
                "entity_type": "Device",
            }
        ]
    }
    max_attempts = 6
    for attempt in range(1, max_attempts + 1):
        response = client.post(
            "http://localhost:4041/iot/services",
            headers={"Fiware-Service": service, "Fiware-ServicePath": "/"},
            json=payload,
        )
        if response.status_code in (200, 201, 204, 409):
            return
        print(f"Service group provisioning attempt {attempt}: HTTP {response.status_code}")
        if attempt < max_attempts:
            time.sleep(2 * attempt)

    raise RuntimeError(f"Service group provisioning failed after {max_attempts} attempts: HTTP {response.status_code} {response.text}")


def provision_device(client: httpx.Client, service: str) -> None:
    payload = {
        "devices": [
            {
                "device_id": DEVICE.device_id,
                "entity_name": DEVICE.entity_id,
                "entity_type": DEVICE.entity_type,
                "service_path": DEVICE.service_path,
                "transport": "HTTP",
                "apikey": "iot-agent-api-key-prod",
                "attributes": [
                    {"object_id": "pm10", "name": "PM10", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
                    {"object_id": "pm25", "name": "PM2_5", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
                    {"object_id": "no2", "name": "NO2", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
                    {"object_id": "o3", "name": "O3", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
                    {"object_id": "temperature", "name": "temperature", "type": "Number", "metadata": {"unitCode": "CEL"}},
                    {"object_id": "humidity", "name": "relativeHumidity", "type": "Number", "metadata": {"unitCode": "P1"}},
                ],
                "static_attributes": [
                    {
                        "name": "address",
                        "type": "Property",
                        "value": {
                            "streetAddress": "Plaza Mayor",
                            "addressLocality": "Madrid",
                            "addressCountry": "ES",
                        },
                    },
                    {
                        "name": "location",
                        "type": "GeoProperty",
                        "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]},
                    },
                ],
            }
        ]
    }
    max_attempts = 6
    for attempt in range(1, max_attempts + 1):
        response = client.post(
            "http://localhost:4041/iot/devices",
            headers={"Fiware-Service": service, "Fiware-ServicePath": DEVICE.service_path},
            json=payload,
        )
        if response.status_code in (200, 201, 204, 409):
            return
        print(f"Device provisioning attempt {attempt}: HTTP {response.status_code}")
        if attempt < max_attempts:
            time.sleep(2 * attempt)

    raise RuntimeError(f"Device provisioning failed after {max_attempts} attempts: HTTP {response.status_code} {response.text}")


def send_observation(client: httpx.Client, service: str) -> None:
    response = client.post(
        "http://localhost:7896/iot/json",
        params={"i": DEVICE.device_id, "k": "iot-agent-api-key-prod"},
        headers={"Fiware-Service": service, "Fiware-ServicePath": DEVICE.service_path},
        json=DEVICE.payload,
    )
    if response.status_code not in (200, 201, 204):
        raise RuntimeError(f"IoT Agent push failed: HTTP {response.status_code} {response.text}")


def poll_orion(client: httpx.Client, service: str, service_path: str) -> dict:
    for attempt in range(1, 8):
        response = client.get(
            f"http://localhost:1026/ngsi-ld/v1/entities/{DEVICE.entity_id}",
            headers=build_headers(service, service_path),
        )
        if response.status_code == 200:
            return response.json()
        time.sleep(1)
    raise RuntimeError(f"Orion did not return the entity after several retries")


def main() -> int:
    parser = argparse.ArgumentParser(description="Manual FIWARE smoke test")
    parser.add_argument("--service", default="openiot", help="Fiware-Service header value (default: openiot)")
    parser.add_argument("--service-path", default="/", help="Fiware-ServicePath header value (default: /)")
    args = parser.parse_args()

    print("Provisioning device and sending one manual observation...")
    with httpx.Client(timeout=120.0) as client:
        provision_service_group(client, args.service)
        provision_device(client, args.service)
        send_observation(client, args.service)
        entity = poll_orion(client, args.service, args.service_path)

    pm10 = entity.get("PM10", {})
    p25 = entity.get("PM2_5", {})
    print("Orion entity response:")
    print(entity)
    print("\nObserved values:")
    print(f"PM10 = {pm10.get('value')}")
    print(f"PM2_5 = {p25.get('value')}")
    print("\nIf PM10 matches the injected value, the IoT Agent -> Orion path is clear.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
