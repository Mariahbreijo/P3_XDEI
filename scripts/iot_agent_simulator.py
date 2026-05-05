#!/usr/bin/env python3
"""
IoT Agent Simulator - Auto-Provisioning & Data Sending

Flujo automático:
  1. Provisiona dispositivos en IoT Agent (si no existen)
  2. Genera datos aleatorios con movimiento realista (Brownian motion)
  3. Envía datos cada 5 segundos
  4. Orion crea entidades AirQualityObserved y NoiseLevelObserved automáticamente
  5. QuantumLeap almacena históricos automáticamente

Uso:
  python iot_agent_simulator.py                    # 20 iteraciones, 5s intervalo
  python iot_agent_simulator.py --count 100 --interval 3
  python iot_agent_simulator.py --continuous      # Loop infinito
"""

import json
import time
import random
import argparse
import sys
from datetime import datetime

import httpx

# ============ CONFIGURACIÓN ============
IOT_AGENT_URL = "http://localhost:4041"
IOT_AGENT_DATA_URL = "http://localhost:7896"
ORION_URL = "http://localhost:1026"
FIWARE_SERVICE = "air_noise"
FIWARE_SERVICE_PATH = "/"
API_KEY = "iot-agent-api-key-prod"
DEVICE_TRANSPORT = "HTTP"

