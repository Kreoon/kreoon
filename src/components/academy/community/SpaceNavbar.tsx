import { NavLink, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  MessagesSquare,
  GraduationCap,
  Video,
  Users,
  Globe2,
  Crown,
  Info,
  Settings,
  Mail,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { OnlineIndicator } from './OnlineIndicator';

interface SpaceNavbarProps {
  spaceSlug: string;
}

const KREOON_PURPLE = '#7c3aed';

const TABS = [
  { to: '', label: 'Inicio', icon: Sparkles, end: true },
  { to: 'feed', label: 'Feed', icon: MessagesSquare },
  { to: 'classroom', label: 'Cursos', icon: GraduationCap },
  { to: 'calendar', label: 'Lives', icon: Video },
  { to: 'members', label: 'Creadores', icon: Users },
  { to: 'dm', label: 'Mensajes', icon: Mail },
  { to: 'map', label: 'Mundo', icon: Globe2 },
  { to: 'leaderboard', label: 'Ranking', icon: Crown },
  { to: 'about', label: 'Acerca de', icon: Info, hidden: true },
];

export function SpaceNavbar({ spaceSlug }: SpaceNavbarProps) {
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const isOwner = useMemo(() => !!user && space?.owner_id === user.id, [user, space]);

  return (
    <div className="border-b border-white/5 bg-kreoon-bg-secondary/95 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-3 md:px-8 flex items-center gap-3">
        <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 py-2.5">
          {TABS.filter((t) => !t.hidden).map((t) => (
            <NavLink
              key={t.label}
              to={`/academia/${spaceSlug}${t.to ? `/${t.to}` : ''}`}
              end={(t as any).end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-2xl whitespace-nowrap transition-all',
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                )
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: KREOON_PURPLE,
                      boxShadow: `0 6px 20px -6px ${KREOON_PURPLE}80`,
                    }
                  : undefined
              }
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </NavLink>
          ))}
          {isOwner && (
            <NavLink
              to={`/academia/${spaceSlug}/admin`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-2xl whitespace-nowrap transition-all ml-auto',
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                )
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: KREOON_PURPLE,
                      boxShadow: `0 6px 20px -6px ${KREOON_PURPLE}80`,
                    }
                  : undefined
              }
            >
              <Settings className="h-4 w-4" /> Admin
            </NavLink>
          )}
        </nav>
        {space && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {isOwner && (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  color: KREOON_PURPLE,
                  borderColor: `${KREOON_PURPLE}40`,
                  backgroundColor: `${KREOON_PURPLE}15`,
                }}
              >
                Owner
              </span>
            )}
            <OnlineIndicator spaceId={space.id} showLabel={false} className="hidden md:inline-flex" />
            {user && <NotificationBell spaceId={space.id} accentColor={KREOON_PURPLE} />}
          </div>
        )}
      </div>
    </div>
  );
}
