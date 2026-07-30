from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta
from uuid import UUID

import pandas as pd
import psycopg2
import psycopg2.extras

from .config import Settings
from .rules import RuleHit


@contextmanager
def connection(settings: Settings):
    conn = psycopg2.connect(settings.database_url, sslmode="require")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_run_table(conn) -> None:
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS anomaly_detection_run (
                runid uuid PRIMARY KEY,
                run_date date NOT NULL,
                startedat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completedat timestamp,
                rows_read integer NOT NULL DEFAULT 0,
                rule_hits integer NOT NULL DEFAULT 0,
                ml_flags integer NOT NULL DEFAULT 0,
                failure_count integer NOT NULL DEFAULT 0,
                status varchar(20) NOT NULL DEFAULT 'RUNNING',
                error_message text
            )
        """)


def start_run(conn, runid: UUID, run_date) -> None:
    with conn.cursor() as cursor:
        cursor.execute("INSERT INTO anomaly_detection_run (runid, run_date) VALUES (%s, %s)", (str(runid), run_date))


def _read_frame(conn, query: str, params: tuple) -> pd.DataFrame:
    """Return a DataFrame without relying on pandas' untested DB-API path."""
    with conn.cursor() as cursor:
        cursor.execute(query, params)
        columns = [description.name for description in cursor.description]
        return pd.DataFrame(cursor.fetchall(), columns=columns)


def finish_run(conn, runid: UUID, *, rows_read: int, rule_hits: int, ml_flags: int, failures: int = 0, error_message: str | None = None) -> None:
    status = "COMPLETED" if failures == 0 else "FAILED"
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE anomaly_detection_run
            SET completedat = CURRENT_TIMESTAMP, rows_read = %s, rule_hits = %s, ml_flags = %s,
                failure_count = %s, status = %s, error_message = %s
            WHERE runid = %s
        """, (rows_read, rule_hits, ml_flags, failures, status, error_message, str(runid)))


def fetch_day(conn, start: datetime, end: datetime) -> pd.DataFrame:
    # A request is associated by its assigned machine; status is deliberately not used as a rental-state proxy.
    query = """
        SELECT e.equipmentid, e.equipmenttype, e.status, el.logid, el."timestamp" AS logtime,
               el.latitude AS log_lat, el.longitude AS log_long, el.runtimehours, el.idlehours, el.fuelconsumption,
               r.requestid, r.startdate, r.enddate AS request_enddate,
               s.siteid, s.latitude AS site_lat, s.longitude AS site_long
        FROM equipmentlog el
        JOIN equipment e ON e.equipmentid = el.equipmentid
        LEFT JOIN LATERAL (
            SELECT requestid, siteid, startdate, enddate
            FROM request
            WHERE assignedequipmentid = e.equipmentid AND startdate <= %s::date
            ORDER BY enddate DESC, requestid DESC
            LIMIT 1
        ) r ON TRUE
        LEFT JOIN site s ON s.siteid = r.siteid
        WHERE el."timestamp" >= %s AND el."timestamp" < %s
        ORDER BY el."timestamp", el.logid
    """
    return _read_frame(conn, query, (start, start, end))


def fetch_zero_engine_logids(conn, start: datetime, end: datetime, days: int, active_status: str) -> set[str]:
    query = """
        WITH daily AS (
            SELECT DISTINCT ON (el.equipmentid, el."timestamp"::date)
                   el.equipmentid, el.logid, el."timestamp"::date AS log_date
            FROM equipmentlog el
            JOIN equipment e ON e.equipmentid = el.equipmentid
            WHERE el."timestamp" >= %s AND el."timestamp" < %s
              AND COALESCE(el.runtimehours, 0) = 0 AND e.status = %s
            ORDER BY el.equipmentid, el."timestamp"::date, el."timestamp" DESC
        ), qualifying AS (
            SELECT equipmentid
            FROM daily
            GROUP BY equipmentid
            HAVING COUNT(*) = %s AND MIN(log_date) = %s::date AND MAX(log_date) = (%s::date - INTERVAL '1 day')::date
        )
        SELECT d.logid FROM daily d JOIN qualifying q USING (equipmentid) WHERE d.log_date = (%s::date - INTERVAL '1 day')::date
    """
    lookback = start - timedelta(days=days - 1)
    with conn.cursor() as cursor:
        cursor.execute(query, (lookback, end, active_status, days, lookback, end, end))
        return {row[0] for row in cursor.fetchall()}


def fetch_training_history(conn, before: datetime, days: int) -> pd.DataFrame:
    query = """
        SELECT e.equipmenttype, el.logid, el.runtimehours, el.idlehours, el.fuelconsumption,
               el.latitude AS log_lat, el.longitude AS log_long, s.latitude AS site_lat, s.longitude AS site_long
        FROM equipmentlog el
        JOIN equipment e ON e.equipmentid = el.equipmentid
        LEFT JOIN LATERAL (
            SELECT siteid FROM request WHERE assignedequipmentid = e.equipmentid ORDER BY enddate DESC, requestid DESC LIMIT 1
        ) r ON TRUE
        LEFT JOIN site s ON s.siteid = r.siteid
        WHERE el."timestamp" >= %s AND el."timestamp" < %s
          AND NOT EXISTS (
              SELECT 1 FROM anomaly a WHERE a.logid = el.logid AND a.anomalytype <> 'STATISTICAL_OUTLIER'
          )
    """
    return _read_frame(conn, query, (before - timedelta(days=days), before))


def insert_hits(conn, hits: list[RuleHit]) -> int:
    if not hits:
        return 0
    query = """
        INSERT INTO anomaly (equipmentid, logid, anomalytype, severity, anomalyscore)
        VALUES %s
        ON CONFLICT (equipmentid, logid, anomalytype) DO NOTHING
    """
    values = [(hit.equipmentid, hit.logid, hit.anomalytype, hit.severity, hit.anomalyscore) for hit in hits]
    with conn.cursor() as cursor:
        psycopg2.extras.execute_values(cursor, query, values)
        return cursor.rowcount
