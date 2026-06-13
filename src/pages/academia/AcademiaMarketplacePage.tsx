// ============================================================================
// Marketplace público de academias. URL: /academia/explorar
// Filtros: categoría, idioma, plan (Hobby/Pro), precio máximo.
// Ranking automático por members + ratings.
// ============================================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Search, Users, Star, GraduationCap, Globe2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

function safeUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const p = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://kreoon.com');
    return (p.protocol === 'https:' || p.protocol === 'http:') ? p.toString() : undefined;
  } catch { return undefined; }
}

function safeColor(c?: string | null): string {
  if (c && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) return c;
  return '#7c3aed';
}

const CATEGORIES = [
  { v: '', l: 'Todas' },
  { v: 'business', l: 'Business' },
  { v: 'content_creation', l: 'Contenido' },
  { v: 'design', l: 'Diseño' },
  { v: 'marketing', l: 'Marketing' },
  { v: 'tech', l: 'Tech' },
  { v: 'fitness', l: 'Fitness' },
  { v: 'wellness', l: 'Bienestar' },
  { v: 'finance', l: 'Finanzas' },
  { v: 'education', l: 'Educación' },
  { v: 'other', l: 'Otro' },
];

const LANGUAGES = [
  { v: '', l: 'Todos' },
  { v: 'es', l: 'Español' },
  { v: 'en', l: 'English' },
  { v: 'pt', l: 'Português' },
];

const PRICE_RANGES = [
  { v: '', l: 'Cualquiera' },
  { v: '0', l: 'Gratis' },
  { v: '10', l: 'Hasta $10' },
  { v: '25', l: 'Hasta $25' },
  { v: '50', l: 'Hasta $50' },
  { v: '100', l: 'Hasta $100' },
];

export default function AcademiaMarketplacePage() {
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'marketplace', category, language, priceMax],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('list_public_academies', {
        p_category: category || null,
        p_language: language || null,
        p_plan_slug: null,
        p_price_max: priceMax ? Number(priceMax) : null,
        p_limit: 48,
        p_offset: 0,
      });
      if (error) throw error;
      return data;
    },
  });

  const items = (data?.items ?? []) as any[];
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      i.name?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link to="/" className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" /> KREOON
          </Link>
          <span className="text-zinc-500 text-sm ml-auto">Academia · Marketplace</span>
        </div>
      </header>

      <section className="px-4 md:px-8 py-12 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold">Explorar academias</h1>
        <p className="text-zinc-400 mt-3">
          Comunidades de creadores que aprenden, crean y crecen juntos.
        </p>
      </section>

      <section className="px-4 md:px-8 max-w-7xl mx-auto">
        {/* Filtros */}
        <Card className="p-4 bg-white/5 border-white/10 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o tema..."
                  className="bg-black/30 border-white/10 pl-8"
                />
              </div>
            </div>
            <Pills label="Categoría" value={category} onChange={setCategory} options={CATEGORIES} />
            <Pills label="Idioma" value={language} onChange={setLanguage} options={LANGUAGES} />
            <Pills label="Precio" value={priceMax} onChange={setPriceMax} options={PRICE_RANGES} />
          </div>
        </Card>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center text-zinc-500 py-12">Cargando academias...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            No encontramos academias con esos filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {filtered.map((a) => <AcademyCard key={a.id} academy={a} />)}
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-zinc-500">
        ¿Sos creador? <Link to="/academia/crear" className="text-violet-400 hover:text-violet-300">Crear tu academia →</Link>
      </footer>
    </div>
  );
}

function Pills({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-zinc-400 mb-1 block">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs border transition-colors',
              value === o.v
                ? 'bg-violet-500/20 border-violet-500/50 text-violet-100'
                : 'border-white/10 text-zinc-400 hover:text-zinc-100'
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function AcademyCard({ academy: a }: { academy: any }) {
  const accent = safeColor(a.accent_color);
  const safeCover = safeUrl(a.cover_image_url);
  const safeLogo = safeUrl(a.logo_url);
  const monthly = Number(a.monthly_price_usd ?? 0);
  const yearly = Number(a.yearly_price_usd ?? 0);
  const minPrice = (() => {
    const candidates = [monthly, yearly].filter((p) => p > 0);
    return candidates.length === 0 ? 0 : Math.min(...candidates);
  })();

  return (
    <Link to={`/a/${a.slug}`} className="block group">
      <Card className="bg-white/5 border-white/10 overflow-hidden h-full hover:border-violet-500/40 transition-colors">
        <div
          className="h-32 relative"
          style={{
            background: safeCover
              ? `linear-gradient(135deg, ${accent}40 0%, transparent 60%), url("${encodeURI(safeCover)}") center/cover`
              : `linear-gradient(135deg, ${accent}50, #0a0a0f)`,
          }}
        >
          {safeLogo && (
            <img src={safeLogo} alt={a.name}
              className="absolute bottom-2 left-3 h-10 w-10 rounded-lg border-2 border-[#0a0a0f] object-cover" />
          )}
          {a.plan_slug === 'pro' && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase">
              Pro
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-violet-300 transition-colors">
            {a.name}
          </h3>
          {a.description && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{a.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {Number(a.member_count ?? 0).toLocaleString()}
            </span>
            {a.avg_rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {Number(a.avg_rating).toFixed(1)}
              </span>
            )}
            {a.language_code && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> {String(a.language_code).toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: accent }}>
              {minPrice === 0 ? 'Gratis' : `Desde $${minPrice}`}
            </span>
            <span className="text-xs text-zinc-500">{a.category ?? ''}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