# Definición de dispositivos (sensores) - Configuración para provisioning
DEVICES_CONFIG = {
    # ===== MADRID =====
    "air-sensor-madrid": {
        "entity_id": "urn:ngsi-ld:AirQualityObserved:ES-Madrid-01",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "attributes": {
            "pm10": {"init": 65.4, "min": 30, "max": 90, "step": 3},
            "pm25": {"init": 28.5, "min": 10, "max": 60, "step": 2},
            "no2": {"init": 89.5, "min": 40, "max": 150, "step": 5},
            "o3": {"init": 62.8, "min": 20, "max": 100, "step": 3},
            "temperature": {"init": 22.5, "min": 15, "max": 30, "step": 1},
            "humidity": {"init": 65.0, "min": 40, "max": 90, "step": 2},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}},
        },
    },
    "noise-sensor-madrid": {
        "entity_id": "urn:ngsi-ld:NoiseLevelObserved:ES-Madrid-01",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "attributes": {
            "laeq": {"init": 72.5, "min": 55, "max": 85, "step": 2},
            "lamax": {"init": 85.2, "min": 70, "max": 100, "step": 3},
            "la90": {"init": 68.3, "min": 50, "max": 80, "step": 2},
            "temperature": {"init": 22.5, "min": 15, "max": 30, "step": 1},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Plaza Mayor", "addressLocality": "Madrid", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-3.7038, 40.4168]}},
        },
    },
    # ===== BARCELONA =====
    "air-sensor-barcelona": {
        "entity_id": "urn:ngsi-ld:AirQualityObserved:ES-Barcelona-01",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "attributes": {
            "pm10": {"init": 45.2, "min": 20, "max": 80, "step": 2},
            "pm25": {"init": 20.1, "min": 8, "max": 50, "step": 2},
            "no2": {"init": 55.3, "min": 30, "max": 120, "step": 4},
            "o3": {"init": 58.9, "min": 18, "max": 95, "step": 3},
            "temperature": {"init": 20.3, "min": 14, "max": 28, "step": 1},
            "humidity": {"init": 72.5, "min": 50, "max": 85, "step": 2},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Sagrada Familia", "addressLocality": "Barcelona", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [2.1744, 41.4036]}},
        },
    },
    "noise-sensor-barcelona": {
        "entity_id": "urn:ngsi-ld:NoiseLevelObserved:ES-Barcelona-05",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "attributes": {
            "laeq": {"init": 68.7, "min": 50, "max": 80, "step": 2},
            "lamax": {"init": 81.4, "min": 65, "max": 95, "step": 3},
            "la90": {"init": 63.2, "min": 45, "max": 75, "step": 2},
            "temperature": {"init": 20.3, "min": 14, "max": 28, "step": 1},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Sagrada Familia", "addressLocality": "Barcelona", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [2.1744, 41.4036]}},
        },
    },
    # ===== A CORUÑA =====
    "air-sensor-corunna": {
        "entity_id": "urn:ngsi-ld:AirQualityObserved:ES-Corunna-01",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "attributes": {
            "pm10": {"init": 42.5, "min": 15, "max": 75, "step": 2},
            "pm25": {"init": 18.3, "min": 5, "max": 45, "step": 1.5},
            "no2": {"init": 52.1, "min": 25, "max": 110, "step": 4},
            "o3": {"init": 55.4, "min": 15, "max": 90, "step": 3},
            "temperature": {"init": 18.2, "min": 10, "max": 25, "step": 1},
            "humidity": {"init": 78.5, "min": 60, "max": 95, "step": 2},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Torre de Hércules", "addressLocality": "A Coruña", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-8.3838, 43.3623]}},
        },
    },
    "noise-sensor-corunna": {
        "entity_id": "urn:ngsi-ld:NoiseLevelObserved:ES-Corunna-01",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "attributes": {
            "laeq": {"init": 65.2, "min": 48, "max": 78, "step": 1.5},
            "lamax": {"init": 78.5, "min": 60, "max": 92, "step": 2},
            "la90": {"init": 60.1, "min": 40, "max": 72, "step": 1.5},
            "temperature": {"init": 18.2, "min": 10, "max": 25, "step": 1},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Torre de Hércules", "addressLocality": "A Coruña", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-8.3838, 43.3623]}},
        },
    },
    # ===== ALICANTE =====
    "air-sensor-alicante": {
        "entity_id": "urn:ngsi-ld:AirQualityObserved:ES-Alicante-01",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "attributes": {
            "pm10": {"init": 58.7, "min": 25, "max": 85, "step": 2.5},
            "pm25": {"init": 25.4, "min": 10, "max": 55, "step": 2},
            "no2": {"init": 72.3, "min": 35, "max": 135, "step": 4},
            "o3": {"init": 66.8, "min": 20, "max": 105, "step": 3},
            "temperature": {"init": 25.1, "min": 18, "max": 32, "step": 1},
            "humidity": {"init": 68.0, "min": 40, "max": 85, "step": 2},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Barrio del Carmen", "addressLocality": "Alicante", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-0.4915, 38.3452]}},
        },
    },
    "noise-sensor-alicante": {
        "entity_id": "urn:ngsi-ld:NoiseLevelObserved:ES-Alicante-01",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "attributes": {
            "laeq": {"init": 70.3, "min": 52, "max": 82, "step": 2},
            "lamax": {"init": 83.8, "min": 68, "max": 98, "step": 3},
            "la90": {"init": 65.5, "min": 48, "max": 77, "step": 2},
            "temperature": {"init": 25.1, "min": 18, "max": 32, "step": 1},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Barrio del Carmen", "addressLocality": "Alicante", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-0.4915, 38.3452]}},
        },
    },
    # ===== BILBAO =====
    "air-sensor-bilbao": {
        "entity_id": "urn:ngsi-ld:AirQualityObserved:ES-Bilbao-02",
        "entity_type": "AirQualityObserved",
        "service_path": "/",
        "attributes": {
            "pm10": {"init": 52.1, "min": 20, "max": 80, "step": 2},
            "pm25": {"init": 22.5, "min": 8, "max": 50, "step": 1.5},
            "no2": {"init": 68.4, "min": 32, "max": 130, "step": 4},
            "o3": {"init": 61.2, "min": 18, "max": 98, "step": 3},
            "temperature": {"init": 19.8, "min": 12, "max": 27, "step": 1},
            "humidity": {"init": 75.3, "min": 55, "max": 90, "step": 2},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Casco Viejo", "addressLocality": "Bilbao", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-2.9385, 43.2627]}},
        },
    },
    "noise-sensor-bilbao": {
        "entity_id": "urn:ngsi-ld:NoiseLevelObserved:ES-Bilbao-01",
        "entity_type": "NoiseLevelObserved",
        "service_path": "/",
        "attributes": {
            "laeq": {"init": 69.5, "min": 51, "max": 81, "step": 2},
            "lamax": {"init": 82.3, "min": 66, "max": 96, "step": 3},
            "la90": {"init": 64.7, "min": 46, "max": 76, "step": 2},
            "temperature": {"init": 19.8, "min": 12, "max": 27, "step": 1},
        },
        "static_attrs": {
            "address": {"value": {"streetAddress": "Casco Viejo", "addressLocality": "Bilbao", "addressCountry": "ES"}},
            "location": {"value": {"type": "Point", "coordinates": [-2.9385, 43.2627]}},
        },
    },
}

# Estado local de sensores (para Brownian motion)
sensor_state = {}
for device_id, config in DEVICES_CONFIG.items():
    sensor_state[device_id] = {}
    for attr, meta in config["attributes"].items():
        sensor_state[device_id][attr] = meta["init"]


def random_walk(current_value, min_val, max_val, step):
    """Movimiento aleatorio browniano con límites"""
    change = random.uniform(-step, step)
    new_value = current_value + change
    return max(min_val, min(max_val, new_value))


