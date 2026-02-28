/**
 * Fetch real price data from BI PIHPS GetGridDataKomoditas API.
 * Must visit homepage first to get session cookies.
 * 
 * Usage: node scripts/fetch-bi-data.js [days_back=31]
 * Output: SQL INSERT statements to stdout
 * Logs: to stderr
 */

const BASE = "https://www.bi.go.id/hargapangan";

// BI commodity IDs (from GetRefCommodityAndCategory)
const COMMODITIES = [
  { biId: "com_1", slug: "beras-kualitas-bawah-i" },
  { biId: "com_2", slug: "beras-kualitas-bawah-ii" },
  { biId: "com_3", slug: "beras-kualitas-medium-i" },
  { biId: "com_4", slug: "beras-kualitas-medium-ii" },
  { biId: "com_5", slug: "beras-kualitas-super-i" },
  { biId: "com_6", slug: "beras-kualitas-super-ii" },
  { biId: "com_7", slug: "daging-ayam-ras-segar" },
  { biId: "com_8", slug: "daging-sapi-kualitas-1" },
  { biId: "com_9", slug: "daging-sapi-kualitas-2" },
  { biId: "com_10", slug: "telur-ayam-ras-segar" },
  { biId: "com_11", slug: "bawang-merah-ukuran-sedang" },
  { biId: "com_12", slug: "bawang-putih-ukuran-sedang" },
  { biId: "com_13", slug: "cabai-merah-besar" },
  { biId: "com_14", slug: "cabai-merah-keriting" },
  { biId: "com_15", slug: "cabai-rawit-hijau" },
  { biId: "com_16", slug: "cabai-rawit-merah" },
  { biId: "com_17", slug: "minyak-goreng-curah" },
  { biId: "com_18", slug: "minyak-goreng-kemasan-bermerek-1" },
  { biId: "com_19", slug: "minyak-goreng-kemasan-bermerek-2" },
  { biId: "com_20", slug: "gula-pasir-kualitas-premium" },
  { biId: "com_21", slug: "gula-pasir-lokal" },
];

