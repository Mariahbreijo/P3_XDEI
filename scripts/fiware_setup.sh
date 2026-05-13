#!/bin/bash
# ============================================================
# FIWARE Configuration - Subscription & IoT Agent Setup
# ============================================================
# Este script configura:
# 1. IoT Agent Device Provisioning
# 2. Orion Subscription a QuantumLeap
# 3. Verificación de setup

set -e

ORION="http://localhost:1026"
IOT_AGENT="http://localhost:4041"
QUANTUMLEAP="http://localhost:8668"
FIWARE_SERVICE="common"
FIWARE_SERVICE_PATH="/"
API_KEY="iot-agent-api-key-prod"
NGSI_LD_CONTEXT="https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"

echo "========================================"
echo "FIWARE Configuration Script"
echo "========================================"
echo "Orion: $ORION"
echo "IoT Agent: $IOT_AGENT"
echo "QuantumLeap: $QUANTUMLEAP"
echo ""

# ============ 1. PROVISIONAR DISPOSITIVOS EN IOT AGENT ============
echo "📋 [1/3] Provisioning IoT Agent Devices..."
echo ""

echo "  ▪ Service group for /iot/json"
curl -s -X POST "$IOT_AGENT/iot/services" \
  -H "Content-Type: application/json" \
  -H "Fiware-Service: $FIWARE_SERVICE" \
  -H "Fiware-ServicePath: /" \
  -d '{
    "services": [
      {
        "apikey": "'$API_KEY'",
        "cbroker": "http://orion-ld:1026",
        "resource": "/iot/json",
        "entity_type": "Device"
      }
    ]
  }' | python3 -m json.tool

echo ""

