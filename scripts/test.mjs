import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const todayStr = new Date().toISOString().split('T')[0];
  const daysAgo8 = new Date();
  daysAgo8.setDate(daysAgo8.getDate() - 10);
  const sparkStartStr = daysAgo8.toISOString().split('T')[0];

  const { data: weekPrices } = await supabase
    .from("prices")
    .select("commodity_id, province_id, date, price")
    .eq("market_type", "traditional")
    .gte("date", sparkStartStr)
    .lte("date", todayStr)
    .gt("price", 0)
    .order("date", { ascending: false });

  if (!weekPrices) {
    console.log("No data");
    return;
  }

  const datesSet = new Set();
  for (const p of weekPrices) {
    datesSet.add(p.date);
  }
  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  
  const latestDate = sortedDates[0];
  const prevDateStr = sortedDates.length > 1 ? sortedDates[1] : null;

  console.log("Latest Date:", latestDate);
  console.log("Prev Date:", prevDateStr);

  const sparklines = {};
  const byCommodityDate = new Map();
  
  for (const p of weekPrices) {
    const key = `${p.commodity_id}:${p.date}`;
    if (!byCommodityDate.has(key)) byCommodityDate.set(key, []);
    byCommodityDate.get(key).push(p.price);
  }

  const roundTo50 = (num) => Math.round(num / 50) * 50;

  for (const [key, prices] of byCommodityDate.entries()) {
    const [cid, date] = key.split(":");
    const commodityId = Number(cid);
    if (!sparklines[commodityId]) sparklines[commodityId] = [];
    
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    sparklines[commodityId].push({
      date,
      price: roundTo50(avg),
    });
  }

  for (const cid in sparklines) {
    sparklines[cid].sort((a, b) => a.date.localeCompare(b.date));
  }

  console.log("Sparklines for 1:", sparklines[1]);

  const todayPrices = weekPrices.filter(p => p.date === latestDate);
  const prevPrices = prevDateStr ? weekPrices.filter(p => p.date === prevDateStr) : [];
  
  const todayCom = todayPrices.filter(p => p.commodity_id === 1);
  const prevCom = prevPrices.filter(p => p.commodity_id === 1);

  const avgPrice = roundTo50(todayCom.map(p => p.price).reduce((a, b) => a + b, 0) / todayCom.length);
  const prevAvgPrice = roundTo50(prevCom.map(p => p.price).reduce((a, b) => a + b, 0) / prevCom.length);

  console.log("avgPrice:", avgPrice);
  console.log("prevAvgPrice:", prevAvgPrice);
  console.log("priceChangePct:", prevAvgPrice ? ((avgPrice - prevAvgPrice) / prevAvgPrice) * 100 : 0);
}

test();
