import { useState, useEffect } from 'react';

const CACHE_KEY = 'kreoon_geo_country';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { code, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return code as string;
  } catch {}
  return null;
}

export function useGeoCountry() {
  const [country, setCountry] = useState<string | null>(readCache);
  const [loading, setLoading] = useState(() => readCache() === null);

  useEffect(() => {
    if (country !== null) return;
    fetch('https://api.country.is/')
      .then(r => r.json())
      .then(d => {
        const code: string = d.country ?? null;
        setCountry(code);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ code, ts: Date.now() })); } catch {}
      })
      .catch(() => setCountry(null))
      .finally(() => setLoading(false));
  }, [country]);

  return { country, isColombia: country === 'CO', loading };
}
