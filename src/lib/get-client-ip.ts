/**
 * Obtiene la IP del cliente usando múltiples servicios de fallback
 */
export async function getClientIP(): Promise<string | null> {
  const services = [
    // Cloudflare trace (muy rápido y confiable)
    async () => {
      const res = await fetch('https://1.1.1.1/cdn-cgi/trace');
      const text = await res.text();
      const match = text.match(/ip=([^\n]+)/);
      return match?.[1] || null;
    },
    // ipify (popular y confiable)
    async () => {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || null;
    },
    // ipapi (backup)
    async () => {
      const res = await fetch('https://ipapi.co/ip/');
      return await res.text();
    },
  ];

  for (const getIP of services) {
    try {
      const ip = await getIP();
      if (ip && ip.length > 0 && ip.length < 50) {
        return ip.trim();
      }
    } catch {
      // Intentar siguiente servicio
      continue;
    }
  }

  return null;
}

/**
 * Cache de la IP para evitar múltiples llamadas
 */
let cachedIP: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getCachedClientIP(): Promise<string | null> {
  const now = Date.now();

  if (cachedIP && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedIP;
  }

  cachedIP = await getClientIP();
  cacheTimestamp = now;

  return cachedIP;
}
