import { Building2, Star, Users, Briefcase, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ORG_TYPE_LABELS, ORG_TYPE_COLORS, TEAM_SIZE_LABELS } from '../types/marketplace';
import type { OrgFullProfile } from '../types/marketplace';

interface OrgProfileHeroProps {
  org: OrgFullProfile;
  accentColor: string;
  onContact: () => void;
}

export function OrgProfileHero({ org, accentColor, onContact }: OrgProfileHeroProps) {
  const displayName = org.org_display_name || org.name;
  const typeColor = org.org_type ? ORG_TYPE_COLORS[org.org_type] : null;
  const typeLabel = org.org_type ? ORG_TYPE_LABELS[org.org_type] : null;

  return (
    <div className="relative">
      {/* Cover */}
      <div className="h-48 md:h-64 overflow-hidden">
        {org.org_cover_url ? (
          <>
            <img src={org.org_cover_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}08, #0a0a0f)` }}
          />
        )}
      </div>

      {/* Info overlay */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          {/* Logo */}
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={displayName}
              className="h-20 w-20 md:h-24 md:w-24 rounded-sm border-4 border-[#0a0a0f] object-cover shadow-xl bg-gray-900"
            />
          ) : (
            <div
              className="h-20 w-20 md:h-24 md:w-24 rounded-sm border-4 border-[#0a0a0f] flex items-center justify-center shadow-xl"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Building2 className="h-10 w-10" style={{ color: accentColor }} />
            </div>
          )}

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{displayName}</h1>
              {typeColor && typeLabel && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColor.bg} ${typeColor.text}`}>
                  {typeLabel}
                </span>
              )}
            </div>
            {org.org_tagline && (
              <p className="text-gray-400 mt-1 line-clamp-2 max-w-2xl text-sm">{org.org_tagline}</p>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={onContact}
            className="hidden md:flex text-white hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Contactar
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4 pb-4">
          {org.org_marketplace_rating_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-purple-400 text-purple-400" />
              <span className="text-white font-semibold">{org.org_marketplace_rating_avg.toFixed(1)}</span>
              <span className="text-gray-500">({org.org_marketplace_rating_count} reseñas)</span>
            </div>
          )}
          {org.org_team_size_range && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>{TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}</span>
            </div>
          )}
          {org.org_marketplace_projects_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Briefcase className="h-4 w-4" />
              <span>{org.org_marketplace_projects_count} proyectos</span>
            </div>
          )}
          {org.org_year_founded && (
            <div className="text-sm text-gray-500">
              Desde {org.org_year_founded}
            </div>
          )}

          {/* Mobile CTA */}
          <div className="flex-1 flex justify-end md:hidden">
            <Button
              onClick={onContact}
              size="sm"
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Mail className="h-4 w-4 mr-1" />
              Contactar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
