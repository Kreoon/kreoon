// Cliente compartido para Firecrawl (https://api.firecrawl.dev)
// Usado por el upgrade "Inteligencia Competitiva Real" del ADN Recargado.
// Scrapea landing pages de competidores, paginas de pricing y ads para extraer
// claims, precios y CTAs reales.

export interface ScrapeResult {
  url: string;
  ok: boolean;
  content: string;
  metadata?: {
    title?: string;
    description?: string;
    [key: string]: any;
  };
  error?: string;
  charsExtracted: number;
}

export interface BatchScrapeOptions {
  // Maximo de URLs scrapeadas en paralelo (por API limit). Default: 4.
  concurrency?: number;
  // Timeout por URL en ms. Default: 25000.
  timeoutMs?: number;
  // Solo extraer contenido principal (excluir nav, footer). Default: true.
  onlyMainContent?: boolean;
  // Limite de chars por URL para no inflar el contexto del LLM. Default: 8000.
  maxCharsPerUrl?: number;
}

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";

function isValidHttpUrl(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function clipContent(content: string, maxChars: number): string {
  if (!content || content.length <= maxChars) return content;
  // Cortar en una frontera natural cuando sea posible
  const sliced = content.slice(0, maxChars);
  const lastNewline = sliced.lastIndexOf("\n\n");
  if (lastNewline > maxChars * 0.7) return sliced.slice(0, lastNewline) + "\n\n[...truncated]";
  return sliced + "\n\n[...truncated]";
}

// Scrapea una URL individual via Firecrawl. No lanza excepciones — devuelve ScrapeResult con ok=false.
export async function scrapeUrl(
  url: string,
  apiKey: string,
  options: BatchScrapeOptions = {},
): Promise<ScrapeResult> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const onlyMainContent = options.onlyMainContent ?? true;
  const maxChars = options.maxCharsPerUrl ?? 8000;

  if (!isValidHttpUrl(normalizeUrl(url))) {
    return { url, ok: false, content: "", error: "URL invalida", charsExtracted: 0 };
  }

  const normalized = normalizeUrl(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        url: normalized,
        formats: ["markdown"],
        onlyMainContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        url: normalized,
        ok: false,
        content: "",
        error: `HTTP ${res.status}: ${errBody.substring(0, 200)}`,
        charsExtracted: 0,
      };
    }

    const data = await res.json();
    if (data.success === false) {
      return {
        url: normalized,
        ok: false,
        content: "",
        error: data.error || "Firecrawl devolvio success=false",
        charsExtracted: 0,
      };
    }

    const rawContent = data.data?.markdown || data.markdown || "";
    const metadata = data.data?.metadata || data.metadata || {};
    const clipped = clipContent(rawContent, maxChars);

    return {
      url: normalized,
      ok: true,
      content: clipped,
      metadata,
      charsExtracted: clipped.length,
    };
  } catch (err: any) {
    const label = err?.name === "AbortError" ? `TIMEOUT ${timeoutMs}ms` : (err?.message || "Error desconocido");
    return { url: normalized, ok: false, content: "", error: label, charsExtracted: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// Scrapea multiples URLs con concurrencia controlada. Devuelve TODOS los resultados (ok y errores).
export async function batchScrape(
  urls: string[],
  apiKey: string,
  options: BatchScrapeOptions = {},
): Promise<ScrapeResult[]> {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 8));
  const dedupedValid = Array.from(new Set(urls.map(normalizeUrl).filter(isValidHttpUrl)));

  if (dedupedValid.length === 0) return [];

  console.log(`[firecrawl] batchScrape: ${dedupedValid.length} URLs, concurrency=${concurrency}`);

  const results: ScrapeResult[] = [];
  const queue = [...dedupedValid];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      const r = await scrapeUrl(next, apiKey, options);
      results.push(r);
      console.log(
        `[firecrawl] ${r.ok ? "OK" : "FAIL"} ${r.url} - ${r.ok ? `${r.charsExtracted} chars` : r.error}`,
      );
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, dedupedValid.length) }, () => worker());
  await Promise.all(workers);

  const okCount = results.filter(r => r.ok).length;
  console.log(`[firecrawl] batchScrape done: ${okCount}/${dedupedValid.length} OK`);

  return results;
}

// Helper: convierte un array de ScrapeResult exitosos en un bloque de texto listo para inyectar al LLM.
export function formatScrapeContextForLLM(results: ScrapeResult[], header: string = "Datos scrapeados de competidores"): string {
  const successful = results.filter(r => r.ok && r.content.trim().length > 100);
  if (successful.length === 0) return "";

  const blocks = successful.map((r, i) => {
    const title = r.metadata?.title || "Sin titulo";
    return `### Fuente ${i + 1}: ${title}\nURL: ${r.url}\n\n${r.content}`;
  });

  return `\n\n---\n## ${header} (Firecrawl, ${successful.length} fuentes)\n\n${blocks.join("\n\n---\n\n")}\n---\n`;
}

// Helper: extrae URLs candidatas de un bloque de texto (busca URLs absolutas).
export function extractUrlsFromText(text: string, limit: number = 10): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s\)\]\>"']+/gi;
  const matches = text.match(urlRegex) || [];
  // Limpiar caracteres finales sucios y deduplicar
  const cleaned = matches
    .map(u => u.replace(/[.,;:!?\)\]\}]+$/, "").trim())
    .filter(u => isValidHttpUrl(u))
    // Excluir URLs irrelevantes
    .filter(u => !u.includes("perplexity.ai") && !u.includes("youtube.com/watch"));
  return Array.from(new Set(cleaned)).slice(0, limit);
}
