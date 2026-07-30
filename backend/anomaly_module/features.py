from __future__ import annotations

from math import atan2, cos, radians, sin, sqrt

import pandas as pd

FEATURE_COLUMNS = [
    "runtimehours",
    "idlehours",
    "utilization_ratio",
    "fuelconsumption",
    "fuel_per_runtime_hour",
    "distance_from_site_km",
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return radius_km * 2 * atan2(sqrt(a), sqrt(1 - a))


def add_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for column in ("runtimehours", "idlehours", "fuelconsumption"):
        result[column] = pd.to_numeric(result[column], errors="coerce").fillna(0.0)

    total_hours = result.runtimehours + result.idlehours
    result["utilization_ratio"] = result.runtimehours.div(total_hours).where(total_hours > 0, 0.0)
    result["fuel_per_runtime_hour"] = result.fuelconsumption.div(result.runtimehours).where(result.runtimehours > 0, 0.0)

    def distance(row: pd.Series) -> float:
        coordinates = (row.log_lat, row.log_long, row.site_lat, row.site_long)
        if any(pd.isna(value) for value in coordinates):
            return 0.0
        return haversine_km(*(float(value) for value in coordinates))

    result["distance_from_site_km"] = result.apply(distance, axis=1)
    return result
