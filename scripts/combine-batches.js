/**
 * Read all batch SQL files and combine into groups for MCP execution.
 * Outputs combined SQL files that can be pasted into MCP SQL tool.
 * Each output file contains ~5 batch statements combined.
 */
const { readFileSync, writeFileSync, readdirSync } = require('fs');
const path = require('path');

const dir = 'd:\\Projects\\pangan.id\\scripts';
const files = readdirSync(dir)
  .filter(f => /^b\d+\.sql$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

console.log(`Found ${files.length} batch files`);

// Read all batch SQL and combine into groups of 5
const groupSize = 5;
const groups = [];

for (let i = 0; i < files.length; i += groupSize) {
  const group = files.slice(i, i + groupSize);
  const combined = group.map(f => {
    return readFileSync(path.join(dir, f), 'utf8').trim();
  }).join('\n');
  groups.push(combined);
}

console.log(`Generated ${groups.length} combined groups`);

// Write combined files
for (let i = 0; i < groups.length; i++) {
  writeFileSync(path.join(dir, `group_${i+1}.sql`), groups[i]);
}

console.log(`Written group_1.sql through group_${groups.length}.sql`);
console.log(`Each group contains ~${groupSize} batch inserts (~${groupSize * 200} rows)`);
