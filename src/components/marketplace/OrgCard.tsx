import { memo } from 'react';
import { Star, Users, Briefcase, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceOrg } from './types/marketplace';
import { ORG_TYPE_LABELS, ORG_TYPE_COLORS, TEAM_SIZE_LABELS } from './types/marketplace';
// Nova Design System - removed framer-motion for better performance

interface OrgCardProps {
  org: MarketplaceOrg;
  onClick?: () => void;
  className?: string;
}

function OrgCardComponent({ org, onClick, className }: OrgCardProps) {
  const typeColor = org.org_type ? ORG_TYPE_COLORS[org.org_type] : null;
  const typeLabel = org.org_type ? ORG_TYPE_LABELS[org.org_type] : null;
  const accentColor = org.portfolio_color || '#8B5CF6';

  return (
    <div
      className={cn(
        'group relative cursor-pointer overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] nova-animate-fade-up',
        className,
      )}
      onClick={onClick}
    >
      {/* Vertical media area - 9:16 */}
      <div className="relative aspect-[9/16] rounded-sm overflow-hidden bg-[var(--nova-bg-surface)] border border-[var(--nova-border-subtle)] group-hover:border-[var(--nova-border-accent)] transition-colors">
        {/* Cover image */}
        {org.org_cover_url ? (
          <img
            src={org.org_cover_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10, transparent)` }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Type badge */}
        {typeColor && typeLabel && (
          <div className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold z-10', typeColor.bg, typeColor.text)}>
            {typeLabel}
          </div>
        )}

        {/* Floating logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.org_display_name}
              loading="lazy"
              className="h-20 w-20 rounded-sm border-2 border-white/20 object-cover shadow-2xl bg-gray-900"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-sm border-2 border-white/20 flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: `${accentColor}30` }}
            >
              <Building2 className="h-10 w-10" style={{ color: accentColor }} />
            </div>
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-3 space-y-1.5">
          <h3 className="font-semibold text-white text-sm truncate drop-shadow-md">
            {org.org_display_name}
          </h3>

          {org.org_tagline && (
            <p className="text-white/70 text-xs line-clamp-2">{org.org_tagline}</p>
          )}

          {/* Specialties */}
          {org.org_specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {org.org_specialties.slice(0, 2).map(spec => (
                <span key={spec} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 capitalize">
                  {spec}
                </span>
              ))}
              {org.org_specialties.length > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
                  +{org.org_specialties.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-[var(--nova-accent-primary)] fill-[var(--nova-accent-primary)]" />
              <span className="text-white font-medium">{org.org_marketplace_rating_avg.toFixed(1)}</span>
            </div>
            {org.org_team_size_range && (
              <div className="flex items-center gap-1 text-white/60">
                <Users className="h-3 w-3" />
                <span>{TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}</span>
              </div>
            )}
            {org.org_marketplace_projects_count > 0 && (
              <div className="flex items-center gap-1 text-white/60">
                <Briefcase className="h-3 w-3" />
                <span>{org.org_marketplace_projects_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MarketplaceOrgCard = memo(OrgCardComponent);
