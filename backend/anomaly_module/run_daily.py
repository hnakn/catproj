from __future__ import annotations

import argparse
from datetime import date

from dotenv import load_dotenv

from .config import load_settings
from .pipeline import run_daily


def main() -> None:
    parser = argparse.ArgumentParser(description="Run daily equipment anomaly detection")
    parser.add_argument("--date", type=date.fromisoformat, help="Date to process (YYYY-MM-DD); defaults to today")
    args = parser.parse_args()
    load_dotenv()
    print(run_daily(load_settings(), args.date))


if __name__ == "__main__":
    main()
