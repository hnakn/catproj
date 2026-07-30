from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd

from .config import Settings


@dataclass(frozen=True)
class RuleHit:
    equipmentid: str
    logid: str
    anomalytype: str
    severity: str
    anomalyscore: float = 100.0


def evaluate(frame: pd.DataFrame, zero_engine_logids: set[str], run_date: date, settings: Settings) -> list[RuleHit]:
    hits: list[RuleHit] = []
    for row in frame.itertuples(index=False):
        total_hours = row.runtimehours + row.idlehours
        if total_hours > 0 and row.idlehours / total_hours > settings.idle_ratio_threshold:
            hits.append(RuleHit(row.equipmentid, row.logid, "HIGH_IDLE_RATIO", "MEDIUM"))
        if row.logid in zero_engine_logids:
            hits.append(RuleHit(row.equipmentid, row.logid, "ZERO_ENGINE_MULTIDAY", "HIGH"))
        if row.request_enddate is not None and run_date > row.request_enddate and row.status == settings.active_equipment_status:
            hits.append(RuleHit(row.equipmentid, row.logid, "RENTAL_OVERRUN", "MEDIUM"))
        if pd.notna(row.site_lat) and row.distance_from_site_km > settings.geofence_radius_km:
            hits.append(RuleHit(row.equipmentid, row.logid, "GEOFENCE_BREACH", "HIGH"))
        if row.status == settings.available_equipment_status:
            hits.append(RuleHit(row.equipmentid, row.logid, "STATUS_LOG_MISMATCH", "HIGH"))
    return hits
