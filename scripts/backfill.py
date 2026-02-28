"""
Backfill historical data from BI PIHPS.
Uses the GetGridDataDaerah endpoint to fetch price tables with date ranges.
Populates the last 90 days of data into the database.
"""

import os
import sys
import json
import time
import logging
import re
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BASE_URL = "https://www.bi.go.id/hargapangan"

# BI province ID -> BPS code (same as scraper.py)
BI_TO_BPS_PROVINCE = {
    1: "11", 2: "12", 3: "13", 4: "14", 5: "21", 6: "15", 7: "17",
    8: "16", 9: "19", 10: "18", 11: "36", 12: "32", 13: "31", 14: "33",
    15: "34", 16: "35", 17: "51", 18: "52", 19: "53", 20: "61",
    21: "63", 22: "62", 23: "64", 24: "65", 25: "75", 26: "73",
    27: "74", 28: "72", 29: "71", 30: "76", 31: "81", 32: "82",
    33: "91", 34: "92",
}

# Province name -> BI ID (reverse lookup from BI API province list)
PROVINCE_NAME_TO_BI_ID = {
    "Aceh": 1, "Sumatera Utara": 2, "Sumatera Barat": 3, "Riau": 4,
    "Kepulauan Riau": 5, "Jambi": 6, "Bengkulu": 7, "Sumatera Selatan": 8,
    "Kepulauan Bangka Belitung": 9, "Lampung": 10, "Banten": 11,
    "Jawa Barat": 12, "DKI Jakarta": 13, "Jawa Tengah": 14,
    "DI Yogyakarta": 15, "Jawa Timur": 16, "Bali": 17,
    "Nusa Tenggara Barat": 18, "Nusa Tenggara Timur": 19,
    "Kalimantan Barat": 20, "Kalimantan Selatan": 21,
    "Kalimantan Tengah": 22, "Kalimantan Timur": 23,
    "Kalimantan Utara": 24, "Gorontalo": 25, "Sulawesi Selatan": 26,
    "Sulawesi Tenggara": 27, "Sulawesi Tengah": 28, "Sulawesi Utara": 29,
    "Sulawesi Barat": 30, "Maluku": 31, "Maluku Utara": 32,
    "Papua": 33, "Papua Barat": 34,
}

# Commodity name to slug (same as scraper.py)
COMMODITY_SLUG_MAP = {
    "Bawang Merah Ukuran Sedang": "bawang-merah-ukuran-sedang",
    "Bawang Putih Ukuran Sedang": "bawang-putih-ukuran-sedang",
    "Beras Kualitas Bawah I": "beras-kualitas-bawah-i",
    "Beras Kualitas Bawah II": "beras-kualitas-bawah-ii",
    "Beras Kualitas Medium I": "beras-kualitas-medium-i",
    "Beras Kualitas Medium II": "beras-kualitas-medium-ii",
    "Beras Kualitas Super I": "beras-kualitas-super-i",
    "Beras Kualitas Super II": "beras-kualitas-super-ii",
    "Cabai Merah Besar": "cabai-merah-besar",
    "Cabai Merah Keriting": "cabai-merah-keriting",
    "Cabai Merah Keriting ": "cabai-merah-keriting",
    "Cabai Rawit Hijau": "cabai-rawit-hijau",
    "Cabai Rawit Merah": "cabai-rawit-merah",
    "Daging Ayam Ras Segar": "daging-ayam-ras-segar",
    "Daging Sapi Kualitas 1": "daging-sapi-kualitas-1",
    "Daging Sapi Kualitas 2": "daging-sapi-kualitas-2",
    "Gula Pasir Kualitas Premium": "gula-pasir-kualitas-premium",
    "Gula Pasir Lokal": "gula-pasir-lokal",
    "Minyak Goreng Curah": "minyak-goreng-curah",
    "Minyak Goreng Kemasan Bermerk 1": "minyak-goreng-kemasan-bermerek-1",
    "Minyak Goreng Kemasan Bermerk 2": "minyak-goreng-kemasan-bermerek-2",
    "Telur Ayam Ras Segar": "telur-ayam-ras-segar",
}


