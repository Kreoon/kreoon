import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Eye, Edit2, Shield, Brain, Target,
  AlertTriangle, Users, Settings, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UPPermissionsEditorProps {
  organizationId: string;
}

const ROLES = ['admin', 'creator', 'editor', 'strategist', 'designer', 'trafficker', 'client'];

const PERMISSION_GROUPS = [
  {
    key: 'visibility',
    label: 'Visibilidad',
    icon: Eye,
    permissions: [
      { key: 'view_own_up', label: 'Ver UP propio', description: 'Ver sus propios puntos y progreso' },
      { key: 'view_ranking', label: 'Ver ranking', description: 'Ver la clasificación general' },
      { key: 'view_others_up', label: 'Ver UP de otros', description: 'Ver puntos de otros usuarios' },
      { key: 'view_quality_score', label: 'Ver QualityScore', description: 'Ver puntuación de calidad IA' }
    ]
  },
  {
    key: 'management',
    label: 'Gestión',
    icon: Settings,
    permissions: [
      { key: 'create_rules', label: 'Crear reglas', description: 'Crear nuevas reglas de puntos' },
      { key: 'edit_rules', label: 'Editar reglas', description: 'Modificar reglas existentes' },
      { key: 'manual_adjustment', label: 'Ajustes manuales', description: 'Ajustar puntos manualmente' }
    ]
  },
  {
    key: 'ai',
    label: 'IA Co-Pilot',
    icon: Brain,
    permissions: [
      { key: 'enable_ai_features', label: 'Activar IA', description: 'Activar/desactivar funciones de IA' },
      { key: 'approve_ai_events', label: 'Aprobar eventos IA', description: 'Confirmar eventos inferidos por IA' },
      { key: 'view_fraud_alerts', label: 'Ver alertas fraude', description: 'Ver alertas anti-fraude' }
    ]
  }
];

type PermissionsMap = Record<string, Record<string, boolean>>;

export function UPPermissionsEditor({ organizationId }: UPPermissionsEditorProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeRole, setActiveRole] = useState('creator');

  useEffect(() => {
    fetchPermissions();
  }, [organizationId]);

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('up_permissions')
      .select('*')
      .eq('organization_id', organizationId);

    if (data) {
      const permMap: PermissionsMap = {};
      ROLES.forEach(role => {
        permMap[role] = {};
        const rolePerms = data.find((p: any) => p.role === role);
        if (rolePerms) {
          // Map database columns to permission keys (using correct column names)
          permMap[role] = {
            view_own_up: rolePerms.can_view_own_up ?? true,
            view_ranking: rolePerms.can_view_ranking ?? true,
            view_others_up: rolePerms.can_view_others_up ?? false,
            view_quality_score: rolePerms.can_view_quality_scores ?? false,
            create_rules: rolePerms.can_create_rules ?? false,
            edit_rules: rolePerms.can_edit_rules ?? false,
            manual_adjustment: rolePerms.can_manual_adjust ?? false,
            enable_ai_features: rolePerms.can_toggle_ai ?? false,
            approve_ai_events: rolePerms.can_approve_ai_events ?? false,
            view_fraud_alerts: rolePerms.can_view_fraud_alerts ?? false
          };
        } else {
          // Default permissions based on role
          const isAdmin = role === 'admin';
          PERMISSION_GROUPS.forEach(group => {
            group.permissions.forEach(perm => {
              permMap[role][perm.key] = isAdmin || perm.key === 'view_own_up' || perm.key === 'view_ranking';
            });
          });
        }
      });
      setPermissions(permMap);
    }
  };

  const handleToggle = (role: string, permKey: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all role permissions
      for (const role of ROLES) {
        const rolePerms = permissions[role];
        if (!rolePerms) continue;

        const { error } = await supabase
          .from('up_permissions')
          .upsert({
            organization_id: organizationId,
            role,
            can_view_own_up: rolePerms.view_own_up,
            can_view_ranking: rolePerms.view_ranking,
            can_view_others_up: rolePerms.view_others_up,
            can_view_quality_scores: rolePerms.view_quality_score,
            can_create_rules: rolePerms.create_rules,
            can_edit_rules: rolePerms.edit_rules,
            can_manual_adjust: rolePerms.manual_adjustment,
            can_toggle_ai: rolePerms.enable_ai_features,
            can_approve_ai_events: rolePerms.approve_ai_events,
            can_view_fraud_alerts: rolePerms.view_fraud_alerts
          } as any, { onConflict: 'organization_id,role' });

        if (error) throw error;
      }

      toast({ title: 'Permisos actualizados' });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      admin: 'Administrador',
      creator: 'Creador',
      editor: 'Editor',
      strategist: 'Estratega',
      designer: 'Diseñador',
      trafficker: 'Trafficker',
      client: 'Cliente'
    };
    return names[role] || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Permisos RBAC</h3>
          <p className="text-sm text-muted-foreground">
            Configura qué puede ver y hacer cada rol en el Sistema UP
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList className="grid grid-cols-7 w-full">
          {ROLES.map(role => (
            <TabsTrigger 
              key={role} 
              value={role}
              className="text-xs"
            >
              {getRoleName(role).slice(0, 8)}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map(role => (
          <TabsContent key={role} value={role} className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-sm">
                {getRoleName(role)}
              </Badge>
              {role === 'admin' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Acceso completo por defecto
                </span>
              )}
            </div>

            {PERMISSION_GROUPS.map(group => {
              const Icon = group.icon;
              return (
                <Card key={group.key} className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="w-5 h-5 text-primary" />
                      {group.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.permissions.map(perm => (
                      <div 
                        key={perm.key}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                        <Switch
                          checked={permissions[role]?.[perm.key] ?? false}
                          onCheckedChange={(checked) => handleToggle(role, perm.key, checked)}
                          disabled={role === 'admin'}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Overview */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5" />
            Resumen de Permisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1">Permiso</th>
                  {ROLES.map(role => (
                    <th key={role} className="text-center py-2 px-1">
                      {getRoleName(role).slice(0, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.flatMap(group => 
                  group.permissions.map(perm => (
                    <tr key={perm.key} className="border-b last:border-0">
                      <td className="py-2 px-1 text-muted-foreground">{perm.label}</td>
                      {ROLES.map(role => (
                        <td key={role} className="text-center py-2 px-1">
                          {permissions[role]?.[perm.key] ? (
                            <span className="text-success">✓</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
