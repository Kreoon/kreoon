import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, X, Plus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UserOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CollaboratorSelectorProps {
  contentId: string;
  creatorId?: string | null;
  disabled?: boolean;
  onChange?: () => void;
}

export function CollaboratorSelector({ contentId, creatorId, disabled, onChange }: CollaboratorSelectorProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
    fetchUsers();
  }, [contentId]);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('content_collaborators')
        .select('id, user_id, role')
        .eq('content_id', contentId);

      if (error) throw error;

      // Fetch profiles for collaborators
      if (data && data.length > 0) {
        const userIds = data.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enriched = data.map(c => ({
          ...c,
          profile: profilesMap.get(c.user_id) || { full_name: 'Usuario', avatar_url: null }
        }));
        
        setCollaborators(enriched);
      } else {
        setCollaborators([]);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addCollaborator = async (userId: string) => {
    if (userId === creatorId) {
      toast.error('El creador ya está asignado');
      return;
    }

    if (collaborators.some(c => c.user_id === userId)) {
      toast.error('Este usuario ya es colaborador');
      return;
    }

    setAdding(userId);
    try {
      const { error } = await supabase
        .from('content_collaborators')
        .insert({
          content_id: contentId,
          user_id: userId,
          role: 'collaborator'
        });

      if (error) throw error;

      await fetchCollaborators();
      toast.success('Colaborador agregado');
      onChange?.();
      setOpen(false);
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Error al agregar colaborador');
    } finally {
      setAdding(null);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success('Colaborador eliminado');
      onChange?.();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Error al eliminar colaborador');
    } finally {
      setLoading(false);
    }
  };

  // Filter out users who are already collaborators or the creator
  const availableUsers = users.filter(u => 
    u.id !== creatorId && 
    !collaborators.some(c => c.user_id === u.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>Colaboradores</span>
          {collaborators.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {collaborators.length}
            </Badge>
          )}
        </div>
        
        {!disabled && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar usuario..." />
                <CommandList>
                  <CommandEmpty>No se encontraron usuarios</CommandEmpty>
                  <CommandGroup>
                    {availableUsers.map(user => (
                      <CommandItem
                        key={user.id}
                        value={user.full_name}
                        onSelect={() => addCollaborator(user.id)}
                        disabled={adding === user.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm">{user.full_name}</span>
                        {adding === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {collaborators.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin colaboradores. {!disabled && 'Agrega usuarios que participaron en este contenido.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {collaborators.map(collab => (
            <div
              key={collab.id}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-full",
                "bg-secondary/50 border border-border"
              )}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={collab.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {collab.profile?.full_name.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-[100px]">
                {collab.profile?.full_name || 'Usuario'}
              </span>
              {!disabled && (
                <button
                  onClick={() => removeCollaborator(collab.id)}
                  disabled={loading}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
