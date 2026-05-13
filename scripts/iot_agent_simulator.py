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
FIWARE_SERVICE = "common"
FIWARE_SERVICE_PATH = "/"
API_KEY = "iot-agent-api-key-prod"
DEVICE_TRANSPORT = "HTTP"

# Build DEVICES_CONFIG dynamically to create multiple sensors per city/neighborhood
SENSORS_PER_NEIGHBORHOOD = 2

# City definitions: center coords (lat, lon), neighborhoods and attribute ranges
CITY_DEFS = {
    "madrid": {
        "name": "Madrid",
        "center": (40.4168, -3.7038),
        "neighborhoods": ["Centro", "Norte", "Sur"],
        "type": "air",
        "air_ranges": {"pm10": (30, 90), "pm25": (10, 60), "no2": (40, 150)}
    },
    "barcelona": {
        "name": "Barcelona",
        "center": (41.3851, 2.1734),
        "neighborhoods": ["Centro", "Norte", "Sur"],
        "type": "noise",
        "noise_ranges": {"laeq": (50, 80)}
    },
    "corunna": {
        "name": "A Coruña",
        "center": (43.3623, -8.4115),
        "neighborhoods": ["Centro", "Ensanche"],
        "type": "air",
        "air_ranges": {"pm10": (15, 75), "pm25": (5, 45), "no2": (25, 110)}
    },
    "alicante": {
        "name": "Alicante",
        "center": (38.3452, -0.4810),
        "neighborhoods": ["Centro", "Playa"],
        "type": "noise",
        "noise_ranges": {"laeq": (52, 82)}
    },
    "bilbao": {
        "name": "Bilbao",
        "center": (43.2630, -2.9350),
        "neighborhoods": ["Centro", "Abando"],
        "type": "air",
        "air_ranges": {"pm10": (20, 80), "pm25": (8, 50), "no2": (30, 130)}
    },
}

DEVICES_CONFIG = {}
for city_key, c in CITY_DEFS.items():
    lat_c, lon_c = c["center"]
    for neigh in c["neighborhoods"]:
        for idx in range(1, SENSORS_PER_NEIGHBORHOOD + 1):
            base = f"{city_key}-{neigh.replace(' ', '').lower()}-{idx:02d}"
            if c["type"] == "air":
                device_id = f"air-sensor-{base}"
                entity_id = f"urn:ngsi-ld:AirQualityObserved:ES-{c['name'].replace(' ', '')}-{neigh.replace(' ', '')}-{idx:02d}"
                # jitter location +/- ~0.006 degrees
                jlat = lat_c + random.uniform(-0.006, 0.006)
                jlon = lon_c + random.uniform(-0.006, 0.006)
                jlon_rounded = round(jlon, 6)
                jlat_rounded = round(jlat, 6)
                DEVICES_CONFIG[device_id] = {
                    "entity_id": entity_id,
                    "entity_type": "AirQualityObserved",
                    "service_path": "/",
                    "attributes": {
                        "pm10": {"init": random.uniform(20, 70), "min": c["air_ranges"]["pm10"][0], "max": c["air_ranges"]["pm10"][1], "step": 3},
                        "pm25": {"init": random.uniform(5, 35), "min": c["air_ranges"]["pm25"][0], "max": c["air_ranges"]["pm25"][1], "step": 2},
                        "no2": {"init": random.uniform(30, 120), "min": c["air_ranges"]["no2"][0], "max": c["air_ranges"]["no2"][1], "step": 5},
                        "o3": {"init": random.uniform(18, 95), "min": 15, "max": 110, "step": 3},
                        "temperature": {"init": random.uniform(15, 26), "min": 10, "max": 35, "step": 1},
                        "humidity": {"init": random.uniform(45, 80), "min": 30, "max": 95, "step": 2},
                    },
                    "static_attrs": {
                        "address": {"value": {"streetAddress": neigh, "addressLocality": c["name"], "addressCountry": "ES"}},
                        "location": {"value": {"type": "Point", "coordinates": [jlon_rounded, jlat_rounded]}},
                    },
                }
            else:
                device_id = f"noise-sensor-{base}"
                entity_id = f"urn:ngsi-ld:NoiseLevelObserved:ES-{c['name'].replace(' ', '')}-{neigh.replace(' ', '')}-{idx:02d}"
                jlat = lat_c + random.uniform(-0.006, 0.006)
                jlon = lon_c + random.uniform(-0.006, 0.006)
                jlon_rounded = round(jlon, 6)
                jlat_rounded = round(jlat, 6)
                DEVICES_CONFIG[device_id] = {
                    "entity_id": entity_id,
                    "entity_type": "NoiseLevelObserved",
                    "service_path": "/",
                    "attributes": {
                        "laeq": {"init": random.uniform(55, 78), "min": c["noise_ranges"]["laeq"][0], "max": c["noise_ranges"]["laeq"][1], "step": 2},
                        "lamax": {"init": random.uniform(70, 95), "min": 60, "max": 100, "step": 3},
                        "la90": {"init": random.uniform(45, 75), "min": 40, "max": 80, "step": 2},
                        "temperature": {"init": random.uniform(15, 26), "min": 10, "max": 35, "step": 1},
                    },
                    "static_attrs": {
                        "address": {"value": {"streetAddress": neigh, "addressLocality": c["name"], "addressCountry": "ES"}},
                        "location": {"value": {"type": "Point", "coordinates": [jlon_rounded, jlat_rounded]}},
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
                def sample_device(prefix):
                    for did in sensor_state.keys():
                        if did.startswith(prefix):
                            return did
                    return None

                m_air = sample_device('air-sensor-madrid')
                m_noise = sample_device('noise-sensor-madrid')
                b_air = sample_device('air-sensor-barcelona')
                c_air = sample_device('air-sensor-corunna')
                a_noise = sample_device('noise-sensor-alicante')
                bi_air = sample_device('air-sensor-bilbao')

                if m_air:
                    print(f"  → Madrid Air: PM10={sensor_state[m_air]['pm10']:.1f}, PM2.5={sensor_state[m_air]['pm25']:.1f}, NO2={sensor_state[m_air]['no2']:.1f}, O3={sensor_state[m_air].get('o3', 0.0):.1f}")
                if m_noise:
                    print(f"  → Madrid Noise: LAeq={sensor_state[m_noise]['laeq']:.1f}, LAmax={sensor_state[m_noise]['lamax']:.1f}")
                if b_air:
                    print(f"  → Barcelona Air: PM10={sensor_state[b_air]['pm10']:.1f}, NO2={sensor_state[b_air]['no2']:.1f}, O3={sensor_state[b_air].get('o3', 0.0):.1f}")
                if c_air:
                    print(f"  → A Coruña Air: PM10={sensor_state[c_air]['pm10']:.1f}, O3={sensor_state[c_air].get('o3', 0.0):.1f}, Temperature={sensor_state[c_air]['temperature']:.1f}°C")
                if a_noise:
                    print(f"  → Alicante Noise: LAeq={sensor_state[a_noise]['laeq']:.1f} dB")
                if bi_air:
                    print(f"  → Bilbao Air: PM2.5={sensor_state[bi_air]['pm25']:.1f}, O3={sensor_state[bi_air].get('o3', 0.0):.1f}")

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
