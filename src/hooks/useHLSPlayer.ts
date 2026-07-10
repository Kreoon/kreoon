import { useEffect, useRef, useCallback, useState } from 'react';
import type Hls from 'hls.js';

interface UseHLSPlayerOptions {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  // New performance options
  fastStart?: boolean;          // Enable aggressive fast start
  preloadNext?: boolean;        // Preload hint for next video
  connectionAware?: boolean;    // Adapt quality to network
  // Fase 3.7 — feed nivel TikTok
  /** Clave para el mapa de resume-position (normalmente el post_id). Sin esto, no se guarda/restaura posicion. */
  resumeKey?: string;
  /** Se llama cuando el autoplay con audio es bloqueado por el browser y el player tuvo que forzar mute — para que el caller sincronice el mute GLOBAL persistido (si no, queda desincronizado del estado real). */
  onForcedMute?: () => void;
}

interface BunnyVideoUrls {
  hls: string;
  mp4: string;
  thumbnail: string;
  // Multiple quality MP4s for progressive loading
  mp4_360p: string;
  mp4_480p: string;
  mp4_720p: string;
  mp4_1080p: string;
  mp4_1440p: string;
  mp4_2160p: string;
}

// Network quality detection
type NetworkQuality = 'slow' | 'medium' | 'fast' | 'unknown';

// Cache for preloaded HLS instances
const preloadCache = new Map<string, Hls>();
const MAX_PRELOAD_CACHE = 3;

// ── Fase 3.7: mapa de resume-position (post_id -> posicion) ────────────────
// Modulo-level (NO localStorage a proposito): sobrevive mount/unmount de SocialFeedCard
// dentro de la MISMA sesion de la app (navegar a perfil y volver al feed restaura),
// pero se pierde en reload/pestaña nueva — evita reanudar videos de hace dias.
interface ResumeEntry { time: number; savedAt: number }
const resumePositions = new Map<string, ResumeEntry>();
const MAX_RESUME_ENTRIES = 200;
const RESUME_TTL_MS = 2 * 60 * 60 * 1000; // 2h — safety extra dentro de la misma sesion larga

export function saveResumePosition(key: string | undefined, time: number): void {
  if (!key || !Number.isFinite(time) || time < 1) return;
  if (resumePositions.size >= MAX_RESUME_ENTRIES && !resumePositions.has(key)) {
    const oldest = resumePositions.keys().next().value;
    if (oldest) resumePositions.delete(oldest);
  }
  resumePositions.set(key, { time, savedAt: Date.now() });
}

export function getResumePosition(key: string | undefined): number | null {
  if (!key) return null;
  const entry = resumePositions.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > RESUME_TTL_MS) {
    resumePositions.delete(key);
    return null;
  }
  return entry.time;
}

export function clearResumePosition(key: string | undefined): void {
  if (key) resumePositions.delete(key);
}

// ── Fase 3.7: precarga condicional por red (2g/slow-2g/saveData -> no precargar) ──
function getPreloadPolicy(): { allowed: boolean; bufferSeconds: number } {
  try {
    if (typeof navigator === 'undefined') return { allowed: true, bufferSeconds: 0 };
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;
    // Sin Network Information API (Safari/iOS): progressive enhancement, preload conservador
    if (!connection) return { allowed: true, bufferSeconds: 4 };
    if (connection.saveData) return { allowed: false, bufferSeconds: 0 };
    const effectiveType = connection.effectiveType;
    if (effectiveType === '2g' || effectiveType === 'slow-2g') return { allowed: false, bufferSeconds: 0 };
    if (effectiveType === '3g') return { allowed: true, bufferSeconds: 4 };
    return { allowed: true, bufferSeconds: 8 }; // 4g o desconocido-rapido
  } catch {
    return { allowed: true, bufferSeconds: 4 };
  }
}

// Lazy-loaded HLS module reference
let HlsModule: typeof import('hls.js').default | null = null;
let hlsLoadPromise: Promise<typeof import('hls.js').default> | null = null;

/**
 * Dynamically load HLS.js only when needed (saves 522KB from initial bundle)
 */
