import { useState } from "react";
import { Settings, Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Check, X } from "lucide-react";
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

interface BoardConfigDialogProps {
  organizationId: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  { value: 'title', label: 'Título' },
  { value: 'thumbnail', label: 'Miniatura' },
  { value: 'status', label: 'Estado' },
  { value: 'responsible', label: 'Responsable' },
  { value: 'client', label: 'Cliente' },
  { value: 'deadline', label: 'Fecha límite' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'points', label: 'Puntos UP' },
  { value: 'tags', label: 'Etiquetas' },
];

const ROLES = ['admin', 'creator', 'editor', 'strategist', 'client'];

export function BoardConfigDialog({ organizationId, trigger, open: controlledOpen, onOpenChange }: BoardConfigDialogProps) {
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
    customFields,
    permissions,
    updateSettings,
    createStatus,
    updateStatus,
    deleteStatus,
    createCustomField,
    deleteCustomField,
    updatePermission
  } = useBoardSettings(organizationId);

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
  };

  const toggleVisibleField = (field: string) => {
    if (!settings) return;
    const newFields = settings.visible_fields.includes(field)
      ? settings.visible_fields.filter(f => f !== field)
      : [...settings.visible_fields, field];
    updateSettings({ visible_fields: newFields });
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statuses">Estados</TabsTrigger>
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
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
                            updateStatus(status.id, { label: editingStatus.label, color: editingStatus.color });
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
                          onClick={() => updateStatus(status.id, { is_active: !status.is_active })}
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
                          onClick={() => deleteStatus(status.id)}
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

          {/* TARJETAS TAB */}
          <TabsContent value="cards" className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Tamaño de tarjeta</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Elige el tamaño predeterminado de las tarjetas en el tablero
              </p>
              <div className="flex gap-2">
                {(['compact', 'normal', 'large'] as const).map(size => (
                  <Button
                    key={size}
                    variant={settings?.card_size === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ card_size: size })}
                  >
                    {size === 'compact' ? 'Compacta' : size === 'normal' ? 'Normal' : 'Grande'}
                  </Button>
                ))}
              </div>
            </div>

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
                    onClick={() => updateSettings({ default_view: view })}
                  >
                    {view === 'kanban' ? 'Kanban' : view === 'list' ? 'Lista' : view === 'calendar' ? 'Calendario' : 'Tabla'}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Campos visibles en tarjeta</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Selecciona qué información mostrar en las tarjetas
              </p>
              <div className="grid grid-cols-3 gap-2">
                {VISIBLE_FIELD_OPTIONS.map(field => (
                  <div
                    key={field.value}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      settings?.visible_fields.includes(field.value)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleVisibleField(field.value)}
                  >
                    <Checkbox checked={settings?.visible_fields.includes(field.value)} />
                    <span className="text-sm">{field.label}</span>
                  </div>
                ))}
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
                      onClick={() => deleteCustomField(field.id)}
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
                            onCheckedChange={(checked) => updatePermission(role, { can_create_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_move_cards ?? true}
                            onCheckedChange={(checked) => updatePermission(role, { can_move_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_edit_fields ?? false}
                            onCheckedChange={(checked) => updatePermission(role, { can_edit_fields: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_delete_cards ?? false}
                            onCheckedChange={(checked) => updatePermission(role, { can_delete_cards: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_approve ?? false}
                            onCheckedChange={(checked) => updatePermission(role, { can_approve: !!checked })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={perm?.can_configure_board ?? false}
                            onCheckedChange={(checked) => updatePermission(role, { can_configure_board: !!checked })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