def provision_device(device_id: str) -> bool:
    """Provisiona un dispositivo en el IoT Agent"""
    config = DEVICES_CONFIG[device_id]

    # Mapeo de atributos (object_id → NGSI-LD name)
    attribute_mapping = {
        "pm10": "PM10",
        "pm25": "PM2_5",
        "no2": "NO2",
        "o3": "O3",
        "laeq": "LAeq",
        "lamax": "LAmax",
        "la90": "LA90",
        "temperature": "temperature",
        "humidity": "relativeHumidity",
    }

    attributes = [
        {
            "object_id": obj_id,
            "name": attribute_mapping.get(obj_id, obj_id),
            "type": "Number",
            "metadata": {"unitCode": "UG_M3" if obj_id in ["pm10", "pm25", "no2", "o3"] else ("2N1" if obj_id in ["laeq", "lamax", "la90"] else "CEL")},
        }
        for obj_id in config["attributes"].keys()
    ]

    payload = {
        "devices": [
            {
                "device_id": device_id,
                "entity_name": config["entity_id"],
                "entity_type": config["entity_type"],
                "service_path": config["service_path"],
                "transport": DEVICE_TRANSPORT,
                "apikey": API_KEY,
                "attributes": attributes,
                "static_attributes": [
                    {"name": k, "type": "Property", **v}
                    for k, v in config["static_attrs"].items()
                ],
            }
        ]
    }

    url = f"{IOT_AGENT_URL}/iot/devices"
    headers = {
        "Content-Type": "application/json",
        "Fiware-Service": FIWARE_SERVICE,
        "Fiware-ServicePath": FIWARE_SERVICE_PATH,
    }

    max_attempts = 6
    for attempt in range(1, max_attempts + 1):
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json=payload, headers=headers)

            if response.status_code in [200, 201, 204]:
                print(f"  ✓ {device_id} provisioned")
                return True
            if response.status_code == 409:  # Conflict - Device already exists
                print(f"  ℹ {device_id} already provisioned (409)")
                return True

            print(f"  ✗ Attempt {attempt}: HTTP {response.status_code}: {response.text}")
        except httpx.ConnectError as e:
            print(f"  ✗ Attempt {attempt}: Connect error to IoT Agent at {IOT_AGENT_URL}: {e}")
        except httpx.HTTPError as e:
            print(f"  ✗ Attempt {attempt}: HTTP error provisioning {device_id}: {e}")
        except Exception as e:
            print(f"  ✗ Attempt {attempt}: Unexpected error provisioning {device_id}: {e}")

        if attempt < max_attempts:
            time.sleep(2 * attempt)

    print(f"  ✗ Failed to provision {device_id} after {max_attempts} attempts")
    return False


def provision_service_group() -> bool:
    """Provisiona el grupo de servicio para el recurso HTTP del IoT Agent"""
    payload = {
        "services": [
            {
                "apikey": API_KEY,
                "cbroker": "http://orion-ld:1026",
                "resource": "/iot/json",
                "entity_type": "Device",
            }
        ]
    }

    url = f"{IOT_AGENT_URL}/iot/services"
    headers = {
        "Content-Type": "application/json",
        "Fiware-Service": FIWARE_SERVICE,
        "Fiware-ServicePath": FIWARE_SERVICE_PATH,
    }

    max_attempts = 6
    for attempt in range(1, max_attempts + 1):
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json=payload, headers=headers)

            if response.status_code in [200, 201, 204, 409]:
                return True
            print(f"  ⚠️  Attempt {attempt}: Service provisioning returned HTTP {response.status_code}: {response.text}")
        except httpx.ConnectError as e:
            print(f"  ⚠️  Attempt {attempt}: Connect error to IoT Agent at {IOT_AGENT_URL}: {e}")
        except httpx.HTTPError as e:
            print(f"  ⚠️  Attempt {attempt}: HTTP error provisioning service group: {e}")

        if attempt < max_attempts:
            time.sleep(2 * attempt)

    return False


def verify_orion_connection() -> bool:
    """Verifica que Orion esté disponible"""
    try:
        response = httpx.get(f"{ORION_URL}/version", timeout=5.0)
        return response.status_code == 200
    except httpx.HTTPError:
        return False


def provision_all_devices() -> bool:
    """Provisiona todos los dispositivos"""
    print(f"\n📋 STEP 1: Provisioning devices...")
    print(f"   IoT Agent: {IOT_AGENT_URL}")
    print(f"   Orion: {ORION_URL}")
    print(f"   Fiware-Service: {FIWARE_SERVICE}\n")

    if not verify_orion_connection():
        print("  ⚠️  WARNING: Orion not responding. Starting anyway...")

    if not provision_service_group():
        print("  ⚠️  Service group provisioning failed. Continuing anyway...")

    all_success = True
    for device_id in DEVICES_CONFIG.keys():
        if not provision_device(device_id):
            all_success = False

    if all_success:
        print("\n✅ All devices provisioned successfully\n")
    else:
        print("\n⚠️  Some devices failed to provision. Continuing anyway...\n")

    return all_success


