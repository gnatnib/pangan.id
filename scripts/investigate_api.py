"""
Investigate BI PIHPS (Bank Indonesia - Pusat Informasi Harga Pangan Strategis) API endpoints.
Discovers and documents the available API endpoints for food price data.
"""

import requests
import json
import os
from datetime import datetime, timedelta

BASE_URL = "https://www.bi.go.id/hargapangan"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PanganID/1.0; +https://pangan.id)",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.bi.go.id/hargapangan",
}

# Ensure data/raw directory exists
os.makedirs("data/raw", exist_ok=True)


def test_endpoint(name, url, params=None, method="GET"):
    """Test an API endpoint and save the response."""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    if params:
        print(f"Params: {json.dumps(params, indent=2)}")
    print("-" * 60)

    try:
        if method == "GET":
            resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
        else:
            resp = requests.post(url, data=params, headers=HEADERS, timeout=30)

        print(f"Status: {resp.status_code}")
        print(f"Content-Type: {resp.headers.get('Content-Type', 'unknown')}")
        print(f"Content-Length: {len(resp.content)} bytes")

        # Try parsing as JSON
        try:
            data = resp.json()
            # Save raw response
            safe_name = name.replace(" ", "_").lower()
            with open(f"data/raw/{safe_name}.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # Print preview
            preview = json.dumps(data, ensure_ascii=False, indent=2)
            if len(preview) > 2000:
                print(f"Response (first 2000 chars):\n{preview[:2000]}...")
            else:
                print(f"Response:\n{preview}")

            return data
        except json.JSONDecodeError:
            text = resp.text[:1000]
            print(f"Not JSON. Response text (first 1000 chars):\n{text}")
            return None

    except requests.RequestException as e:
        print(f"ERROR: {e}")
        return None


def main():
    print("=" * 60)
    print("BI PIHPS API Endpoint Investigation")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    today = datetime.now()
    yesterday = today - timedelta(days=1)
    date_str = yesterday.strftime("%m/%d/%Y")

    # 1. Get commodity tree (reference data)
    commodities = test_endpoint(
        "Commodity Tree",
        f"{BASE_URL}/WebSite/Home/GetCommoditiesTree",
    )

    # 2. Get province list (reference data)
    provinces = test_endpoint(
        "Province List",
        f"{BASE_URL}/WebSite/TabelHarga/GetRefProvince",
    )

    # 3. Get summary/homepage data (national averages with map)
    summary = test_endpoint(
        "Homepage Summary Data (GetGridData1)",
        f"{BASE_URL}/WebSite/Home/GetGridData1",
        params={
            "price_type_id": "1",  # 1 = Pasar Tradisional
        },
    )

    # 4. Get detailed price table data by region
    price_data = test_endpoint(
        "Price Table - Traditional Market - All Provinces",
        f"{BASE_URL}/WebSite/TabelHarga/GetGridDataDaerah",
        params={
            "price_type_id": "1",  # 1 = Pasar Tradisional
            "start_date": date_str,
            "end_date": date_str,
            "province_id": "",  # empty = all provinces
            "regency_id": "",
            "commodity_id": "",  # empty = all commodities
        },
    )

    # 5. Try Modern Market data
    modern_data = test_endpoint(
        "Price Table - Modern Market - All Provinces",
        f"{BASE_URL}/WebSite/TabelHarga/GetGridDataDaerah",
        params={
            "price_type_id": "2",  # 2 = Pasar Modern
            "start_date": date_str,
            "end_date": date_str,
            "province_id": "",
            "regency_id": "",
            "commodity_id": "",
        },
    )

    # 6. Try getting data for a specific province (DKI Jakarta)
    jakarta_data = test_endpoint(
        "Price Table - Traditional - DKI Jakarta",
        f"{BASE_URL}/WebSite/TabelHarga/GetGridDataDaerah",
        params={
            "price_type_id": "1",
            "start_date": date_str,
            "end_date": date_str,
            "province_id": "31",  # DKI Jakarta
            "regency_id": "",
            "commodity_id": "",
        },
    )

    # 7. Try date range (last 7 days)
    week_ago = (today - timedelta(days=7)).strftime("%m/%d/%Y")
    range_data = test_endpoint(
        "Price Table - Traditional - Last 7 Days",
        f"{BASE_URL}/WebSite/TabelHarga/GetGridDataDaerah",
        params={
            "price_type_id": "1",
            "start_date": week_ago,
            "end_date": date_str,
            "province_id": "",
            "regency_id": "",
            "commodity_id": "",
        },
    )

    print("\n\n" + "=" * 60)
    print("INVESTIGATION SUMMARY")
    print("=" * 60)
    print(f"Commodity Tree: {'OK' if commodities else 'FAILED'}")
    print(f"Province List: {'OK' if provinces else 'FAILED'}")
    print(f"Summary Data: {'OK' if summary else 'FAILED'}")
    print(f"Traditional Market Prices: {'OK' if price_data else 'FAILED'}")
    print(f"Modern Market Prices: {'OK' if modern_data else 'FAILED'}")
    print(f"Province-specific Prices: {'OK' if jakarta_data else 'FAILED'}")
    print(f"Date Range Prices: {'OK' if range_data else 'FAILED'}")


if __name__ == "__main__":
    main()
