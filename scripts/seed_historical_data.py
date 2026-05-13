#!/usr/bin/env python3
"""
Historical Data Seeding Script for FIWARE NGSI-LD.

This script generates synthetic historical data for the last 7 days with hourly intervals
and injects it into Orion-LD via upsert operations. The data will then be automatically
persisted to QuantumLeap through the subscriptions.

Features:
  - Generates 168 hourly data points (7 days × 24 hours) per sensor
  - Realistic day/night variation curves for pollutants and noise
  - Proper NGSI-LD format with observedAt timestamps
  - Batch processing for efficiency

Usage:
  python3 scripts/seed_historical_data.py
  python3 scripts/seed_historical_data.py --orion-url http://localhost:1026 --dry-run
  python3 scripts/seed_historical_data.py --num-days 14 --batch-size 10

Environment variables:
  ORION_URL: Orion-LD base URL (default: http://localhost:1026)
  FIWARE_SERVICE: Fiware-Service header (default: common)
  FIWARE_SERVICEPATH: Fiware-ServicePath header (default: /)
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sys
from datetime import datetime, timedelta
from typing import Any

import httpx

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# NGSI-LD context
NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"

# Sensor definitions with locations
SENSORS = [
    # Air Quality - Madrid (8 sensors)
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Madrid:001",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [-3.7038, 40.4168]},
        "address": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-madrid-001",
        "city": "Madrid",
    },
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Madrid:002",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [-3.6753, 40.4168]},
        "address": {"streetAddress": "Puerta del Sol", "addressLocality": "Madrid", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-madrid-002",
        "city": "Madrid",
    },
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Madrid:003",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [-3.6920, 40.4232]},
        "address": {"streetAddress": "Paseo del Prado", "addressLocality": "Madrid", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-madrid-003",
        "city": "Madrid",
    },
    # Air Quality - Barcelona (4 sensors)
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Barcelona:001",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [2.1734, 41.3851]},
        "address": {"streetAddress": "Av. Diagonal", "addressLocality": "Barcelona", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-barcelona-001",
        "city": "Barcelona",
    },
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Barcelona:002",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [2.1738, 41.3843]},
        "address": {"streetAddress": "Plaça de Catalunya", "addressLocality": "Barcelona", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-barcelona-002",
        "city": "Barcelona",
    },
    # Air Quality - Valencia (4 sensors)
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Valencia:001",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [-0.3768, 39.4699]},
        "address": {"streetAddress": "City of Arts and Sciences", "addressLocality": "Valencia", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-valencia-001",
        "city": "Valencia",
    },
    {
        "id": "urn:ngsi-ld:AirQualityObserved:Valencia:002",
        "type": "AirQualityObserved",
        "location": {"type": "Point", "coordinates": [-0.3844, 39.4669]},
        "address": {"streetAddress": "Turia Park", "addressLocality": "Valencia", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:airquality-valencia-002",
        "city": "Valencia",
    },
    # Noise Level - Madrid (5 sensors)
    {
        "id": "urn:ngsi-ld:NoiseLevelObserved:Madrid:001",
        "type": "NoiseLevelObserved",
        "location": {"type": "Point", "coordinates": [-3.7038, 40.4168]},
        "address": {"streetAddress": "Gran Vía", "addressLocality": "Madrid", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:noise-madrid-001",
        "city": "Madrid",
    },
    {
        "id": "urn:ngsi-ld:NoiseLevelObserved:Madrid:002",
        "type": "NoiseLevelObserved",
        "location": {"type": "Point", "coordinates": [-3.6850, 40.4150]},
        "address": {"streetAddress": "Cibeles Circle", "addressLocality": "Madrid", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:noise-madrid-002",
        "city": "Madrid",
    },
    # Noise Level - Barcelona (5 sensors)
    {
        "id": "urn:ngsi-ld:NoiseLevelObserved:Barcelona:001",
        "type": "NoiseLevelObserved",
        "location": {"type": "Point", "coordinates": [2.1700, 41.3851]},
        "address": {"streetAddress": "Passeig de Gràcia", "addressLocality": "Barcelona", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:noise-barcelona-001",
        "city": "Barcelona",
    },
    {
        "id": "urn:ngsi-ld:NoiseLevelObserved:Barcelona:002",
        "type": "NoiseLevelObserved",
        "location": {"type": "Point", "coordinates": [2.1734, 41.3843]},
        "address": {"streetAddress": "Gothic Quarter", "addressLocality": "Barcelona", "addressCountry": "ES"},
        "refDevice": "urn:ngsi-ld:Device:noise-barcelona-002",
        "city": "Barcelona",
    },
]


def sin_curve(hour: int, min_val: float, max_val: float, peak_hour: float = 14.0) -> float:
    """Generate a sinusoidal curve for day/night variation.

    Args:
        hour: Hour of day (0-23)
        min_val: Minimum value (night)
        max_val: Maximum value (day)
        peak_hour: Hour of maximum value (default: 14:00 / 2 PM)

    Returns:
        Value following sinusoidal pattern
    """
    # Normalize hour to 0-24 range and shift so peak_hour is at maximum
    shifted_hour = (hour - peak_hour + 24) % 24
    # Sine curve: 0 at start/end (6 hours), peak at center (12 hours)
    normalized = math.sin((shifted_hour / 24.0) * math.pi)
    return min_val + (normalized + 1) / 2 * (max_val - min_val)


def generate_air_quality_reading(hour: int, sensor_id: str) -> dict[str, Any]:
    """Generate synthetic air quality reading for a specific hour.

    Args:
        hour: Hour of day (0-23)
        sensor_id: Sensor ID for variability

    Returns:
        Dictionary with air quality attributes
    """
    # Day/night patterns: higher pollution during day
    pm25_base = sin_curve(hour, 15.0, 45.0, peak_hour=13.0)
    pm10_base = sin_curve(hour, 30.0, 80.0, peak_hour=13.0)
    no2_base = sin_curve(hour, 20.0, 70.0, peak_hour=10.0)  # Earlier peak

    # Add small sensor-specific variations (deterministic based on sensor ID)
    hash_val = hash(sensor_id) % 100 / 100
    pm25 = pm25_base + (hash_val - 0.5) * 5
    pm10 = pm10_base + (hash_val - 0.5) * 10
    no2 = no2_base + (hash_val - 0.5) * 8

    return {
        "PM2_5": round(max(5, pm25), 1),
        "PM10": round(max(10, pm10), 1),
        "NO2": round(max(5, no2), 1),
        "CO2": round(350 + (hash_val * 100), 1),
        "temperature": round(10 + sin_curve(hour, 5, 8, peak_hour=15.0), 1),
        "relativeHumidity": round(40 + sin_curve(hour, -30, 30, peak_hour=6.0), 1),
    }


def generate_noise_level_reading(hour: int, sensor_id: str) -> dict[str, Any]:
    """Generate synthetic noise level reading for a specific hour.

    Args:
        hour: Hour of day (0-23)
        sensor_id: Sensor ID for variability

    Returns:
        Dictionary with noise level attributes
    """
    # Day/night patterns: higher noise during day/evening
    laeq_base = sin_curve(hour, 60.0, 78.0, peak_hour=19.0)

    # Add small sensor-specific variations
    hash_val = hash(sensor_id) % 100 / 100
    laeq = laeq_base + (hash_val - 0.5) * 3
    lamax = laeq + 10 + (hash_val - 0.5) * 5

    return {
        "LAeq": round(max(55, laeq), 1),
        "LAmax": round(max(65, lamax), 1),
        "LA90": round(max(50, laeq - 5), 1),
        "temperature": round(10 + sin_curve(hour, 5, 8, peak_hour=15.0), 1),
        "windSpeed": round(1 + abs(math.sin(hour * 0.3)) * 3, 1),
    }


def create_entity_update(sensor: dict[str, Any], timestamp: datetime) -> dict[str, Any]:
    """Create an NGSI-LD entity update for a sensor at a specific time.

    Args:
        sensor: Sensor definition dictionary
        timestamp: Observation datetime

    Returns:
        NGSI-LD entity with historical data
    """
    hour = timestamp.hour
    entity: dict[str, Any] = {
        "id": sensor["id"],
        "type": sensor["type"],
        "@context": NGSI_LD_CONTEXT,
    }

    # Add static properties
    if "location" in sensor:
        entity["location"] = {"type": "GeoProperty", "value": sensor["location"]}
    if "address" in sensor:
        entity["address"] = {"type": "Property", "value": sensor["address"]}
    if "refDevice" in sensor:
        entity["refDevice"] = {"type": "Relationship", "object": sensor["refDevice"]}

    # Add observedAt timestamp - CRITICAL for historical data
    timestamp_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    entity["observedAt"] = {"type": "Property", "value": timestamp_str}
    entity["dateObserved"] = {"type": "Property", "value": timestamp_str}

    # Add dynamic readings
    if sensor["type"] == "AirQualityObserved":
        readings = generate_air_quality_reading(hour, sensor["id"])
    else:  # NoiseLevelObserved
        readings = generate_noise_level_reading(hour, sensor["id"])

    for key, value in readings.items():
        if key in ["temperature", "relativeHumidity", "windSpeed"]:
            entity[key] = {"type": "Property", "value": value, "unitCode": "CEL" if key == "temperature" else "P1" if key == "relativeHumidity" else "M_S"}
        else:
            entity[key] = {"type": "Property", "value": value}

    return entity


def upsert_entity(client: httpx.Client, orion_url: str, entity: dict[str, Any], headers: dict[str, str]) -> bool:
    """Upsert a single entity to Orion-LD.

    Args:
        client: HTTP client
        orion_url: Base URL of Orion-LD
        entity: NGSI-LD entity
        headers: HTTP headers

    Returns:
        True if successful, False otherwise
    """
    url = f"{orion_url}/ngsi-ld/v1/entityOperations/upsert"

    try:
        response = client.post(url, json=[entity], headers=headers)

        if response.status_code in [200, 204]:
            return True
        else:
            logger.error(f"Failed to upsert entity {entity.get('id')}: {response.status_code} - {response.text}")
            return False

    except httpx.RequestError as e:
        logger.error(f"Error upserting entity {entity.get('id')}: {e}")
        return False


def seed_historical_data(
    orion_url: str,
    num_days: int,
    batch_size: int,
    fiware_service: str,
    fiware_servicepath: str,
    dry_run: bool = False,
) -> int:
    """Seed historical data into Orion-LD.

    Args:
        orion_url: Base URL of Orion-LD
        num_days: Number of days of history to generate
        batch_size: Number of entities to process before logging progress
        fiware_service: Fiware-Service header value
        fiware_servicepath: Fiware-ServicePath header value
        dry_run: If True, only generate data without uploading

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    headers = {
        "Content-Type": "application/ld+json",
        "Link": f'<{NGSI_LD_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
        "Fiware-Service": fiware_service,
        "Fiware-ServicePath": fiware_servicepath,
    }

    logger.info("=" * 70)
    logger.info("Historical Data Seeding for FIWARE NGSI-LD")
    logger.info("=" * 70)
    logger.info(f"Orion-LD URL: {orion_url}")
    logger.info(f"Number of days: {num_days}")
    logger.info(f"Total sensors: {len(SENSORS)}")
    logger.info(f"Data points per sensor: {num_days * 24}")
    logger.info(f"Total data points: {len(SENSORS) * num_days * 24}")
    logger.info(f"Fiware-Service: {fiware_service}")
    logger.info(f"Dry run: {dry_run}")
    logger.info("=" * 70)

    # Calculate time range
    end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=num_days)

    logger.info(f"Generating data from {start_time.isoformat()}Z to {end_time.isoformat()}Z")
    logger.info("")

    if dry_run:
        logger.info("DRY RUN MODE - No data will be uploaded to Orion-LD")
        logger.info("")

    success_count = 0
    error_count = 0
    entity_count = 0

    if not dry_run:
        client = httpx.Client(timeout=10.0)

    try:
        current_time = start_time

        while current_time <= end_time:
            for sensor in SENSORS:
                entity = create_entity_update(sensor, current_time)
                entity_count += 1

                if dry_run:
                    if entity_count <= 3:  # Show first few examples
                        logger.debug(f"Sample entity: {json.dumps(entity, indent=2)[:200]}...")
                else:
                    if upsert_entity(client, orion_url, entity, headers):
                        success_count += 1
                    else:
                        error_count += 1

                if entity_count % (batch_size * len(SENSORS)) == 0:
                    logger.info(f"Processed {entity_count} entities ({entity_count // len(SENSORS)} time steps)")

            current_time += timedelta(hours=1)

        logger.info("")
        logger.info("=" * 70)

        if dry_run:
            logger.info(f"✓ Generated {entity_count} entities (DRY RUN - not uploaded)")
        else:
            logger.info(f"✓ Upload complete!")
            logger.info(f"  Successful: {success_count}")
            logger.info(f"  Errors: {error_count}")

        logger.info("=" * 70)

        return 0 if (error_count == 0 or dry_run) else 1

    finally:
        if not dry_run:
            client.close()


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--orion-url",
        default=os.getenv("ORION_URL", "http://localhost:1026"),
        help="Orion-LD base URL (default: http://localhost:1026)",
    )
    parser.add_argument(
        "--num-days",
        type=int,
        default=7,
        help="Number of days of historical data to generate (default: 7)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for progress logging (default: 100)",
    )
    parser.add_argument(
        "--fiware-service",
        default=os.getenv("FIWARE_SERVICE", "common"),
        help="Fiware-Service header (default: common)",
    )
    parser.add_argument(
        "--fiware-servicepath",
        default=os.getenv("FIWARE_SERVICEPATH", "/"),
        help="Fiware-ServicePath header (default: /)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate data without uploading to Orion-LD",
    )

    args = parser.parse_args()

    return seed_historical_data(
        args.orion_url,
        args.num_days,
        args.batch_size,
        args.fiware_service,
        args.fiware_servicepath,
        args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
