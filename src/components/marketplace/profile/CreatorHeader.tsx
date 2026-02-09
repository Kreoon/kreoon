import { useState } from 'react';
import { MapPin, Star, CheckCircle2, Share2, Heart, Circle, Gift, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketplaceRoleBadge } from '../roles/MarketplaceRoleBadge';
import type { CreatorFullProfile } from '../types/marketplace';

interface CreatorHeaderProps {
  creator: CreatorFullProfile;
  /** Whether the viewing brand has a paid plan (unlocks exchange) */
  hasPaidPlan?: boolean;
}

const LEVEL_STYLES: Record<string, string> = {
  elite: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
  gold: 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white',
  silver: 'bg-gray-500/30 text-gray-300 border border-gray-500/50',
  bronze: 'bg-amber-900/30 text-amber-400 border border-amber-700/50',
};

const LEVEL_LABELS: Record<string, string> = {
  elite: 'Élite',
  gold: 'Oro',
  silver: 'Plata',
  bronze: 'Bronce',
};

/** SVG platform icons — non-clickable, indicator only */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.83-4.47V8.76a8.26 8.26 0 004.75 1.5V6.8a4.83 4.83 0 01-1-.11z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
};

export function CreatorHeader({ creator, hasPaidPlan = false }: CreatorHeaderProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const initials = creator.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  const handleShare = (method: string) => {
    const url = window.location.href;
    if (method === 'copy') {
      navigator.clipboard.writeText(url);
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Mira este creador en Kreoon: ${url}`)}`);
    }
    setShowShareMenu(false);
  };

  // Collect active platform keys from social_links (boolean flags)
  const activePlatforms = Object.entries(creator.social_links || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div className="space-y-4 pb-8 border-b border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              className="w-16 h-16 rounded-full border-2 border-purple-500 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-purple-500 bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-xl flex-shrink-0">
              {initials}
            </div>
          )}

          <div className="space-y-1.5">
            {/* Name + verified + level */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{creator.display_name}</h1>
              {creator.is_verified && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                  LEVEL_STYLES[creator.level],
                )}
              >
                {LEVEL_LABELS[creator.level]}
              </span>
            </div>

            {/* Location */}
            {(creator.location_city || creator.location_country) && (
              <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>
                  {[creator.location_city, creator.location_country].filter(Boolean).join(', ')}
                  {creator.country_flag && ` ${creator.country_flag}`}
                </span>
              </div>
            )}

            {/* Categories */}
            {creator.categories.length > 0 && (
              <p className="text-gray-400 text-sm">
                {creator.categories.join(' · ')}
              </p>
            )}

            {/* Marketplace roles */}
            {creator.marketplace_roles && creator.marketplace_roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {creator.marketplace_roles.map(roleId => (
                  <MarketplaceRoleBadge key={roleId} roleId={roleId} size="sm" />
                ))}
              </div>
            )}

            {/* Rating + projects */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-purple-400 fill-purple-400" />
                <span className="text-white font-medium">{creator.rating_avg.toFixed(1)}</span>
                <span className="text-gray-500">({creator.rating_count} reseñas)</span>
              </div>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400">{creator.completed_projects} proyectos</span>
            </div>

            {/* Platform icons — non-clickable indicators */}
            {activePlatforms.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-gray-500 text-xs">Crea contenido para:</span>
                <div className="flex items-center gap-1.5">
                  {activePlatforms.map(platform => {
                    const Icon = PLATFORM_ICONS[platform];
                    return Icon ? (
                      <span
                        key={platform}
                        className="text-gray-400"
                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Availability + Exchange badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <Circle
                  className={cn(
                    'h-2.5 w-2.5 fill-current',
                    creator.is_available ? 'text-green-400' : 'text-red-400',
                  )}
                />
                <span className={creator.is_available ? 'text-green-400' : 'text-red-400'}>
                  {creator.is_available ? 'Disponible ahora' : 'No disponible'}
                </span>
              </div>

              {/* Exchange badge */}
              {creator.accepts_product_exchange && (
                <div className="relative group">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all',
                      hasPaidPlan
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-white/5 border-white/10 text-gray-400 opacity-70',
                    )}
                  >
                    <Gift className="h-3.5 w-3.5" />
                    <span>Acepta canje de producto</span>
                    {!hasPaidPlan && <Lock className="h-3 w-3 ml-0.5" />}
                  </div>

                  {/* Tooltip for non-paid users */}
                  {!hasPaidPlan && (
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50">
                      <div className="bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-300 w-56">
                        Actualiza tu plan para acceder al canje de producto y ahorrar en campañas.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 border border-white/20 rounded-lg px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl p-2 z-50 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5"
                >
                  Copiar enlace
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5"
                >
                  WhatsApp
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={cn(
              'flex items-center gap-2 border rounded-lg px-4 py-2 text-sm transition-colors',
              isSaved
                ? 'border-pink-500/50 text-pink-400 bg-pink-500/10'
                : 'border-white/20 text-white hover:bg-white/5',
            )}
          >
            <Heart className={cn('h-4 w-4', isSaved && 'fill-pink-400')} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