def send_to_iot_agent(device_id: str, payload: dict) -> bool:
    """Envía datos al IoT Agent HTTP"""
    try:
        url = f"{IOT_AGENT_DATA_URL}/iot/json"
        config = DEVICES_CONFIG[device_id]
        
        params = {
            "i": device_id,  # Device ID
            "k": API_KEY,  # API Key
        }
        headers = {
            "Content-Type": "application/json",
            "Fiware-Service": FIWARE_SERVICE,
            "Fiware-ServicePath": config["service_path"],
        }

        response = httpx.post(url, json=payload, params=params, headers=headers, timeout=5.0)

        return response.status_code in [200, 201, 204]
    except httpx.HTTPError:
        return False


def run_simulator(count: int = 20, interval: float = 5.0, continuous: bool = False):
    """Ejecuta simulador de sensores"""
    print(f"\n📡 STEP 2: Sending data...\n")

    iteration = 0
    try:
        while True:
            iteration += 1

            if not continuous and iteration > count:
                break

            print(f"[#{iteration}] {datetime.now().strftime('%H:%M:%S')}", end=" → ")

            success_count = 0
            for device_id, config in DEVICES_CONFIG.items():
                # Generar valores con random walk
                payload = {}
                for attr, meta in config["attributes"].items():
                    current = sensor_state[device_id][attr]
                    new_value = random_walk(
                        current,
                        meta["min"],
                        meta["max"],
                        meta["step"],
                    )
                    sensor_state[device_id][attr] = new_value
                    payload[attr] = round(new_value, 2)

                # Enviar al IoT Agent
                if send_to_iot_agent(device_id, payload):
                    success_count += 1

            # Log: Mostrar resumen
            print(f"{success_count}/{len(DEVICES_CONFIG)} devices sent")

            # Mostrar detalles cada 5 iteraciones
            if iteration % 5 == 0:
                print(f"  → Madrid Air: PM10={sensor_state['air-sensor-madrid']['pm10']:.1f}, PM2.5={sensor_state['air-sensor-madrid']['pm25']:.1f}, NO2={sensor_state['air-sensor-madrid']['no2']:.1f}")
                print(f"  → Madrid Noise: LAeq={sensor_state['noise-sensor-madrid']['laeq']:.1f}, LAmax={sensor_state['noise-sensor-madrid']['lamax']:.1f}")
                print(f"  → Barcelona Air: PM10={sensor_state['air-sensor-barcelona']['pm10']:.1f}, NO2={sensor_state['air-sensor-barcelona']['no2']:.1f}")
                print(f"  → A Coruña Air: PM10={sensor_state['air-sensor-corunna']['pm10']:.1f}, Temperature={sensor_state['air-sensor-corunna']['temperature']:.1f}°C")
                print(f"  → Alicante Noise: LAeq={sensor_state['noise-sensor-alicante']['laeq']:.1f} dB")
                print(f"  → Bilbao Air: PM2.5={sensor_state['air-sensor-bilbao']['pm25']:.1f}, O3={sensor_state['air-sensor-bilbao']['o3']:.1f}")

            if not continuous:
                if iteration < count:
                    time.sleep(interval)
            else:
                time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n\n⏹️  Interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        sys.exit(1)

    print(f"\n✅ Simulator completed: {iteration} iterations sent to IoT Agent")


def main():
    parser = argparse.ArgumentParser(
        description="IoT Agent Simulator with Auto-Provisioning",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python iot_agent_simulator.py                    # 20 iterations, 5s interval
  python iot_agent_simulator.py --count 100 --interval 3
  python iot_agent_simulator.py --continuous      # Loop indefinitely
        """,
    )
    parser.add_argument("--count", type=int, default=20, help="Number of iterations (default: 20)")
    parser.add_argument("--interval", type=float, default=5, help="Interval in seconds (default: 5)")
    parser.add_argument("--continuous", action="store_true", help="Run indefinitely (Ctrl+C to stop)")
    parser.add_argument("--skip-provision", action="store_true", help="Skip device provisioning")

    args = parser.parse_args()

    print("=" * 60)
    print("🚀 IoT Agent Simulator - Auto-Provisioning & Data Sending")
    print("=" * 60)

    # Provisionar dispositivos (a menos que se especifique --skip-provision)
    if not args.skip_provision:
        provision_all_devices()

        # Esperar un poco para que Orion cree las entidades
        print("Waiting for Orion to create entities...\n")
        time.sleep(3)

    # Ejecutar simulador
    run_simulator(
        count=args.count,
        interval=args.interval,
        continuous=args.continuous,
    )

    print("\n" + "=" * 60)
    print("📊 Data is now available at:")
    print("  • Orion:      http://localhost:1026/ngsi-ld/v1/entities")
    print("  • QuantumLeap: http://localhost:8668/v1/entities")
    print("  • IoT Agent:   http://localhost:7896/iot/json")
    print("  • Frontend:    http://localhost:3000")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