async function loadHls(): Promise<typeof import('hls.js').default> {
  if (HlsModule) return HlsModule;
  if (hlsLoadPromise) return hlsLoadPromise;

  hlsLoadPromise = import('hls.js').then(mod => {
    HlsModule = mod.default;
    return HlsModule;
  });

  return hlsLoadPromise;
}

/**
 * Check if HLS.js is supported (without loading the full module)
 */
function isHlsSupported(): boolean {
  // Basic check without loading HLS.js - works for most browsers
  const mediaSource = window.MediaSource || (window as any).WebKitMediaSource;
  return !!mediaSource && typeof mediaSource.isTypeSupported === 'function' &&
         mediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
}

/**
 * Detect network quality based on connection API and bandwidth estimates
 */
function detectNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

  if (!connection) return 'unknown';

  // Check effective type (4g, 3g, 2g, slow-2g)
  const effectiveType = connection.effectiveType;
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';

  // Fallback to downlink speed (Mbps)
  const downlink = connection.downlink;
  if (downlink >= 5) return 'fast';
  if (downlink >= 1) return 'medium';
  if (downlink > 0) return 'slow';

  return 'unknown';
}

/**
 * Fase 3.7 (decision cerrada): startLevel hibrido.
 * - Movil (viewport <768) + conexion celular/desconocida -> startLevel -1 (ABR arranca bajo,
 *   pinta YA, escala solo) — prioridad velocidad de arranque estilo TikTok.
 * - Desktop o WiFi/ethernet confirmado -> se mantiene el piso min-720p existente.
 * navigator.connection.type solo existe en Chrome Android/ChromeOS; sin señal de wifi,
 * movil se trata como celular. iOS Safari usa HLS nativo (no hls.js) — esto no le aplica.
 */
function shouldUseLowStartLevel(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const isMobileViewport = window.innerWidth < 768;
    if (!isMobileViewport) return false;
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;
    if (connection?.type === 'wifi' || connection?.type === 'ethernet') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get optimal HLS config based on network quality
 */
function getOptimalHlsConfig(networkQuality: NetworkQuality, fastStart: boolean): Record<string, any> {
  const config = buildHlsConfig(networkQuality, fastStart);
  // Override hibrido: movil+celular arranca en auto/bajo (ABR escala); desktop/wifi conserva
  // el piso 720p que setea buildHlsConfig. Un solo punto de override, no tocar cada branch.
  if (shouldUseLowStartLevel()) {
    config.startLevel = -1;
  }
  return config;
}

function buildHlsConfig(networkQuality: NetworkQuality, fastStart: boolean): Record<string, any> {
  const baseConfig = {
    enableWorker: true,
    lowLatencyMode: false,
    // Fase 3.7 Paso 5: no cambia el piso de calidad (POLICY min-720p abajo se mantiene
    // intacta a proposito — bajar startLevel a 0/-1 como pedia el spec original
    // contradice esa politica de producto ya deliberada; ver reporte). Estas 3 SI son
    // adiciones seguras que no bajan el startLevel:
    capLevelToPlayerSize: true,  // no decodificar 1080p en una pantalla de 390px
    capLevelOnFPSDrop: true,     // baja calidad sola si el dispositivo no da abasto
    backBufferLength: 10,        // libera memoria del buffer YA reproducido (no toca el buffer hacia adelante)
  };

  if (fastStart) {
    // Fast start with min 720p policy.
    // Buffers cortos (feed de swipe, no cine): 15s adelante bastan — el usuario abandona la
    // mayoria de videos antes; 30s+ era datos moviles tirados y ABR lento para reaccionar.
    return {
      ...baseConfig,
      maxBufferLength: 15,
      maxMaxBufferLength: 30,
      maxBufferSize: 30 * 1000000,   // 30MB
      maxBufferHole: 0.5,
      startLevel: 2,                  // Min 720p always
      autoLevelCapping: -1,           // No cap - seek max quality
      abrEwmaDefaultEstimate: networkQuality === 'fast' ? 5000000 : 2000000,
      abrEwmaFastVoD: 2,              // media movil corta: ABR reacciona a los primeros fragments
      abrBandWidthFactor: 0.9,
      abrBandWidthUpFactor: 0.7,
      fragLoadingTimeOut: 10000,
      fragLoadingMaxRetry: 2,
      startFragPrefetch: true,
      testBandwidth: false,
    };
  }

  // Quality-based configs
  // POLICY: Minimum 720p (startLevel: 2), always seek max quality
  // Quality levels: 0=360p, 1=480p, 2=720p, 3=1080p, 4=1440p, 5=2160p
  switch (networkQuality) {
    case 'slow':
      return {
        ...baseConfig,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: 2,              // Min 720p even on slow connection
        abrEwmaDefaultEstimate: 500000,
        autoLevelCapping: -1,       // No cap - allow upgrade to max
      };
    case 'medium':
      return {
        ...baseConfig,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        startLevel: 2,              // Min 720p
        abrEwmaDefaultEstimate: 2000000,
        autoLevelCapping: -1,
      };
    case 'fast':
    default:
      return {
        ...baseConfig,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        startLevel: 3,              // Start at 1080p on fast connection
        abrEwmaDefaultEstimate: 5000000,
        autoLevelCapping: -1,
      };
  }
}

/**
 * Extract video ID and library ID from various Bunny.net URL formats
 */
export function extractBunnyIds(url: string): { libraryId: string; videoId: string } | null {
  if (!url) return null;

  // Format: iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return { libraryId: embedMatch[1], videoId: embedMatch[2] };
  }

  // Format: https://vz-{hash}.b-cdn.net/{videoId}/... (playlist.m3u8, mp4, thumbnail, etc.)
  const cdnMatch = url.match(/https?:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)(?:\/|$)/i);
  if (cdnMatch) {
    return { libraryId: cdnMatch[1].replace(/^vz-/, '').replace(/\.b-cdn\.net$/, ''), videoId: cdnMatch[2] };
  }

  // Format: {libraryId}.mediadelivery.net/{videoId}
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    return { libraryId: directMatch[1], videoId: directMatch[2] };
  }

  // Format: cdn.kreoon.com/{videoId}/... (dominio personalizado de Kreoon)
  const kreoonCdnMatch = url.match(/cdn\.kreoon\.com\/([a-f0-9-]+)(?:\/|$)/i);
  if (kreoonCdnMatch) {
    return { libraryId: 'kreoon', videoId: kreoonCdnMatch[1] };
  }

  return null;
}

