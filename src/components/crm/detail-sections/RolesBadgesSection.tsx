import { Shield, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailSection } from '@/components/crm/DetailSection';

interface RoleSummary {
  role: string;
  organization_name: string;
}

interface BadgeSummary {
  badge: string;
  level: string;
  is_active: boolean;
  granted_at: string;
}

interface RolesBadgesSectionProps {
  roles: RoleSummary[] | undefined;
  badges: BadgeSummary[] | undefined;
  ambassadorLevel: string | null | undefined;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  team_leader: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  strategist: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  trafficker: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  creator: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  editor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  client: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700/20 text-amber-600 border-amber-700/30',
  silver: 'bg-gray-400/20 text-muted-foreground border-gray-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const AMBASSADOR_LABELS: Record<string, string> = {
  bronze: 'Embajador Bronce',
  silver: 'Embajador Plata',
  gold: 'Embajador Oro',
};

function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || 'bg-white/10 text-white/60 border-white/20';
}

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level.toLowerCase()] || 'bg-white/10 text-white/60 border-white/20';
}

export function RolesBadgesSection({ roles, badges, ambassadorLevel }: RolesBadgesSectionProps) {
  const hasRoles = roles && roles.length > 0;
  const hasBadges = badges && badges.length > 0;
  const hasAmbassador = !!ambassadorLevel;

  if (!hasRoles && !hasBadges && !hasAmbassador) return null;

  return (
    <DetailSection title="Roles y Badges">
      <div className="space-y-2.5">
        {/* Ambassador */}
        {hasAmbassador && (
          <div className="flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                getLevelColor(ambassadorLevel),
              )}
            >
              {AMBASSADOR_LABELS[ambassadorLevel.toLowerCase()] || `Embajador ${ambassadorLevel}`}
            </span>
          </div>
        )}

        {/* Roles */}
        {hasRoles && (
          <div>
            <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" />
              Roles
            </p>
            <div className="flex flex-wrap gap-1">
              {roles.map((r, i) => (
                <span
                  key={`${r.role}-${i}`}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    getRoleColor(r.role),
                  )}
                >
                  {r.role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {hasBadges && (
          <div>
            <p className="text-[10px] text-white/40 mb-1 flex items-center gap-1">
              <Award className="h-2.5 w-2.5" />
              Badges
            </p>
            <div className="flex flex-wrap gap-1">
              {badges.map((b, i) => (
                <span
                  key={`${b.badge}-${i}`}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    b.is_active ? getLevelColor(b.level) : 'bg-white/5 text-white/30 border-white/10',
                  )}
                >
                  {b.badge} ({b.level})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
