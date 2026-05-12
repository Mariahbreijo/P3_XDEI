from functools import lru_cache
import logging
import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(override=True)

logger = logging.getLogger(__name__)


class Settings(BaseModel):
    app_name: str = "Smart Air & Noise Monitor"
    app_env: str = "dev"
    orion_url: str = "http://localhost:1026"
    quantumleap_url: str = "http://localhost:8668"
    fiware_service: str = "air_noise"
    fiware_servicepath: str = "/"
    llm_enabled: bool = False
    llm_provider: str = "openai"
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.3
    llm_timeout_seconds: float = 12.0


@lru_cache
def get_settings() -> Settings:
    def env_str(name: str, default: str) -> str:
        raw = os.getenv(name)
        if raw is None:
            return default
        return raw.strip()

    def env_bool(name: str, default: bool) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return default
        return raw.strip().lower() in {"1", "true", "yes", "on"}

    api_key = env_str("LLM_API_KEY", "") or env_str("OPENAI_API_KEY", "") or env_str("GEMINI_API_KEY", "")
    provider = env_str("LLM_PROVIDER", "openai").lower()
    enabled_default = bool(api_key)

    if not api_key and env_str("GEMINI_API_KEY", ""):
        provider = "gemini"

    return Settings(
        app_name=env_str("APP_NAME", Settings.model_fields["app_name"].default),
        app_env=env_str("APP_ENV", Settings.model_fields["app_env"].default),
        orion_url=env_str("ORION_URL", Settings.model_fields["orion_url"].default),
        quantumleap_url=env_str("QUANTUMLEAP_URL", Settings.model_fields["quantumleap_url"].default),
        fiware_service=env_str("FIWARE_SERVICE", Settings.model_fields["fiware_service"].default),
        fiware_servicepath=env_str("FIWARE_SERVICEPATH", Settings.model_fields["fiware_servicepath"].default),
        llm_enabled=env_bool("LLM_ENABLED", enabled_default),
        llm_provider=provider,
        llm_base_url=env_str("LLM_BASE_URL", Settings.model_fields["llm_base_url"].default),
        llm_api_key=api_key,
        llm_model=env_str("LLM_MODEL", Settings.model_fields["llm_model"].default),
        llm_temperature=float(env_str("LLM_TEMPERATURE", str(Settings.model_fields["llm_temperature"].default))),
        llm_timeout_seconds=float(
            env_str("LLM_TIMEOUT_SECONDS", str(Settings.model_fields["llm_timeout_seconds"].default))
        ),
    )