# Provisionamiento Air Sensor Madrid
echo "  ▪ Air Sensor Madrid (service_path: /madrid)"
curl -s -X POST "$IOT_AGENT/iot/devices" \
  -H "Content-Type: application/json" \
  -H "Fiware-Service: $FIWARE_SERVICE" \
  -H "Fiware-ServicePath: /" \
  -d '{
    "devices": [
      {
        "device_id": "air-sensor-madrid",
        "entity_name": "urn:ngsi-ld:AirQualityObserved:Madrid:Centro",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "transport": "HTTP",
        "apikey": "'$API_KEY'",
        "attributes": [
          {"object_id": "pm10", "name": "PM10", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "pm25", "name": "PM2_5", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "no2", "name": "NO2", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "o3", "name": "O3", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "temperature", "name": "temperature", "type": "Number", "metadata": {"unitCode": "CEL"}},
          {"object_id": "humidity", "name": "relativeHumidity", "type": "Number", "metadata": {"unitCode": "P1"}}
        ],
        "static_attributes": [
          {"name": "address", "type": "Property", "value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
          {"name": "location", "type": "GeoProperty", "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}}
        ]
      },
      {
        "device_id": "air-sensor-barcelona",
        "entity_name": "urn:ngsi-ld:AirQualityObserved:Barcelona:Sagrada",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "transport": "HTTP",
        "apikey": "'$API_KEY'",
        "attributes": [
          {"object_id": "pm10", "name": "PM10", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "pm25", "name": "PM2_5", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "no2", "name": "NO2", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "o3", "name": "O3", "type": "Number", "metadata": {"unitCode": "UG_M3"}},
          {"object_id": "temperature", "name": "temperature", "type": "Number", "metadata": {"unitCode": "CEL"}},
          {"object_id": "humidity", "name": "relativeHumidity", "type": "Number", "metadata": {"unitCode": "P1"}}
        ],
        "static_attributes": [
          {"name": "address", "type": "Property", "value": {"streetAddress": "Sagrada Familia", "addressLocality": "Barcelona", "addressCountry": "ES"}},
          {"name": "location", "type": "GeoProperty", "value": {"type": "Point", "coordinates": [2.1744, 41.4036]}}
        ]
      },
      {
        "device_id": "noise-sensor-madrid",
        "entity_name": "urn:ngsi-ld:NoiseLevelObserved:Madrid:Centro",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "transport": "HTTP",
        "apikey": "'$API_KEY'",
        "attributes": [
          {"object_id": "laeq", "name": "LAeq", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "lamax", "name": "LAmax", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "la90", "name": "LA90", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "temperature", "name": "temperature", "type": "Number", "metadata": {"unitCode": "CEL"}}
        ],
        "static_attributes": [
          {"name": "address", "type": "Property", "value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
          {"name": "location", "type": "GeoProperty", "value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}}
        ]
      },
      {
        "device_id": "noise-sensor-barcelona",
        "entity_name": "urn:ngsi-ld:NoiseLevelObserved:Barcelona:Sagrada",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "transport": "HTTP",
        "apikey": "'$API_KEY'",
        "attributes": [
          {"object_id": "laeq", "name": "LAeq", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "lamax", "name": "LAmax", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "la90", "name": "LA90", "type": "Number", "metadata": {"unitCode": "2N1"}},
          {"object_id": "temperature", "name": "temperature", "type": "Number", "metadata": {"unitCode": "CEL"}}
        ],
        "static_attributes": [
          {"name": "address", "type": "Property", "value": {"streetAddress": "Sagrada Familia", "addressLocality": "Barcelona", "addressCountry": "ES"}},
          {"name": "location", "type": "GeoProperty", "value": {"type": "Point", "coordinates": [2.1744, 41.4036]}}
        ]
      }
    ]
  }' | python3 -m json.tool

echo ""
echo "✅ Devices provisioned"
echo ""

# ============ 2. CREAR SUSCRIPCIÓN ORION → QUANTUMLEAP ============
echo "📋 [2/3] Creating Orion Subscription (Orion → QuantumLeap)..."
echo ""

echo "  ▪ Subscription for AirQualityObserved entities"
curl -s -X POST "$ORION/ngsi-ld/v1/subscriptions" \
  -H "Content-Type: application/ld+json" \
  -H "Link: <${NGSI_LD_CONTEXT}>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"" \
  -d '{
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld",
    "description": "Air Quality Observable to QuantumLeap",
    "type": "Subscription",
    "entities": [
      {
        "type": "AirQualityObserved"
      }
    ],
    "watchedAttributes": ["PM10", "PM2_5", "NO2", "O3", "temperature", "relativeHumidity"],
    "notification": {
      "format": "normalized",
      "endpoint": {
        "uri": "http://quantumleap:8668/v1/notify"
      },
      "attributes": ["PM10", "PM2_5", "NO2", "O3", "temperature", "relativeHumidity"]
    }
  }' | python3 -m json.tool

echo ""

echo "  ▪ Subscription for NoiseLevelObserved entities"
curl -s -X POST "$ORION/ngsi-ld/v1/subscriptions" \
  -H "Content-Type: application/ld+json" \
  -H "Link: <${NGSI_LD_CONTEXT}>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\"" \
  -d '{
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld",
    "description": "Noise Level Observable to QuantumLeap",
    "type": "Subscription",
    "entities": [
      {
        "type": "NoiseLevelObserved"
      }
    ],
    "watchedAttributes": ["LAeq", "LAmax", "LA90", "temperature"],
    "notification": {
      "format": "normalized",
      "endpoint": {
        "uri": "http://quantumleap:8668/v1/notify"
      },
      "attributes": ["LAeq", "LAmax", "LA90", "temperature"]
    }
  }' | python3 -m json.tool

echo ""
echo "✅ Subscriptions created"
echo ""

# ============ 3. VERIFICACIÓN ============
echo "📋 [3/3] Verification..."
echo ""

echo "  ▪ Checking Orion entities"
curl -s -X GET "$ORION/ngsi-ld/v1/entities?type=AirQualityObserved" \
  -H "Accept: application/ld+json" | python3 -m json.tool | head -20

echo ""
echo "  ▪ Checking Subscriptions"
curl -s -X GET "$ORION/ngsi-ld/v1/subscriptions" \
  -H "Accept: application/ld+json" | python3 -m json.tool | head -30

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Run sensor simulator: python3 scripts/iot_agent_simulator.py --count 20 --interval 5"
echo "  2. Check Orion entities: curl http://localhost:1026/ngsi-ld/v1/entities"
echo "  3. Check QuantumLeap data: curl http://localhost:8668/v1/entities"
echo ""
