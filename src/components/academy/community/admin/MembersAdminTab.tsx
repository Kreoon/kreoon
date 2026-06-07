import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, UserX, Crown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface MembersAdminTabProps {
  spaceId: string;
  accentColor?: string;
}

type FilterStatus = 'active' | 'banned' | 'all';

export function MembersAdminTab({ spaceId, accentColor = '#8B5CF6' }: MembersAdminTabProps) {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('active');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['academy', 'admin-members', spaceId, filter],
    queryFn: async () => {
      let q = (supabase as any)
        .from('academy_memberships')
        .select('*, user:profiles!user_id(full_name, avatar_url, email)')
        .eq('space_id', spaceId)
        .order('joined_at', { ascending: false });
      if (filter === 'active') q = q.eq('is_active', true);
      if (filter === 'banned') q = q.eq('is_active', false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!spaceId,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const lower = query.toLowerCase();
    return (members as any[]).filter(
      (m) =>
        (m.user?.full_name ?? '').toLowerCase().includes(lower) ||
        (m.user?.email ?? '').toLowerCase().includes(lower)
    );
  }, [members, query]);

  const banMutation = useMutation({
    mutationFn: async ({ id, ban }: { id: string; ban: boolean }) => {
      const { error } = await (supabase as any)
        .from('academy_memberships')
        .update({ is_active: !ban })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'admin-members', spaceId] }),
  });

  function exportCSV() {
    const rows = [
      ['Nombre', 'Email', 'Rol', 'Activo', 'Joined'],
      ...(filtered as any[]).map((m) => [
        m.user?.full_name ?? '',
        m.user?.email ?? '',
        m.role,
        m.is_active ? 'Sí' : 'No',
        new Date(m.joined_at).toISOString(),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `miembros_space_${spaceId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1">
          {(['active', 'banned', 'all'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs border transition-colors',
                filter === f
                  ? 'text-zinc-100 border-purple-500 bg-purple-500/10'
                  : 'border-white/10 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f === 'active' ? 'Activos' : f === 'banned' ? 'Baneados' : 'Todos'}
            </button>
          ))}
        </div>
        <div className="md:ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-black/30 border-white/10 pl-8 h-9 text-sm w-64"
            />
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-2" /> CSV
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 text-zinc-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">Sin miembros</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {(filtered as any[]).map((m) => (
              <li key={m.id} className="px-4 py-3 flex items-center gap-3">
                <Avatar profile={m.user} accentColor={accentColor} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate flex items-center gap-2">
                    {m.user?.full_name ?? 'Miembro'}
                    {m.role === 'owner' && (
                      <Crown className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {m.user?.email ?? '(sin email)'}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 hidden sm:block">
                  {new Date(m.joined_at).toLocaleDateString('es-ES')}
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded',
                    m.is_active
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-rose-500/10 text-rose-300'
                  )}
                >
                  {m.is_active ? 'Activo' : 'Baneado'}
                </span>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => banMutation.mutate({ id: m.id, ban: m.is_active })}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title={m.is_active ? 'Banear' : 'Reactivar'}
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="text-xs text-zinc-500 text-right">
        {filtered.length} de {members.length} miembros
      </div>
    </div>
  );
}

function Avatar({ profile, accentColor }: { profile: any; accentColor: string }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white text-sm"
      style={{ backgroundColor: `${accentColor}40` }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
