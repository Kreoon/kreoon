import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shuffle, User, Plus, Trash2 } from 'lucide-react';

interface EditorInPool {
  id: string;
  editor_user_id: string;
  is_active: boolean;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface AvailableEditor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export function EditorRandomizerSettings() {
  const { currentOrg, updateOrganization } = useOrganizations();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [randomizerEnabled, setRandomizerEnabled] = useState(false);
  const [editorsInPool, setEditorsInPool] = useState<EditorInPool[]>([]);
  const [availableEditors, setAvailableEditors] = useState<AvailableEditor[]>([]);
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);

  useEffect(() => {
    if (currentOrg?.id) {
      fetchData();
    }
  }, [currentOrg?.id]);

  const fetchData = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    try {
      // Get organization settings
      const settings = currentOrg.settings as Record<string, unknown> || {};
      setRandomizerEnabled(settings.editor_randomizer_enabled === true);

      // Get editors in pool
      const { data: poolData } = await supabase
        .from('organization_editor_pool')
        .select('id, editor_user_id, is_active')
        .eq('organization_id', currentOrg.id);

      // Get profiles for pool editors
      if (poolData && poolData.length > 0) {
        const editorIds = poolData.map(p => p.editor_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', editorIds);

        const poolWithProfiles = poolData.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.id === p.editor_user_id),
        }));
        setEditorsInPool(poolWithProfiles);
      } else {
        setEditorsInPool([]);
      }

      // Get available editors (members with editor role in this org)
      const { data: memberRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrg.id)
        .eq('role', 'editor');

      if (memberRoles && memberRoles.length > 0) {
        const editorUserIds = memberRoles.map(m => m.user_id);
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', editorUserIds);

        setAvailableEditors(editorProfiles || []);
      } else {
        setAvailableEditors([]);
      }
    } catch (error) {
      console.error('Error fetching editor randomizer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRandomizer = async (enabled: boolean) => {
    if (!currentOrg?.id) return;
    setSaving(true);

    try {
      const currentSettings = (currentOrg.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, editor_randomizer_enabled: enabled };

      const { error } = await supabase
        .from('organizations')
        .update({ settings: newSettings })
        .eq('id', currentOrg.id);

      if (error) throw error;

      setRandomizerEnabled(enabled);
      toast({
        title: enabled ? 'Aleatorizador activado' : 'Aleatorizador desactivado',
        description: enabled
          ? 'Los editores se asignarán automáticamente cuando el contenido pase a estado "grabado"'
          : 'La asignación automática de editores ha sido desactivada',
      });
    } catch (error) {
      console.error('Error toggling randomizer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPool = async () => {
    if (!currentOrg?.id || selectedEditors.length === 0) return;
    setSaving(true);

    try {
      const inserts = selectedEditors.map(editorId => ({
        organization_id: currentOrg.id,
        editor_user_id: editorId,
        is_active: true,
      }));

      const { error } = await supabase
        .from('organization_editor_pool')
        .upsert(inserts, { onConflict: 'organization_id,editor_user_id' });

      if (error) throw error;

      toast({
        title: 'Editores agregados',
        description: `${selectedEditors.length} editor(es) agregado(s) al pool`,
      });

      setSelectedEditors([]);
      fetchData();
    } catch (error) {
      console.error('Error adding editors to pool:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron agregar los editores',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromPool = async (poolId: string) => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organization_editor_pool')
        .delete()
        .eq('id', poolId);

      if (error) throw error;

      toast({ description: 'Editor removido del pool' });
      fetchData();
    } catch (error) {
      console.error('Error removing editor from pool:', error);
      toast({
        title: 'Error',
        description: 'No se pudo remover el editor',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (poolId: string, isActive: boolean) => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organization_editor_pool')
        .update({ is_active: isActive })
        .eq('id', poolId);

      if (error) throw error;

      setEditorsInPool(prev =>
        prev.map(e => (e.id === poolId ? { ...e, is_active: isActive } : e))
      );

      toast({
        description: isActive ? 'Editor activado en el pool' : 'Editor pausado en el pool',
      });
    } catch (error) {
      console.error('Error toggling editor active status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter out editors already in pool
  const editorsNotInPool = availableEditors.filter(
    e => !editorsInPool.some(p => p.editor_user_id === e.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          Aleatorizador de Editores
        </CardTitle>
        <CardDescription>
          Cuando está activo, se asigna automáticamente un editor aleatorio del pool cuando el contenido pasa a estado "grabado"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-sm">
          <div>
            <Label htmlFor="randomizer-toggle" className="text-base font-medium">
              Activar aleatorizador
            </Label>
            <p className="text-sm text-muted-foreground">
              Los editores se asignarán automáticamente del pool
            </p>
          </div>
          <Switch
            id="randomizer-toggle"
            checked={randomizerEnabled}
            onCheckedChange={handleToggleRandomizer}
            disabled={saving}
          />
        </div>

        {/* Editors in Pool */}
        <div className="space-y-3">
          <h4 className="font-medium">Editores en el Pool ({editorsInPool.length})</h4>
          
          {editorsInPool.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-sm">
              No hay editores en el pool. Agrega editores para que puedan ser asignados automáticamente.
            </p>
          ) : (
            <div className="space-y-2">
              {editorsInPool.map(editor => (
                <div
                  key={editor.id}
                  className="flex items-center justify-between p-3 border rounded-sm bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={editor.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{editor.profile?.full_name || 'Editor'}</p>
                      <p className="text-xs text-muted-foreground">{editor.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={editor.is_active ? 'default' : 'secondary'}>
                      {editor.is_active ? 'Activo' : 'Pausado'}
                    </Badge>
                    <Switch
                      checked={editor.is_active}
                      onCheckedChange={checked => handleToggleActive(editor.id, checked)}
                      disabled={saving}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFromPool(editor.id)}
                      disabled={saving}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Editors to Pool */}
        {editorsNotInPool.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Agregar editores al pool</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {editorsNotInPool.map(editor => (
                <label
                  key={editor.id}
                  className="flex items-center gap-3 p-3 border rounded-sm hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEditors.includes(editor.id)}
                    onCheckedChange={checked => {
                      if (checked) {
                        setSelectedEditors(prev => [...prev, editor.id]);
                      } else {
                        setSelectedEditors(prev => prev.filter(id => id !== editor.id));
                      }
                    }}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={editor.avatar_url || ''} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{editor.full_name}</p>
                    <p className="text-xs text-muted-foreground">{editor.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button
              onClick={handleAddToPool}
              disabled={selectedEditors.length === 0 || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Agregar al pool ({selectedEditors.length})
            </Button>
          </div>
        )}

        {editorsNotInPool.length === 0 && availableEditors.length === 0 && (
          <p className="text-sm text-muted-foreground border-t pt-4">
            No hay editores disponibles en esta organización. Primero asigna el rol de "Editor" a los miembros del equipo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
