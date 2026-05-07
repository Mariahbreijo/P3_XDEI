from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Smart Air & Noise Monitor"
    app_env: str = "dev"
    orion_url: str = "http://localhost:1026"
    quantumleap_url: str = "http://localhost:8668"
    fiware_service: str = "air_noise"
    fiware_servicepath: str = "/"


@lru_cache

def get_settings() -> Settings:
    return Settings()
