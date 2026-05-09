// Validador de URLs y handles de redes sociales para outputs de IA.
// Su objetivo es PREVENIR HALLUCINATION: si una IA inventa una URL,
// HEAD/GET request fallara y la marcaremos invalida (vacia).

export interface UrlValidationResult {
  url: string;          // URL original
  cleaned: string;      // URL normalizada (o "" si invalida)
  valid: boolean;
  reason?: string;
}

const HALLUCINATION_PATTERNS: RegExp[] = [
  /\b(123456|987654|1234567890)\b/,           // IDs secuenciales obviamente fake
  /\bexample\.(com|org)\b/i,                  // example.com
  /\bplaceholder\b/i,
  /\b(producto|product)-\d{6,}\b/i,           // /producto-123456
  /\/(prod|pdp|item)\/\d{8,}\d*$/i,           // IDs largos numericos al final de path
  /\bxxx+\b/i,                                // xxx, xxxxxx
  /\b(tu|your)-(marca|brand|domain)\.(com|net)\b/i,
];

function looksHallucinated(url: string): boolean {
  return HALLUCINATION_PATTERNS.some(p => p.test(url));
}

function normalizeUrl(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let trimmed = raw.trim();
  // Quitar puntuacion final tipica de texto: "url." → "url"
  trimmed = trimmed.replace(/[.,;:!?\)\]\}>"']+$/, "");
  if (!trimmed) return "";
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    if (trimmed.includes(" ") || !trimmed.includes(".")) return "";
    trimmed = `https://${trimmed}`;
  }
  try {
    const u = new URL(trimmed);
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

// HEAD request con timeout. true si responde 2xx/3xx, false si 4xx/5xx/timeout.
async function urlExists(url: string, timeoutMs: number = 8000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KreoonValidator/1.0)" },
    });
    // Algunos servidores no soportan HEAD: reintenta con GET
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KreoonValidator/1.0)" },
      });
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function validateUrl(url: string, options: { skipNetworkCheck?: boolean } = {}): Promise<UrlValidationResult> {
  const cleaned = normalizeUrl(url);
  if (!cleaned) return { url, cleaned: "", valid: false, reason: "URL vacia o malformada" };
  if (looksHallucinated(cleaned)) return { url, cleaned: "", valid: false, reason: "Patron de hallucination detectado" };

  if (options.skipNetworkCheck) return { url, cleaned, valid: true };

  const reachable = await urlExists(cleaned);
  if (!reachable) return { url, cleaned: "", valid: false, reason: "404/timeout/no responde" };
  return { url, cleaned, valid: true };
}

// Limpia un handle de Instagram/TikTok y devuelve URL completa o "" si invalido.
// Acepta entradas: "@usuario", "usuario", "https://instagram.com/usuario", "instagram.com/usuario"
export function cleanInstagramHandle(input: string): { url: string; handle: string } {
  if (!input || typeof input !== "string") return { url: "", handle: "" };
  const t = input.trim();
  if (!t) return { url: "", handle: "" };

  // Extraer handle desde URL si viene con "instagram.com/"
  const urlMatch = t.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})/i);
  let handle = urlMatch ? urlMatch[1] : t.replace(/^@/, "").replace(/^https?:\/\//, "");
  handle = handle.split(/[\/?#]/)[0]; // cortar en "/", "?", "#"

  // Validar formato: solo letras, numeros, ".", "_", entre 1-30 chars
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return { url: "", handle: "" };
  // Filtrar handles obviamente inventados
  if (/^(usuario|user|brand|tubranding|fakeuser|tu_marca|example)/i.test(handle)) return { url: "", handle: "" };

  return { url: `https://www.instagram.com/${handle}`, handle: `@${handle}` };
}

export function cleanTiktokHandle(input: string): { url: string; handle: string } {
  if (!input || typeof input !== "string") return { url: "", handle: "" };
  const t = input.trim();
  if (!t) return { url: "", handle: "" };

  const urlMatch = t.match(/tiktok\.com\/@([a-zA-Z0-9._]{1,24})/i);
  let handle = urlMatch ? urlMatch[1] : t.replace(/^@/, "").replace(/^https?:\/\//, "");
  handle = handle.split(/[\/?#]/)[0];

  if (!/^[a-zA-Z0-9._]{1,24}$/.test(handle)) return { url: "", handle: "" };
  if (/^(usuario|user|brand|tubranding|fakeuser|tu_marca|example)/i.test(handle)) return { url: "", handle: "" };

  return { url: `https://www.tiktok.com/@${handle}`, handle: `@${handle}` };
}

// Valida un array de competidores limpiando websites + handles.
// Modifica IN-PLACE y retorna estadistica de cuantas URLs fueron rescatadas/eliminadas.
export async function validateCompetitorUrls(competitors: any[]): Promise<{ checked: number; valid: number; invalid: number; cleaned: number }> {
  if (!Array.isArray(competitors)) return { checked: 0, valid: 0, invalid: 0, cleaned: 0 };

  let checked = 0, valid = 0, invalid = 0, cleaned = 0;

  // Validar websites en paralelo (concurrencia 4)
  const websiteTasks: Array<{ idx: number; url: string }> = [];
  for (let i = 0; i < competitors.length; i++) {
    const c = competitors[i];
    if (typeof c?.website === "string" && c.website.trim()) {
      websiteTasks.push({ idx: i, url: c.website });
    }
  }

  const concurrency = 4;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < websiteTasks.length) {
      const my = websiteTasks[cursor++];
      if (!my) return;
      checked++;
      const r = await validateUrl(my.url);
      if (r.valid) {
        if (r.cleaned !== my.url) cleaned++;
        competitors[my.idx].website = r.cleaned;
        valid++;
      } else {
        competitors[my.idx].website = "";
        invalid++;
        console.log(`[url-validator] Website invalida limpiada: "${my.url}" (${r.reason})`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, websiteTasks.length) }, () => worker()));

  // Limpiar handles (sin red, solo regex/normalizacion)
  for (const c of competitors) {
    if (typeof c?.instagram === "string" && c.instagram.trim()) {
      const ig = cleanInstagramHandle(c.instagram);
      c.instagram = ig.url; // URL completa para click directo
    }
    if (typeof c?.tiktok === "string" && c.tiktok.trim()) {
      const tk = cleanTiktokHandle(c.tiktok);
      c.tiktok = tk.url;
    }
  }

  return { checked, valid, invalid, cleaned };
}
