from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_url: str
    timezone: str = os.getenv("ANOMALY_TIMEZONE", "UTC")
    idle_ratio_threshold: float = float(os.getenv("IDLE_RATIO_THRESHOLD", "0.75"))
    zero_engine_min_days: int = int(os.getenv("ZERO_ENGINE_MIN_DAYS", "3"))
    geofence_radius_km: float = float(os.getenv("GEOFENCE_RADIUS_KM", "2.0"))
    contamination: float = float(os.getenv("IF_CONTAMINATION", "0.08"))
    min_training_rows: int = int(os.getenv("IF_MIN_TRAINING_ROWS", "30"))
    training_days: int = int(os.getenv("IF_TRAINING_DAYS", "90"))
    retrain_days: int = int(os.getenv("IF_RETRAIN_DAYS", "7"))
    active_equipment_status: str = os.getenv("ACTIVE_EQUIPMENT_STATUS", "active")
    available_equipment_status: str = os.getenv("AVAILABLE_EQUIPMENT_STATUS", "available")
    models_dir: Path = Path(os.getenv("ANOMALY_MODELS_DIR", "anomaly_module/models"))


def load_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set")
    return Settings(database_url=database_url)
