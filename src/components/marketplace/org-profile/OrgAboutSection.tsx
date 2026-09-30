import { Calendar, Users, MapPin } from 'lucide-react';
import { TEAM_SIZE_LABELS } from '../types/marketplace';
import type { OrgFullProfile } from '../types/marketplace';

interface OrgAboutSectionProps {
  org: OrgFullProfile;
}

export function OrgAboutSection({ org }: OrgAboutSectionProps) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {org.description && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Acerca de</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{org.description}</p>
        </div>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {org.org_year_founded && (
          <div className="flex items-center gap-3 p-3 rounded-sm bg-muted/50">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fundada en</p>
              <p className="text-sm text-foreground font-medium">{org.org_year_founded}</p>
            </div>
          </div>
        )}
        {org.org_team_size_range && (
          <div className="flex items-center gap-3 p-3 rounded-sm bg-muted/50">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tamaño del equipo</p>
              <p className="text-sm text-foreground font-medium">
                {TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Specialties */}
      {org.org_specialties.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Especialidades</h3>
          <div className="flex flex-wrap gap-2">
            {org.org_specialties.map(spec => (
              <span key={spec} className="px-3 py-1.5 rounded-sm text-sm capitalize bg-muted/50 text-foreground/80 border border-border">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
