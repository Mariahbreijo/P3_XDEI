from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IcaBand:
    upper: float
    category: str


ICA_BANDS = (
    IcaBand(50, "GOOD"),
    IcaBand(100, "MODERATE"),
    IcaBand(150, "POOR"),
    IcaBand(float("inf"), "VERY_POOR"),
)

NOISE_BANDS = (
    IcaBand(55, "QUIET"),
    IcaBand(70, "MODERATE"),
    IcaBand(85, "LOUD"),
    IcaBand(float("inf"), "VERY_LOUD"),
)


def calculate_ica(pm25: float, pm10: float, no2: float, o3: float) -> float:
    return round(max(pm25, pm10, no2, o3), 1)


def classify_ica(ica: float) -> str:
    for band in ICA_BANDS:
        if ica <= band.upper:
            return band.category
    return "VERY_POOR"


def classify_noise_level(leq: float) -> str:
    for band in NOISE_BANDS:
        if leq <= band.upper:
            return band.category
    return "VERY_LOUD"
