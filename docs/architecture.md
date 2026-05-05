# Arquitectura - Vista Técnica

Este documento ofrece una vista arquitectónica consolidada en un único lugar, alineada con el código actual del repositorio.

## Resumen

La implementación actual opera como una demo FIWARE con estos componentes:

- Sensores (mock/local) → IoT Agent (opcional) → Orion-LD (http://localhost:1026)
- QuantumLeap (http://localhost:8668) para series temporales (opcional)
- Backend FastAPI (http://localhost:8000) que agrega, calcula ICA y actúa como proxy a Orion
- Frontend estático (http://localhost:3000) que consume `/api/v1/dashboard` y el proxy a Orion

## Componentes e integraciones

- Backend (FastAPI): expone endpoints en `/api/v1`:
  - `/health`
  - `/sensors`
  - `/bootstrap` (crea entidades demo en Orion)
  - `/air-quality` y `/air-quality/{sensor_id}`
  - `/noise-level` y `/noise-level/{sensor_id}`
  - `/dashboard`
  - `/orion-proxy/ngsi-ld/v1/entities` y `/orion-proxy/ngsi-ld/v1/entities/{entity_id}`

- Orion-LD: almacena entidades NGSI-LD. El backend usa `app.services.orion_service` para crear/listar/obtener entidades.

- QuantumLeap: consultado por `app.services.quantumleap_service` para recuperar históricos cuando está disponible.

- Frontend: scripts en `frontend/` consumen `/api/v1/dashboard` y usan el proxy para obtener entidades NGSI-LD si se necesita mostrar el mapa y más detalles.

## Flujos principales

1. Dashboard (primario): Frontend -> `GET /api/v1/dashboard` -> Backend compone resumen por ciudad (usa store local o Orion)
2. Detalle sensor: Frontend -> `GET /api/v1/air-quality/{sensor_id}` -> Backend busca en Orion o store local -> calcula ICA -> devuelve historial (QuantumLeap si disponible)
3. Bootstrap: Operador -> `POST /api/v1/bootstrap` -> Backend crea/actualiza entidades demo en Orion via `OrionService.bootstrap_demo_entities()`
4. Proxy Orion: Frontend -> `GET /api/v1/orion-proxy/...` -> Backend reenvía a Orion con cabeceras `Fiware-Service: air_noise` y `Fiware-ServicePath: /` para evitar CORS.

## Observabilidad y configuración

- `backend/app/config.py` contiene URLs y valores por defecto:
  - `orion_url`: http://localhost:1026
  - `quantumleap_url`: http://localhost:8668
  - `fiware_service`: air_noise
  - `fiware_servicepath`: /

- Timeout y manejo de caídas: los servicios `OrionService` y `QuantumLeapService` exponen `is_available()` y el backend usa datos locales como fallback.

## Recomendaciones prácticas

- Para demos locales, ejecutar `fiware/docker-compose.yml` y luego `uvicorn app.main:app --reload --port 8000` y servir `frontend` en 3000.
- Configurar variables en `.env` si se desea apuntar a entornos remotos.
- Añadir autenticación/ACL en el proxy antes de exponerlo en producción.

***
