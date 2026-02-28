/**
 * Reads SQL file (UTF-16 from PowerShell) and generates batched SQL files.
 */
const { readFileSync, writeFileSync } = require('fs');

// Read with utf16le encoding (PowerShell default for redirect)
let sql;
try {
  sql = readFileSync('d:\\Projects\\pangan.id\\scripts\\bi_data_v2.sql', 'utf16le');
} catch (e) {
  sql = readFileSync('d:\\Projects\\pangan.id\\scripts\\bi_data_v2.sql', 'utf8');
}

// Remove BOM if present
if (sql.charCodeAt(0) === 0xFEFF) sql = sql.slice(1);

const lines = sql.split(/\r?\n/).filter(l => l.startsWith('INSERT'));
console.log(`Total INSERT lines: ${lines.length}`);

if (lines.length === 0) {
  console.log('No INSERT lines found. Trying different parse...');
  const allLines = sql.split(/\r?\n/);
  console.log(`Total lines: ${allLines.length}`);
  console.log('First line:', allLines[0]?.substring(0, 80));
  console.log('Sample lines:', allLines.slice(0, 3).map(l => l.substring(0, 60)));
  process.exit(1);
}

// Parse each line
const regex = /SELECT id, '(\w+)', (\d+), 'traditional', '([\d-]+)', 'bi' FROM commodities WHERE slug='([^']+)'/;
const records = [];
for (const line of lines) {
  const match = line.match(regex);
  if (!match) continue;
  const [, bpsCode, price, date, slug] = match;
  records.push({ slug, bpsCode, price: parseInt(price), date });
}
console.log(`Parsed ${records.length} records`);

// Group by slug
const bySlug = {};
for (const r of records) {
  if (!bySlug[r.slug]) bySlug[r.slug] = [];
  bySlug[r.slug].push(r);
}

// Generate efficient batch SQL files (one per commodity)
const batches = [];
for (const [slug, recs] of Object.entries(bySlug)) {
  // Split into sub-batches of 200 rows
  for (let i = 0; i < recs.length; i += 200) {
    const batch = recs.slice(i, i + 200);
    const values = batch.map(r => 
      `('${r.bpsCode}',${r.price},'${r.date}'::date)`
    ).join(',');
    
    const sql = `INSERT INTO prices (commodity_id,province_id,price,market_type,date,source) SELECT c.id,v.pid,v.price,'traditional',v.d,'bi' FROM (VALUES ${values}) AS v(pid,price,d) CROSS JOIN commodities c WHERE c.slug='${slug}' ON CONFLICT (commodity_id,province_id,date,market_type,source) DO UPDATE SET price=EXCLUDED.price;`;
    batches.push(sql);
  }
}

console.log(`Generated ${batches.length} batch SQL statements`);

// Write all batches to one file
writeFileSync('d:\\Projects\\pangan.id\\scripts\\bi_batched.sql', batches.join('\n\n'));
console.log('Written to bi_batched.sql');

// Also write each batch to individual file for easier copy-paste
for (let i = 0; i < batches.length; i++) {
  writeFileSync(`d:\\Projects\\pangan.id\\scripts\\b${i+1}.sql`, batches[i]);
}
console.log(`Written ${batches.length} individual batch files (b1.sql, b2.sql, ...)`);