/**
 * Get a Bunny CDN thumbnail URL from any Bunny video URL.
 * Returns null for non-Bunny URLs.
 * @param url - URL del video de Bunny
 * @param _options - Opciones ignoradas (Bunny CDN ya optimiza sus thumbnails)
 */
export function getBunnyThumbnailUrl(
  url: string,
  _options?: { width?: number; height?: number; quality?: number }
): string | null {
  const ids = extractBunnyIds(url);
  if (!ids) return null;

  // Usar el host de Bunny Stream directamente para thumbnails
  // El dominio personalizado cdn.kreoon.com no sirve thumbnails
  // Bunny CDN ya tiene buena compresión, no necesita proxy adicional
  const BUNNY_STREAM_HOST = 'vz-78fcd769-050.b-cdn.net';
  return `https://${BUNNY_STREAM_HOST}/${ids.videoId}/thumbnail.jpg`;
}

/**
 * Generate Bunny.net HLS, MP4 and thumbnail URLs from any Bunny URL format
 * Now includes multiple quality MP4s for progressive loading
 */
export function getBunnyVideoUrls(url: string): BunnyVideoUrls | null {
  if (!url) return null;

  // Host para streaming (HLS/MP4) y thumbnails
  const BUNNY_STREAM_HOST = 'vz-78fcd769-050.b-cdn.net';
  const BUNNY_CDN_HOST = BUNNY_STREAM_HOST; // Alias para compatibilidad
  // Thumbnails deben usar el mismo host de streaming (cdn.kreoon.com no sirve thumbnails)
  const BUNNY_THUMB_HOST = BUNNY_STREAM_HOST;

  // Helper to build all quality URLs for a given host and videoId
  const buildUrls = (streamHost: string, videoId: string): BunnyVideoUrls => ({
    hls: `https://${streamHost}/${videoId}/playlist.m3u8`,
    mp4: `https://${streamHost}/${videoId}/play_1080p.mp4`,
    mp4_360p: `https://${streamHost}/${videoId}/play_360p.mp4`,
    mp4_480p: `https://${streamHost}/${videoId}/play_480p.mp4`,
    mp4_720p: `https://${streamHost}/${videoId}/play_720p.mp4`,
    mp4_1080p: `https://${streamHost}/${videoId}/play_1080p.mp4`,
    mp4_1440p: `https://${streamHost}/${videoId}/play_1440p.mp4`,
    mp4_2160p: `https://${streamHost}/${videoId}/play_2160p.mp4`,
    thumbnail: `https://${BUNNY_THUMB_HOST}/${videoId}/thumbnail.jpg`,
  });

  // 1) CDN URL
  const cdnMatch = url.match(/https?:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)(?:\/|$)/i);
  if (cdnMatch) {
    return buildUrls(cdnMatch[1], cdnMatch[2]);
  }

  // 2) Iframe embed/play URL
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return buildUrls(BUNNY_CDN_HOST, embedMatch[2]);
  }

  // 3) Direct mediadelivery.net URL
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    return buildUrls(BUNNY_CDN_HOST, directMatch[2]);
  }

  return null;
}

