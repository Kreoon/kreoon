// Genera el SQL de restauración de una tabla respaldada.
// Uso:  node backups/pre-simplificacion/tools/make-restore-sql.mjs <modulo> <tabla> [tabla_destino]
// Ej.:  node ... make-restore-sql.mjs social-feed followers followers_restaurada
// Escribe restore/<tabla>.sql y lo imprime en consola. Ese SQL se pega en el
// SQL Editor de Supabase (rol postgres). Método verificado el 2026-08-11 sobre
// `followers`: 36 filas, md5 idéntico al origen.
//
// OJO: json_populate_recordset necesita que el TIPO de la tabla exista. Si la tabla
// ya fue eliminada, primero corre schema/01_tables.sql (y luego 02..05) para recrearla.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const [mod, table, target] = process.argv.slice(2);

if (!mod || !table) {
  console.error('Uso: node make-restore-sql.mjs <modulo> <tabla> [tabla_destino]');
  process.exit(1);
}

const json = readFileSync(join(ROOT, mod, `${table}.json`), 'utf8');
const rows = JSON.parse(json);
const dest = target || table;

const sql = `-- Restauración de public.${dest} desde backups/pre-simplificacion/${mod}/${table}.json
-- Filas en el respaldo: ${rows.length}
BEGIN;

INSERT INTO public.${dest}
SELECT * FROM json_populate_recordset(null::public.${table}, $kreoon$${json}$kreoon$::json);

-- Verificación (debe dar ${rows.length}):
SELECT count(*) FROM public.${dest};

COMMIT;
`;

mkdirSync(join(ROOT, 'restore'), { recursive: true });
const out = join(ROOT, 'restore', `${dest}.sql`);
writeFileSync(out, sql, 'utf8');
console.log(`Escrito ${out} (${rows.length} filas)`);
