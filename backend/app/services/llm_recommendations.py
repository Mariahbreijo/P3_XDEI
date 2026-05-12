from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _extract_json_object(text: str) -> dict[str, Any] | None:
    if not text:
        return None

    cleaned = text.strip()
    fenced_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, re.DOTALL)
    if fenced_match:
        cleaned = fenced_match.group(1).strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if "\n" in cleaned:
            cleaned = cleaned.split("\n", 1)[1].strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _normalize_recommendations(items: Any) -> list[str]:
    if not isinstance(items, list):
        return []

    normalized: list[str] = []
    for item in items:
        if isinstance(item, str) and item.strip():
            normalized.append(item.strip())
        elif isinstance(item, dict):
            text = item.get("text") or item.get("message") or item.get("recommendation")
            if isinstance(text, str) and text.strip():
                normalized.append(text.strip())
    return normalized


def _call_gemini(payload: dict[str, Any], system_prompt: str, user_prompt: str, settings) -> dict[str, Any] | None:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.llm_model}:generateContent"

    response_schema = {
        "type": "object",
        "properties": {
            "alert_message": {"type": "string"},
            "summary": {"type": "string"},
            "recommendations": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["alert_message", "summary", "recommendations"],
    }
    
    request_body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "generationConfig": {
            "temperature": settings.llm_temperature,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
        },
    }

    params = {"key": settings.llm_api_key}
    headers = {"Content-Type": "application/json"}

    try:
        logger.debug(f"[LLM] Calling Gemini ({settings.llm_model}) for {payload.get('mode', 'unknown')} mode")
        response = httpx.post(url, headers=headers, json=request_body, params=params, timeout=settings.llm_timeout_seconds)
        response.raise_for_status()
        response_data = response.json()
        
        candidates = response_data.get("candidates", [])
        if not candidates:
            logger.warning("[LLM] Gemini returned no candidates")
            return None
        
        content = candidates[0]["content"]["parts"][0]["text"]
        parsed = _extract_json_object(content)
        if not parsed:
            logger.warning("[LLM] Failed to parse JSON from Gemini response")
            return None

        alert_message = parsed.get("alert_message") or parsed.get("summary") or ""
        summary = parsed.get("summary") or alert_message
        recommendations = _normalize_recommendations(parsed.get("recommendations"))

        logger.info(f"[LLM] Gemini generated {len(recommendations)} recommendations for {payload.get('mode', 'unknown')}")
        return {
            "used_llm": True,
            "alert_message": str(alert_message).strip(),
            "summary": str(summary).strip(),
            "recommendations": recommendations,
        }
    except Exception as e:
        logger.error(f"[LLM] Gemini error: {str(e)}")
        return None


def _call_openai(payload: dict[str, Any], system_prompt: str, user_prompt: str, settings) -> dict[str, Any] | None:
    base_url = settings.llm_base_url.rstrip("/")
    url = f"{base_url}/chat/completions"

    request_body = {
        "model": settings.llm_model,
        "temperature": settings.llm_temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    try:
        logger.debug(f"[LLM] Calling OpenAI ({settings.llm_model}) for {payload.get('mode', 'unknown')} mode")
        response = httpx.post(url, headers=headers, json=request_body, timeout=settings.llm_timeout_seconds)
        response.raise_for_status()
        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        parsed = _extract_json_object(content)
        if not parsed:
            logger.warning("[LLM] Failed to parse JSON from OpenAI response")
            return None

        alert_message = parsed.get("alert_message") or parsed.get("summary") or ""
        summary = parsed.get("summary") or alert_message
        recommendations = _normalize_recommendations(parsed.get("recommendations"))

        logger.info(f"[LLM] OpenAI generated {len(recommendations)} recommendations for {payload.get('mode', 'unknown')}")
        return {
            "used_llm": True,
            "alert_message": str(alert_message).strip(),
            "summary": str(summary).strip(),
            "recommendations": recommendations,
        }
    except Exception as e:
        logger.error(f"[LLM] OpenAI error: {str(e)}")
        return None


def generate_llm_communication(payload: dict[str, Any]) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.llm_enabled or not settings.llm_api_key:
        logger.debug("[LLM] LLM disabled or no API key configured")
        return None

    mode = payload.get("mode", "air")
    
    if mode == "air":
        system_prompt = (
            "Eres un asistente experto en calidad del aire y salud ambiental. Convierte métricas de contaminación "
            "(PM2.5, PM10, NO2, O3) en alertas y recomendaciones en español. "
            "- Si level='safe': confirma que la calidad es buena y sugerencias para mantenerla. "
            "- Si level='warning': advierte sobre limitaciones de actividad outdoor y protección. "
            "- Si level='danger': es crítico, recomienda quedarse en interior, filtros, máscara si es necesario. "
            "No diagnoses enfermedades. Devuelve solo JSON válido, sin texto adicional, sin markdown y sin bloques de código. "
            "No uses comillas simples ni comentarios. La respuesta debe seguir exactamente esta estructura: "
            "{\"alert_message\": string (1-2 frases), \"summary\": string (contexto breve), \"recommendations\": [string, ...]}. "
            "La lista debe contener 3 o 4 recomendaciones concretas y no redundantes para aire contaminado."
        )
    else:
        system_prompt = (
            "Eres un asistente experto en contaminación acústica y salud auditiva. Convierte métricas de ruido "
            "(LAeq, LAmax, LA90 en dB) en alertas y recomendaciones en español. "
            "- Si level='safe': confirma que el ruido es bajo y sugerencias para proteger el descanso. "
            "- Si level='warning': advierte sobre estrés auditivo y recomienda protección auditiva en ciertos contextos. "
            "- Si level='danger': ruido muy alto, recomienda auriculares de protección, evitar zonas ruidosas, descanso. "
            "No diagnoses sordera. Devuelve solo JSON válido, sin texto adicional, sin markdown y sin bloques de código. "
            "No uses comillas simples ni comentarios. La respuesta debe seguir exactamente esta estructura: "
            "{\"alert_message\": string (1-2 frases), \"summary\": string (contexto breve), \"recommendations\": [string, ...]}. "
            "La lista debe contener 3 o 4 recomendaciones concretas y no redundantes para mitigación del ruido."
        )
    
    user_prompt = json.dumps(payload, ensure_ascii=False, indent=2)

    if settings.llm_provider.lower() == "gemini":
        return _call_gemini(payload, system_prompt, user_prompt, settings)
    else:
        return _call_openai(payload, system_prompt, user_prompt, settings)