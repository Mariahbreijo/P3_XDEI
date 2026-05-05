#!/bin/bash
# ============================================================
# FIWARE Smart Air & Noise Monitor - One-Command Startup
# ============================================================
# Inicia TODO automáticamente: Docker + Provisioning + Simulador
#
# Uso:
#   bash quickstart.sh              # Ejecución normal
#   bash quickstart.sh --continuous # Loop infinito
#   bash quickstart.sh --help       # Mostrar opciones

set -e

cd "$(dirname "$0")"

CONTINUOUS=""
if [[ "$1" == "--continuous" ]]; then
    CONTINUOUS="--continuous"
    echo "Mode: Continuous simulation (Ctrl+C to stop)"
elif [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "FIWARE Smart Air & Noise Monitor - Quick Start"
    echo ""
    echo "Usage:"
    echo "  bash quickstart.sh              # Standard mode (20 iterations)"
    echo "  bash quickstart.sh --continuous # Infinite loop (Ctrl+C to stop)"
    echo ""
    exit 0
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 FIWARE Smart Air & Noise Monitor - Auto Setup         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# =========== STEP 1: Docker ==========
echo "📦 [1/3] Starting Docker services..."
echo "   (This may take 30-60 seconds on first run)"
echo ""

cd fiware

# Detener servicios previos si existen
docker-compose down 2>/dev/null || true
sleep 2

# Iniciar nuevos servicios
docker-compose up -d

# Esperar a que Orion esté listo
echo "   Waiting for Orion to be ready..."
for i in {1..60}; do
    if curl -s http://localhost:1026/version > /dev/null 2>&1; then
        echo "   ✅ Orion is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "   Checking all services..."
docker-compose ps | grep -E "mongodb|orion-ld|iot-agent-json|quantumleap|timescaledb"
echo ""

cd ..

# =========== STEP 2: Provisioning ==========
echo "⚙️  [2/3] Provisioning IoT Agent devices..."
echo "   (Auto-registering: air-sensor-madrid, air-sensor-barcelona, etc.)"
echo ""

# El simulador hará el provisioning automáticamente en la primera ejecución
# Pero podemos hacer una verificación previa

# =========== STEP 3: Simulador ==========
echo "📡 [3/3] Starting sensor simulator..."
echo "   (Generating random data: PM10, PM2.5, NO2, LAeq, etc.)"
echo ""

if [[ -n "$CONTINUOUS" ]]; then
    .venv/bin/python scripts/iot_agent_simulator.py $CONTINUOUS
else
    .venv/bin/python scripts/iot_agent_simulator.py
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "🔍 View data sources:"
echo "   • Orion:       http://localhost:1026/ngsi-ld/v1/entities"
echo "   • QuantumLeap: http://localhost:8668/version"
echo "   • IoT Agent:   http://localhost:4041/iot/about"
echo ""
echo "🛑 To stop everything:"
echo "   cd fiware && docker-compose down"
echo ""

