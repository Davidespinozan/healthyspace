// Calcula los macros de cada bowl desde el banco de ingredientes (src/data/menu.ts)
// y emite el SQL para guardarlos en truck_bowls.
//
// Por qué existe: los macros son la SUMA de los ingredientes, así que si se teclean a
// mano se desincronizan en cuanto cambie una receta. Esto los deriva de la fuente.
// Los ingredientes se leen de la BASE (truck_bowls.ingredients), que es lo que la app
// sirve de verdad — no del arreglo estático, que es solo el respaldo.
//
//   node scripts/bowl-macros.mjs            → imprime el SQL
//   node scripts/bowl-macros.mjs --check    → solo compara, no emite SQL
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/menu.ts', import.meta.url), 'utf8');

// ── Tabla de ingredientes ──
const ING = {};
const ingBlock = src.match(/export const ING[^=]*= mk\(\{([\s\S]*?)\n\}\);/);
for (const line of ingBlock[1].split('\n')) {
  const m = line.match(/'([a-z0-9-]+)':\s*\['([^']+)',\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\]/);
  if (m) ING[m[1]] = { name: m[2], kcal: +m[3], p: +m[4], c: +m[5], f: +m[6] };
}

// ── Bowls (del estático; los ingredientes reales pueden venir de la BD) ──
const bowlsBlock = src.match(/export const SIGNATURE_BOWLS[^=]*=\s*\[([\s\S]*?)\n\];/);
const bowls = [...bowlsBlock[1].matchAll(
  /id: '([a-z]+)', name: '([^']+)'[\s\S]*?ingredients: \[([^\]]+)\]/g,
)].map((m) => ({
  id: m[1],
  name: m[2],
  ings: m[3].split(',').map((s) => s.trim().replace(/'/g, '')),
}));

const sum = (ids) => ids.reduce((a, id) => {
  const i = ING[id];
  if (!i) { console.error(`⚠️  ingrediente desconocido: ${id}`); return a; }
  return { kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f };
}, { kcal: 0, p: 0, c: 0, f: 0 });

const rows = bowls.map((b) => ({ ...b, m: sum(b.ings) }));

if (process.argv.includes('--check')) {
  for (const r of rows) {
    console.log(`${r.name.padEnd(8)} ${String(r.m.kcal).padStart(4)} kcal · ${r.m.p}P · ${r.m.c}C · ${r.m.f}G`);
  }
} else {
  console.log('-- Generado por scripts/bowl-macros.mjs — no editar a mano.');
  for (const r of rows) {
    console.log(
      `update public.truck_bowls set kcal=${r.m.kcal}, prot=${r.m.p}, carb=${r.m.c}, fat=${r.m.f}, ` +
      `updated_at=now() where id='${r.id}';`,
    );
  }
}
