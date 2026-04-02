import { useState, useCallback, useEffect } from "react";
import { Settings, Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Check, X, ArrowUp, ArrowDown, Palette, ChevronRight, ChevronLeft, Lock, FileText, Zap, Filter, Workflow, Activity, Bell, Plug } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useBoardSettings, OrganizationStatus, BoardCustomField, StatePermission } from "@/hooks/useBoardSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScriptPermissionsEditor } from "@/components/settings/ScriptPermissionsEditor";
import { ColorPicker } from "./config/ColorPicker";
import { IconPicker } from "./config/IconPicker";
import { SortableStatusRow } from "./config/SortableStatusRow";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface BoardConfigDialogProps {
  organizationId: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSettingsChange?: () => void; // Callback when settings change
}

const STATUS_COLORS = [
  { value: '#6b7280', label: 'Gris' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#a855f7', label: 'Púrpura' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#22d3ee', label: 'Cian claro' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#ef4444', label: 'Rojo' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'datetime', label: 'Fecha y hora' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'multiselect', label: 'Multi-selector' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'currency', label: 'Moneda' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'rating', label: 'Rating (estrellas)' },
  { value: 'color', label: 'Color' },
  { value: 'tags', label: 'Etiquetas' },
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

const ROLES = ['admin', 'team_leader', 'creator', 'editor', 'strategist', 'client', 'trafficker', 'designer'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  team_leader: 'Líder Equipo',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  client: 'Cliente',
  trafficker: 'Trafficker',
  designer: 'Diseñador'
};

export function BoardConfigDialog({ organizationId, trigger, open: controlledOpen, onOpenChange, onSettingsChange }: BoardConfigDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [editingStatus, setEditingStatus] = useState<OrganizationStatus | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6b7280');
  const [newStatusIcon, setNewStatusIcon] = useState<string | null>(null);
  const [newStatusDescription, setNewStatusDescription] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<BoardCustomField['field_type']>('text');

  const [statusToDelete, setStatusToDelete] = useState<OrganizationStatus | null>(null);
  const [contentCountsByStatus, setContentCountsByStatus] = useState<Record<string, number>>({});
  const statusSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    loading,
    settings,
    statuses,
    rules,
    customFields,
    permissions,
    statePermissions,
    refetch,
    updateSettings,
    createStatus,
    updateStatus,
    deleteStatus,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    updatePermission,
    updateStatusRule,
    reorderStatuses,
    upsertStatePermission,
    kanbanConfigJson,
    updateKanbanConfig,
  } = useBoardSettings(organizationId);

  // Refetch al abrir el diálogo para cargar configuración actual
  useEffect(() => {
    if (open && organizationId) {
      refetch();
    }
  }, [open, organizationId, refetch]);

  // Cargar conteo de contenidos por estado cuando abre el diálogo
  useEffect(() => {
    if (!open || !organizationId) return;
    const loadContentCounts = async () => {
      const { data } = await supabase
        .from("content")
        .select("status")
        .eq("organization_id", organizationId)
        .not("status", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: { status: string }) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      setContentCountsByStatus(counts);
    };
    loadContentCounts();
  }, [open, organizationId]);

  const getContentCountForStatus = (statusKey: string) =>
    contentCountsByStatus[statusKey] ?? 0;

  const getStatePermission = (statusId: string, role: string) =>
    statePermissions.find(p => p.status_id === statusId && p.role === role) ?? null;

  const toggleStatePermission = async (
    statusId: string,
    role: string,
    field: 'can_view' | 'can_view_assigned_only' | 'can_move_to' | 'can_edit',
    value: boolean
  ) => {
    const existing = getStatePermission(statusId, role);
    await upsertStatePermission({
      status_id: statusId,
      role,
      ...(existing && {
        can_view: existing.can_view,
        can_view_assigned_only: existing.can_view_assigned_only,
        can_move_to: existing.can_move_to,
        can_edit: existing.can_edit,
      }),
      [field]: value,
    });
    onSettingsChange?.();
  };

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
      status_key: statusKey,
      icon: newStatusIcon,
      description: newStatusDescription.trim() || null,
    });
    setNewStatusLabel('');
    setNewStatusColor('#6b7280');
    setNewStatusIcon(null);
    setNewStatusDescription('');
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
    setStatusToDelete(null);
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

  const TAB_ITEMS = [
    { id: "statuses", label: "Estados", icon: Workflow },
    { id: "state-permissions", label: "Permisos", icon: Lock },
    { id: "rules", label: "Transiciones", icon: ChevronRight },
    { id: "cards", label: "Tarjetas", icon: Palette },
    { id: "fields", label: "Campos", icon: FileText },
    { id: "permissions", label: "Permisos Rol", icon: Lock },
    { id: "visibility", label: "Visibilidad", icon: Filter },
    { id: "automations", label: "Automatizaciones", icon: Activity },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "integrations", label: "Integraciones", icon: Plug },
    { id: "scripts", label: "Scripts", icon: Zap },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurar Tablero
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 gap-0 overflow-hidden flex flex-col bg-[#0a0a18]/95 border-purple-500/15"
        aria-describedby="board-config-description"
      >
        <Tabs defaultValue="statuses" className="flex h-full overflow-hidden">
          <div className="flex h-full w-full overflow-hidden">
            {/* Sidebar - Nova v2 */}
            <aside className="w-56 shrink-0 flex flex-col border-r border-purple-500/10 bg-[#0f0f22]/60">
              <SheetHeader className="p-4 border-b border-purple-500/10 shrink-0">
                <SheetTitle className="flex items-center gap-2 text-[#e4e4e7] text-lg">
                  <Settings className="h-5 w-5 text-[#8b5cf6]" />
                  Configuracion
                </SheetTitle>
                <SheetDescription id="board-config-description" className="sr-only">
                  Configura estados, permisos, transiciones, campos y visibilidad del tablero Kanban.
                </SheetDescription>
              </SheetHeader>
              <TabsList className="flex-1 flex flex-col h-auto rounded-none bg-transparent border-0 p-0 overflow-y-auto">
                {TAB_ITEMS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "w-full justify-start gap-2 h-10 px-4 rounded-none border-l-2 border-transparent mt-0.5",
                      "data-[state=active]:border-[#8b5cf6] data-[state=active]:bg-purple-500/10 data-[state=active]:text-[#a78bfa]",
                      "hover:bg-purple-500/5 text-[#a1a1aa] transition-colors duration-150"
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </aside>

            {/* Contenido principal - scrollable */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">

          {/* ESTADOS TAB */}
          <TabsContent value="statuses" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden min-h-0">
            {!organizationId && (
              <div className="rounded-sm border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
                No hay organización seleccionada. Asegúrate de estar en el tablero de una organización.
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Crea y organiza los estados de tu flujo de trabajo
              </p>
              {statuses.length === 0 && organizationId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    toast({ title: "Recargando configuración…" });
                    await refetch();
                    onSettingsChange?.();
                    toast({ title: "Configuración actualizada", description: "Si había datos pendientes, ya deberían aparecer." });
                  }}
                  disabled={loading}
                >
                  {loading ? "Cargando…" : "Recargar / Inicializar estados"}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Nombre del estado"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  className="flex-1 min-w-[180px]"
                />
                <ColorPicker value={newStatusColor} onChange={setNewStatusColor} />
                <IconPicker value={newStatusIcon} onChange={setNewStatusIcon} />
                <Button onClick={handleCreateStatus} disabled={!newStatusLabel.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar estado
                </Button>
              </div>
              <Input
                placeholder="Descripción (opcional)"
                value={newStatusDescription}
                onChange={(e) => setNewStatusDescription(e.target.value)}
                className="max-w-md"
              />
            </div>

            <ScrollArea className="h-[300px] border border-purple-500/15 rounded-lg p-2 bg-[#0f0f22]/40">
              <DndContext
                sensors={statusSensors}
                collisionDetection={closestCenter}
                onDragEnd={async (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const oldIndex = statuses.findIndex((s) => s.id === active.id);
                  const newIndex = statuses.findIndex((s) => s.id === over.id);
                  if (oldIndex === -1 || newIndex === -1) return;
                  const reordered = arrayMove(statuses, oldIndex, newIndex);
                  await reorderStatuses(reordered.map((s) => s.id));
                  onSettingsChange?.();
                  toast({ title: "Orden actualizado" });
                }}
              >
                <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {statuses.map((status) => (
                      <SortableStatusRow key={status.id} id={status.id} isActive={status.is_active}>
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
                        <ColorPicker
                          value={editingStatus.color}
                          onChange={(color) => setEditingStatus({ ...editingStatus, color })}
                          className="h-8"
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => {
                            handleUpdateStatus(status.id, { label: editingStatus.label, color: editingStatus.color, icon: editingStatus.icon ?? null });
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
                        <span className="text-xs text-muted-foreground">
                          {getContentCountForStatus(status.status_key)} contenido(s)
                        </span>
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
                          onClick={() => setStatusToDelete(status)}
                          disabled={getContentCountForStatus(status.status_key) > 0}
                          title={getContentCountForStatus(status.status_key) > 0 ? `No se puede eliminar: tiene ${getContentCountForStatus(status.status_key)} contenido(s)` : "Eliminar estado"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                      </SortableStatusRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {statuses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay estados configurados. Crea el primero arriba.
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* MATRIZ PERMISOS POR ESTADO/ROL */}
          <TabsContent value="state-permissions" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Matriz de permisos: por estado y rol
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={async () => {
                  for (const s of statuses.filter(s => s.is_active)) {
                    for (const role of ROLES.filter(r => !['trafficker', 'designer'].includes(r))) {
                      await upsertStatePermission({ status_id: s.id, role, can_view: true, can_view_assigned_only: false, can_move_to: true, can_edit: true });
                    }
                  }
                  toast({ title: "Preset Admin aplicado", description: "Todos los permisos activados" });
                  await refetch();
                  onSettingsChange?.();
                }}>
                  Preset Admin
                </Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  for (const s of statuses.filter(s => s.is_active)) {
                    const clientVisible = ['delivered', 'approved', 'issue', 'corrected'].includes(s.status_key);
                    await upsertStatePermission({
                      status_id: s.id,
                      role: 'client',
                      can_view: clientVisible,
                      can_view_assigned_only: clientVisible,
                      can_move_to: clientVisible,
                      can_edit: false
                    });
                  }
                  toast({ title: "Preset Cliente aplicado", description: "Solo estados de revisión visibles" });
                  await refetch();
                  onSettingsChange?.();
                }}>
                  Preset Cliente
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="border rounded-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Estado</th>
                      {ROLES.filter(r => !['trafficker', 'designer'].includes(r)).map(role => (
                        <th key={role} className="p-2 text-center font-medium text-xs">{ROLE_LABELS[role] || role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.filter(s => s.is_active).map(status => (
                      <tr key={status.id} className="border-t">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                            <span className="font-medium truncate max-w-[120px]">{status.label}</span>
                          </div>
                        </td>
                        {ROLES.filter(r => !['trafficker', 'designer'].includes(r)).map(role => {
                          const perm = getStatePermission(status.id, role);
                          return (
                            <td key={`${status.id}-${role}`} className="p-1">
                              <div className="flex flex-wrap gap-1 justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      checked={perm?.can_view ?? (rules.find(r => r.status_id === status.id)?.can_view_roles?.includes(role) ?? true)}
                                      onCheckedChange={(c) => toggleStatePermission(status.id, role, 'can_view', !!c)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>Ver columna</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      checked={perm?.can_view_assigned_only ?? false}
                                      onCheckedChange={(c) => toggleStatePermission(status.id, role, 'can_view_assigned_only', !!c)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>Ver solo asignados</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      checked={perm?.can_move_to ?? false}
                                      onCheckedChange={(c) => toggleStatePermission(status.id, role, 'can_move_to', !!c)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>Mover a este estado</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Checkbox
                                      checked={perm?.can_edit ?? false}
                                      onCheckedChange={(c) => toggleStatePermission(status.id, role, 'can_edit', !!c)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>Editar en este estado</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {statuses.filter(s => s.is_active).length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Crea estados primero</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Si no hay permiso explícito en la matriz, se usan las reglas de la pestaña Transiciones y Permisos Rol.
            </p>
          </TabsContent>

          {/* REGLAS TAB - Permisos de movimiento y transiciones */}
          <TabsContent value="rules" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Define qué roles pueden avanzar o retroceder tarjetas desde cada estado
              </p>
            </div>
            
            <ScrollArea className="h-[350px] border rounded-sm p-3">
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
          <TabsContent value="cards" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0 data-[state=inactive]:hidden">
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
                <ScrollArea className="flex-1 h-[240px] border rounded-sm p-3">
                  <div className="space-y-2">
                    {VISIBLE_FIELD_OPTIONS.map((field, index) => {
                      const isActive = settings?.visible_fields.includes(field.value);
                      const fieldIndex = settings?.visible_fields.indexOf(field.value) ?? -1;
                      
                      return (
                        <div
                          key={field.value}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-sm border transition-all",
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
          <TabsContent value="fields" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
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

            <ScrollArea className="h-[280px] border rounded-sm p-2">
              <div className="space-y-2">
                {customFields.map(field => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-sm border bg-card"
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
          <TabsContent value="permissions" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <p className="text-sm text-muted-foreground">
              Define qué puede hacer cada rol en el tablero
            </p>

            <div className="border rounded-sm overflow-hidden">
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

          {/* VISIBILIDAD TAB */}
          <TabsContent value="visibility" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Configura qué ve cada rol. Admin/Estratega: tablero completo. Editor/Creador: todo + filtro &quot;Mis asignaciones&quot;. Cliente: solo estados configurados + solo su contenido.
              </p>
            </div>
            <Card className="p-4">
              <Label className="text-sm font-medium">Mostrar contenido no asignado</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Para roles limitados (ej. Creador), ¿mostrar tarjetas sin asignar en estados que pueden ver?
              </p>
              <Switch
                checked={(kanbanConfigJson as { show_unassigned?: boolean })?.show_unassigned ?? false}
                onCheckedChange={(c) => updateKanbanConfig?.({ ...(kanbanConfigJson || {}), show_unassigned: c })}
              />
            </Card>
          </TabsContent>

          {/* AUTOMATIZACIONES TAB */}
          <TabsContent value="automations" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Configura reglas automáticas: cuando un contenido cambie de estado, asigna usuarios, envía notificaciones, etc.
              </p>
            </div>
            <Card className="p-6 border-dashed">
              <div className="text-center text-muted-foreground space-y-2">
                <Activity className="h-12 w-12 mx-auto opacity-50" />
                <p className="font-medium">Automatizaciones (próximamente)</p>
                <p className="text-sm">Crea reglas tipo &quot;Si X entonces Y&quot; para tu flujo de trabajo.</p>
              </div>
            </Card>
          </TabsContent>

          {/* NOTIFICACIONES TAB */}
          <TabsContent value="notifications" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Configura qué notificaciones recibe cada rol y por qué canal (in-app, email, push).
              </p>
            </div>
            <Card className="p-6 border-dashed">
              <div className="text-center text-muted-foreground space-y-2">
                <Bell className="h-12 w-12 mx-auto opacity-50" />
                <p className="font-medium">Notificaciones (próximamente)</p>
                <p className="text-sm">Personaliza eventos y canales de notificación.</p>
              </div>
            </Card>
          </TabsContent>

          {/* INTEGRACIONES TAB */}
          <TabsContent value="integrations" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 mb-4">
              <Plug className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Webhooks, API, Zapier, Make, n8n. Conecta el tablero con herramientas externas.
              </p>
            </div>
            <Card className="p-6 border-dashed">
              <div className="text-center text-muted-foreground space-y-2">
                <Plug className="h-12 w-12 mx-auto opacity-50" />
                <p className="font-medium">Integraciones (próximamente)</p>
                <p className="text-sm">Webhooks, tokens de API y conectores para automatizar.</p>
              </div>
            </Card>
          </TabsContent>

          {/* SCRIPTS TAB */}
          <TabsContent value="scripts" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0 data-[state=inactive]:hidden">
            <ScriptPermissionsEditor organizationId={organizationId} />
          </TabsContent>
            </div>
          </div>
        </Tabs>

        <AlertDialog open={!!statusToDelete} onOpenChange={(o) => !o && setStatusToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
              <AlertDialogDescription>
                {statusToDelete && (
                  <>Se eliminará el estado &quot;{statusToDelete.label}&quot;. Si tiene contenido asignado, verifica antes de continuar.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => statusToDelete && handleDeleteStatus(statusToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
