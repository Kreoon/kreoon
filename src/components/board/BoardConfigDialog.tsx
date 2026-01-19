import { useState, useCallback } from "react";
import { Settings, Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Check, X, ArrowUp, ArrowDown, Palette, ChevronRight, ChevronLeft, Lock, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useBoardSettings, OrganizationStatus, BoardCustomField } from "@/hooks/useBoardSettings";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ScriptPermissionsEditor } from "@/components/settings/ScriptPermissionsEditor";

interface BoardConfigDialogProps {
  organizationId: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSettingsChange?: () => void; // Callback when settings change
}

const STATUS_COLORS = [
  { value: '#6b7280', label: 'Gris' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Selector' },
  { value: 'multiselect', label: 'Multi-selector' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'currency', label: 'Moneda' },
  { value: 'url', label: 'URL' },
];

const VISIBLE_FIELD_OPTIONS = [
  { value: 'title', label: 'Título', description: 'Nombre del contenido' },
  { value: 'thumbnail', label: 'Miniatura', description: 'Imagen de preview' },
  { value: 'status', label: 'Estado', description: 'Badge de estado actual' },
  { value: 'responsible', label: 'Responsable', description: 'Avatar del asignado' },
  { value: 'client', label: 'Cliente', description: 'Nombre del cliente' },
  { value: 'deadline', label: 'Fecha límite', description: 'Deadline del proyecto' },
  { value: 'priority', label: 'Prioridad', description: 'Nivel de prioridad' },
  { value: 'points', label: 'Puntos UP', description: 'Puntos de usuario' },
  { value: 'tags', label: 'Etiquetas', description: 'Tags del proyecto' },
  { value: 'progress', label: 'Progreso', description: 'Barra de progreso' },
  { value: 'indicators', label: 'Indicadores', description: 'Puntos de estado visual' },
];

const ROLES = ['admin', 'creator', 'editor', 'strategist', 'client', 'trafficker', 'designer'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  client: 'Cliente',
  trafficker: 'Trafficker',
  designer: 'Diseñador'
};

export function BoardConfigDialog({ organizationId, trigger, open: controlledOpen, onOpenChange, onSettingsChange }: BoardConfigDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [editingStatus, setEditingStatus] = useState<OrganizationStatus | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6b7280');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<BoardCustomField['field_type']>('text');

  const {
    loading,
    settings,
    statuses,
    rules,
    customFields,
    permissions,
    updateSettings,
    createStatus,
    updateStatus,
    deleteStatus,
    createCustomField,
    deleteCustomField,
    updatePermission,
    updateStatusRule
  } = useBoardSettings(organizationId);

  // Get rule for a status
  const getRuleForStatus = (statusId: string) => {
    return rules.find(r => r.status_id === statusId);
  };

  // Toggle role in advance/retreat/view arrays
  const toggleRolePermission = async (statusId: string, role: string, type: 'advance' | 'retreat' | 'view') => {
    const rule = getRuleForStatus(statusId);
    const currentRoles = type === 'advance' 
      ? (rule?.can_advance_roles || [])
      : type === 'retreat'
        ? (rule?.can_retreat_roles || [])
        : (rule?.can_view_roles || ['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client']);
    
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    const fieldName = type === 'advance' ? 'can_advance_roles' : type === 'retreat' ? 'can_retreat_roles' : 'can_view_roles';
    await updateStatusRule(statusId, { [fieldName]: newRoles });
    onSettingsChange?.();
  };

  const handleCreateStatus = async () => {
    if (!newStatusLabel.trim()) return;
    
    const statusKey = newStatusLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await createStatus({
      label: newStatusLabel,
      color: newStatusColor,
      status_key: statusKey
    });
    setNewStatusLabel('');
    setNewStatusColor('#6b7280');
    onSettingsChange?.();
  };

  const handleCreateField = async () => {
    if (!newFieldName.trim()) return;
    
    await createCustomField({
      name: newFieldName,
      field_type: newFieldType,
      options: null,
      is_required: false,
      show_in_card: false,
      show_in_detail: true,
      sort_order: customFields.length,
      is_active: true
    });
    setNewFieldName('');
    setNewFieldType('text');
    onSettingsChange?.();
  };

  // Wrapper functions to ensure parent is notified after changes
  const handleUpdateStatus = async (statusId: string, updates: Partial<OrganizationStatus>) => {
    await updateStatus(statusId, updates);
    onSettingsChange?.();
  };

  const handleDeleteStatus = async (statusId: string) => {
    await deleteStatus(statusId);
    onSettingsChange?.();
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    await deleteCustomField(fieldId);
    onSettingsChange?.();
  };

  const handleUpdatePermission = async (role: string, updates: Record<string, boolean>) => {
    await updatePermission(role, updates);
    onSettingsChange?.();
  };

  const toggleVisibleField = async (field: string) => {
    if (!settings) return;
    const newFields = settings.visible_fields.includes(field)
      ? settings.visible_fields.filter(f => f !== field)
      : [...settings.visible_fields, field];
    await updateSettings({ visible_fields: newFields });
    onSettingsChange?.();
  };
  
  // Wrapper to call callback after settings update
  const handleUpdateSettings = async (updates: Parameters<typeof updateSettings>[0]) => {
    await updateSettings(updates);
    onSettingsChange?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurar Tablero
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración del Tablero
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="statuses" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="statuses">Estados</TabsTrigger>
            <TabsTrigger value="rules">Reglas</TabsTrigger>
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
          </TabsList>

          {/* ESTADOS TAB */}
          <TabsContent value="statuses" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Crea y organiza los estados de tu flujo de trabajo
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Nombre del estado"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                className="flex-1"
              />
              <Select value={newStatusColor} onValueChange={setNewStatusColor}>
                <SelectTrigger className="w-32">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: newStatusColor }} />
                    Color
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color.value }} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateStatus} disabled={!newStatusLabel.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Crear
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {statuses.map((status, index) => (
                  <div
                    key={status.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card",
                      !status.is_active && "opacity-50"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div 
                      className="h-4 w-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: status.color }} 
                    />
                    
                    {editingStatus?.id === status.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingStatus.label}
                          onChange={(e) => setEditingStatus({ ...editingStatus, label: e.target.value })}
                          className="h-8"
                        />
                        <Select 
                          value={editingStatus.color} 
                          onValueChange={(color) => setEditingStatus({ ...editingStatus, color })}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: editingStatus.color }} />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_COLORS.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.value }} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => {
                            handleUpdateStatus(status.id, { label: editingStatus.label, color: editingStatus.color });
                            setEditingStatus(null);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => setEditingStatus(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{status.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {status.status_key}
                        </Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => handleUpdateStatus(status.id, { is_active: !status.is_active })}
                        >
                          {status.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => setEditingStatus(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteStatus(status.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                
                {statuses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay estados configurados. Crea el primero arriba.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* REGLAS TAB - Permisos de movimiento */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Define qué roles pueden avanzar o retroceder tarjetas desde cada estado
              </p>
            </div>
            
            <ScrollArea className="h-[350px] border rounded-lg p-3">
              <div className="space-y-4">
                {statuses.filter(s => s.is_active).map((status, index) => {
                  const rule = getRuleForStatus(status.id);
                  const canAdvanceRoles = rule?.can_advance_roles || [];
                  const canRetreatRoles = rule?.can_retreat_roles || [];
                  const canViewRoles = rule?.can_view_roles || ['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client'];
                  
                  return (
                    <Card key={status.id} className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="h-5 w-5 rounded-full flex-shrink-0 shadow-sm" 
                          style={{ backgroundColor: status.color }} 
                        />
                        <span className="font-semibold">{status.label}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          Orden: {status.sort_order + 1}
                        </Badge>
                      </div>
                      
                      {/* Visibilidad - Quién puede VER este estado */}
                      <div className="space-y-2 mb-4 pb-4 border-b">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <Label className="text-sm font-medium">Puede VER este estado</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Roles que pueden ver esta columna y sus tarjetas (si está vacío, nadie ve este estado)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES.map(role => {
                            const isActive = canViewRoles.includes(role);
                            return (
                              <Badge 
                                key={role}
                                variant={isActive ? "default" : "outline"}
                                className={cn(
                                  "text-xs cursor-pointer transition-all",
                                  isActive 
                                    ? "bg-blue-500/20 text-blue-700 border-blue-500 hover:bg-blue-500/30" 
                                    : "hover:bg-muted opacity-60"
                                )}
                                onClick={() => toggleRolePermission(status.id, role, 'view')}
                              >
                                {isActive && <Check className="h-3 w-3 mr-1" />}
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Quién puede AVANZAR */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-green-500" />
                            <Label className="text-sm font-medium">Puede AVANZAR</Label>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Roles que pueden mover al siguiente estado
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLES.map(role => {
                              const isActive = canAdvanceRoles.includes(role);
                              return (
                                <Badge 
                                  key={role}
                                  variant={isActive ? "default" : "outline"}
                                  className={cn(
                                    "text-xs cursor-pointer transition-all",
                                    isActive 
                                      ? "bg-green-500/20 text-green-700 border-green-500 hover:bg-green-500/30" 
                                      : "hover:bg-muted opacity-60"
                                  )}
                                  onClick={() => toggleRolePermission(status.id, role, 'advance')}
                                >
                                  {isActive && <Check className="h-3 w-3 mr-1" />}
                                  {ROLE_LABELS[role] || role}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quién puede RETROCEDER */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ChevronLeft className="h-4 w-4 text-orange-500" />
                            <Label className="text-sm font-medium">Puede RETROCEDER</Label>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Roles que pueden devolver a un estado anterior
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLES.map(role => {
                              const isActive = canRetreatRoles.includes(role);
                              return (
                                <Badge 
                                  key={role}
                                  variant={isActive ? "default" : "outline"}
                                  className={cn(
                                    "text-xs cursor-pointer transition-all",
                                    isActive 
                                      ? "bg-orange-500/20 text-orange-700 border-orange-500 hover:bg-orange-500/30" 
                                      : "hover:bg-muted opacity-60"
                                  )}
                                  onClick={() => toggleRolePermission(status.id, role, 'retreat')}
                                >
                                  {isActive && <Check className="h-3 w-3 mr-1" />}
                                  {ROLE_LABELS[role] || role}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {statuses.filter(s => s.is_active).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Crea estados primero para configurar reglas de movimiento.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TARJETAS TAB */}
          <TabsContent value="cards" className="space-y-6">
            {/* Card Size Selection */}
            <div>
              <Label className="text-sm font-medium">Tamaño de tarjeta</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Elige el tamaño predeterminado de las tarjetas en el tablero
              </p>
              <div className="flex gap-2">
                {(['compact', 'normal', 'large'] as const).map(size => (
                  <Card
                    key={size}
                    className={cn(
                      "p-3 cursor-pointer transition-all hover:border-primary/50",
                      settings?.card_size === size && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleUpdateSettings({ card_size: size })}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "rounded bg-muted",
                        size === 'compact' && "w-12 h-8",
                        size === 'normal' && "w-16 h-12",
                        size === 'large' && "w-20 h-16"
                      )} />
                      <span className="text-xs font-medium">
                        {size === 'compact' ? 'Compacta' : size === 'normal' ? 'Normal' : 'Grande'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Default View Selection */}
            <div>
              <Label className="text-sm font-medium">Vista predeterminada</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Vista que se muestra al abrir el tablero
              </p>
              <div className="flex gap-2">
                {(['kanban', 'list', 'calendar', 'table'] as const).map(view => (
                  <Button
                    key={view}
                    variant={settings?.default_view === view ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUpdateSettings({ default_view: view })}
                  >
                    {view === 'kanban' ? 'Kanban' : view === 'list' ? 'Lista' : view === 'calendar' ? 'Calendario' : 'Tabla'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Visual Card Editor */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Editor visual de tarjeta
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Configura qué información mostrar en las tarjetas y en qué orden
              </p>
              
              {/* Card Preview */}
              <div className="flex gap-4">
                {/* Fields selector */}
                <ScrollArea className="flex-1 h-[240px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {VISIBLE_FIELD_OPTIONS.map((field, index) => {
                      const isActive = settings?.visible_fields.includes(field.value);
                      const fieldIndex = settings?.visible_fields.indexOf(field.value) ?? -1;
                      
                      return (
                        <div
                          key={field.value}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg border transition-all",
                            isActive ? "bg-primary/10 border-primary" : "hover:bg-muted border-transparent"
                          )}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          
                          <Checkbox 
                            checked={isActive}
                            onCheckedChange={() => toggleVisibleField(field.value)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{field.label}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {field.description}
                            </div>
                          </div>
                          
                          {isActive && (
                            <Badge variant="secondary" className="text-xs">
                              #{fieldIndex + 1}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                {/* Live Preview */}
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs text-muted-foreground mb-2">Vista previa</div>
                  <Card className={cn(
                    "p-2 space-y-2 transition-all",
                    settings?.card_size === 'compact' && "p-1.5",
                    settings?.card_size === 'large' && "p-3"
                  )}>
                    {settings?.visible_fields.includes('thumbnail') && (
                      <div className="aspect-video bg-muted rounded" />
                    )}
                    {settings?.visible_fields.includes('title') && (
                      <div className="h-3 bg-foreground/20 rounded w-3/4" />
                    )}
                    {settings?.visible_fields.includes('client') && (
                      <div className="h-2 bg-muted-foreground/30 rounded w-1/2" />
                    )}
                    <div className="flex items-center gap-2">
                      {settings?.visible_fields.includes('status') && (
                        <div className="h-4 w-12 bg-primary/30 rounded-full" />
                      )}
                      {settings?.visible_fields.includes('responsible') && (
                        <div className="h-5 w-5 bg-muted rounded-full" />
                      )}
                      {settings?.visible_fields.includes('deadline') && (
                        <div className="h-2 bg-muted-foreground/20 rounded w-12" />
                      )}
                    </div>
                    {settings?.visible_fields.includes('progress') && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-primary rounded-full" />
                      </div>
                    )}
                    {settings?.visible_fields.includes('indicators') && (
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <div className="h-2 w-2 rounded-full bg-muted" />
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CAMPOS PERSONALIZADOS TAB */}
          <TabsContent value="fields" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crea campos personalizados tipo Notion para tus proyectos
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Nombre del campo"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="flex-1"
              />
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as BoardCustomField['field_type'])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateField} disabled={!newFieldName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Crear
              </Button>
            </div>

            <ScrollArea className="h-[280px] border rounded-lg p-2">
              <div className="space-y-2">
                {customFields.map(field => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="flex-1 font-medium">{field.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>En tarjeta:</span>
                      <Switch
                        checked={field.show_in_card}
                        onCheckedChange={() => {}}
                      />
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteCustomField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {customFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay campos personalizados. Crea el primero arriba.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* PERMISOS TAB */}
          <TabsContent value="permissions" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define qué puede hacer cada rol en el tablero
            </p>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left font-medium">Rol</th>
                    <th className="p-3 text-center font-medium">Crear</th>
                    <th className="p-3 text-center font-medium">Mover</th>
                    <th className="p-3 text-center font-medium">Editar</th>
                    <th className="p-3 text-center font-medium">Eliminar</th>
                    <th className="p-3 text-center font-medium">Aprobar</th>
                    <th className="p-3 text-center font-medium">Configurar</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map(role => {
                    const perm = permissions.find(p => p.role === role);
                    return (
                      <tr key={role} className="border-t">
                        <td className="p-3 font-medium capitalize">{role}</td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_create_cards ?? false}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_create_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_move_cards ?? true}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_move_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_edit_fields ?? false}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_edit_fields: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_delete_cards ?? false}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_delete_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_approve ?? false}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_approve: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_configure_board ?? false}
                            onCheckedChange={(checked) => handleUpdatePermission(role, { can_configure_board: !!checked })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* SCRIPTS TAB */}
          <TabsContent value="scripts" className="space-y-4">
            <ScriptPermissionsEditor organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
