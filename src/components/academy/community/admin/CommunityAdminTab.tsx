import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CommunityAdminTabProps {
  spaceId: string;
  accentColor?: string;
}

const EMOJI_OPTIONS = ['💬', '❓', '💡', '🏆', '📣', '🧠', '🚀', '🎯', '✨', '🔥', '📚', '🎨'];

export function CommunityAdminTab({ spaceId, accentColor = '#8B5CF6' }: CommunityAdminTabProps) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💬');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['academy', 'admin-categories', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_post_categories')
        .select('*')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!spaceId,
  });

  const createCategory = useMutation({
    mutationFn: async (input: { name: string; emoji: string }) => {
      const slug = input.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || `cat-${Date.now()}`;

      const { error } = await (supabase as any)
        .from('academy_post_categories')
        .insert({
          space_id: spaceId,
          name: input.name,
          slug,
          emoji: input.emoji,
          sort_order: (categories as any[]).length,
          is_active: true,
          who_can_post: 'all',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'admin-categories', spaceId] });
      qc.invalidateQueries({ queryKey: ['academy', 'categories', spaceId] });
      setNewName('');
      setNewEmoji('💬');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('academy_post_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'admin-categories', spaceId] });
      qc.invalidateQueries({ queryKey: ['academy', 'categories', spaceId] });
    },
  });

  const togglePermission = useMutation({
    mutationFn: async ({ id, who_can_post }: { id: string; who_can_post: string }) => {
      const { error } = await (supabase as any)
        .from('academy_post_categories')
        .update({ who_can_post })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'admin-categories', spaceId] });
    },
  });

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-card border-border">
        <h3 className="font-semibold mb-3">Crear nueva categoría</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Emoji</Label>
            <select
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="mt-1 bg-muted border border-border rounded-lg px-3 py-2 text-base focus:outline-none focus:border-primary/50"
              aria-label="Emoji de la categoría"
            >
              {EMOJI_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Recursos, Tips, Networking..."
              className="mt-1 bg-muted border-border"
              maxLength={30}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => createCategory.mutate({ name: newName.trim(), emoji: newEmoji })}
              disabled={!newName.trim() || createCategory.isPending}
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Crear
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h3 className="font-semibold mb-3">
          Categorías existentes ({categories.filter((c: any) => c.is_active).length})
        </h3>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Cargando...</div>
        ) : (
          <ul className="divide-y divide-border">
            {(categories as any[]).map((c) => (
              <li key={c.id} className={cn('flex items-center gap-3 py-3', !c.is_active && 'opacity-40')}>
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <span className="text-xl" aria-hidden="true">{c.emoji}</span>
                <span className="flex-1 font-medium text-foreground">{c.name}</span>
                <select
                  value={c.who_can_post}
                  onChange={(e) =>
                    togglePermission.mutate({ id: c.id, who_can_post: e.target.value })
                  }
                  className="text-xs bg-muted border border-border rounded px-2 py-1"
                  aria-label={`Quién puede postear en ${c.name}`}
                >
                  <option value="all">Todos</option>
                  <option value="instructor">Solo instructores</option>
                  <option value="moderator">Solo moderadores</option>
                </select>
                {c.is_active && !c.is_default && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar categoría "${c.name}"?`)) {
                        deleteCategory.mutate(c.id);
                      }
                    }}
                    aria-label={`Eliminar categoría ${c.name}`}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {c.is_default && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