// BI province names (from API "name" field) -> BPS province code
const PROV_NAME_TO_BPS = {
  "Aceh": "11", "Sumatera Utara": "12", "Sumatera Barat": "13",
  "Riau": "14", "Kepulauan Riau": "21", "Jambi": "15",
  "Bengkulu": "17", "Sumatera Selatan": "16",
  "Kep. Bangka Belitung": "19", "Kepulauan Bangka Belitung": "19",
  "Lampung": "18", "Banten": "36", "Jawa Barat": "32",
  "DKI Jakarta": "31", "Jawa Tengah": "33", "DI Yogyakarta": "34",
  "Jawa Timur": "35", "Bali": "51", "Nusa Tenggara Barat": "52",
  "Nusa Tenggara Timur": "53", "Kalimantan Barat": "61",
  "Kalimantan Selatan": "63", "Kalimantan Tengah": "62",
  "Kalimantan Timur": "64", "Kalimantan Utara": "65",
  "Gorontalo": "75", "Sulawesi Selatan": "73", "Sulawesi Tenggara": "74",
  "Sulawesi Tengah": "72", "Sulawesi Utara": "71", "Sulawesi Barat": "76",
  "Maluku": "81", "Maluku Utara": "82", "Papua": "91", "Papua Barat": "92",
  // Newer province splits
  "Papua Barat Daya": "96", "Papua Selatan": "93", "Papua Tengah": "94",
  "Papua Pegunungan": "95",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrice(str) {
  if (!str || str === "-" || str === "0") return null;
  // Format: "44,750" or "44.750" (Indonesian uses . as thousands separator)
  const cleaned = String(str).replace(/\./g, "").replace(/,/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

function formatDateISO(d) {
  return d.toISOString().split("T")[0];
}

async function initSession() {
  console.error("Initializing session (visiting homepage for cookies)...");
  const resp = await fetch(BASE, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    redirect: "follow",
  });
  const cookies = resp.headers.getSetCookie?.() || [];
  console.error(`  Status: ${resp.status}, Cookies: ${cookies.length}`);
  
  // Extract cookie string
  const cookieStr = cookies.map(c => c.split(";")[0]).join("; ");
  console.error(`  Cookie string: ${cookieStr.substring(0, 100)}...`);
  return cookieStr;
}

async function fetchCommodityData(biId, slug, startDate, endDate, cookies) {
  const params = new URLSearchParams({
    price_type_id: "1",
    comcat_id: biId,
    province_id: "",
    regency_id: "",
    showKota: "false",
    showPasar: "false",
    tipe_laporan: "1",
    start_date: formatDateISO(startDate),
    end_date: formatDateISO(endDate),
    _: String(Date.now()),
  });

  const url = `${BASE}/WebSite/TabelHarga/GetGridDataKomoditas?${params}`;
  
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE}/TabelHarga/PasarTradisionalKomoditas`,
      ...(cookies ? { "Cookie": cookies } : {}),
    },
  });

  if (!resp.ok) {
    console.error(`  ${biId}: HTTP ${resp.status}`);
    return [];
  }

  const json = await resp.json();
  const rows = json.data || [];
  
  if (rows.length === 0) {
    console.error(`  ${biId}: no data`);
    return [];
  }

  const records = [];
  
  for (const row of rows) {
    const name = (row.name || "").trim();
    const level = row.level;
    
    // Skip "Semua Provinsi" (national average) row and sub-province rows
    if (level === 0 || name === "Semua Provinsi") continue;
    if (level > 1) continue; // Skip city/market level data
    
    const bpsCode = PROV_NAME_TO_BPS[name];
    if (!bpsCode) {
      console.error(`  Unknown province: "${name}"`);
      continue;
    }

    // Extract price for each date column
    for (const [key, val] of Object.entries(row)) {
      // Date columns are like "27/02/2026"
      const dateMatch = key.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!dateMatch) continue;
      
      const [, dd, mm, yyyy] = dateMatch;
      const isoDate = `${yyyy}-${mm}-${dd}`;
      const price = parsePrice(val);
      
      if (price) {
        records.push({ slug, bpsCode, price, date: isoDate });
      }
    }
  }

  return records;
}

async function main() {
  const daysBack = parseInt(process.argv[2] || "31", 10);
  
  console.error("=== BI PIHPS Real Data Fetch (GetGridDataKomoditas) ===");
  console.error(`Fetching last ${daysBack} days...`);

  // Calculate date range
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // T-1 (yesterday, since BI has 1-day lag)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack + 1);

  console.error(`Date range: ${formatDateISO(startDate)} to ${formatDateISO(endDate)}`);

  // Init session for cookies
  const cookies = await initSession();
  await sleep(1000);

  const allRecords = [];

  for (let i = 0; i < COMMODITIES.length; i++) {
    const { biId, slug } = COMMODITIES[i];
    console.error(`\n[${i+1}/${COMMODITIES.length}] Fetching ${slug} (${biId})...`);
    
    try {
      const records = await fetchCommodityData(biId, slug, startDate, endDate, cookies);
      console.error(`  Got ${records.length} price records`);
      allRecords.push(...records);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
    
    // Respectful delay between commodities
    if (i < COMMODITIES.length - 1) await sleep(1200);
  }

  console.error(`\n=== TOTAL: ${allRecords.length} records ===`);

  // Output SQL
  if (allRecords.length === 0) {
    console.error("No records fetched. Check errors above.");
    process.exit(1);
  }

  // Group by slug for efficiency
  for (const r of allRecords) {
    const safeSlug = r.slug.replace(/'/g, "''");
    console.log(
      `INSERT INTO prices (commodity_id, province_id, price, market_type, date, source) ` +
      `SELECT id, '${r.bpsCode}', ${r.price}, 'traditional', '${r.date}', 'bi' ` +
      `FROM commodities WHERE slug='${safeSlug}' ` +
      `ON CONFLICT (commodity_id,province_id,date,market_type,source) DO UPDATE SET price=EXCLUDED.price;`
    );
  }

  console.error("SQL output complete. Use Supabase SQL editor to execute.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
