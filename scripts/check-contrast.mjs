#!/usr/bin/env node
/**
 * Validación de contraste WCAG 2.x de los tokens de marca, leyendo los valores REALES de src/index.css
 * (no una copia): si alguien cambia un token y rompe el contraste, este script falla.
 *
 *   texto normal      >= 4.5:1  (AA)
 *   componentes UI    >= 3.0:1  (WCAG 1.4.11: bordes de campos, foco)
 *
 * Uso: node scripts/check-contrast.mjs   (o: npm run check:contrast)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/index.css"), "utf8");

function blockVars(selectorRe) {
  const m = selectorRe.exec(css);
  if (!m) throw new Error(`No se encontró el bloque ${selectorRe}`);
  const start = css.indexOf("{", m.index) + 1;
  let depth = 1, i = start;
  while (depth > 0 && i < css.length) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
  const body = css.slice(start, i - 1);
  const vars = {};
  for (const v of body.matchAll(/--([\w-]+):\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*(?:\/[^;]*)?;/g)) {
    vars[v[1]] = [Number(v[2]), Number(v[3]), Number(v[4])];
  }
  return vars;
}

const hslToRgb = ([h, s, l]) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
};
const lum = (hsl) => {
  const [r, g, b] = hslToRgb(hsl).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [nombre, texto/primer plano, fondo, mínimo]
const PAIRS = [
  ["foreground / background", "foreground", "background", 4.5],
  ["card-foreground / card", "card-foreground", "card", 4.5],
  ["popover-foreground / popover", "popover-foreground", "popover", 4.5],
  ["primary-foreground / primary (botón)", "primary-foreground", "primary", 4.5],
  ["primary / background (texto/enlace)", "primary", "background", 4.5],
  ["primary / card (texto/enlace)", "primary", "card", 4.5],
  ["secondary-foreground / secondary", "secondary-foreground", "secondary", 4.5],
  ["muted-foreground / background", "muted-foreground", "background", 4.5],
  ["muted-foreground / card", "muted-foreground", "card", 4.5],
  ["muted-foreground / muted", "muted-foreground", "muted", 4.5],
  ["accent-foreground / accent", "accent-foreground", "accent", 4.5],
  ["destructive-foreground / destructive", "destructive-foreground", "destructive", 4.5],
  ["success-foreground / success", "success-foreground", "success", 4.5],
  ["warning-foreground / warning", "warning-foreground", "warning", 4.5],
  ["info-foreground / info", "info-foreground", "info", 4.5],
  ["sidebar-foreground / sidebar-background", "sidebar-foreground", "sidebar-background", 4.5],
  ["sidebar-accent-foreground / sidebar-accent", "sidebar-accent-foreground", "sidebar-accent", 4.5],
  ["input (borde de campo) / background", "input", "background", 3],
  ["ring (foco) / background", "ring", "background", 3],
];
const BRAND_ONLY = [
  ["brand-coral-foreground / brand-coral", "brand-coral-foreground", "brand-coral", 4.5],
  ["brand-mint-foreground / brand-mint", "brand-mint-foreground", "brand-mint", 4.5],
];

let failures = 0;
function run(label, vars, pairs) {
  console.log(`\n${label}`);
  for (const [name, fg, bg, min] of pairs) {
    if (!vars[fg] || !vars[bg]) { console.log(`  ?  ${name}: token ausente (${!vars[fg] ? fg : bg})`); failures++; continue; }
    const r = ratio(vars[fg], vars[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "OK " : "FALLA"} ${r.toFixed(2).padStart(5)}:1 (mín ${min})  ${name}`);
  }
}

const light = blockVars(/:root,\s*\n?\s*\.brand-surface\s*\{/);
const dark = { ...light, ...blockVars(/\n\s*\.dark\s*\{/) };
run("TEMA CLARO DE MARCA (:root / .brand-surface)", light, [...PAIRS, ...BRAND_ONLY]);
run("TEMA OSCURO (.dark)", dark, PAIRS);

console.log(failures ? `\n✖ ${failures} par(es) por debajo del mínimo` : "\n✔ Todos los pares cumplen WCAG AA");
process.exit(failures ? 1 : 0);
