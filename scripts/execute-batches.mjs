/**
 * Execute batch SQL files against Supabase using the REST API.
 * Each batch file contains a single INSERT statement with up to 200 VALUES.
 * 
 * Usage: node scripts/execute-batches.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://xivuxbnrcwlddeegctkk.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// We'll use the Supabase REST API's rpc endpoint, or directly the postgrest endpoint
// Actually, for raw SQL we need to use the management API or the SQL endpoint
// Let's try using the supabase-js library with the anon key but with the SQL function

async function executeSQLviaRPC(sql) {
  // Use Supabase's built-in pg_catalog or a custom function
  // Actually, let's use a simpler approach - create a temporary function
  // Or better: use the Supabase client's from().rpc() with a helper function
  
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdnV4Ym5yY3dsZGRlZWdjdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU5MzAsImV4cCI6MjA4Nzc5MTkzMH0.kvBwyz3DZGikLxDU_4hbEnc6aTLxDEoadbQkwrWvB7c',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdnV4Ym5yY3dsZGRlZWdjdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU5MzAsImV4cCI6MjA4Nzc5MTkzMH0.kvBwyz3DZGikLxDU_4hbEnc6aTLxDEoadbQkwrWvB7c',
    },
    body: JSON.stringify({ query: sql }),
  });
  return resp;
}

async function main() {
  const dir = 'd:\\Projects\\pangan.id\\scripts';
  
  // Find all batch files b1.sql through bN.sql
  const files = readdirSync(dir)
    .filter(f => /^b\d+\.sql$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });
  
  console.log(`Found ${files.length} batch files`);
  
  // Try executing via RPC first
  const testResp = await executeSQLviaRPC('SELECT 1');
  console.log(`RPC test response: ${testResp.status}`);
  
  if (testResp.status !== 200) {
    console.log('RPC not available. Falling back to direct Supabase client...');
    
    // Use supabase-js to insert data directly
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdnV4Ym5yY3dsZGRlZWdjdGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU5MzAsImV4cCI6MjA4Nzc5MTkzMH0.kvBwyz3DZGikLxDU_4hbEnc6aTLxDEoadbQkwrWvB7c');
    
    // Load commodity IDs
    const { data: commodities } = await supabase.from('commodities').select('id, slug');
    const slugToId = {};
    for (const c of commodities) slugToId[c.slug] = c.id;
    console.log(`Loaded ${Object.keys(slugToId).length} commodity IDs`);
    
    // Read all batch files, parse, and upsert
    let totalInserted = 0;
    const allRecords = [];
    
    // Parse records from SQL files
    const regex = /\('(\w+)',(\d+),'([\d-]+)'::date\)/g;
    const slugRegex = /WHERE c\.slug='([^']+)'/;
    
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      const slugMatch = sql.match(slugRegex);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      const commodityId = slugToId[slug];
      if (!commodityId) { console.error(`Unknown slug: ${slug}`); continue; }
      
      let match;
      while ((match = regex.exec(sql)) !== null) {
        allRecords.push({
          commodity_id: commodityId,
          province_id: match[1],
          price: parseInt(match[2]),
          market_type: 'traditional',
          date: match[3],
          source: 'bi',
        });
      }
    }
    
    console.log(`Total records to insert: ${allRecords.length}`);
    
    // Batch upsert (500 at a time)
    const batchSize = 500;
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      const { error } = await supabase.from('prices').upsert(batch, {
        onConflict: 'commodity_id,province_id,date,market_type,source'
      });
      if (error) {
        console.error(`Batch ${Math.floor(i/batchSize)+1}: ${error.message}`);
      } else {
        totalInserted += batch.length;
        if (totalInserted % 2000 === 0 || i + batchSize >= allRecords.length) {
          console.log(`Progress: ${totalInserted}/${allRecords.length}`);
        }
      }
    }
    
    console.log(`\nDone! Inserted ${totalInserted} records`);
  }
}

main().catch(console.error);
