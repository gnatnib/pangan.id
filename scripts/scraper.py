"""
Main daily scraper for Bank Indonesia PIHPS (Pusat Informasi Harga Pangan Strategis).
Fetches today's food commodity prices across all Indonesian provinces.

Data source: https://www.bi.go.id/hargapangan
API endpoint: GetGridData1 (per-province, per-commodity summary)
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from decimal import Decimal

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BASE_URL = "https://www.bi.go.id/hargapangan"

import re

# BI province names (from API "name" field) -> BPS province code
PROV_NAME_TO_BPS = {
    "Aceh": "11", "Sumatera Utara": "12", "Sumatera Barat": "13",
    "Riau": "14", "Kepulauan Riau": "21", "Jambi": "15",
    "Bengkulu": "17", "Sumatera Selatan": "16", "Kep. Bangka Belitung": "19",
    "Kepulauan Bangka Belitung": "19",
    "Lampung": "18", "Banten": "36", "Jawa Barat": "32",
    "DKI Jakarta": "31", "Jawa Tengah": "33", "DI Yogyakarta": "34",
    "Jawa Timur": "35", "Bali": "51", "Nusa Tenggara Barat": "52",
    "Nusa Tenggara Timur": "53", "Kalimantan Barat": "61",
    "Kalimantan Selatan": "63", "Kalimantan Tengah": "62",
    "Kalimantan Timur": "64", "Kalimantan Utara": "65",
    "Gorontalo": "75", "Sulawesi Selatan": "73", "Sulawesi Tenggara": "74",
    "Sulawesi Tengah": "72", "Sulawesi Utara": "71", "Sulawesi Barat": "76",
    "Maluku": "81", "Maluku Utara": "82", "Papua": "91", "Papua Barat": "92",
    # Newer province splits
    "Papua Barat Daya": "96", "Papua Selatan": "93", "Papua Tengah": "94",
    "Papua Pegunungan": "95",
}

# BI commodity IDs -> our commodity slug mapping
COMMODITIES = [
    {"bi_id": "com_1", "slug": "beras-kualitas-bawah-i"},
    {"bi_id": "com_2", "slug": "beras-kualitas-bawah-ii"},
    {"bi_id": "com_3", "slug": "beras-kualitas-medium-i"},
    {"bi_id": "com_4", "slug": "beras-kualitas-medium-ii"},
    {"bi_id": "com_5", "slug": "beras-kualitas-super-i"},
    {"bi_id": "com_6", "slug": "beras-kualitas-super-ii"},
    {"bi_id": "com_7", "slug": "daging-ayam-ras-segar"},
    {"bi_id": "com_8", "slug": "daging-sapi-kualitas-1"},
    {"bi_id": "com_9", "slug": "daging-sapi-kualitas-2"},
    {"bi_id": "com_10", "slug": "telur-ayam-ras-segar"},
    {"bi_id": "com_11", "slug": "bawang-merah-ukuran-sedang"},
    {"bi_id": "com_12", "slug": "bawang-putih-ukuran-sedang"},
    {"bi_id": "com_13", "slug": "cabai-merah-besar"},
    {"bi_id": "com_14", "slug": "cabai-merah-keriting"},
    {"bi_id": "com_15", "slug": "cabai-rawit-hijau"},
    {"bi_id": "com_16", "slug": "cabai-rawit-merah"},
    {"bi_id": "com_17", "slug": "minyak-goreng-curah"},
    {"bi_id": "com_18", "slug": "minyak-goreng-kemasan-bermerek-1"},
    {"bi_id": "com_19", "slug": "minyak-goreng-kemasan-bermerek-2"},
    {"bi_id": "com_20", "slug": "gula-pasir-kualitas-premium"},
    {"bi_id": "com_21", "slug": "gula-pasir-lokal"},
]

# Market type mapping (BI price_type_id -> our market_type)
MARKET_TYPES = {
    "1": "traditional",
    "2": "modern",
}


class BIPIHPSScraper:
    """Scraper for Bank Indonesia PIHPS food price data."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{BASE_URL}/TabelHarga/PasarTradisionalKomoditas",
        })
        self.supabase: Client = None
        self.commodity_id_cache = {}  # slug -> id
        self._init_supabase()

    def _init_supabase(self):
        """Initialize Supabase client."""
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL and SUPABASE_KEY environment variables are required")
            sys.exit(1)
        self.supabase = create_client(url, key)
        logger.info("Supabase client initialized")

    def _load_commodity_ids(self):
        """Load commodity slug -> id mapping from the database."""
        result = self.supabase.table("commodities").select("id, slug").execute()
        self.commodity_id_cache = {row["slug"]: row["id"] for row in result.data}
        logger.info(f"Loaded {len(self.commodity_id_cache)} commodity IDs")

    def _init_session(self):
        """Visit the homepage to obtain session cookies (WSAntiforgeryCookie)."""
        logger.info("Initializing session by visiting BI PIHPS homepage...")
        try:
            resp = self.session.get(BASE_URL, timeout=60)
            logger.info(f"Homepage status: {resp.status_code}, cookies: {list(self.session.cookies.keys())}")
            time.sleep(1)
            return resp.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Failed to initialize session: {e}")
            return False

    def fetch_prices_for_date_range(self, start_date, end_date, market_type_id="1"):
        """
        Fetch all commodity prices for a specific date range using GetGridDataKomoditas.
        This endpoint returns per-province data for individual commodities.
        """
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        market_type = MARKET_TYPES.get(market_type_id, "traditional")

        all_records = []
        cache_buster = str(int(time.time() * 1000))

        for item in COMMODITIES:
            bi_id = item["bi_id"]
            slug = item["slug"]
            commodity_id = self.commodity_id_cache.get(slug)
            if not commodity_id:
                logger.debug(f"No DB entry for slug: {slug}")
                continue

            try:
                url = f"{BASE_URL}/WebSite/TabelHarga/GetGridDataKomoditas"
                params = {
                    "price_type_id": market_type_id,
                    "comcat_id": bi_id,
                    "province_id": "",
                    "regency_id": "",
                    "showKota": "false",
                    "showPasar": "false",
                    "tipe_laporan": "1",
                    "start_date": start_str,
                    "end_date": end_str,
                    "_": cache_buster
                }

                resp = self.session.get(url, params=params, timeout=30)
                if resp.status_code != 200:
                    logger.warning(f"{slug}: HTTP {resp.status_code}")
                    continue

                data = resp.json()
                rows = data.get("data", [])
                
                cat_count = 0
                for row in rows:
                    name = row.get("name", "").strip()
                    level = row.get("level")
                    
                    if level == 0 or name == "Semua Provinsi" or level > 1:
                        continue
                        
                    bps_code = PROV_NAME_TO_BPS.get(name)
                    if not bps_code:
                        logger.debug(f"Unknown province: {name}")
                        continue
                        
                    # Extract price for each date column (e.g., "01/03/2026")
                    for k, val in row.items():
                        match = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", k)
                        if not match:
                            continue
                        
                        dd, mm, yyyy = match.groups()
                        iso_date = f"{yyyy}-{mm}-{dd}"
                        
                        if not val or val == "-" or val == "0":
                            continue
                            
                        # Indonesian number formatting removes dots and commas
                        price_str = str(val).replace(".", "").replace(",", "").strip()
                        try:
                            price_num = int(price_str)
                            if price_num > 0:
                                all_records.append({
                                    "commodity_id": commodity_id,
                                    "province_id": bps_code,
                                    "price": price_num,
                                    "market_type": market_type,
                                    "date": iso_date,
                                    "source": "bi",
                                })
                                cat_count += 1
                        except ValueError:
                            pass

                logger.info(f"Commodity {bi_id} ({slug}): fetched {cat_count} records")
                time.sleep(1)  # Be respectful — 1s delay

            except requests.RequestException as e:
                logger.error(f"{slug} request failed: {e}")
                time.sleep(2)
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"{slug} parse error: {e}")

        return all_records

    def upsert_prices(self, records):
        """Upsert price records into the database."""
        if not records:
            logger.warning("No records to upsert")
            return 0

        # Supabase upsert in batches of 500
        batch_size = 500
        total_upserted = 0

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                result = self.supabase.table("prices").upsert(
                    batch,
                    on_conflict="commodity_id,province_id,date,market_type,source"
                ).execute()
                total_upserted += len(batch)
                logger.info(f"Upserted batch {i // batch_size + 1}: {len(batch)} records")
            except Exception as e:
                logger.error(f"Upsert batch {i // batch_size + 1} failed: {e}")

        return total_upserted

    def scrape_today(self):
        """Main scraping workflow for today's data."""
        start_time = time.time()
        today = datetime.now()
        start_date = today - timedelta(days=8)

        logger.info("=" * 60)
        logger.info("BI PIHPS Daily Scraper")
        logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {today.strftime('%Y-%m-%d')}")
        logger.info("=" * 60)

        # Initialize session
        if not self._init_session():
            self._log_scrape(today.date(), "failed", 0, 0, 0, "Session init failed", time.time() - start_time)
            return

        # Load commodity IDs
        self._load_commodity_ids()

        total_records = []

        for market_type_id in ["1", "2"]:  # Traditional and Modern
            market_name = "Traditional" if market_type_id == "1" else "Modern"
            logger.info(f"\nScraping {market_name} Market...")

            records = self.fetch_prices_for_date_range(start_date, today, market_type_id)
            if records:
                total_records.extend(records)
                logger.info(f"  Got {len(records)} records for {market_name} market")
            else:
                logger.info(f"  No data for this date range in {market_name} market")

        # Deduplicate records (keep the last one for each unique key)
        seen = {}
        for rec in total_records:
            key = (rec["commodity_id"], rec["province_id"], rec["date"], rec["market_type"])
            seen[key] = rec
        unique_records = list(seen.values())

        logger.info(f"\nTotal unique records: {len(unique_records)}")

        # Upsert into database
        rows_inserted = self.upsert_prices(unique_records)

        # Count unique commodities and provinces
        commodities_scraped = len(set(r["commodity_id"] for r in unique_records))
        provinces_scraped = len(set(r["province_id"] for r in unique_records))

        duration = time.time() - start_time
        status = "success" if rows_inserted > 0 else "failed"
        if rows_inserted > 0 and provinces_scraped < 20:
            status = "partial"

        self._log_scrape(
            today.date(), status, commodities_scraped,
            provinces_scraped, rows_inserted, None, duration
        )

        logger.info(f"\n{'=' * 60}")
        logger.info(f"Scrape complete!")
        logger.info(f"Status: {status}")
        logger.info(f"Commodities: {commodities_scraped}")
        logger.info(f"Provinces: {provinces_scraped}")
        logger.info(f"Rows inserted: {rows_inserted}")
        logger.info(f"Duration: {duration:.1f}s")
        logger.info(f"{'=' * 60}")

    def _log_scrape(self, scrape_date, status, commodities, provinces, rows, error, duration):
        """Log scrape result to the database."""
        try:
            self.supabase.table("scrape_logs").insert({
                "scrape_date": str(scrape_date),
                "source": "bi",
                "status": status,
                "commodities_scraped": commodities,
                "provinces_scraped": provinces,
                "rows_inserted": rows,
                "error_message": error,
                "duration_seconds": round(duration, 2),
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log scrape: {e}")


def main():
    scraper = BIPIHPSScraper()
    scraper.scrape_today()


if __name__ == "__main__":
    main()

