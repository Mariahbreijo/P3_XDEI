# Arquitectura - Vista Técnica

Este documento ofrece una vista arquitectónica consolidada en un único lugar, alineada con el código actual del repositorio.

## Resumen

La implementación actual opera como una demo FIWARE con estos componentes:

- Sensores (mock/local) → IoT Agent (opcional) → Orion-LD (http://localhost:1026)
- QuantumLeap (http://localhost:8668) para series temporales (opcional)
- Backend FastAPI (http://localhost:8000) que agrega, calcula ICA y actúa como proxy a Orion
- Frontend estático (http://localhost:3000) compuesto por módulos ES (vanilla JS) que consumen `/api/v1/dashboard` y usan el proxy a Orion cuando se requiere.
  - Incluye una **vista avanzada** (Mapa Geoespacial Avanzado) implementada con Leaflet + OpenStreetMap y `Leaflet.markercluster` para clustering dinámico.
  - La vista avanzada es una vista separada del dashboard principal, optimizada para pantalla completa con controles de filtros, capas (aire/ruido), y popups con datos NGSI-LD en vivo.

### Frontend: eventos y nueva vista "Detalle de sensor"

- El frontend sigue un patrón orientado a vistas (`main`, `advanced`, `detail`) controlado por `viewState.activeView` y `document.body.dataset.activeView`.
- Se introdujo una vista adicional `detail` (Detalle de sensor) que se abre desde el Mapa Avanzado cuando el usuario hace click en un marcador.
- Estado global: `window.appState` contiene ahora `entities`, `selectedCity` y `selectedSensor` (objeto con campos relevantes del sensor). El `selectedSensor` sirve para poblar la vista detalle sin necesidad de nueva consulta inmediata.
- API cliente/DOM:
  - `openSensorDetail(sensor)`: helper expuesto en `window` por el controlador principal (`app_fiware_sync.js`). Actualiza `selectedCity` (si aplica), guarda `selectedSensor`, cambia la vista a `detail` y llama a `window.renderSensorDetail()` si está disponible.
  - `sensor_detail.js`: módulo responsable de renderizar la vista detalle; expone `window.renderSensorDetail` y se suscribe a los eventos `fiware:selected-sensor-changed` y `fiware:view-changed` para actualizar su UI.
- Eventos personalizados:
  - `fiware:view-changed` — notifica cambios de vista (`detail`, `advanced`, `main`).
  - `fiware:selected-sensor-changed` — notifica cambios en la selección de sensor y es usado por `sensor_detail.js` para refrescar la UI.

Este diseño mantiene el mapa y el dashboard sin acoplamientos fuertes: el Mapa solo invoca un helper público y el módulo detalle se encarga de consumir el estado global.

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
