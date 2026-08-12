/**
 * PromptsSection — Panel de administración de prompts de IA
 * Diseño "a prueba de niños": BigCards, emojis, variables coloreadas.
 * Solo visible para platform root.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  usePlatformPrompts,
  usePromptModules,
  useUpdatePrompt,
  useCreatePrompt,
  PlatformPrompt,
  PromptVariable,
} from '@/hooks/usePlatformPrompts';
import {
  Loader2,
  Save,
  Plus,
  Pencil,
  Code2,
  Eye,
  EyeOff,
  Search,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Configuración de módulos
// ---------------------------------------------------------------------------

interface ModuleConfig {
  emoji: string;
  label: string;
  description: string;
  color: string;
}

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  base: {
    emoji: '🏗️',
    label: 'Base',
    description: 'Identidad y reglas globales de la IA',
    color: 'slate',
  },
  scripts: {
    emoji: '🎬',
    label: 'Guiones',
    description: 'Todos los generadores de guiones UGC',
    color: 'violet',
  },
  board: {
    emoji: '📋',
    label: 'Board',
    description: 'Análisis inteligente del tablero Kanban',
    color: 'blue',
  },
  talent: {
    emoji: '🏆',
    label: 'Talento',
    description: 'Evaluación y matching de creadores',
    color: 'amber',
  },
  research: {
    emoji: '🔬',
    label: 'Investigación',
    description: 'ADN V2 — Método KIRO (21 pasos)',
    color: 'cyan',
  },
  dna: {
    emoji: '🧬',
    label: 'ADN',
    description: 'ADN de marca, talento y producto',
    color: 'rose',
  },
  social: {
    emoji: '📲',
    label: 'Social Hub',
    description: 'Copies para redes sociales',
    color: 'pink',
  },
  skills: {
    emoji: '🎭',
    label: 'Skills IA',
    description: 'Micro-agentes especializados de escritura (20)',
    color: 'indigo',
  },
  skills_backend: {
    emoji: '⚙️',
    label: 'Motor Skills',
    description: 'Motor de generación v2 — 14 agentes avanzados',
    color: 'gray',
  },
};

function getModuleConfig(module: string): ModuleConfig {
  return (
    MODULE_CONFIG[module] ?? {
      emoji: '📄',
      label: module,
      description: `Módulo ${module}`,
      color: 'slate',
    }
  );
}

// ---------------------------------------------------------------------------
// Barra de temperatura coloreada
// ---------------------------------------------------------------------------

function TemperatureBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);

  let barColor = 'bg-blue-500';
  let label = 'Preciso';
  if (value >= 0.7) {
    barColor = 'bg-orange-500';
    label = 'Creativo';
  } else if (value >= 0.4) {
    barColor = 'bg-yellow-500';
    label = 'Balanceado';
  }
  if (value >= 1.0) {
    barColor = 'bg-red-500';
    label = 'Máximo';
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">🌡️</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground">
        {value} · {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips de variables
// ---------------------------------------------------------------------------

function VariableChip({ variable }: { variable: PromptVariable }) {
  const label = `{${variable.key}}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {variable.required ? (
            <Badge className="font-mono text-xs cursor-default bg-indigo-600 hover:bg-indigo-700 text-white border-0">
              {label}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="font-mono text-xs cursor-default text-muted-foreground"
            >
              {label}
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-semibold mb-0.5">
            {variable.required ? '● Requerida' : '○ Opcional'}
          </p>
          {(variable as PromptVariable & { description?: string }).description && (
            <p className="text-muted-foreground">
              {(variable as PromptVariable & { description?: string }).description}
            </p>
          )}
          {variable.default !== undefined && (
            <p className="text-muted-foreground mt-0.5">
              Default: <span className="font-mono">{variable.default}</span>
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// PromptBigCard
// ---------------------------------------------------------------------------

function PromptBigCard({
  prompt,
  moduleConfig,
  onEdit,
}: {
  prompt: PlatformPrompt;
  moduleConfig: ModuleConfig;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const requiredVars = prompt.variables?.filter((v) => v.required) ?? [];
  const optionalVars = prompt.variables?.filter((v) => !v.required) ?? [];
  const hasVars = (prompt.variables?.length ?? 0) > 0;

  return (
    <Card className="flex flex-col gap-0 overflow-hidden border border-border/60 hover:border-border transition-colors">
      {/* Header de la card */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl flex-shrink-0" aria-hidden="true">
              {moduleConfig.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate">
                {prompt.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {prompt.module}/{prompt.prompt_key}
              </p>
            </div>
          </div>
          {prompt.category && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {prompt.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 flex flex-col gap-3">
        {/* Descripción */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {prompt.description ?? 'Sin descripción'}
        </p>

        {/* Variables */}
        {hasVars && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Code2 className="h-3 w-3" />
              <span>Variables que usa:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredVars.map((v) => (
                <VariableChip key={v.key} variable={v} />
              ))}
              {optionalVars.map((v) => (
                <VariableChip key={v.key} variable={v} />
              ))}
            </div>
          </div>
        )}

        {/* Config: temperatura + tokens */}
        <div className="flex items-center gap-4 flex-wrap">
          <TemperatureBar value={prompt.temperature} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>📦</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {prompt.max_tokens.toLocaleString()} tokens
            </Badge>
          </div>
          {prompt.model && prompt.model !== 'default' && (
            <Badge variant="outline" className="text-xs">
              {prompt.model}
            </Badge>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Ocultar prompt
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Ver prompt
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>

        {/* Contenido expandido */}
        {expanded && (
          <div className="space-y-3 pt-1 border-t border-border/40">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                System Prompt:
              </p>
              <Textarea
                readOnly
                value={prompt.system_prompt}
                className="min-h-[140px] text-xs font-mono resize-none bg-muted/30 border-muted"
              />
            </div>
            {prompt.user_prompt && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Template de usuario:
                </p>
                <Textarea
                  readOnly
                  value={prompt.user_prompt}
                  className="min-h-[80px] text-xs font-mono resize-none bg-muted/30 border-muted"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PromptEditDialog — con tabs de Contenido / Configuración / Variables
// ---------------------------------------------------------------------------

interface EditFormData {
  name: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  max_tokens: number;
  model: string;
  variables: PromptVariable[];
}

function PromptEditDialog({
  prompt,
  onClose,
}: {
  prompt: PlatformPrompt;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('content');
  const [formData, setFormData] = useState<EditFormData>({
    name: prompt.name,
    description: prompt.description ?? '',
    system_prompt: prompt.system_prompt,
    user_prompt: prompt.user_prompt ?? '',
    temperature: prompt.temperature,
    max_tokens: prompt.max_tokens,
    model: prompt.model ?? 'default',
    variables: prompt.variables ? [...prompt.variables] : [],
  });

  const updatePrompt = useUpdatePrompt();

  const setField = <K extends keyof EditFormData>(key: K, value: EditFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    updatePrompt.mutate(
      { id: prompt.id, data: formData },
      { onSuccess: () => onClose() }
    );
  };

  // Variables tab helpers
  const addVariable = () => {
    setFormData((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        { key: '', required: false, default: '' } as PromptVariable,
      ],
    }));
  };

  const updateVariable = (
    index: number,
    field: keyof PromptVariable,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const vars = [...prev.variables];
      vars[index] = { ...vars[index], [field]: value };
      return { ...prev, variables: vars };
    });
  };

  const removeVariable = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  // Ejemplo de interpolación en Variables tab
  const interpolationExample = useMemo(() => {
    if (!formData.user_prompt) return null;
    return formData.variables.reduce((acc, v) => {
      const example = v.default ?? `[${v.key}]`;
      return acc.replace(new RegExp(`\\{${v.key}\\}`, 'g'), example);
    }, formData.user_prompt);
  }, [formData.user_prompt, formData.variables]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">
            ✏️ Editar: {prompt.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {prompt.module}/{prompt.prompt_key}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0 w-fit">
            <TabsTrigger value="content">📝 Contenido</TabsTrigger>
            <TabsTrigger value="config">⚙️ Configuración</TabsTrigger>
            <TabsTrigger value="variables">
              🔑 Variables{' '}
              {formData.variables.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {formData.variables.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* --- Tab Contenido --- */}
          <TabsContent
            value="content"
            className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Describe qué hace este prompt…"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>System Prompt</Label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setField('system_prompt', e.target.value)}
                className="min-h-[300px] font-mono text-xs resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Template de usuario (user_prompt)</Label>
              <Textarea
                value={formData.user_prompt}
                onChange={(e) => setField('user_prompt', e.target.value)}
                className="min-h-[120px] font-mono text-xs resize-y"
                placeholder="Usa {variable} para variables dinámicas"
              />
            </div>
          </TabsContent>

          {/* --- Tab Configuración --- */}
          <TabsContent
            value="config"
            className="flex-1 overflow-y-auto space-y-6 pr-1 mt-4"
          >
            <div className="space-y-3">
              <Label>
                Temperatura:{' '}
                <span className="font-mono text-indigo-500">
                  {formData.temperature}
                </span>
              </Label>
              <Slider
                value={[formData.temperature]}
                onValueChange={([v]) => setField('temperature', v)}
                min={0}
                max={1}
                step={0.1}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                0 = más preciso y determinista · 1 = más creativo e impredecible
              </p>
              <TemperatureBar value={formData.temperature} />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setField('max_tokens', parseInt(e.target.value) || 2000)
                }
              />
              <p className="text-xs text-muted-foreground">
                Máximo de tokens que puede generar la respuesta
              </p>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <Label>Modelo</Label>
              <Select
                value={formData.model}
                onValueChange={(v) => setField('model', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default (fallback automático)</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* --- Tab Variables --- */}
          <TabsContent
            value="variables"
            className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Variables disponibles en este prompt
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={addVariable}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar variable
              </Button>
            </div>

            {formData.variables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Sin variables. Agrega una para que la IA pueda recibir datos
                dinámicos.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Encabezado de columnas */}
                <div className="grid grid-cols-[1fr_1.5fr_auto_1fr_auto] gap-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Key</span>
                  <span>Descripción</span>
                  <span>Requerida</span>
                  <span>Default</span>
                  <span />
                </div>
                {formData.variables.map((v, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1.5fr_auto_1fr_auto] gap-2 items-center"
                  >
                    <Input
                      value={v.key}
                      onChange={(e) => updateVariable(i, 'key', e.target.value)}
                      placeholder="nombre_var"
                      className="font-mono text-xs h-8"
                    />
                    <Input
                      value={
                        (v as PromptVariable & { description?: string })
                          .description ?? ''
                      }
                      onChange={(e) =>
                        updateVariable(i, 'description' as keyof PromptVariable, e.target.value)
                      }
                      placeholder="Qué representa…"
                      className="text-xs h-8"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) =>
                          updateVariable(i, 'required', e.target.checked)
                        }
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                        aria-label={`Variable ${v.key} requerida`}
                      />
                    </div>
                    <Input
                      value={v.default ?? ''}
                      onChange={(e) =>
                        updateVariable(i, 'default', e.target.value)
                      }
                      placeholder="valor por defecto"
                      className="font-mono text-xs h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeVariable(i)}
                      aria-label={`Eliminar variable ${v.key}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview de interpolación */}
            {interpolationExample && (
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vista previa con defaults:
                </p>
                <pre className="text-xs font-mono bg-muted/40 rounded-md p-3 whitespace-pre-wrap break-words leading-relaxed">
                  {interpolationExample}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 pt-2 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePrompt.isPending}
            className="gap-1.5"
          >
            {updatePrompt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            💾 Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// PromptCreateDialog
// ---------------------------------------------------------------------------

interface CreateFormData {
  module: string;
  prompt_key: string;
  name: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  max_tokens: number;
  model: string;
  variables: PromptVariable[];
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
}

function PromptCreateDialog({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('content');
  const [formData, setFormData] = useState<CreateFormData>({
    module: 'scripts',
    prompt_key: '',
    name: '',
    description: '',
    system_prompt: '',
    user_prompt: '',
    temperature: 0.7,
    max_tokens: 2000,
    model: 'default',
    variables: [],
    category: null,
    tags: null,
    is_active: true,
  });

  const createPrompt = useCreatePrompt();

  const setField = <K extends keyof CreateFormData>(
    key: K,
    value: CreateFormData[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const canCreate =
    !!formData.prompt_key && !!formData.name && !!formData.system_prompt;

  const handleCreate = () => {
    if (!canCreate) return;
    createPrompt.mutate(formData as Parameters<typeof createPrompt.mutate>[0], {
      onSuccess: () => onClose(),
    });
  };

  const addVariable = () =>
    setFormData((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        { key: '', required: false, default: '' } as PromptVariable,
      ],
    }));

  const updateVariable = (
    index: number,
    field: keyof PromptVariable,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const vars = [...prev.variables];
      vars[index] = { ...vars[index], [field]: value };
      return { ...prev, variables: vars };
    });
  };

  const removeVariable = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));

  const allModuleKeys = Object.keys(MODULE_CONFIG);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">➕ Crear nuevo prompt</DialogTitle>
          <DialogDescription>
            Completa al menos Módulo, Key, Nombre y System Prompt para guardar.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0 w-fit">
            <TabsTrigger value="content">📝 Contenido</TabsTrigger>
            <TabsTrigger value="config">⚙️ Configuración</TabsTrigger>
            <TabsTrigger value="variables">🔑 Variables</TabsTrigger>
          </TabsList>

          {/* --- Contenido --- */}
          <TabsContent
            value="content"
            className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Módulo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.module}
                  onValueChange={(v) => setField('module', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allModuleKeys.map((m) => {
                      const cfg = MODULE_CONFIG[m];
                      return (
                        <SelectItem key={m} value={m}>
                          {cfg.emoji} {cfg.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Key única <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.prompt_key}
                  onChange={(e) => setField('prompt_key', e.target.value)}
                  placeholder="nombre_unico"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nombre descriptivo <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Ej: Generador de hooks UGC"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Qué hace este prompt…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                System Prompt <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setField('system_prompt', e.target.value)}
                className="min-h-[260px] font-mono text-xs resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Template de usuario (user_prompt)</Label>
              <Textarea
                value={formData.user_prompt}
                onChange={(e) => setField('user_prompt', e.target.value)}
                className="min-h-[100px] font-mono text-xs resize-y"
                placeholder="Usa {variable} para variables dinámicas"
              />
            </div>
          </TabsContent>

          {/* --- Configuración --- */}
          <TabsContent
            value="config"
            className="flex-1 overflow-y-auto space-y-6 pr-1 mt-4"
          >
            <div className="space-y-3">
              <Label>
                Temperatura:{' '}
                <span className="font-mono text-indigo-500">
                  {formData.temperature}
                </span>
              </Label>
              <Slider
                value={[formData.temperature]}
                onValueChange={([v]) => setField('temperature', v)}
                min={0}
                max={1}
                step={0.1}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                0 = más preciso · 1 = más creativo
              </p>
              <TemperatureBar value={formData.temperature} />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setField('max_tokens', parseInt(e.target.value) || 2000)
                }
              />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <Label>Modelo</Label>
              <Select
                value={formData.model}
                onValueChange={(v) => setField('model', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default (fallback automático)</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* --- Variables --- */}
          <TabsContent
            value="variables"
            className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Variables disponibles en este prompt
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={addVariable}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar variable
              </Button>
            </div>

            {formData.variables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Sin variables. Agrega una para que la IA reciba datos dinámicos.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1.5fr_auto_1fr_auto] gap-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Key</span>
                  <span>Descripción</span>
                  <span>Requerida</span>
                  <span>Default</span>
                  <span />
                </div>
                {formData.variables.map((v, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1.5fr_auto_1fr_auto] gap-2 items-center"
                  >
                    <Input
                      value={v.key}
                      onChange={(e) => updateVariable(i, 'key', e.target.value)}
                      placeholder="nombre_var"
                      className="font-mono text-xs h-8"
                    />
                    <Input
                      value={
                        (v as PromptVariable & { description?: string })
                          .description ?? ''
                      }
                      onChange={(e) =>
                        updateVariable(
                          i,
                          'description' as keyof PromptVariable,
                          e.target.value
                        )
                      }
                      placeholder="Qué representa…"
                      className="text-xs h-8"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) =>
                          updateVariable(i, 'required', e.target.checked)
                        }
                        className="w-4 h-4 cursor-pointer accent-indigo-600"
                        aria-label={`Variable ${v.key || i} requerida`}
                      />
                    </div>
                    <Input
                      value={v.default ?? ''}
                      onChange={(e) =>
                        updateVariable(i, 'default', e.target.value)
                      }
                      placeholder="valor por defecto"
                      className="font-mono text-xs h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeVariable(i)}
                      aria-label={`Eliminar variable ${v.key || i}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 pt-2 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createPrompt.isPending || !canCreate}
            className="gap-1.5"
          >
            {createPrompt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Stats card pequeña
// ---------------------------------------------------------------------------

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <span className="text-lg" aria-hidden="true">
        {emoji}
      </span>
      <div>
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PromptsSection() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PlatformPrompt | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Datos
  const { data: modules, isLoading: modulesLoading } = usePromptModules();
  const { data: allPrompts, isLoading: promptsLoading } = usePlatformPrompts(
    selectedModule ?? undefined
  );

  const isLoading = modulesLoading || promptsLoading;

  // Seleccionar primer módulo automáticamente cuando lleguen los datos
  const effectiveModule = useMemo(() => {
    if (selectedModule) return selectedModule;
    if (modules && modules.length > 0) return modules[0];
    return null;
  }, [selectedModule, modules]);

  // Prompts filtrados por búsqueda
  const filteredPrompts = useMemo(() => {
    if (!allPrompts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allPrompts;
    return allPrompts.filter((p) => {
      const inName = p.name.toLowerCase().includes(q);
      const inDesc = (p.description ?? '').toLowerCase().includes(q);
      const inVars = (p.variables ?? []).some((v) =>
        v.key.toLowerCase().includes(q)
      );
      return inName || inDesc || inVars;
    });
  }, [allPrompts, search]);

  // Stats globales (usamos los prompts del módulo actual, o todos si no hay filtro)
  const totalPrompts = allPrompts?.length ?? 0;
  const totalModules = modules?.length ?? 0;
  const totalVars = useMemo(
    () =>
      (allPrompts ?? []).reduce(
        (sum, p) => sum + (p.variables?.length ?? 0),
        0
      ),
    [allPrompts]
  );
  const lastUpdated = useMemo(() => {
    if (!allPrompts || allPrompts.length === 0) return '—';
    const sorted = [...allPrompts].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    const date = new Date(sorted[0].updated_at);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [allPrompts]);

  // Conteo por módulo para los badges de tabs
  const countByModule = useMemo(() => {
    // Para los counts necesitamos todos los prompts — usamos allPrompts como proxy
    // (cuando no hay filtro de módulo, allPrompts trae todo el módulo activo)
    return {} as Record<string, number>;
  }, []);

  // Módulo config activo
  const activeCfg = effectiveModule ? getModuleConfig(effectiveModule) : null;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">🤖 Prompts de IA</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              El cerebro de la plataforma. Cada prompt es una instrucción que le
              dice a la IA cómo comportarse.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-1.5 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nuevo Prompt
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard emoji="📊" label="Total prompts" value={totalPrompts} />
          <StatCard emoji="🗂️" label="Módulos activos" value={totalModules} />
          <StatCard emoji="🔑" label="Variables totales" value={totalVars} />
          <StatCard emoji="🔄" label="Último cambio" value={lastUpdated} />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Búsqueda global                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre, descripción o variable…"
          className="pl-9"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs de módulos                                                     */}
      {/* ------------------------------------------------------------------ */}
      {modulesLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando módulos…
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {modules.map((mod) => {
              const cfg = getModuleConfig(mod);
              const isActive = (effectiveModule ?? modules[0]) === mod;
              return (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    isActive
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-card text-muted-foreground border-border/60 hover:border-foreground/40 hover:text-foreground',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  <span aria-hidden="true">{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Descripción del módulo activo */}
      {activeCfg && !search && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-2">
          <span aria-hidden="true">{activeCfg.emoji}</span>
          <span>{activeCfg.description}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Grid de cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando prompts…</span>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          {search ? (
            <>
              <p className="text-lg font-semibold">Sin resultados</p>
              <p className="text-sm mt-1">
                No hay prompts que coincidan con{' '}
                <span className="font-mono">"{search}"</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">Sin prompts</p>
              <p className="text-sm mt-1">
                Este módulo todavía no tiene prompts. Crea uno.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPrompts.map((prompt) => {
            const cfg = getModuleConfig(prompt.module);
            return (
              <PromptBigCard
                key={prompt.id}
                prompt={prompt}
                moduleConfig={cfg}
                onEdit={() => setEditingPrompt(prompt)}
              />
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                             */}
      {/* ------------------------------------------------------------------ */}
      {editingPrompt && (
        <PromptEditDialog
          prompt={editingPrompt}
          onClose={() => setEditingPrompt(null)}
        />
      )}

      {isCreateDialogOpen && (
        <PromptCreateDialog onClose={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
}
