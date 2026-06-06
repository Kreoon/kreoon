import { NavLink, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { cn } from '@/lib/utils';
import {
  MessagesSquare,
  BookOpen,
  Calendar,
  Users,
  Map as MapIcon,
  Trophy,
  Info,
  Settings,
} from 'lucide-react';

interface SpaceNavbarProps {
  spaceSlug: string;
}

const TABS = [
  { to: 'feed', label: 'Comunidad', icon: MessagesSquare },
  { to: '', label: 'Classroom', icon: BookOpen, end: true },
  { to: 'calendar', label: 'Calendario', icon: Calendar },
  { to: 'members', label: 'Miembros', icon: Users, hidden: true },
  { to: 'map', label: 'Mapa', icon: MapIcon },
  { to: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: 'about', label: 'Acerca de', icon: Info, hidden: true },
];

export function SpaceNavbar({ spaceSlug }: SpaceNavbarProps) {
  const { user } = useAuth();
  const { data: space } = useAcademySpace(spaceSlug);
  const accent = space?.accent_color || '#8B5CF6';
  const isOwner = useMemo(() => !!user && space?.owner_id === user.id, [user, space]);

  return (
    <div className="border-b border-white/10 bg-[#0c0c16] sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {TABS.filter((t) => !t.hidden).map((t) => (
            <NavLink
              key={t.label}
              to={`/academia/${spaceSlug}${t.to ? `/${t.to}` : ''}`}
              end={(t as any).end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )
              }
              style={({ isActive }) => (isActive ? { borderColor: accent } : undefined)}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </NavLink>
          ))}
          {isOwner && (
            <NavLink
              to={`/academia/${spaceSlug}/admin`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ml-auto',
                  isActive
                    ? 'text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )
              }
              style={({ isActive }) => (isActive ? { borderColor: accent } : undefined)}
            >
              <Settings className="h-4 w-4" /> Admin
            </NavLink>
          )}
        </nav>
      </div>
    </div>
  );
}
