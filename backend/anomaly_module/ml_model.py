from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .config import Settings
from .features import FEATURE_COLUMNS


@dataclass(frozen=True)
class MlHit:
    equipmentid: str
    logid: str
    anomalytype: str
    severity: str
    anomalyscore: float


def _model_path(models_dir: Path, equipmenttype: str) -> Path:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", equipmenttype).strip("_") or "unknown"
    return models_dir / f"isolation_forest_{safe_name}.pkl"


def _matrix(frame: pd.DataFrame) -> np.ndarray:
    return frame[FEATURE_COLUMNS].astype(float).replace([np.inf, -np.inf], 0.0).fillna(0.0).to_numpy()


def _load_or_train(equipmenttype: str, historical: pd.DataFrame, settings: Settings):
    path = _model_path(settings.models_dir, equipmenttype)
    stale_after = datetime.now(timezone.utc) - timedelta(days=settings.retrain_days)
    if path.exists() and datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) >= stale_after:
        return joblib.load(path)
    if len(historical) < settings.min_training_rows:
        return None
    model = IsolationForest(n_estimators=200, contamination=settings.contamination, random_state=42)
    matrix = _matrix(historical)
    model.fit(matrix)
    reference_scores = np.sort(-model.decision_function(matrix))
    artifact = {"model": model, "reference_scores": reference_scores}
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)
    return artifact


def score(frame: pd.DataFrame, historical: pd.DataFrame, settings: Settings) -> list[MlHit]:
    hits: list[MlHit] = []
    for equipmenttype, group in frame.groupby("equipmenttype"):
        artifact = _load_or_train(equipmenttype, historical[historical.equipmenttype == equipmenttype], settings)
        if artifact is None:
            continue
        raw_scores = -artifact["model"].decision_function(_matrix(group))
        reference = artifact["reference_scores"]
        percentiles = np.searchsorted(reference, raw_scores, side="right") / len(reference) * 100
        for row, anomaly_score in zip(group.itertuples(index=False), percentiles):
            if anomaly_score < 40:
                continue
            severity = "MEDIUM" if anomaly_score >= 70 else "LOW"
            hits.append(MlHit(row.equipmentid, row.logid, "STATISTICAL_OUTLIER", severity, round(float(anomaly_score), 2)))
    return hits
