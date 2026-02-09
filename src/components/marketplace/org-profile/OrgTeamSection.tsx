import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  admin: 'Admin',
  team_leader: 'Líder',
};

interface OrgTeamSectionProps {
  members: TeamMember[];
  accentColor: string;
}

export function OrgTeamSection({ members, accentColor }: OrgTeamSectionProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay miembros visibles en este equipo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Equipo ({members.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {members.map(member => {
          const initials = member.full_name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || '?';

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatar_url || ''} alt={member.full_name} />
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{member.full_name}</p>
                <Badge
                  variant="secondary"
                  className="text-[10px] mt-0.5"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                  {ROLE_LABELS[member.role] || member.role}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
