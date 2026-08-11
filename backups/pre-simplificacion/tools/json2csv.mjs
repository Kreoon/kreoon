// Regenera el .csv hermano de cada .json que le falte (o esté vacío teniendo datos).
// Uso: node backups/pre-simplificacion/tools/json2csv.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['live-streaming', 'social-feed', 'up-reputacion', 'marketplace-campanas', 'booking'];

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

let written = 0;
for (const mod of MODULES) {
  for (const f of readdirSync(join(ROOT, mod)).filter((f) => f.endsWith('.json'))) {
    const table = f.replace(/\.json$/, '');
    const rows = JSON.parse(readFileSync(join(ROOT, mod, f), 'utf8'));
    const csvPath = join(ROOT, mod, `${table}.csv`);
    const missing = !existsSync(csvPath) || (statSync(csvPath).size === 0 && rows.length > 0);
    if (missing) {
      writeFileSync(csvPath, toCsv(rows), 'utf8');
      console.log(`csv ${mod}/${table}: ${rows.length} filas`);
      written++;
    }
  }
}
console.log(`${written} CSV regenerados`);
