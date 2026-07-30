from __future__ import annotations

from datetime import date, datetime, time, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from .config import Settings
from .db import (connection, ensure_run_table, fetch_day, fetch_training_history,
                 fetch_zero_engine_logids, finish_run, insert_hits, start_run)
from .features import add_features
from .ml_model import score
from .rules import evaluate


def run_daily(settings: Settings, run_date: date | None = None) -> dict[str, int | str]:
    zone = ZoneInfo(settings.timezone)
    run_date = run_date or datetime.now(zone).date()
    start = datetime.combine(run_date, time.min)
    end = start + timedelta(days=1)
    runid = uuid4()
    with connection(settings) as conn:
        ensure_run_table(conn)
        start_run(conn, runid, run_date)
        try:
            daily = add_features(fetch_day(conn, start, end))
            zero_engine_logids = fetch_zero_engine_logids(conn, start, end, settings.zero_engine_min_days, settings.active_equipment_status)
            rule_hits = evaluate(daily, zero_engine_logids, run_date, settings)
            rule_logids = {hit.logid for hit in rule_hits}
            clean_daily = daily[~daily.logid.isin(rule_logids)]
            history = add_features(fetch_training_history(conn, start, settings.training_days))
            ml_hits = score(clean_daily, history, settings) if not clean_daily.empty else []
            inserted_rules = insert_hits(conn, rule_hits)
            inserted_ml = insert_hits(conn, ml_hits)
            finish_run(conn, runid, rows_read=len(daily), rule_hits=inserted_rules, ml_flags=inserted_ml)
            return {"runid": str(runid), "rows_read": len(daily), "rule_hits": inserted_rules, "ml_flags": inserted_ml}
        except Exception as exc:
            finish_run(conn, runid, rows_read=0, rule_hits=0, ml_flags=0, failures=1, error_message=str(exc)[:2000])
            raise