/**
 * Async: probe Bunny CDN from highest to lowest quality and return the best available MP4 URL.
 * Falls back to 720p (guaranteed) if no higher quality exists.
 */
export async function findBestBunnyMp4(url: string): Promise<string> {
  const urls = getBunnyVideoUrls(url);
  if (!urls) return url;

  const qualities: Array<keyof BunnyVideoUrls> = [
    'mp4_2160p', 'mp4_1440p', 'mp4_1080p', 'mp4_720p',
  ];

  for (const q of qualities) {
    const candidate = urls[q];
    try {
      const res = await fetch(candidate, { method: 'HEAD' });
      if (res.ok) return candidate;
    } catch {
      // probe failed, try next
    }
  }

  // 720p is always available as absolute fallback
  return urls.mp4_720p;
}

/**
 * Return multiple candidate CDN URLs for the same Bunny video.
 */
export function getBunnyVideoUrlCandidates(url: string): BunnyVideoUrls[] {
  if (!url) return [];

  const direct = getBunnyVideoUrls(url);
  const ids = extractBunnyIds(url);

  if (!ids) return direct ? [direct] : [];

  const { libraryId, videoId } = ids;

  const candidateHosts = [
    'vz-78fcd769-050.b-cdn.net',
    `vz-${libraryId}.b-cdn.net`,
  ];

  const uniqueHosts = Array.from(new Set(candidateHosts));
  // Thumbnails deben usar el mismo host de streaming
  const BUNNY_THUMB_HOST = 'vz-78fcd769-050.b-cdn.net';

  return uniqueHosts.map((host) => ({
    hls: `https://${host}/${videoId}/playlist.m3u8`,
    mp4: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_360p: `https://${host}/${videoId}/play_360p.mp4`,
    mp4_480p: `https://${host}/${videoId}/play_480p.mp4`,
    mp4_720p: `https://${host}/${videoId}/play_720p.mp4`,
    mp4_1080p: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_1440p: `https://${host}/${videoId}/play_1440p.mp4`,
    mp4_2160p: `https://${host}/${videoId}/play_2160p.mp4`,
    thumbnail: `https://${BUNNY_THUMB_HOST}/${videoId}/thumbnail.jpg`,
  }));
}

/**
 * Preload an HLS video in the background (for next video in feed)
 * Now loads HLS.js dynamically
 */
// Fase 3.7: preload de manifest para iOS Safari (HLS nativo, sin MSE — hls.js no aplica).
// <link rel="preload" as="fetch"> calienta el manifest en el HTTP cache / SW cache; los
// segmentos los precarga el propio SW cuando el player los pida. Cap chico, FIFO.
const nativePreloadLinks = new Map<string, HTMLLinkElement>();
const MAX_NATIVE_PRELOAD_LINKS = 4;

