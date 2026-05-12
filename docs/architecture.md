# Arquitectura - Vista Técnica

Este documento resume la arquitectura real de la implementación actual y evita dependencias obsoletas que ya no forman parte del flujo activo.

## Resumen

La aplicación opera como una demo FIWARE con estos componentes:

- Sensores mock/locales o agentes IoT opcionales → Orion-LD (`http://localhost:1026`)
- QuantumLeap (`http://localhost:8668`) para históricos cuando está disponible
- Backend FastAPI (`http://localhost:8000`) que calcula ICA, genera recomendaciones con Gemini y actúa como proxy a Orion
- Frontend estático (`http://localhost:3000`) basado en módulos ES de vanilla JS, HTML y CSS

El frontend incluye dos vistas principales además del panel inicial:

- Mapa Geoespacial Avanzado con Leaflet, OpenStreetMap y clustering
- Vista `detail` para el detalle de sensor, con histórico sintético, banners OMS y recomendaciones dinámicas

## Frontend: eventos y vista de detalle

- El frontend sigue un patrón de vistas (`main`, `advanced`, `detail`) controlado por `viewState.activeView` y `document.body.dataset.activeView`.
- `openSensorDetail(sensor)` es el helper público que guarda `selectedSensor`, cambia la vista a `detail` y dispara el render del módulo detalle.
- `sensor_detail.js` es el responsable de pintar la vista detalle y de reaccionar a `fiware:selected-sensor-changed` y `fiware:view-changed`.
- El estado global `window.appState` contiene `entities`, `selectedCity` y `selectedSensor` para evitar consultas extra innecesarias al abrir la vista detalle.

### Soporte multidioma

- El runtime i18n está en cliente, con español por defecto e inglés persistido en `localStorage`.
- Las traducciones cubren shell, dashboard, mapa avanzado, detalle, recomendaciones y etiquetas derivadas.
- Los componentes generados en cliente se reconstruyen cuando cambia el idioma.

### Extensión funcional de `sensor_detail.js`

La vista `detail` añade una capa local de analítica y salud para respuesta inmediata:

- KPIs dinámicos por tipo de sensor.
- Histórico semanal sintético para visualización estable.
- Gráfico semanal con `Chart.js`.
- Tarjeta de día más perjudicial.
- Motor de alertas OMS local con estados `safe`, `warning` y `danger`.
- Recomendaciones visuales por contexto `air` o `noise`.
- Marcado explícito cuando una respuesta procede de IA con la insignia `✨ IA`.

La generación de alertas y recomendaciones ya no se considera lógica puramente frontend: la evaluación visual sigue en cliente, pero el contenido de recomendaciones se solicita al backend para centralizar el prompt y usar Gemini.

## Backend e integraciones

El backend FastAPI expone estos endpoints en `/api/v1`:

- `/health`
- `/sensors`
- `/bootstrap`
- `/air-quality` y `/air-quality/{sensor_id}`
- `/noise-level` y `/noise-level/{sensor_id}`
- `/recommendations`
- `/dashboard`
- `/orion-proxy/ngsi-ld/v1/entities` y `/orion-proxy/ngsi-ld/v1/entities/{entity_id}`

Responsabilidades principales:

- `app.services.orion_service` crea, lista y obtiene entidades NGSI-LD en Orion-LD.
- `app.services.quantumleap_service` consulta históricos cuando el servicio está disponible.
- `app.services.llm_recommendations` encapsula Gemini y el fallback compatible con OpenAI, devolviendo un contrato JSON estable con `used_llm`, `alert_message`, `summary` y `recommendations`.

## Flujos principales

1. Dashboard: Frontend -> `GET /api/v1/dashboard` -> Backend compone el resumen por ciudad.
2. Detalle sensor: Frontend -> `GET /api/v1/air-quality/{sensor_id}` o `GET /api/v1/noise-level/{sensor_id}` -> Backend calcula derivados y, si hay histórico, consulta QuantumLeap.
3. Bootstrap: Operador -> `POST /api/v1/bootstrap` -> Backend crea o actualiza entidades demo en Orion.
4. Recomendaciones IA: Frontend -> `POST /api/v1/recommendations` -> Backend llama a Gemini o al fallback y devuelve una respuesta normalizada.
5. Proxy Orion: Frontend -> `GET /api/v1/orion-proxy/...` -> Backend reenvía a Orion con cabeceras FIWARE.

## Observabilidad y configuración

- `backend/app/config.py` carga `.env`, limpia espacios y finales de línea, y detecta `gemini` cuando la configuración lo indica.
- `main.py` registra al inicio el estado de LLM para facilitar el diagnóstico.
- `OrionService` y `QuantumLeapService` exponen `is_available()` y el sistema usa fallback local cuando un servicio no responde.

## Recomendaciones prácticas

- Para demos locales, ejecutar `fiware/docker-compose.yml`, luego `uvicorn app.main:app --reload --port 8000` y servir `frontend` en el puerto 3000.
- Definir `LLM_ENABLED=true`, `LLM_PROVIDER=gemini`, `LLM_API_KEY` y `LLM_MODEL=gemini-2.5-flash` en `backend/.env`.
- Añadir autenticación y ACL al proxy si el sistema se expone fuera de entorno local.
