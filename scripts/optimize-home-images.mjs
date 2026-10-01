#!/usr/bin/env node
/**
 * Exporta las fotografías maestras de la home a AVIF + WebP responsivos en public/home/.
 *
 * Uso:  node scripts/optimize-home-images.mjs <carpeta-origen>
 * La carpeta debe tener (originales PNG/JPG, NO se versionan por su peso):
 *   hero.png        (3:4)   → public/home/hero-{480,720,960}.{avif,webp}
 *   comunidad.png   (16:9)  → public/home/comunidad-{640,1024,1600}.{avif,webp}
 *   detalle.png     (4:3)   → public/home/detalle-{480,800}.{avif,webp}
 *
 * Cada variante baja la calidad por pasos hasta entrar en su presupuesto de peso
 * (orientativo: ≤150 KB en móvil, ≤250 KB en la variante grande del hero). Reporta lo que no cabe.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC) {
  console.error("Uso: node scripts/optimize-home-images.mjs <carpeta-origen>");
  process.exit(1);
}

const OUT = path.resolve("public/home");
const KB = 1024;

const JOBS = [
  { name: "hero", ratio: 3 / 4, widths: [480, 720, 960], budget: (w) => (w <= 480 ? 150 * KB : 250 * KB) },
  { name: "comunidad", ratio: 16 / 9, widths: [640, 1024, 1600], budget: (w) => (w <= 640 ? 110 * KB : w <= 1024 ? 180 * KB : 260 * KB) },
  { name: "detalle", ratio: 4 / 3, widths: [480, 800], budget: (w) => (w <= 480 ? 80 * KB : 140 * KB) },
];

const FORMATS = {
  avif: { start: 56, min: 30, step: 6, encode: (img, q) => img.avif({ quality: q, effort: 6 }) },
  webp: { start: 78, min: 40, step: 6, encode: (img, q) => img.webp({ quality: q, effort: 6 }) },
};

function findSource(name) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const p = path.join(SRC, `${name}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
let overBudget = 0;

for (const job of JOBS) {
  const input = findSource(job.name);
  if (!input) {
    console.warn(`· falta ${job.name}.{png,jpg} en ${SRC}; se omite`);
    continue;
  }
  for (const width of job.widths) {
    const height = Math.round(width / job.ratio);
    const budget = job.budget(width);
    for (const [ext, fmt] of Object.entries(FORMATS)) {
      let q = fmt.start;
      let buf;
      for (;;) {
        buf = await fmt.encode(sharp(input).resize({ width, height, fit: "cover", position: "attention" }), q).toBuffer();
        if (buf.length <= budget || q <= fmt.min) break;
        q -= fmt.step;
      }
      const file = path.join(OUT, `${job.name}-${width}.${ext}`);
      fs.writeFileSync(file, buf);
      const ok = buf.length <= budget;
      if (!ok) overBudget++;
      rows.push(`${ok ? "ok " : "!! "} ${path.relative(process.cwd(), file).padEnd(34)} ${String(Math.round(buf.length / KB)).padStart(4)} KB (q${q}, tope ${Math.round(budget / KB)} KB)`);
    }
  }
}

console.log(rows.join("\n"));
if (overBudget) console.warn(`\n${overBudget} variante(s) superan su presupuesto: revisa el original o sube el tope conscientemente.`);
