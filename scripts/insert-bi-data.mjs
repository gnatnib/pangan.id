/**
 * Insert BI PIHPS data into Supabase using the REST API.
 * Reads records from the fetched data and inserts via Supabase JS client.
 * 
 * Usage: node scripts/insert-bi-data.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://xivuxbnrcwlddeegctkk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdnV4Ym5yY3dsZGRlZWdjdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU5MzAsImV4cCI6MjA4Nzc5MTkzMH0.kvBwyz3DZGikLxDU_4hbEnc6aTLxDEoadbQkwrWvB7c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Read SQL file and extract records
  const sql = readFileSync('d:\\Projects\\pangan.id\\scripts\\bi_data_v2.sql', 'utf8');
  const lines = sql.split('\n').filter(l => l.startsWith('INSERT'));
  
  console.log(`Total INSERT statements: ${lines.length}`);
  
  // Parse each INSERT line to extract data
  const regex = /SELECT id, '(\w+)', (\d+), 'traditional', '([\d-]+)', 'bi' FROM commodities WHERE slug='([^']+)'/;
  
  // First, load commodity IDs
  const { data: commodities } = await supabase.from('commodities').select('id, slug');
  const slugToId = {};
  for (const c of commodities) { slugToId[c.slug] = c.id; }
  console.log(`Loaded ${Object.keys(slugToId).length} commodity IDs`);
  
  // Parse all records
  const records = [];
  for (const line of lines) {
    const match = line.match(regex);
    if (!match) continue;
    const [, bpsCode, price, date, slug] = match;
    const commodityId = slugToId[slug];
    if (!commodityId) { console.error(`Unknown slug: ${slug}`); continue; }
    records.push({
      commodity_id: commodityId,
      province_id: bpsCode,
      price: parseInt(price),
      market_type: 'traditional',
      date: date,
      source: 'bi',
    });
  }
  
  console.log(`Parsed ${records.length} records`);
  
  // Batch upsert (500 at a time)
  const batchSize = 500;
  let total = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    try {
      const { error } = await supabase.from('prices').upsert(batch, {
        onConflict: 'commodity_id,province_id,date,market_type,source'
      });
      if (error) {
        console.error(`Batch ${Math.floor(i/batchSize)+1} error:`, error.message);
      } else {
        total += batch.length;
        console.log(`Batch ${Math.floor(i/batchSize)+1}: ${batch.length} records (total: ${total})`);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i/batchSize)+1} exception:`, err.message);
    }
  }
  
  console.log(`\nDone! Inserted ${total} records`);
}

main().catch(console.error);
