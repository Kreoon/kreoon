import { useState, useEffect, memo } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Loader2, ExternalLink, Play, Eye, Heart, Film, MapPin, Users, Calendar, Globe, Instagram, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { BunnyVideoPlayer } from '@/components/video/BunnyVideoPlayer';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

// ── Types ──

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  portfolio_title: string | null;
  portfolio_description: string | null;
  portfolio_cover: string | null;
  portfolio_color: string | null;
  primary_color: string | null;
  org_display_name: string | null;
  org_tagline: string | null;
  org_cover_url: string | null;
  org_specialties: string[] | null;
  org_type: string | null;
  org_website: string | null;
  org_instagram: string | null;
  org_tiktok: string | null;
  org_linkedin: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  org_year_founded: number | null;
  org_team_size_range: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  registration_banner_url: string | null;
}

interface OrgStats {
  total_videos_produced: number;
  total_clients: number;
  total_projects: number;
  total_creators: number;
}

interface PublicContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  bunny_embed_url: string | null;
  thumbnail_url: string | null;
  status: string;
  views_count: number;
  likes_count: number;
  approved_at: string;
  created_at: string;
  sphere_phase: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
}

// ── Constants ──

const PHASE_LABELS: Record<string, string> = {
  engage: 'Engage',
  solution: 'Solution',
  remarketing: 'Remarketing',
  fidelize: 'Fidelizar',
};

