import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, Target, Zap, Edit2, Trash2, 
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Shield, Play, ChevronDown
} from 'lucide-react';
import { UPRule, useUPEngine } from '@/hooks/useUPEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RuleSimulator } from './RuleSimulator';

interface UPRulesBuilderProps {
  organizationId: string;
  rules: UPRule[];
  onRefresh: () => void;
}

const EVENT_TYPES = [
  { value: 'content_completed', label: 'Contenido Completado', icon: CheckCircle2 },
  { value: 'early_delivery', label: 'Entrega Anticipada', icon: TrendingUp },
  { value: 'late_delivery', label: 'Entrega Tardía', icon: Clock },
  { value: 'correction_requested', label: 'Ajuste Solicitado', icon: AlertTriangle },
  { value: 'content_approved', label: 'Contenido Aprobado', icon: CheckCircle2 },
  { value: 'perfect_streak', label: 'Racha de Excelencia', icon: Zap },
  { value: 'quality_bonus', label: 'Bonus por Calidad', icon: Target },
  { value: 'quest_completed', label: 'Objetivo Completado', icon: Target }
];

const APPLICABLE_ROLES = [
  { value: 'creator', label: 'Creador' },
  { value: 'editor', label: 'Editor' },
  { value: 'strategist', label: 'Estratega' },
  { value: 'designer', label: 'Diseñador' },
  { value: 'trafficker', label: 'Trafficker' },
  { value: 'all', label: 'Todos' }
];

export function UPRulesBuilder({ organizationId, rules, onRefresh }: UPRulesBuilderProps) {
  const { createRule, updateRule, deleteRule } = useUPEngine(organizationId);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<UPRule | null>(null);
  const [formData, setFormData] = useState({
    event_type_key: '',
    name: '',
    description: '',
    points: 10,
    is_penalty: false,
    applies_to_roles: ['all'] as string[],
    max_per_day: 0,
    max_per_week: 0,
    max_per_content: 1
  });

  const resetForm = () => {
    setFormData({
      event_type_key: '',
      name: '',
      description: '',
      points: 10,
      is_penalty: false,
      applies_to_roles: ['all'],
      max_per_day: 0,
      max_per_week: 0,
      max_per_content: 1
    });
  };

  const handleCreate = async () => {
    try {
      await createRule({
        ...formData,
        is_active: true
      });
      toast({ title: 'Regla creada', description: 'La regla se ha creado correctamente.' });
      setIsCreating(false);
      resetForm();
      onRefresh();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo crear la regla.', 
        variant: 'destructive' 
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    try {
      await updateRule(editingRule.id, formData);
      toast({ title: 'Regla actualizada', description: 'Los cambios se han guardado.' });
      setEditingRule(null);
      resetForm();
      onRefresh();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo actualizar la regla.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      toast({ title: 'Regla eliminada', description: 'La regla ha sido eliminada.' });
      onRefresh();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo eliminar la regla.', 
        variant: 'destructive' 
      });
    }
  };

  const handleToggleActive = async (rule: UPRule) => {
    try {
      await updateRule(rule.id, { is_active: !rule.is_active });
      onRefresh();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo cambiar el estado.', 
        variant: 'destructive' 
      });
    }
  };

  const openEdit = (rule: UPRule) => {
    setFormData({
      event_type_key: rule.event_type_key,
      name: rule.name,
      description: rule.description || '',
      points: rule.points,
      is_penalty: rule.is_penalty,
      applies_to_roles: rule.applies_to_roles || ['all'],
      max_per_day: rule.max_per_day || 0,
      max_per_week: rule.max_per_week || 0,
      max_per_content: rule.max_per_content || 1
    });
    setEditingRule(rule);
  };

  const RuleForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Evento</Label>
          <Select 
            value={formData.event_type_key} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, event_type_key: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar evento" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map(et => (
                <SelectItem key={et.value} value={et.value}>
                  <div className="flex items-center gap-2">
                    <et.icon className="w-4 h-4" />
                    {et.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Nombre de la Regla</Label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Bonus por entrega temprana"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea 
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe cuándo y cómo se aplica esta regla..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Puntos</Label>
          <Input 
            type="number"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
          />
        </div>

        <div className="space-y-2 flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <Switch 
              checked={formData.is_penalty}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_penalty: checked }))}
            />
            <Label className={formData.is_penalty ? 'text-destructive' : ''}>
              {formData.is_penalty ? 'Penalización' : 'Recompensa'}
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Rol Aplicable</Label>
          <Select 
            value={formData.applies_to_roles[0] || 'all'} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, applies_to_roles: [v] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICABLE_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Limits */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Límites Anti-Abuso
        </Label>
        <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Máx. Diario</Label>
            <Input 
              type="number"
              value={formData.max_per_day || 0}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_per_day: parseInt(e.target.value) || 0
              }))}
              placeholder="0 = sin límite"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Máx. Semanal</Label>
            <Input 
              type="number"
              value={formData.max_per_week || 0}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_per_week: parseInt(e.target.value) || 0
              }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Por Contenido</Label>
            <Input 
              type="number"
              value={formData.max_per_content || 1}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_per_content: parseInt(e.target.value) || 1
              }))}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreating(false); setEditingRule(null); resetForm(); }}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  const [simulatorOpen, setSimulatorOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Constructor de Reglas</h3>
          <p className="text-sm text-muted-foreground">
            Define cómo se otorgan y penalizan puntos UP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSimulatorOpen(!simulatorOpen)}>
            <Play className="w-4 h-4 mr-2" />
            Simulador
          </Button>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Regla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Regla</DialogTitle>
                <DialogDescription>
                  Define las condiciones y puntos para esta regla
                </DialogDescription>
              </DialogHeader>
              <RuleForm onSubmit={handleCreate} submitLabel="Crear Regla" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Simulador Colapsable */}
      <Collapsible open={simulatorOpen} onOpenChange={setSimulatorOpen}>
        <CollapsibleContent>
          <RuleSimulator rules={rules} organizationId={organizationId} />
        </CollapsibleContent>
      </Collapsible>

      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {rules.length > 0 ? (
            rules.map(rule => {
              const eventType = EVENT_TYPES.find(e => e.value === rule.event_type_key);
              const EventIcon = eventType?.icon || Target;

              return (
                <Card 
                  key={rule.id}
                  className={cn(
                    "border transition-colors",
                    !rule.is_active && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          rule.is_penalty ? "bg-destructive/20" : "bg-success/20"
                        )}>
                          <EventIcon className={cn(
                            "w-5 h-5",
                            rule.is_penalty ? "text-destructive" : "text-success"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            {rule.is_penalty && (
                              <Badge variant="destructive">Penalización</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rule.description || eventType?.label}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className={cn(
                              "font-bold",
                              rule.is_penalty ? "text-destructive" : "text-success"
                            )}>
                              {rule.is_penalty ? '-' : '+'}{rule.points} UP
                            </span>
                            <span>Roles: {rule.applies_to_roles?.join(', ') || 'Todos'}</span>
                            {rule.max_per_day && rule.max_per_day > 0 && (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Máx {rule.max_per_day}/día
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEdit(rule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-1">Sin reglas configuradas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primera regla para comenzar a otorgar puntos
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Regla
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Regla</DialogTitle>
            <DialogDescription>
              Modifica las condiciones y puntos de esta regla
            </DialogDescription>
          </DialogHeader>
          <RuleForm onSubmit={handleUpdate} submitLabel="Guardar Cambios" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
