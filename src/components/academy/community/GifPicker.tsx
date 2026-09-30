// ============================================================================
// GifPicker — buscador de GIFs con Giphy API.
// Requiere VITE_GIPHY_API_KEY (free tier en https://developers.giphy.com).
// Si no hay key, muestra link con instrucciones.
// ============================================================================

import { useEffect, useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

const GIPHY_KEY = (import.meta as any).env?.VITE_GIPHY_API_KEY as string | undefined;
const GIPHY_API = 'https://api.giphy.com/v1/gifs';

interface GiphyResult {
  id: string;
  url: string;
  title: string;
  images: {
    fixed_height_small: { url: string; width: string; height: string };
    original: { url: string };
  };
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar trending al abrir
  useEffect(() => {
    if (!GIPHY_KEY) return;
    void fetchGifs('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    if (!GIPHY_KEY) return;
    const t = setTimeout(() => {
      void fetchGifs(query);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function fetchGifs(q: string) {
    setLoading(true);
    setError(null);
    try {
      const url = q.trim()
        ? `${GIPHY_API}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=es`
        : `${GIPHY_API}/trending?api_key=${GIPHY_KEY}&limit=24&rating=pg-13`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Giphy error ${res.status}`);
      const data = await res.json();
      setResults(data.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los GIFs');
    } finally {
      setLoading(false);
    }
  }

  if (!GIPHY_KEY) {
    return (
      <div className="absolute z-50 mt-2 w-80 rounded-xl border border-border bg-background p-4 shadow-2xl">
        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-medium">GIF picker no configurado</p>
            <p className="text-muted-foreground mt-1">
              Conseguí una API key gratis en{' '}
              <a
                href="https://developers.giphy.com/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 underline"
              >
                developers.giphy.com
              </a>{' '}
              y agregala como <code className="bg-muted px-1 rounded">VITE_GIPHY_API_KEY</code> en Vercel env vars.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="absolute z-50 mt-2 w-80 rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar GIFs..."
            autoFocus
            className="bg-muted border-border text-sm pl-8 h-8"
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto p-2">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
          </div>
        ) : error ? (
          <div className="text-xs text-rose-700 dark:text-rose-300 p-3 text-center">{error}</div>
        ) : results.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3 text-center">Sin resultados</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onSelect(g.images.original.url);
                  onClose();
                }}
                className="group relative aspect-square bg-muted rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                title={g.title}
              >
                <img
                  src={g.images.fixed_height_small.url}
                  alt={g.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Powered by GIPHY</span>
        <button onClick={onClose} className="hover:text-foreground">Cerrar</button>
      </div>
    </div>
  );
}
