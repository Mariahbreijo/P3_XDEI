#!/usr/bin/env python3
"""
FIWARE Subscription Creator - Configures Orion-LD subscriptions to QuantumLeap.

This script creates two subscriptions in Orion-LD:
  1. For AirQualityObserved entities - notifies QuantumLeap on updates
  2. For NoiseLevelObserved entities - notifies QuantumLeap on updates

The subscriptions use the NGSI-LD context and proper headers for persistence.

Usage:
  python3 scripts/fiware_subscriptions.py
  python3 scripts/fiware_subscriptions.py --orion-url http://localhost:1026 --quantumleap-url http://fiware-quantumleap:8668

Environment variables:
  ORION_URL: Orion-LD base URL (default: http://localhost:1026)
  QUANTUMLEAP_URL: QuantumLeap internal URL (default: http://fiware-quantumleap:8668)
  FIWARE_SERVICE: Fiware-Service header (default: common)
  FIWARE_SERVICEPATH: Fiware-ServicePath header (default: /)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys

import httpx

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# NGSI-LD context
NGSI_LD_CONTEXT = "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"


def create_subscription(
    orion_url: str,
    quantumleap_url: str,
    entity_type: str,
    fiware_service: str,
    fiware_servicepath: str,
) -> bool:
    """Create a subscription in Orion-LD for a specific entity type.

    Args:
        orion_url: Base URL of Orion-LD
        quantumleap_url: Internal URL of QuantumLeap (for notifications)
        entity_type: NGSI-LD entity type (AirQualityObserved or NoiseLevelObserved)
        fiware_service: Fiware-Service header value
        fiware_servicepath: Fiware-ServicePath header value

    Returns:
        True if subscription was created successfully, False otherwise
    """
    headers = {
        "Content-Type": "application/ld+json",
        "Link": f'<{NGSI_LD_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
        "Fiware-Service": fiware_service,
        "Fiware-ServicePath": fiware_servicepath,
    }

    # Subscription payload for NGSI-LD
    subscription = {
        "type": "Subscription",
        "entities": [{"type": entity_type}],
        "notification": {
            "endpoint": {
                "uri": f"{quantumleap_url}/v1/notify",
                "accept": "application/ld+json",
            },
            "format": "normalized",
            "attributes": [],  # Empty = all attributes
        },
        "status": "active",
    }

    url = f"{orion_url}/ngsi-ld/v1/subscriptions"

    try:
        with httpx.Client(timeout=10.0) as client:
            logger.info(f"Creating subscription for {entity_type}...")
            logger.debug(f"POST {url}")
            logger.debug(f"Headers: {headers}")
            logger.debug(f"Payload: {json.dumps(subscription, indent=2)}")

            response = client.post(url, json=subscription, headers=headers)

            if response.status_code == 201:
                subscription_id = response.headers.get("Location", "").split("/")[-1]
                logger.info(f"✓ Subscription created successfully for {entity_type}")
                logger.info(f"  ID: {subscription_id}")
                return True
            elif response.status_code == 409:
                logger.warning(f"⚠ Subscription for {entity_type} already exists")
                return True
            else:
                logger.error(f"✗ Failed to create subscription for {entity_type}")
                logger.error(f"  Status: {response.status_code}")
                logger.error(f"  Response: {response.text}")
                return False

    except httpx.RequestError as e:
        logger.error(f"✗ Error creating subscription for {entity_type}: {e}")
        return False


def list_subscriptions(orion_url: str, fiware_service: str, fiware_servicepath: str) -> bool:
    """List all subscriptions in Orion-LD.

    Args:
        orion_url: Base URL of Orion-LD
        fiware_service: Fiware-Service header value
        fiware_servicepath: Fiware-ServicePath header value

    Returns:
        True if listing succeeded, False otherwise
    """
    headers = {
        "Link": f'<{NGSI_LD_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
        "Fiware-Service": fiware_service,
        "Fiware-ServicePath": fiware_servicepath,
    }

    url = f"{orion_url}/ngsi-ld/v1/subscriptions"

    try:
        with httpx.Client(timeout=10.0) as client:
            logger.info("Listing current subscriptions...")
            response = client.get(url, headers=headers)
            response.raise_for_status()

            subscriptions = response.json()
            if not subscriptions:
                logger.warning("⚠ No subscriptions found")
            else:
                logger.info(f"✓ Found {len(subscriptions)} subscription(s):")
                for sub in subscriptions:
                    sub_id = sub.get("id", "N/A")
                    sub_type = sub.get("entities", [{}])[0].get("type", "N/A")
                    sub_status = sub.get("status", "N/A")
                    logger.info(f"  - {sub_id} (type: {sub_type}, status: {sub_status})")
            return True

    except httpx.RequestError as e:
        logger.error(f"✗ Error listing subscriptions: {e}")
        return False


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--orion-url",
        default=os.getenv("ORION_URL", "http://localhost:1026"),
        help="Orion-LD base URL (default: http://localhost:1026)",
    )
    parser.add_argument(
        "--quantumleap-url",
        default=os.getenv("QUANTUMLEAP_URL", "http://fiware-quantumleap:8668"),
        help="QuantumLeap internal URL (default: http://fiware-quantumleap:8668)",
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
        "--list-only",
        action="store_true",
        help="Only list current subscriptions without creating new ones",
    )

    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("FIWARE Subscription Creator")
    logger.info("=" * 70)
    logger.info(f"Orion-LD URL: {args.orion_url}")
    logger.info(f"QuantumLeap URL: {args.quantumleap_url}")
    logger.info(f"Fiware-Service: {args.fiware_service}")
    logger.info(f"Fiware-ServicePath: {args.fiware_servicepath}")
    logger.info("=" * 70)

    # List existing subscriptions
    if not list_subscriptions(args.orion_url, args.fiware_service, args.fiware_servicepath):
        logger.error("Failed to list subscriptions")
        return 1

    # Create subscriptions unless --list-only is specified
    if args.list_only:
        logger.info("--list-only specified, skipping subscription creation")
        return 0

    logger.info("")
    logger.info("Creating subscriptions...")

    success = True

    # Create subscription for AirQualityObserved
    if not create_subscription(
        args.orion_url,
        args.quantumleap_url,
        "AirQualityObserved",
        args.fiware_service,
        args.fiware_servicepath,
    ):
        success = False

    # Create subscription for NoiseLevelObserved
    if not create_subscription(
        args.orion_url,
        args.quantumleap_url,
        "NoiseLevelObserved",
        args.fiware_service,
        args.fiware_servicepath,
    ):
        success = False

    logger.info("")
    logger.info("=" * 70)

    if success:
        logger.info("✓ All subscriptions created successfully!")
        logger.info("  QuantumLeap will now receive notifications for entity updates.")
        logger.info("=" * 70)
        return 0
    else:
        logger.error("✗ Some subscriptions failed to create")
        logger.error("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
