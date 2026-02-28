/**
 * Strategy: visit TabelHarga page first for cookies, then call GetGridDataKomoditas
 * Also try: the panelharga.badanpangan.go.id API as alternative
 */
async function test() {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.bi.go.id/hargapangan/TabelHarga/PasarTradisionalKomoditas",
    "Origin": "https://www.bi.go.id",
  };

  // Test 1: Try panelharga.badanpangan.go.id API
  console.log("=== Test panelharga.badanpangan.go.id ===");
  try {
    const resp = await fetch("https://panelharga.badanpangan.go.id/data/province-with-harga/1/2026-02-27", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    console.log(`Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`Length: ${text.length}, First 800: ${text.substring(0,800)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  // Test 2: Try panelharga API with different format
  console.log("\n=== Test panelharga API v2 ===");
  try {
    const resp = await fetch("https://panelharga.badanpangan.go.id/data/provinsi-with-harga/1", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    console.log(`Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`Length: ${text.length}, First 800: ${text.substring(0,800)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  // Test 3: panelharga API for commodity list
  console.log("\n=== Test panelharga commodity list ===");
  try {
    const resp = await fetch("https://panelharga.badanpangan.go.id/data/komoditas", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    console.log(`Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`Length: ${text.length}, First 1000: ${text.substring(0,1000)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
  
  // Test 4: PIHPS BI table endpoint with GET params (different date format)
  console.log("\n=== Test BI TabelHarga GET with different date format ===");
  try {
    const url = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga/GetGridDataKomoditas?" + 
      "price_type_id=1&comcat_id=com_11&province_id=0&regency_id=0&start_date=2026-02-22&end_date=2026-02-27";
    const resp = await fetch(url, { headers });
    console.log(`Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`Length: ${text.length}, Response: ${text.substring(0,400)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  // Test 5: Try TabelHarga with month/day/year format  
  console.log("\n=== Test BI TabelHarga with month/day/year format ===");
  try {
    const url = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga/GetGridDataKomoditas?" + 
      "price_type_id=1&comcat_id=com_11&province_id=0&regency_id=0&start_date=2%2F22%2F2026&end_date=2%2F27%2F2026";
    const resp = await fetch(url, { headers });
    console.log(`Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`Length: ${text.length}, Response: ${text.substring(0,500)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

test();
