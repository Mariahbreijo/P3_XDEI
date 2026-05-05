from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()


class QuantumLeapService:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.quantumleap_url).rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def is_available(self) -> bool:
        try:
            with httpx.Client(timeout=3.0) as client:
                response = client.get(self._url("/v2/version"))
                return response.status_code < 500
        except httpx.HTTPError:
            return False

    def query_entity_attrs(self, entity_id: str, attrs: list[str], limit: int = 50) -> list[dict[str, Any]]:
        joined_attrs = ",".join(attrs)
        with httpx.Client(timeout=6.0) as client:
            response = client.get(
                self._url(f"/v2/entities/{entity_id}/attrs/{joined_attrs}"),
                params={"limit": limit},
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                return payload
            return [payload]


quantumleap_service = QuantumLeapService()
