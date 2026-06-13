// ============================================================================
// Landing pública de una academia. URL: /a/:spaceSlug
// SEO friendly: meta tags Open Graph, descripción, schema.org.
// No requiere login. Visible para anon. CTA → /academia/:slug (donde el
// SpaceJoinGate maneja el flujo de registro/pago).
// ============================================================================

import { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, Users, CheckCircle2, Play, Sparkles, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHTML } from '@/lib/sanitizeHTML';

// Bloquea javascript:, data:, vbscript: y schemas no-web. Devuelve undefined
// para URLs inseguras o malformadas, así no llegan al DOM (href/src).
function safeUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const p = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://kreoon.com');
    return (p.protocol === 'https:' || p.protocol === 'http:') ? p.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Solo permite #rgb, #rrggbb. Cualquier otra cosa (incluyendo intentos de
// breakout con ); o expression()) cae al default — no se interpola crudo.
function safeAccentColor(c?: string | null): string {
  if (c && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) return c;
  return '#7c3aed';
}

// URL ya sanitizada para uso dentro de un literal CSS url("..."). encodeURI
// preserva caracteres seguros pero escapa los que romperían el quoting.
function cssUrl(u?: string): string | undefined {
  if (!u) return undefined;
  return `url("${encodeURI(u)}")`;
}

