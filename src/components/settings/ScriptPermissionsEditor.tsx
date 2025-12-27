import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScriptPermission {
  id: string;
  organization_id: string;
  role: string;
  ia_view: boolean;
  ia_edit: boolean;
  ia_generate: boolean;
  script_view: boolean;
  script_edit: boolean;
  script_approve: boolean;
  editor_view: boolean;
  editor_edit: boolean;
  strategist_view: boolean;
  strategist_edit: boolean;
  designer_view: boolean;
  designer_edit: boolean;
  trafficker_view: boolean;
  trafficker_edit: boolean;
  admin_view: boolean;
  admin_edit: boolean;
  admin_lock: boolean;
}

interface ScriptPermissionsEditorProps {
  organizationId: string | null;
}

const ROLES = ['admin', 'creator', 'editor', 'strategist', 'designer', 'trafficker', 'client'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  designer: 'Diseñador',
  trafficker: 'Trafficker',
  client: 'Cliente',
};

const SUB_TABS = [
  { key: 'ia', label: 'IA', emoji: '🤖', permissions: ['view', 'edit', 'generate'] },
  { key: 'script', label: 'Guión', emoji: '📝', permissions: ['view', 'edit', 'approve'] },
  { key: 'editor', label: 'Editor', emoji: '🎬', permissions: ['view', 'edit'] },
  { key: 'strategist', label: 'Estratega', emoji: '🧠', permissions: ['view', 'edit'] },
  { key: 'designer', label: 'Diseñador', emoji: '🎨', permissions: ['view', 'edit'] },
  { key: 'trafficker', label: 'Trafficker', emoji: '📈', permissions: ['view', 'edit'] },
  { key: 'admin', label: 'Admin', emoji: '🛠️', permissions: ['view', 'edit', 'lock'] },
];

const PERMISSION_LABELS: Record<string, string> = {
  view: 'Ver',
  edit: 'Editar',
  generate: 'Generar',
  approve: 'Aprobar',
  lock: 'Bloquear',
};

export function ScriptPermissionsEditor({ organizationId }: ScriptPermissionsEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<ScriptPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState('admin');

  useEffect(() => {
    if (organizationId) {
      fetchPermissions();
    }
  }, [organizationId]);

  const fetchPermissions = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_permissions')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching script permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionForRole = (role: string): ScriptPermission | undefined => {
    return permissions.find(p => p.role === role);
  };

  const updatePermission = async (role: string, field: string, value: boolean) => {
    if (!organizationId) return;
    
    const existing = getPermissionForRole(role);
    
    // Optimistic update
    if (existing) {
      setPermissions(prev => prev.map(p => 
        p.role === role ? { ...p, [field]: value } : p
      ));
    } else {
      // Create new permission row
      const newPerm: Partial<ScriptPermission> = {
        organization_id: organizationId,
        role,
        [field]: value,
      };
      setPermissions(prev => [...prev, newPerm as ScriptPermission]);
    }

    try {
      if (existing) {
        const { error } = await supabase
          .from('script_permissions')
          .update({ [field]: value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('script_permissions')
          .upsert({
            organization_id: organizationId,
            role,
            [field]: value,
          }, { onConflict: 'organization_id,role' })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setPermissions(prev => 
            prev.map(p => p.role === role && !p.id ? data : p)
          );
        }
      }
    } catch (err) {
      console.error('Error updating permission:', err);
      toast({ title: 'Error al actualizar permiso', variant: 'destructive' });
      fetchPermissions(); // Revert on error
    }
  };

  const resetToDefaults = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      // Delete all existing permissions
      await supabase
        .from('script_permissions')
        .delete()
        .eq('organization_id', organizationId);
      
      // Re-create defaults by calling the function
      const { error } = await supabase.rpc('create_default_script_permissions', {
        org_id: organizationId
      });
      
      if (error) throw error;
      
      await fetchPermissions();
      toast({ title: 'Permisos restablecidos' });
    } catch (err) {
      console.error('Error resetting permissions:', err);
      toast({ title: 'Error al restablecer', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentRolePermission = getPermissionForRole(selectedRole);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Permisos de Scripts</h3>
          <p className="text-sm text-muted-foreground">
            Configura qué roles pueden ver y editar cada sección de scripts
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
          Restablecer
        </Button>
      </div>

      {/* Role Selector */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(role => (
          <Badge
            key={role}
            variant={selectedRole === role ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedRole(role)}
          >
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>

      {/* Permissions Grid */}
      <ScrollArea className="h-[300px] border rounded-lg p-4">
        <div className="space-y-4">
          {SUB_TABS.map(tab => (
            <Card key={tab.key} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{tab.emoji}</span>
                <span className="font-medium">{tab.label}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tab.permissions.map(perm => {
                  const fieldName = `${tab.key}_${perm}` as keyof ScriptPermission;
                  const value = currentRolePermission?.[fieldName] as boolean ?? false;
                  
                  return (
                    <div key={perm} className="flex items-center justify-between">
                      <Label className="text-sm">{PERMISSION_LABELS[perm]}</Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => updatePermission(selectedRole, fieldName, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Overview */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground mb-2">Vista rápida para {ROLE_LABELS[selectedRole]}:</p>
        <div className="flex flex-wrap gap-1">
          {SUB_TABS.map(tab => {
            const viewField = `${tab.key}_view` as keyof ScriptPermission;
            const editField = `${tab.key}_edit` as keyof ScriptPermission;
            const canView = currentRolePermission?.[viewField] ?? false;
            const canEdit = currentRolePermission?.[editField] ?? false;
            
            return (
              <Badge
                key={tab.key}
                variant="outline"
                className={
                  canEdit 
                    ? 'bg-green-500/10 text-green-700 border-green-500/30' 
                    : canView 
                      ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                      : 'bg-muted text-muted-foreground'
                }
              >
                {tab.emoji} {canEdit ? 'Edita' : canView ? 'Ve' : 'No ve'}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
