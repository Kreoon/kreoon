import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  Save, 
  Loader2,
  Eye,
  Plus,
  Edit,
  LayoutDashboard,
  Kanban,
  Video,
  Users,
  Sparkles,
  Building2,
  UsersRound,
  Package,
  CreditCard,
  DollarSign,
  Target,
  Image
} from "lucide-react";

interface RolePermission {
  id: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_modify: boolean;
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Panel principal con métricas y KPIs' },
  { id: 'tablero', label: 'Tablero Kanban', icon: Kanban, description: 'Gestión visual de proyectos' },
  { id: 'contenido', label: 'Contenido', icon: Video, description: 'Lista y gestión de contenido' },
  { id: 'creadores', label: 'Creadores', icon: Users, description: 'Gestión de creadores de contenido' },
  { id: 'guiones_ia', label: 'Guiones IA', icon: Sparkles, description: 'Generación de guiones con IA' },
  { id: 'clientes', label: 'Clientes', icon: Building2, description: 'Gestión de clientes' },
  { id: 'equipo', label: 'Equipo', icon: UsersRound, description: 'Gestión del equipo interno' },
  { id: 'productos', label: 'Productos', icon: Package, description: 'Productos de los clientes' },
  { id: 'paquetes', label: 'Paquetes', icon: CreditCard, description: 'Paquetes de servicios' },
  { id: 'pagos', label: 'Pagos', icon: DollarSign, description: 'Gestión de pagos' },
  { id: 'metas', label: 'Metas', icon: Target, description: 'Objetivos y metas' },
  { id: 'portafolio', label: 'Portafolio', icon: Image, description: 'Portafolio público' },
];

const ROLES = [
  { id: 'admin', label: 'Administrador', color: 'bg-primary' },
  { id: 'strategist', label: 'Estratega', color: 'bg-orange-500' },
  { id: 'creator', label: 'Creador', color: 'bg-purple-500' },
  { id: 'editor', label: 'Editor', color: 'bg-blue-500' },
  { id: 'client', label: 'Cliente', color: 'bg-green-500' },
];

export function PermissionsEditor() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState('creator');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module');
      
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los permisos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    role: string, 
    module: string, 
    field: 'can_view' | 'can_create' | 'can_modify',
    value: boolean
  ) => {
    setPermissions(prev => 
      prev.map(p => {
        if (p.role === role && p.module === module) {
          // If disabling view, also disable create and modify
          if (field === 'can_view' && !value) {
            return { ...p, can_view: false, can_create: false, can_modify: false };
          }
          // If enabling create or modify, also enable view
          if ((field === 'can_create' || field === 'can_modify') && value) {
            return { ...p, [field]: value, can_view: true };
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all permissions
      const updates = permissions.map(p => ({
        id: p.id,
        role: p.role,
        module: p.module,
        can_view: p.can_view,
        can_create: p.can_create,
        can_modify: p.can_modify
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('role_permissions')
          .update({
            can_view: update.can_view,
            can_create: update.can_create,
            can_modify: update.can_modify
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast({
        title: "Permisos actualizados",
        description: "Los cambios se guardaron correctamente"
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getRolePermissions = (role: string) => {
    return permissions.filter(p => p.role === role);
  };

  const getPermission = (role: string, module: string) => {
    return permissions.find(p => p.role === role && p.module === module);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Solo los administradores pueden gestionar permisos</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gestión de Permisos
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura los permisos de acceso para cada rol
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        )}
      </div>

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span><strong>Ver:</strong> Puede visualizar la sección</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              <span><strong>Crear:</strong> Puede agregar nuevos registros</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-amber-500" />
              <span><strong>Modificar:</strong> Puede editar registros existentes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
          {ROLES.map(role => (
            <TabsTrigger 
              key={role.id} 
              value={role.id}
              className="text-xs sm:text-sm"
            >
              <Badge className={`${role.color} text-white mr-2 hidden sm:inline-flex`}>
                {role.label.charAt(0)}
              </Badge>
              {role.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map(role => (
          <TabsContent key={role.id} value={role.id} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${role.color} text-white`}>{role.label}</Badge>
                  <CardTitle className="text-base">Permisos del {role.label}</CardTitle>
                </div>
                <CardDescription>
                  Configura qué puede ver, crear y modificar este rol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
                    <div className="col-span-6">Módulo</div>
                    <div className="col-span-2 text-center">Ver</div>
                    <div className="col-span-2 text-center">Crear</div>
                    <div className="col-span-2 text-center">Modificar</div>
                  </div>

                  {/* Permission rows */}
                  {MODULES.map(module => {
                    const permission = getPermission(role.id, module.id);
                    const Icon = module.icon;
                    
                    return (
                      <div 
                        key={module.id}
                        className="grid grid-cols-12 gap-2 px-3 py-3 hover:bg-muted/30 rounded-lg transition-colors items-center"
                      >
                        <div className="col-span-6 flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{module.label}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox
                            checked={permission?.can_view || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(role.id, module.id, 'can_view', !!checked)
                            }
                            disabled={role.id === 'admin'}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox
                            checked={permission?.can_create || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(role.id, module.id, 'can_create', !!checked)
                            }
                            disabled={role.id === 'admin'}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Checkbox
                            checked={permission?.can_modify || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(role.id, module.id, 'can_modify', !!checked)
                            }
                            disabled={role.id === 'admin'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {role.id === 'admin' && (
                  <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
                    ℹ️ Los permisos del administrador no se pueden modificar. Los administradores tienen acceso completo a todas las funciones.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}