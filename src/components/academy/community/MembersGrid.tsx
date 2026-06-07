import { useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSpaceMembers, useMyFollows, useSpacePresence } from '@/hooks/academy/useAcademyCommunityV3';
import { MemberCard } from './MemberCard';

interface MembersGridProps {
  spaceId: string;
  spaceOwnerId: string;
  accentColor?: string;
}

type Filter = 'all' | 'instructors' | 'new' | 'online';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'online', label: 'En línea' },
  { id: 'instructors', label: 'Instructores' },
  { id: 'new', label: 'Nuevos esta semana' },
];

export function MembersGrid({ spaceId, spaceOwnerId, accentColor = '#8B5CF6' }: MembersGridProps) {
  const { data: members = [], isLoading } = useSpaceMembers(spaceId);
  const { data: follows = new Set<string>() } = useMyFollows(spaceId);
  const { data: presence = [] } = useSpacePresence(spaceId);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const onlineIds = useMemo(() => new Set(presence.map((p) => p.user_id)), [presence]);

  const filtered = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let list = members as any[];

    if (filter === 'instructors') {
      list = list.filter((m) => m.role === 'instructor' || m.user_id === spaceOwnerId);
    } else if (filter === 'new') {
      list = list.filter((m) => new Date(m.joined_at).getTime() > oneWeekAgo);
    } else if (filter === 'online') {
      list = list.filter((m) => onlineIds.has(m.user_id));
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => (m.user?.full_name ?? '').toLowerCase().includes(q));
    }

    return list;
  }, [members, filter, query, onlineIds, spaceOwnerId]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors',
                filter === f.id
                  ? 'text-zinc-100 border-purple-500 bg-purple-500/10'
                  : 'border-white/10 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="md:ml-auto relative md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar miembro..."
            className="bg-black/30 border-white/10 pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando miembros...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">No hay miembros que coincidan.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m: any) => (
            <MemberCard
              key={m.id}
              spaceId={spaceId}
              spaceOwnerId={spaceOwnerId}
              membership={m}
              isFollowing={follows.has(m.user_id)}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
