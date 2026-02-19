import { memo } from 'react';
import { Star, Users, Briefcase, Clock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceOrg } from './types/marketplace';
import { ORG_TYPE_LABELS, ORG_TYPE_COLORS, TEAM_SIZE_LABELS, RESPONSE_TIME_LABELS } from './types/marketplace';

interface OrgCardProps {
  org: MarketplaceOrg;
  onClick?: () => void;
  className?: string;
}

function OrgCardComponent({ org, onClick, className }: OrgCardProps) {
  const typeColor = org.org_type ? ORG_TYPE_COLORS[org.org_type] : null;
  const typeLabel = org.org_type ? ORG_TYPE_LABELS[org.org_type] : null;
  const accentColor = org.portfolio_color || '#8B5CF6';

  const budgetLabel = org.org_min_budget && org.org_max_budget
    ? `$${(org.org_min_budget / 1000000).toFixed(1)}M - $${(org.org_max_budget / 1000000).toFixed(1)}M ${org.org_budget_currency}`
    : org.org_min_budget
      ? `Desde $${(org.org_min_budget / 1000000).toFixed(1)}M ${org.org_budget_currency}`
      : null;

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-white/5 bg-card overflow-hidden transition-all duration-200 hover:border-white/10 hover:shadow-lg hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      {/* Cover / Header */}
      <div className="relative h-28 overflow-hidden">
        {org.org_cover_url ? (
          <img
            src={org.org_cover_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10, transparent)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />

        {/* Type badge */}
        {typeColor && typeLabel && (
          <div className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold', typeColor.bg, typeColor.text)}>
            {typeLabel}
          </div>
        )}
      </div>

      {/* Logo + Info */}
      <div className="px-4 pb-4 -mt-8 relative z-10">
        {/* Logo */}
        <div className="mb-3">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.org_display_name}
              className="h-14 w-14 rounded-xl border-2 border-[#12121a] object-cover shadow-lg bg-gray-900"
            />
          ) : (
            <div
              className="h-14 w-14 rounded-xl border-2 border-[#12121a] flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Building2 className="h-6 w-6" style={{ color: accentColor }} />
            </div>
          )}
        </div>

        {/* Name + Tagline */}
        <h3 className="font-semibold text-white text-sm truncate">{org.org_display_name}</h3>
        {org.org_tagline && (
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">{org.org_tagline}</p>
        )}

        {/* Specialties */}
        {org.org_specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {org.org_specialties.slice(0, 3).map(spec => (
              <span key={spec} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">
                {spec}
              </span>
            ))}
            {org.org_specialties.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">
                +{org.org_specialties.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 text-xs">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-purple-400 fill-purple-400" />
            <span className="text-white font-medium">{org.org_marketplace_rating_avg.toFixed(1)}</span>
            <span className="text-gray-600">({org.org_marketplace_rating_count})</span>
          </div>

          {/* Team size */}
          {org.org_team_size_range && (
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="h-3 w-3" />
              <span>{TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}</span>
            </div>
          )}

          {/* Projects */}
          {org.org_marketplace_projects_count > 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <Briefcase className="h-3 w-3" />
              <span>{org.org_marketplace_projects_count}</span>
            </div>
          )}
        </div>

        {/* Budget + Response time */}
        <div className="flex items-center justify-between mt-2">
          {budgetLabel && (
            <span className="text-xs text-gray-400">{budgetLabel}</span>
          )}
          {org.org_response_time && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="h-2.5 w-2.5" />
              <span>{RESPONSE_TIME_LABELS[org.org_response_time] || org.org_response_time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const MarketplaceOrgCard = memo(OrgCardComponent);