function preloadManifestNative(hlsUrl: string): void {
  try {
    if (typeof document === 'undefined' || nativePreloadLinks.has(hlsUrl)) return;
    if (nativePreloadLinks.size >= MAX_NATIVE_PRELOAD_LINKS) {
      const oldest = nativePreloadLinks.keys().next().value;
      if (oldest) {
        nativePreloadLinks.get(oldest)?.remove();
        nativePreloadLinks.delete(oldest);
      }
    }
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    link.href = hlsUrl;
    document.head.appendChild(link);
    nativePreloadLinks.set(hlsUrl, link);
  } catch {
    // preload es best-effort, nunca romper por esto
  }
}

// Fase 3.7b: prefetch real de los primeros segmentos para iOS nativo. Los fetch() pasan por
// el Service Worker -> manifest queda en bunny-hls-manifest-v1 y segmentos en
// bunny-hls-segments-v1 (CacheFirst) -> el player nativo de Safari los encuentra en cache
// al reproducir. Best-effort: cualquier fallo (CORS, red, parse) se traga en silencio.
const nativePrefetchedUrls = new Set<string>();

async function prefetchFirstSegmentsNative(hlsUrl: string, maxSegments: number): Promise<void> {
  if (nativePrefetchedUrls.has(hlsUrl)) return;
  nativePrefetchedUrls.add(hlsUrl);
  try {
    const masterRes = await fetch(hlsUrl, { credentials: 'omit' });
    if (!masterRes.ok) return;
    const master = await masterRes.text();

    // Master playlist -> primera variante (Bunny lista de menor a mayor calidad); si ya es
    // media playlist (sin STREAM-INF), usar directamente.
    let mediaUrl = hlsUrl;
    let mediaText = master;
    if (master.includes('#EXT-X-STREAM-INF')) {
      const lines = master.split('\n');
      const infIdx = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
      const variant = lines.slice(infIdx + 1).find((l) => l.trim() && !l.startsWith('#'))?.trim();
      if (!variant) return;
      const base = hlsUrl.slice(0, hlsUrl.lastIndexOf('/') + 1);
      mediaUrl = variant.startsWith('http') ? variant : base + variant;
      const mediaRes = await fetch(mediaUrl, { credentials: 'omit' });
      if (!mediaRes.ok) return;
      mediaText = await mediaRes.text();
    }

    const mediaBase = mediaUrl.slice(0, mediaUrl.lastIndexOf('/') + 1);
    const segments = mediaText
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .slice(0, maxSegments);
    await Promise.all(
      segments.map((s) => {
        const segUrl = s.trim().startsWith('http') ? s.trim() : mediaBase + s.trim();
        return fetch(segUrl, { credentials: 'omit' }).catch(() => {});
      })
    );
  } catch {
    // best-effort
  }
}

// Fase 3.7b: precalentar el thumbnail del siguiente slide — poster instantaneo al swipe
// (el <img> del poster overlay sale del HTTP cache, cero flash negro). Dedupe simple.
const preloadedThumbnails = new Set<string>();

export function preloadThumbnail(thumbUrl: string | null | undefined): void {
  if (!thumbUrl || preloadedThumbnails.has(thumbUrl)) return;
  preloadedThumbnails.add(thumbUrl);
  try {
    const img = new Image();
    img.src = thumbUrl;
  } catch {
    // best-effort
  }
}

export async function preloadHLSVideo(url: string): Promise<void> {
  // Fase 3.7: en 2g/slow-2g/saveData no se precarga nada (ni manifest) — no gastar datos del usuario.
  const { allowed, bufferSeconds } = getPreloadPolicy();
  if (!allowed) return;

  const urls = getBunnyVideoUrls(url);
  if (!urls?.hls) return;

  // iOS Safari (HLS nativo, sin MSE): hls.js no puede precargar — calentar manifest +
  // primeros segmentos via SW cache (1-2 segun red).
  if (!isHlsSupported()) {
    preloadManifestNative(urls.hls);
    prefetchFirstSegmentsNative(urls.hls, bufferSeconds >= 8 ? 2 : 1);
    return;
  }

  // Check if already cached
  if (preloadCache.has(urls.hls)) return;

  try {
    const Hls = await loadHls();
    if (!Hls.isSupported()) return;

    // Evict oldest if cache full
    if (preloadCache.size >= MAX_PRELOAD_CACHE) {
      const oldest = preloadCache.keys().next().value;
      if (oldest) {
        preloadCache.get(oldest)?.destroy();
        preloadCache.delete(oldest);
      }
    }

    // Fase 3.7: precarga real de los primeros segundos (no solo el manifest) cuando la red
    // lo permite — bufferSeconds sale de getPreloadPolicy() segun effectiveType/saveData.
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: bufferSeconds,
      maxMaxBufferLength: bufferSeconds,
    });

    hls.loadSource(urls.hls);
    preloadCache.set(urls.hls, hls);
  } catch (error) {
    console.warn('[HLS] Failed to preload:', error);
  }
}

