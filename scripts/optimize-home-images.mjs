#!/usr/bin/env node
/**
 * Exporta las fotografías maestras de la home a AVIF + WebP responsivos en public/home/.
 *
 * Uso:  node scripts/optimize-home-images.mjs <carpeta-origen>
 * La carpeta contiene los originales (PNG/JPG; NO se versionan por su peso), con estos nombres:
 *   hero-main, ugc, video, beauty, editor, gaming, viajes, bienestar, gastro, foto, comunidad, detalle
 * Un mismo original puede alimentar varias salidas (p. ej. `beauty` → cara-beauty y persona-beauty).
 *
 * Cada variante baja la calidad por pasos hasta entrar en su presupuesto de peso (KB, orientativo:
 * ≤150 KB en móvil y ≤250 KB en la variante grande del hero) y reporta lo que no cabe.
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

/**
 * name = prefijo de salida; master = original; widths y budgetKB van alineados.
 * extract = recorte cuadrado manual (px del original 1728×2304) centrado en el rostro para los avatares.
 */
const JOBS = [
  { name: "hero", master: "hero-main", ratio: 3 / 4, widths: [480, 720, 960], budgetKB: [150, 220, 250] },
  { name: "hero-ugc", master: "ugc", ratio: 3 / 4, widths: [320, 480], budgetKB: [70, 110] },
  { name: "hero-video", master: "video", ratio: 3 / 4, widths: [320, 480], budgetKB: [70, 110] },
  { name: "cara-beauty", master: "beauty", ratio: 1, widths: [80, 160], budgetKB: [8, 20], extract: { left: 182, top: 205, size: 1092 } },
  { name: "cara-editor", master: "editor", ratio: 1, widths: [80, 160], budgetKB: [8, 20], extract: { left: 455, top: 91, size: 1137 } },
  { name: "cara-gaming", master: "gaming", ratio: 1, widths: [80, 160], budgetKB: [8, 20], extract: { left: 273, top: 114, size: 1182 } },
  { name: "cara-viajes", master: "viajes", ratio: 1, widths: [80, 160], budgetKB: [8, 20], extract: { left: 227, top: 136, size: 1273 } },
  { name: "persona-bienestar", master: "bienestar", ratio: 3 / 4, widths: [320, 480], budgetKB: [70, 110] },
  { name: "persona-gastro", master: "gastro", ratio: 3 / 4, widths: [320, 480], budgetKB: [70, 110] },
  { name: "persona-foto", master: "foto", ratio: 3 / 4, widths: [320, 480], budgetKB: [70, 110] },
  { name: "persona-beauty", master: "beauty", ratio: 3 / 4, widths: [360, 540], budgetKB: [80, 120] },
  { name: "persona-viajes", master: "viajes", ratio: 3 / 4, widths: [240, 360], budgetKB: [50, 80] },
  { name: "comunidad", master: "comunidad", ratio: 16 / 9, widths: [640, 1024, 1600], budgetKB: [110, 180, 260] },
  { name: "detalle", master: "detalle", ratio: 4 / 3, widths: [480, 800], budgetKB: [80, 140] },
];

const FORMATS = {
  avif: { start: 56, min: 28, step: 6, encode: (img, q) => img.avif({ quality: q, effort: 6 }) },
  webp: { start: 78, min: 38, step: 6, encode: (img, q) => img.webp({ quality: q, effort: 6 }) },
};

function findMaster(name) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const p = path.join(SRC, `${name}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
let overBudget = 0;
let total = 0;

for (const job of JOBS) {
  const input = findMaster(job.master);
  if (!input) {
    console.warn(`· falta el original «${job.master}» en ${SRC}; se omite ${job.name}`);
    continue;
  }
  for (const [i, width] of job.widths.entries()) {
    const height = Math.round(width / job.ratio);
    const budget = job.budgetKB[i] * KB;
    for (const [ext, fmt] of Object.entries(FORMATS)) {
      let q = fmt.start;
      let buf;
      for (;;) {
        const base = job.extract
          ? sharp(input).extract({ left: job.extract.left, top: job.extract.top, width: job.extract.size, height: job.extract.size })
          : sharp(input);
        const img = base.resize({ width, height, fit: "cover", position: job.position ?? "attention" });
        buf = await fmt.encode(img, q).toBuffer();
        if (buf.length <= budget || q <= fmt.min) break;
        q -= fmt.step;
      }
      const file = path.join(OUT, `${job.name}-${width}.${ext}`);
      fs.writeFileSync(file, buf);
      total += buf.length;
      const ok = buf.length <= budget;
      if (!ok) overBudget++;
      rows.push(`${ok ? "ok " : "!! "} ${path.relative(process.cwd(), file).padEnd(38)} ${String(Math.round(buf.length / KB)).padStart(4)} KB (q${q}, tope ${job.budgetKB[i]} KB)`);
    }
  }
}

console.log(rows.join("\n"));
console.log(`\nTotal exportado: ${Math.round(total / KB)} KB en ${rows.length} archivos.`);
if (overBudget) console.warn(`${overBudget} variante(s) superan su presupuesto: revisa el original o sube el tope conscientemente.`);