export default function AcademiaPublicLandingPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get('ref');
  const couponCode = searchParams.get('coupon');

  const { data: landing, isLoading } = useQuery({
    queryKey: ['academy', 'public-landing', spaceSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_public_academy_landing', {
        p_slug: spaceSlug,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!spaceSlug,
  });

  // Tracking affiliate click vía edge function (valida origen + hashea IP)
  useEffect(() => {
    if (!affiliateCode || !landing?.id) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-track-click`;
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: affiliateCode, space_id: landing.id }),
    }).catch(() => {});
  }, [affiliateCode, landing?.id]);

  // SEO: actualizar document head dinámicamente
  useEffect(() => {
    if (!landing) return;
    document.title = `${landing.seo_title} | KREOON Academia`;
    setMeta('description', landing.seo_description ?? '');
    setMeta('og:title', landing.seo_title ?? landing.name, true);
    setMeta('og:description', landing.seo_description ?? '', true);
    setMeta('og:image', safeUrl(landing.og_image_url) ?? '', true);
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');
  }, [landing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando...
      </div>
    );
  }

  if (!landing || landing.error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3 px-6">
        <h1 className="text-2xl font-bold">Academia no disponible</h1>
        <p>Esta academia no existe o no es pública.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300">
          Explorar academias →
        </Link>
      </div>
    );
  }

  const ctaHref = (() => {
    const url = new URL(`/academia/${landing.slug}`, window.location.origin);
    if (affiliateCode) url.searchParams.set('ref', affiliateCode);
    if (couponCode) url.searchParams.set('coupon', couponCode);
    return url.pathname + url.search;
  })();

  const accent = safeAccentColor(landing.accent_color);
  const monthlyPrice = Number(landing.monthly_price_usd ?? 0);
  const yearlyPrice = Number(landing.yearly_price_usd ?? 0);
  const safeCoverUrl = safeUrl(landing.cover_image_url);
  const safeLogoUrl = safeUrl(landing.logo_url);
  const safeVideoUrl = safeUrl(landing.landing_video_url);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* HERO */}
      <section
        className="relative px-4 md:px-8 py-16 md:py-24 overflow-hidden"
        style={{
          background: safeCoverUrl
            ? `linear-gradient(135deg, ${accent}40 0%, transparent 60%), ${cssUrl(safeCoverUrl)} center/cover`
            : `linear-gradient(135deg, ${accent}50, #0a0a0f)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {safeLogoUrl && (
              <img src={safeLogoUrl} alt={landing.name}
                className="h-14 w-14 rounded-xl object-cover border-2 border-white/10" />
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white">{landing.name}</h1>
              <div className="text-sm text-zinc-300 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {landing.member_count.toLocaleString()} miembros
                </span>
                {landing.avg_rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {Number(landing.avg_rating).toFixed(1)} ({landing.rating_count})
                  </span>
                )}
              </div>
            </div>
          </div>

          {landing.landing_headline && (
            <h2 className="text-2xl md:text-4xl font-bold mt-6 max-w-3xl">
              {landing.landing_headline}
            </h2>
          )}
          {landing.landing_subheadline && (
            <p className="text-lg text-zinc-300 mt-3 max-w-2xl">
              {landing.landing_subheadline}
            </p>
          )}

          <div className="flex gap-3 mt-8 flex-wrap">
            <Link to={ctaHref}>
              <Button
                size="lg"
                className="text-white font-bold rounded-2xl px-8 py-6 shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #a855f7)`,
                  boxShadow: `0 8px 24px -4px ${accent}80`,
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {monthlyPrice === 0 && yearlyPrice === 0
                  ? 'Unirme gratis'
                  : `Empezar desde $${Math.min(monthlyPrice || 9999, yearlyPrice || 9999).toFixed(0)}`}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            {safeVideoUrl && (
              <Button variant="outline" size="lg" asChild>
                <a href={safeVideoUrl} target="_blank" rel="noreferrer">
                  <Play className="h-4 w-4 mr-2" /> Ver video
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* DESCRIPCIÓN */}
      {landing.description && (
        <section className="px-4 md:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <div
              className="prose prose-invert prose-zinc max-w-none"
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(landing.description),
              }}
            />
          </div>
        </section>
      )}

      {/* CURSOS PREVIEW */}
      {landing.courses?.length > 0 && (
        <section className="px-4 md:px-8 py-12 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Cursos incluidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {landing.courses.map((c: any) => {
                const safeCourseImg = safeUrl(c.cover_image_url);
                return (
                <Card key={c.id} className="bg-white/5 border-white/10 overflow-hidden">
                  {safeCourseImg && (
                    <div className="h-32 bg-cover bg-center"
                         style={{ backgroundImage: cssUrl(safeCourseImg) }} />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-base">{c.title}</h3>
                    {c.description && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* INSTRUCTORES */}
      {Array.isArray(landing.landing_instructors) && landing.landing_instructors.length > 0 && (
        <section className="px-4 md:px-8 py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Quién enseña</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {landing.landing_instructors.map((i: any, idx: number) => {
                const safeAvatar = safeUrl(i.avatar_url);
                return (
                <Card key={idx} className="bg-white/5 border-white/10 p-4 text-center">
                  {safeAvatar && (
                    <img src={safeAvatar} alt={i.name}
                         className="h-20 w-20 rounded-full mx-auto object-cover mb-3" />
                  )}
                  <h3 className="font-semibold">{i.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{i.title}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {Array.isArray(landing.landing_testimonials) && landing.landing_testimonials.length > 0 && (
        <section className="px-4 md:px-8 py-12 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Lo que dicen los miembros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {landing.landing_testimonials.map((t: any, idx: number) => (
                <Card key={idx} className="bg-white/5 border-white/10 p-5">
                  <p className="text-sm text-zinc-200 italic">"{t.quote}"</p>
                  <div className="text-xs text-zinc-400 mt-3">— {t.author}</div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {Array.isArray(landing.landing_faqs) && landing.landing_faqs.length > 0 && (
        <section className="px-4 md:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Preguntas frecuentes</h2>
            <div className="space-y-3">
              {landing.landing_faqs.map((f: any, idx: number) => (
                <Card key={idx} className="bg-white/5 border-white/10 p-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-400" /> {f.question}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 pl-6">{f.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="px-4 md:px-8 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">¿Te unís?</h2>
          <p className="text-zinc-300 mt-3">Comunidad activa, contenido nuevo cada semana.</p>
          <Link to={ctaHref}>
            <Button
              size="lg"
              className="mt-6 text-white font-bold rounded-2xl px-10 py-6 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${accent}, #a855f7)`,
                boxShadow: `0 8px 24px -4px ${accent}80`,
              }}
            >
              Empezar ahora <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-zinc-500">
        <Link to="/academia" className="hover:text-zinc-300 flex items-center justify-center gap-1.5">
          <Globe2 className="h-3 w-3" /> Explorar más academias en KREOON
        </Link>
      </footer>
    </div>
  );
}

function setMeta(name: string, content: string, isProperty = false) {
  if (!content) return;
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