/**
 * Clear preload cache for a specific URL or all
 */
export function clearPreloadCache(url?: string): void {
  if (url) {
    const urls = getBunnyVideoUrls(url);
    if (urls?.hls && preloadCache.has(urls.hls)) {
      preloadCache.get(urls.hls)?.destroy();
      preloadCache.delete(urls.hls);
    }
  } else {
    preloadCache.forEach(hls => hls.destroy());
    preloadCache.clear();
  }
}

/**
 * Custom hook for HLS video playback with Bunny.net
 * OPTIMIZED VERSION with dynamic HLS.js loading (saves 522KB from initial bundle)
 */
export function useHLSPlayer(
  videoUrl: string | null,
  options: UseHLSPlayerOptions = {}
) {
  const {
    autoPlay = true,
    muted = true,
    loop = true,
    poster,
    fastStart = true,          // Enable fast start by default
    connectionAware = true,    // Enable network-aware quality
    resumeKey,
    onForcedMute,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fatalErrorCountRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMuted, setCurrentMuted] = useState(muted);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('unknown');
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [loadedFromPreload, setLoadedFromPreload] = useState(false);
  const playbackStartedRef = useRef(false);
  // Refs para no meter callbacks del caller en deps de efectos pesados (re-crearian HLS)
  const onForcedMuteRef = useRef(onForcedMute);
  onForcedMuteRef.current = onForcedMute;
  const resumeKeyRef = useRef(resumeKey);
  resumeKeyRef.current = resumeKey;

  // Detect network quality on mount and when connection changes
  useEffect(() => {
    const updateQuality = () => setNetworkQuality(detectNetworkQuality());
    updateQuality();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, []);

  // Reset source attempts when URL changes
  useEffect(() => {
    setSourceIndex(0);
    playbackStartedRef.current = false;
    setLoadedFromPreload(false);
  }, [videoUrl]);

  // Get candidate HLS URLs
  const candidates = videoUrl ? getBunnyVideoUrlCandidates(videoUrl) : [];
  const selected = candidates[sourceIndex] || (videoUrl ? getBunnyVideoUrls(videoUrl) : null);

  const hlsUrl = selected?.hls || null;
  const mp4Url = selected?.mp4 || null;
  const thumbnailUrl = poster || selected?.thumbnail || null;

  // Check if it's a direct MP4 URL
  const isDirectMp4 = videoUrl && !getBunnyVideoUrls(videoUrl) && (videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?'));

  // Helper: Play video with muted fallback
  const playWithFallback = useCallback((video: HTMLVideoElement, mutedState: boolean) => {
    video.muted = mutedState;
    video.play().catch(() => {
      video.muted = true;
      setCurrentMuted(true);
      // Fase 3.7: si el autoplay con audio fue bloqueado, el mute GLOBAL persistido queda
      // desincronizado de la realidad (video real quedo muted aunque el usuario habia elegido
      // "sonido activado" en una sesion anterior) — avisar al caller para que sincronice/persista.
      onForcedMuteRef.current?.();
      video.play().catch(() => {
        console.warn('[HLS] Autoplay completely blocked');
      });
    });
  }, []);

  // Helper: Fallback to MP4
  const fallbackToMp4 = useCallback((video: HTMLVideoElement, mp4: string | null) => {
    if (mp4) {
      setError(null);
      setIsLoading(true);
      video.src = mp4;
      video.load();

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video, currentMuted);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
    } else {
      setError('Video playback error');
      setIsLoading(false);
    }
  }, [autoPlay, playWithFallback, currentMuted]);

  // Initialize HLS player with optimized config
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!hlsUrl && !isDirectMp4) return;

    // Handle direct MP4 files
    if (isDirectMp4 && videoUrl) {
      setIsLoading(true);
      setError(null);

      video.playsInline = true;
      video.loop = loop;
      video.preload = fastStart ? 'auto' : 'metadata';
      video.muted = currentMuted;
      video.src = videoUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video, currentMuted);
        }
      };

      const handleError = () => {
        setError('Error al cargar el video');
        setIsLoading(false);
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.addEventListener('error', handleError, { once: true });
      video.load();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }

    if (!hlsUrl) return;

    setIsLoading(true);
    setError(null);
    fatalErrorCountRef.current = 0;

    // Configure video element
    video.playsInline = true;
    video.loop = loop;
    video.preload = fastStart ? 'auto' : 'metadata';
    video.muted = currentMuted;

    // Check if browser natively supports HLS (Safari/iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video, currentMuted);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.load();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }

    // Use hls.js for other browsers - LOAD DYNAMICALLY
    if (!isHlsSupported()) {
      // Fallback to MP4 for browsers without HLS support
      fallbackToMp4(video, mp4Url);
      return;
    }

    // Load HLS.js dynamically and initialize
    let cancelled = false;

    const initHls = async () => {
      try {
        const Hls = await loadHls();

        if (cancelled) return;

        if (!Hls.isSupported()) {
          fallbackToMp4(video, mp4Url);
          return;
        }

        // Check for preloaded HLS instance
        let hls: Hls | null = preloadCache.get(hlsUrl) || null;
        setLoadedFromPreload(!!hls);
        if (hls) {
          preloadCache.delete(hlsUrl);
        }

        // Get optimized config based on network and fast start preference
        const hlsConfig = getOptimalHlsConfig(
          connectionAware ? networkQuality : 'unknown',
          fastStart
        );

        if (!hls) {
          hls = new Hls(hlsConfig as any);
          hls.loadSource(hlsUrl);
        } else {
          // Reconfigure preloaded instance
          Object.assign(hls.config, hlsConfig);
        }

        hlsRef.current = hls;
        hls.attachMedia(video);

        // Track quality level changes
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setIsLoading(false);

          // Log available qualities
          if (process.env.NODE_ENV === 'development') {
            console.log('[HLS] Available qualities:', data.levels.map(l => `${l.height}p`));
          }

          if (autoPlay) {
            playWithFallback(video, currentMuted);
          }
        });

        // Can play through - buffer enough for smooth playback
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (!playbackStartedRef.current && autoPlay && video.paused) {
            playbackStartedRef.current = true;
            playWithFallback(video, currentMuted);
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          console.warn('[HLS] Fatal error:', {
            type: data.type,
            details: data.details,
            reason: data.reason,
          });

          // Try alternate CDN host
          if (candidates.length > 0 && sourceIndex < candidates.length - 1) {
            setSourceIndex((prev) => prev + 1);
            return;
          }

          fatalErrorCountRef.current += 1;

          // Retry logic
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (fatalErrorCountRef.current <= 3) {
                hls!.startLoad();
                return;
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (fatalErrorCountRef.current <= 3) {
                hls!.recoverMediaError();
                return;
              }
              break;
            default:
              if (fatalErrorCountRef.current <= 2) {
                hls!.stopLoad();
                hls!.startLoad();
                return;
              }
              break;
          }

          // Fallback to MP4
          fallbackToMp4(video, mp4Url);
        });
      } catch (err) {
        console.error('[HLS] Failed to load hls.js:', err);
        fallbackToMp4(video, mp4Url);
      }
    };

    initHls();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // currentMuted NO va en las deps a proposito: es solo el valor inicial para el primer
    // autoplay/load. Togglear mute despues NO debe re-disparar este efecto entero (recarga
    // la fuente HLS/MP4 y reinicia el video) — el sync de mute en caliente ya lo maneja el
    // useEffect de mas abajo ([currentMuted]) escribiendo video.muted directo, sin reload.
  }, [hlsUrl, mp4Url, loop, isDirectMp4, videoUrl, autoPlay, networkQuality, fastStart, connectionAware, fallbackToMp4, playWithFallback, candidates.length, sourceIndex]);

  // React to autoPlay changes — SOLO debe reaccionar a autoPlay (o cambio de fuente), NUNCA
  // a currentMuted: antes currentMuted estaba en las deps y CADA toggle de audio volvia a
  // llamar video.play() aca (ademas del play() sincrono que ya dispara el tap/boton). Ese
  // play() async, disparado desde un efecto (no dentro del gesto de click), puede ser
  // rechazado en silencio por la politica de autoplay de iOS Safari -> video se queda negro
  // y no se recupera solo. El sync de mute en caliente lo maneja el efecto de mas abajo
  // ([currentMuted]), que solo escribe video.muted, nunca llama play().
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      playWithFallback(video, currentMuted);
    } else {
      // NO resetear currentTime aca — pausar (slide fuera de vista o tap manual via autoPlay
      // pasando a false) debe conservar la posicion, retomar donde quedo al reactivarse.
      video.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hlsUrl, playWithFallback]);

  // Clear error on successful playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clearOnPlay = () => setError(null);
    video.addEventListener('playing', clearOnPlay);
    video.addEventListener('canplay', clearOnPlay);
    return () => {
      video.removeEventListener('playing', clearOnPlay);
      video.removeEventListener('canplay', clearOnPlay);
    };
  }, [hlsUrl]);

  // Fase 3.7 Paso 2: pausa/reanuda en el punto exacto. Un solo listener 'loadedmetadata' cubre
  // los 3 codepaths (MP4 directo, HLS nativo Safari, hls.js) porque todos comparten el mismo
  // elemento <video> — no hay que duplicar el seek en cada rama de inicializacion.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const saved = getResumePosition(resumeKeyRef.current);
      if (saved != null && Number.isFinite(video.duration) && saved < video.duration - 1) {
        video.currentTime = saved;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [hlsUrl, videoUrl]);

  // Guarda posicion on pause (inmediato) y cada ~5s durante playback (throttled, NO en cada
  // 'timeupdate' que dispara ~4x/seg). Vive mientras el post este montado; para el resto de
  // la ventana/feed, useHLSPlayer se desmonta y el ultimo valor guardado queda en el Map modulo-level.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSaveAt = 0;
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSaveAt < 5000) return;
      lastSaveAt = now;
      saveResumePosition(resumeKeyRef.current, video.currentTime);
    };
    const handlePause = () => saveResumePosition(resumeKeyRef.current, video.currentTime);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
    };
  }, [hlsUrl, videoUrl]);

  // Sync muted state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = currentMuted;
    }
  }, [currentMuted]);

  useEffect(() => {
    setCurrentMuted(muted);
  }, [muted]);

  // Track play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [loop]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        video.muted = true;
        setCurrentMuted(true);
        video.play().catch(() => {});
      });
    }
  }, []);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // NO resetear currentTime a 0 aca — pausar (tap manual o slide fuera de vista) debe
    // conservar la posicion exacta; reanudar retoma desde ahi mismo, no reinicia el video.
    video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    setCurrentMuted(prev => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setCurrentMuted(muted);
  }, []);

  // Set quality level manually (for quality selector UI)
  const setQualityLevel = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  }, []);

  // Get available quality levels
  const getQualityLevels = useCallback(() => {
    if (!hlsRef.current) return [];
    return hlsRef.current.levels.map((level, index) => ({
      index,
      height: level.height,
      bitrate: level.bitrate,
      label: `${level.height}p`,
    }));
  }, []);

  return {
    videoRef,
    isPlaying,
    isLoading,
    error,
    isMuted: currentMuted,
    thumbnailUrl,
    play,
    pause,
    toggleMute,
    setMuted,
    // Fase 3.7: si el manifest/buffer ya venia precargado cuando este player arranco
    loadedFromPreload,
    // New optimization features
    networkQuality,
    currentQuality,
    setQualityLevel,
    getQualityLevels,
  };
}
