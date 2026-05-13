#!/bin/bash
# Quickstart para Configuración de Persistencia FIWARE (NGSI v2)
# Este script ejecuta las suscripciones y la inyección de datos históricos

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════════════════"
echo "FIWARE Persistence Configuration Quickstart (v2 API)"
echo "════════════════════════════════════════════════════════"
echo ""

# Verificar que Orion está corriendo (v2 API)
echo "▶ Verificando conectividad con Orion (v2 API)..."
if ! curl -s http://localhost:1026/v2/version > /dev/null; then
    echo "✗ ERROR: Orion no está disponible en http://localhost:1026"
    echo "  Asegúrate de que los contenedores Docker estén corriendo:"
    echo "  $ docker-compose -f fiware/docker-compose.yml up -d"
    exit 1
fi
echo "✓ Orion (v2 API) está disponible"
echo ""

# Verificar que QuantumLeap está corriendo
echo "▶ Verificando conectividad con QuantumLeap..."
if ! curl -s http://localhost:8668/version > /dev/null; then
    echo "✗ ERROR: QuantumLeap no está disponible en http://localhost:8668"
    echo "  Asegúrate de que los contenedores Docker estén corriendo:"
    echo "  $ docker-compose -f fiware/docker-compose.yml up -d"
    exit 1
fi
echo "✓ QuantumLeap está disponible"
echo ""

# Paso 1: Crear suscripciones
echo "════════════════════════════════════════════════════════"
echo "Paso 1/2: Creando suscripciones Orion (v2) → QuantumLeap"
echo "════════════════════════════════════════════════════════"
echo ""

python3 scripts/fiware_subscriptions.py

echo ""
echo "Paso 1 completado. Las suscripciones están activas."
echo ""

# Pause para verificación manual (opcional)
read -p "¿Deseas continuar con la inyección de datos históricos? (s/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Abortado por el usuario."
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "Paso 2/2: Inyectando datos históricos (últimos 7 días)"
echo "════════════════════════════════════════════════════════"
echo "Esto inyectará ~4,032 registros históricos en 24 sensores."
echo "Tiempo estimado: 2-5 minutos"
echo ""

python3 scripts/seed_historical_data.py

echo ""
echo "════════════════════════════════════════════════════════"
echo "✓ Configuración de persistencia completada exitosamente!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Verificar suscripciones (v2 API):"
echo "   curl -s http://localhost:1026/v2/subscriptions | jq ."
echo ""
echo "2. Verificar datos históricos:"
echo "   curl -s http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001 | jq '.value[] | {dateObserved, PM2_5, PM10}' | head"
echo ""
echo "3. Consultar por rango de tiempo:"
echo "   curl -s 'http://localhost:8668/v1/entities/urn:ngsi-ld:AirQualityObserved:Madrid:001?fromDate=2026-05-06T00:00:00Z&toDate=2026-05-13T23:59:59Z' | jq ."
echo ""
echo "Para más detalles, consulta:"
echo "  docs/FIWARE_PERSISTENCE_SETUP.md"
echo ""