const PHASE_COLORS: Record<string, string> = {
  engage: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  solution: 'bg-green-500/15 text-green-400 border-green-500/20',
  remarketing: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  fidelize: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

const SPECIALTY_LABELS: Record<string, string> = {
  ugc: 'UGC', fitness: 'Fitness', moda: 'Moda', tech: 'Tech', belleza: 'Belleza',
  hogar: 'Hogar', mascotas: 'Mascotas', bebes: 'Bebés', salud: 'Salud',
  viajes: 'Viajes', finanzas: 'Finanzas', food: 'Food', educacion: 'Educación',
  gaming: 'Gaming', deportes: 'Deportes', musica: 'Música', arte: 'Arte',
};

// ── Helpers ──

function getVideoSrc(item: PublicContent): string | null {
  return item.video_url || item.bunny_embed_url || null;
}

function getThumbnail(item: PublicContent): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  const src = getVideoSrc(item);
  if (src) return getBunnyThumbnailUrl(src);
  return null;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function ensureUrl(url: string): string {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

// ── Video Card ──

const VideoCard = memo(function VideoCard({
  item,
  accentColor,
  onClick,
}: {
  item: PublicContent;
  accentColor: string;
  onClick: () => void;
}) {
  const thumb = getThumbnail(item);
  const initials = item.creator_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '';

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-card border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-all duration-300 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="relative aspect-[9/16] bg-neutral-900">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title || 'Video'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-white/10" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 rounded-full p-4" style={{ backgroundColor: `${accentColor}CC` }}>
            <Play className="h-6 w-6 text-black fill-black" />
          </div>
        </div>

        {/* Phase pill */}
        {item.sphere_phase && PHASE_LABELS[item.sphere_phase] && (
          <div className="absolute top-2.5 left-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${PHASE_COLORS[item.sphere_phase] || ''}`}>
              {PHASE_LABELS[item.sphere_phase]}
            </span>
          </div>
        )}

        {/* Bottom gradient + stats */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10">
          {item.creator_name && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Avatar className="h-5 w-5 ring-1 ring-white/20">
                <AvatarImage src={item.creator_avatar || ''} alt={item.creator_name} />
                <AvatarFallback className="text-[7px] bg-white/10 text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-white/80 truncate font-medium">{item.creator_name}</span>
            </div>
          )}
          <p className="text-xs text-white font-semibold line-clamp-2 leading-tight">
            {item.title || 'Sin titulo'}
          </p>
          <div className="flex items-center gap-2.5 mt-1.5 text-white/60 text-[10px]">
            {item.views_count > 0 && (
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatNumber(item.views_count)}</span>
            )}
            {item.likes_count > 0 && (
              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatNumber(item.likes_count)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Stat Card ──

function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: typeof Film }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <Icon className="h-4 w-4 text-white/40" />
        <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ── Main Page ──

export default function OrgContentShowcase() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [content, setContent] = useState<PublicContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PublicContent | null>(null);
  const [filterPhase, setFilterPhase] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);

      // Single RPC call that returns org + stats + content
      const { data, error } = await (supabase as any)
        .rpc('get_public_org_content_page', { org_slug: slug, max_items: 50 });

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrg(data.org as OrgInfo);
      setStats(data.stats as OrgStats);
      setContent((data.content || []) as PublicContent[]);
      setLoading(false);
    };

    fetchData();
  }, [slug]);

  // SEO
  useEffect(() => {
    if (org) {
      document.title = `${org.org_display_name || org.name} — Portafolio de Contenido`;
    }
    return () => { document.title = 'KREOON'; };
  }, [org]);

  const availablePhases = [...new Set(content.map((c) => c.sphere_phase).filter(Boolean))] as string[];
  const filteredContent = filterPhase ? content.filter((c) => c.sphere_phase === filterPhase) : content;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <Building2 className="h-16 w-16 mx-auto text-white/20" />
          <h1 className="text-xl font-semibold text-white">Portafolio no disponible</h1>
          <p className="text-white/50">Esta organizacion no tiene un portafolio de contenido publico.</p>
          <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/5" onClick={() => (window.location.href = '/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const accent = org.portfolio_color || org.primary_color || '#ffd500';
  const displayName = org.org_display_name || org.name;
  const tagline = org.org_tagline || org.portfolio_description || org.description || '';
  const coverUrl = org.registration_banner_url || org.org_cover_url || org.portfolio_cover;
  const specialties = org.org_specialties || [];
  const igHandle = org.instagram || org.org_instagram;
  const tkHandle = org.tiktok || org.org_tiktok;
  const liHandle = org.linkedin || org.org_linkedin;
  const webUrl = org.website || org.org_website;
  const location = [org.city, org.country].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* ═══ NAVBAR ═══ */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {org.logo_url ? (
            <img src={org.logo_url} alt={displayName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
              <Building2 className="h-4 w-4" style={{ color: accent }} />
            </div>
          )}
          <span className="text-sm font-bold truncate">{displayName}</span>
          <div className="flex-1" />
          {/* Social links in navbar */}
          <div className="hidden sm:flex items-center gap-1">
            {igHandle && (
              <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/80">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {tkHandle && (
              <a href={`https://tiktok.com/@${tkHandle}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/80">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.81.13v-3.5a6.37 6.37 0 00-.81-.05A6.34 6.34 0 003.15 15.4a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.22a8.16 8.16 0 004.76 1.52V7.3a4.85 4.85 0 01-1-.61z"/></svg>
              </a>
            )}
            {webUrl && (
              <a href={ensureUrl(webUrl)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/80">
                <Globe className="h-4 w-4" />
              </a>
            )}
          </div>
          <a href={`/org/${slug}`}>
            <Button size="sm" className="h-8 text-xs font-semibold text-black" style={{ backgroundColor: accent }}>
              Trabajemos juntos
            </Button>
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Cover image */}
        <div className="h-64 sm:h-80 md:h-[420px] relative">
          {coverUrl ? (
            <>
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/60 via-transparent to-[#0a0a0b]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/80 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}15 0%, #0a0a0b 60%)` }} />
          )}
        </div>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 inset-x-0 pb-8 pt-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-5">
              {/* Logo */}
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={displayName}
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border-2 shadow-2xl shrink-0"
                  style={{ borderColor: `${accent}40` }}
                />
              ) : (
                <div
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl shrink-0"
                  style={{ backgroundColor: `${accent}15`, borderColor: `${accent}40` }}
                >
                  <Building2 className="h-10 w-10" style={{ color: accent }} />
                </div>
              )}

              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none">
                  {displayName}
                </h1>
                {tagline && (
                  <p className="text-base md:text-lg text-white/60 mt-2 max-w-2xl line-clamp-2">{tagline}</p>
                )}
                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-white/40">
                  {location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {location}</span>
                  )}
                  {org.org_year_founded && (
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Desde {org.org_year_founded}</span>
                  )}
                  {org.org_team_size_range && (
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {org.org_team_size_range} personas</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      {stats && (
        <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-3 gap-6">
              <StatCard value={`+${formatNumber(stats.total_videos_produced)}`} label="Videos producidos" icon={Film} />
              <StatCard value={`+${stats.total_clients}`} label="Empresas" icon={Building2} />
              <StatCard value={`+${stats.total_creators}`} label="Creadores" icon={Users} />
            </div>
          </div>
        </section>
      )}

      {/* ═══ SPECIALTIES ═══ */}
      {specialties.length > 0 && (
        <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Star className="h-3.5 w-3.5 text-white/30 mr-1" />
              {specialties.map((s) => (
                <span
                  key={s}
                  className="text-xs font-medium px-2.5 py-1 rounded-full border border-white/[0.08] text-white/50 bg-white/[0.03]"
                >
                  {SPECIALTY_LABELS[s] || s}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PORTFOLIO TITLE ═══ */}
      {org.portfolio_title && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-white/90">{org.portfolio_title}</h2>
          {org.portfolio_description && org.portfolio_description !== tagline && (
            <p className="text-sm text-white/40 mt-1 max-w-2xl">{org.portfolio_description}</p>
          )}
        </section>
      )}

      {/* ═══ PHASE FILTERS ═══ */}
      {availablePhases.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterPhase(null)}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                !filterPhase
                  ? 'text-black border-transparent'
                  : 'bg-transparent text-white/50 border-white/[0.08] hover:border-white/20 hover:text-white/70'
              }`}
              style={!filterPhase ? { backgroundColor: accent } : undefined}
            >
              Todo ({content.length})
            </button>
            {availablePhases.map((phase) => {
              const count = content.filter((c) => c.sphere_phase === phase).length;
              const isActive = filterPhase === phase;
              return (
                <button
                  key={phase}
                  onClick={() => setFilterPhase(isActive ? null : phase)}
                  className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-black border-transparent'
                      : 'bg-transparent text-white/50 border-white/[0.08] hover:border-white/20 hover:text-white/70'
                  }`}
                  style={isActive ? { backgroundColor: accent } : undefined}
                >
                  {PHASE_LABELS[phase] || phase} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ CONTENT GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filteredContent.length === 0 ? (
          <div className="text-center py-24">
            <Film className="h-14 w-14 mx-auto text-white/10 mb-4" />
            <p className="text-white/40 text-lg">
              {filterPhase ? 'No hay contenido en esta fase.' : 'No hay contenido disponible.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredContent.map((item) => (
              <VideoCard key={item.id} item={item} accentColor={accent} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Crea contenido con nosotros</h2>
          <p className="text-white/50 mb-6 max-w-lg mx-auto">
            {tagline || `Conecta con ${displayName} para impulsar tu marca con contenido autentico y creativo.`}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href={`/org/${slug}`}>
              <Button size="lg" className="h-12 px-8 text-sm font-bold text-black" style={{ backgroundColor: accent }}>
                Trabajemos juntos
              </Button>
            </a>
            {igHandle && (
              <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-12 px-6 text-sm font-bold border-white/10 text-white/70 hover:bg-white/5">
                  <Instagram className="h-4 w-4 mr-2" />
                  @{igHandle}
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt="" className="h-6 w-6 rounded" />}
            <span className="text-xs text-white/30">{displayName} — Portafolio de contenido</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Social links */}
            <div className="flex items-center gap-2">
              {igHandle && (
                <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {tkHandle && (
                <a href={`https://tiktok.com/@${tkHandle}`} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.81.13v-3.5a6.37 6.37 0 00-.81-.05A6.34 6.34 0 003.15 15.4a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.22a8.16 8.16 0 004.76 1.52V7.3a4.85 4.85 0 01-1-.61z"/></svg>
                </a>
              )}
              {liHandle && (
                <a href={`https://linkedin.com/company/${liHandle}`} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}
            </div>
            <div className="h-4 w-px bg-white/10" />
            <a href="/" className="flex items-center gap-1.5 text-white/20 hover:text-white/40 transition-colors">
              <img src="/favicon.png" alt="KREOON" className="h-4 w-4 rounded opacity-40" />
              <span className="text-xs">Powered by KREOON</span>
            </a>
          </div>
        </div>
      </footer>

      {/* ═══ VIDEO LIGHTBOX ═══ */}
      {selectedItem && (
        <VideoLightbox item={selectedItem} accentColor={accent} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

// ── Video Lightbox ──

function VideoLightbox({ item, accentColor, onClose }: { item: PublicContent; accentColor: string; onClose: () => void }) {
  const videoSrc = getVideoSrc(item);
  const initials = item.creator_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-[#111113] border-white/[0.08] gap-0">
        <DialogTitle className="sr-only">{item.title || 'Video'}</DialogTitle>

        <div className="relative bg-black aspect-[9/16] max-h-[70vh]">
          {videoSrc ? (
            <BunnyVideoPlayer
              src={videoSrc}
              poster={getThumbnail(item) || undefined}
              autoPlay
              muted={false}
              loop
              showControls
              showMuteButton
              objectFit="contain"
              aspectRatio="auto"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Film className="h-10 w-10 text-white/20" /></div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-bold text-white line-clamp-2">{item.title || 'Sin titulo'}</h3>
          {item.description && <p className="text-sm text-white/50 line-clamp-3">{item.description}</p>}

          <div className="flex items-center justify-between">
            {item.creator_name && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.creator_avatar || ''} alt={item.creator_name} />
                  <AvatarFallback className="text-[9px] bg-white/10 text-white/60">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-white/60">{item.creator_name}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-white/40">
              {item.views_count > 0 && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatNumber(item.views_count)}</span>}
              {item.likes_count > 0 && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {formatNumber(item.likes_count)}</span>}
              {item.sphere_phase && PHASE_LABELS[item.sphere_phase] && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${PHASE_COLORS[item.sphere_phase] || ''}`}>
                  {PHASE_LABELS[item.sphere_phase]}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