def parse_price(value):
    """Parse a price string like '15,800' or '15800' to a float."""
    if value is None or value == "" or value == "-" or value == "( - )":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    # Remove commas and whitespace
    cleaned = str(value).replace(",", "").replace(" ", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


class BackfillScraper:
    """Scraper for historical data using GetGridDataDaerah endpoint."""

    def __init__(self, days=90):
        self.days = days
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{BASE_URL}",
        })

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL and SUPABASE_KEY required")
            sys.exit(1)
        self.supabase = create_client(url, key)
        self.commodity_id_cache = {}

    def _load_commodity_ids(self):
        result = self.supabase.table("commodities").select("id, slug").execute()
        self.commodity_id_cache = {row["slug"]: row["id"] for row in result.data}
        logger.info(f"Loaded {len(self.commodity_id_cache)} commodity IDs")

    def _init_session(self):
        logger.info("Initializing session...")
        try:
            resp = self.session.get(BASE_URL, timeout=60)
            logger.info(f"Session initialized: {resp.status_code}")
            time.sleep(2)
            return resp.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Session init failed: {e}")
            return False

    def fetch_table_data(self, start_date, end_date, province_bi_id, market_type_id="1"):
        """
        Fetch price table data from GetGridDataDaerah for a province and date range.
        
        Returns data in format:
        [{"no": 1, "name": "Beras Kualitas Bawah I", "level": 2, "27/02/2026": "14,450", ...}]
        """
        url = f"{BASE_URL}/WebSite/TabelHarga/GetGridDataDaerah"
        params = {
            "price_type_id": market_type_id,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "province_id": str(province_bi_id),
            "regency_id": "",
            "market_id": "",
            "commodity_id": "",
            "tipe_laporan": "1",
        }

        try:
            resp = self.session.get(url, params=params, timeout=60)
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Fetch failed for province {province_bi_id}: {e}")
            return []

    def parse_table_data(self, rows, province_bps_code, market_type):
        """Parse GetGridDataDaerah response rows into price records."""
        records = []

        for row in rows:
            name = row.get("name", "").strip()
            level = row.get("level", 0)

            # Skip category headers (level 1) — only process leaf commodities (level 2)
            if level == 1 or not name:
                continue

            slug = COMMODITY_SLUG_MAP.get(name)
            if not slug:
                continue

            commodity_id = self.commodity_id_cache.get(slug)
            if not commodity_id:
                continue

            # Iterate over date columns
            for key, value in row.items():
                # Date columns are like "27/02/2026"
                if not re.match(r"\d{2}/\d{2}/\d{4}", str(key)):
                    continue

                price = parse_price(value)
                if price is None or price <= 0:
                    continue

                # Parse date from column key (DD/MM/YYYY)
                try:
                    date_obj = datetime.strptime(key, "%d/%m/%Y")
                    date_str = date_obj.strftime("%Y-%m-%d")
                except ValueError:
                    continue

                records.append({
                    "commodity_id": commodity_id,
                    "province_id": province_bps_code,
                    "price": price,
                    "market_type": market_type,
                    "date": date_str,
                    "source": "bi",
                })

        return records

    def run(self):
        """Run the backfill process."""
        start_time = time.time()
        today = datetime.now()
        start_date = today - timedelta(days=self.days)

        logger.info("=" * 60)
        logger.info(f"BI PIHPS Backfill Scraper ({self.days} days)")
        logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {today.strftime('%Y-%m-%d')}")
        logger.info("=" * 60)

        if not self._init_session():
            logger.error("Aborting: session initialization failed")
            return

        self._load_commodity_ids()

        total_records = 0

        # Process in 7-day chunks to avoid large responses
        chunk_size = 7
        date_chunks = []
        current = start_date
        while current < today:
            chunk_end = min(current + timedelta(days=chunk_size - 1), today)
            date_chunks.append((current, chunk_end))
            current = chunk_end + timedelta(days=1)

        for market_type_id, market_name in [("1", "traditional"), ("2", "modern")]:
            logger.info(f"\n--- {market_name.upper()} MARKET ---")

            for bi_id, bps_code in BI_TO_BPS_PROVINCE.items():
                province_records = []

                for chunk_start, chunk_end in date_chunks:
                    logger.info(
                        f"Province {bi_id} ({bps_code}) | "
                        f"{chunk_start.strftime('%m/%d')} - {chunk_end.strftime('%m/%d')} | "
                        f"{market_name}"
                    )

                    rows = self.fetch_table_data(chunk_start, chunk_end, bi_id, market_type_id)
                    if rows:
                        records = self.parse_table_data(rows, bps_code, market_name)
                        province_records.extend(records)
                        logger.info(f"  -> {len(records)} records")
                    else:
                        logger.info("  -> no data")

                    time.sleep(1.5)  # Be respectful

                # Batch upsert per province
                if province_records:
                    batch_size = 500
                    for i in range(0, len(province_records), batch_size):
                        batch = province_records[i:i + batch_size]
                        try:
                            self.supabase.table("prices").upsert(
                                batch,
                                on_conflict="commodity_id,province_id,date,market_type,source"
                            ).execute()
                        except Exception as e:
                            logger.error(f"Upsert failed: {e}")

                    total_records += len(province_records)
                    logger.info(f"Province {bi_id}: {len(province_records)} total records upserted")

        duration = time.time() - start_time
        logger.info(f"\n{'=' * 60}")
        logger.info(f"Backfill complete!")
        logger.info(f"Total records: {total_records}")
        logger.info(f"Duration: {duration:.1f}s ({duration / 60:.1f} min)")
        logger.info(f"{'=' * 60}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Backfill historical price data")
    parser.add_argument("--days", type=int, default=90, help="Number of days to backfill (default: 90)")
    args = parser.parse_args()

    scraper = BackfillScraper(days=args.days)
    scraper.run()
