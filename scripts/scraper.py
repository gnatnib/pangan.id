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

# BI PIHPS internal province ID -> BPS province code mapping
# BI uses its own numbering; BPS uses the official province codes
BI_TO_BPS_PROVINCE = {
    1: "11",    # Aceh
    2: "12",    # Sumatera Utara
    3: "13",    # Sumatera Barat
    4: "14",    # Riau
    5: "21",    # Kepulauan Riau
    6: "15",    # Jambi
    7: "17",    # Bengkulu
    8: "16",    # Sumatera Selatan
    9: "19",    # Kep. Bangka Belitung
    10: "18",   # Lampung
    11: "36",   # Banten
    12: "32",   # Jawa Barat
    13: "31",   # DKI Jakarta
    14: "33",   # Jawa Tengah
    15: "34",   # DI Yogyakarta
    16: "35",   # Jawa Timur
    17: "51",   # Bali
    18: "52",   # Nusa Tenggara Barat
    19: "53",   # Nusa Tenggara Timur
    20: "61",   # Kalimantan Barat
    21: "63",   # Kalimantan Selatan
    22: "62",   # Kalimantan Tengah
    23: "64",   # Kalimantan Timur
    24: "65",   # Kalimantan Utara
    25: "75",   # Gorontalo
    26: "73",   # Sulawesi Selatan
    27: "74",   # Sulawesi Tenggara
    28: "72",   # Sulawesi Tengah
    29: "71",   # Sulawesi Utara
    30: "76",   # Sulawesi Barat
    31: "81",   # Maluku
    32: "82",   # Maluku Utara
    33: "91",   # Papua
    34: "92",   # Papua Barat
}

# BI commodity names -> our commodity slug mapping
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
    "Cabai Merah Keriting ": "cabai-merah-keriting",  # BI has trailing space
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
            "Referer": f"{BASE_URL}",
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

    def fetch_prices_for_date(self, target_date, market_type_id="1"):
        """
        Fetch all commodity prices for a specific date using GetGridData1.
        This endpoint returns per-province, per-commodity summary data.
        
        Args:
            target_date: datetime object for the target date
            market_type_id: "1" for Traditional Market, "2" for Modern Market
        
        Returns:
            list of price records ready for database upsert
        """
        date_str = target_date.strftime("%b %d, %Y")  # e.g., "Feb 28, 2026"
        market_type = MARKET_TYPES.get(market_type_id, "traditional")

        # Fetch data for each commodity category
        # BI commodity categories: 1=Beras, 2=DagingAyam, 3=DagingSapi, 4=TelurAyam,
        # 5=BawangMerah, 6=BawangPutih, 7=CabaiMerah, 8=CabaiRawit, 
        # 9=MinyakGoreng, 10=GulaPasir
        commodity_categories = range(1, 11)
        all_records = []

        for cat_id in commodity_categories:
            try:
                url = f"{BASE_URL}/WebSite/Home/GetGridData1"
                params = {
                    "tanggal": date_str,
                    "commodity": str(cat_id),
                    "priceType": market_type_id,
                    "provId": "0",  # 0 = all provinces
                }

                resp = self.session.get(url, params=params, timeout=30)
                if resp.status_code != 200:
                    logger.warning(f"Category {cat_id}: HTTP {resp.status_code}")
                    continue

                data = resp.json()
                records = data.get("data", [])

                if not records:
                    logger.warning(f"Category {cat_id}: no data returned")
                    continue

                for record in records:
                    prov_id_bi = record.get("ProvID")
                    commodity_name = record.get("Komoditas", "").strip()
                    price_value = record.get("Nilai")

                    if not prov_id_bi or not commodity_name or price_value is None:
                        continue

                    # Map BI province ID to BPS code
                    bps_code = BI_TO_BPS_PROVINCE.get(prov_id_bi)
                    if not bps_code:
                        logger.debug(f"Unknown BI province ID: {prov_id_bi}")
                        continue

                    # Map commodity name to our slug
                    slug = COMMODITY_SLUG_MAP.get(commodity_name)
                    if not slug:
                        logger.debug(f"Unknown commodity: {commodity_name}")
                        continue

                    # Get our commodity ID
                    commodity_id = self.commodity_id_cache.get(slug)
                    if not commodity_id:
                        logger.debug(f"No DB entry for slug: {slug}")
                        continue

                    # Skip zero or negative prices
                    if price_value <= 0:
                        continue

                    all_records.append({
                        "commodity_id": commodity_id,
                        "province_id": bps_code,
                        "price": float(price_value),
                        "market_type": market_type,
                        "date": target_date.strftime("%Y-%m-%d"),
                        "source": "bi",
                    })

                logger.info(f"Category {cat_id}: fetched {len(records)} records")
                time.sleep(1.5)  # Be respectful — 1.5s delay between requests

            except requests.RequestException as e:
                logger.error(f"Category {cat_id} request failed: {e}")
                time.sleep(2)
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Category {cat_id} parse error: {e}")

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
        # BI data typically has 1-day lag, so try yesterday first, then today
        target_dates = [
            today - timedelta(days=1),
            today,
        ]

        logger.info("=" * 60)
        logger.info("BI PIHPS Daily Scraper")
        logger.info(f"Date: {today.strftime('%Y-%m-%d %H:%M:%S')}")
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

            for target_date in target_dates:
                logger.info(f"  Target date: {target_date.strftime('%Y-%m-%d')}")
                records = self.fetch_prices_for_date(target_date, market_type_id)
                if records:
                    total_records.extend(records)
                    logger.info(f"  Got {len(records)} records for {market_name} market")
                    break  # If we got data for this date, no need to try the next
                else:
                    logger.info(f"  No data for {target_date.strftime('%Y-%m-%d')}, trying next date...")

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
