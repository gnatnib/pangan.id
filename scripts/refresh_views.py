"""
Refresh materialized views after scraping.
Call this after running the daily scraper to update the national_averages view.
"""

import os
import sys
import logging

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_KEY required")
        sys.exit(1)

    supabase = create_client(url, key)
    logger.info("Refreshing national_averages materialized view...")

    try:
        supabase.rpc("refresh_national_averages").execute()
        logger.info("Materialized view refreshed successfully!")
    except Exception as e:
        logger.error(f"Failed to refresh materialized view: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
