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
          <h2 className="text-lg font-semibold text-white mb-3">Acerca de</h2>
          <p className="text-gray-400 leading-relaxed whitespace-pre-line">{org.description}</p>
        </div>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {org.org_year_founded && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Fundada en</p>
              <p className="text-sm text-white font-medium">{org.org_year_founded}</p>
            </div>
          </div>
        )}
        {org.org_team_size_range && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <Users className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Tamaño del equipo</p>
              <p className="text-sm text-white font-medium">
                {TEAM_SIZE_LABELS[org.org_team_size_range] || org.org_team_size_range}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Specialties */}
      {org.org_specialties.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Especialidades</h3>
          <div className="flex flex-wrap gap-2">
            {org.org_specialties.map(spec => (
              <span key={spec} className="px-3 py-1.5 rounded-lg text-sm capitalize bg-white/5 text-gray-300 border border-white/5">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
