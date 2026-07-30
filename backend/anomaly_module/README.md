# Anomaly detection job

Run from `backend` after installing the Python requirements:

```bash
python -m pip install -r anomaly_module/requirements.txt
python -m anomaly_module.run_daily
```

To process a particular local calendar day:

```bash
python -m anomaly_module.run_daily --date 2026-07-30
```

The job expects `DATABASE_URL` in the environment (or `backend/.env`). It processes the day in `ANOMALY_TIMEZONE` (default: `UTC`).

Equipment status mapping is configurable: `ACTIVE_EQUIPMENT_STATUS=active` and `AVAILABLE_EQUIPMENT_STATUS=available` by default. Rule thresholds and model tuning are configured through the environment variables defined in `config.py`.

The first weekly model training needs at least 30 clean historical rows per equipment type. Before then, the pipeline runs rules only. Model files are deliberately stored locally in `anomaly_module/models/` until a deployment target is selected.
