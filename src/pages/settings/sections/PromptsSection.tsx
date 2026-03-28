/**
 * PromptsSection - Panel de administracion de prompts de AI
 * Solo visible para platform root
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  usePlatformPrompts,
  usePromptModules,
  useUpdatePrompt,
  useCreatePrompt,
  PlatformPrompt,
  PromptVariable,
} from '@/hooks/usePlatformPrompts';
import { Loader2, Save, Plus, Pencil, Trash2, Bot, Code, FileText } from 'lucide-react';

export default function PromptsSection() {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [editingPrompt, setEditingPrompt] = useState<PlatformPrompt | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: modules, isLoading: modulesLoading } = usePromptModules();
  const { data: prompts, isLoading: promptsLoading } = usePlatformPrompts(
    selectedModule === 'all' ? undefined : selectedModule
  );

  const isLoading = modulesLoading || promptsLoading;

  // Agrupar prompts por modulo
  const groupedPrompts = prompts?.reduce((acc, prompt) => {
    if (!acc[prompt.module]) {
      acc[prompt.module] = [];
    }
    acc[prompt.module].push(prompt);
    return acc;
  }, {} as Record<string, PlatformPrompt[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Prompts de AI
          </h2>
          <p className="text-muted-foreground">
            Administra los prompts de inteligencia artificial de la plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Prompt
        </Button>
      </div>

      {/* Filtro por modulo */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedModule === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedModule('all')}
        >
          Todos
        </Badge>
        {modules?.map((module) => (
          <Badge
            key={module}
            variant={selectedModule === module ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setSelectedModule(module)}
          >
            {module}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {groupedPrompts &&
            Object.entries(groupedPrompts).map(([module, modulePrompts]) => (
              <Card key={module}>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    {module}
                    <Badge variant="secondary" className="ml-2">
                      {modulePrompts.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {modulePrompts.map((prompt) => (
                      <PromptRow
                        key={prompt.id}
                        prompt={prompt}
                        onEdit={() => setEditingPrompt(prompt)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Dialog de edicion */}
      {editingPrompt && (
        <PromptEditDialog
          prompt={editingPrompt}
          onClose={() => setEditingPrompt(null)}
        />
      )}

      {/* Dialog de creacion */}
      {isCreateDialogOpen && (
        <PromptCreateDialog onClose={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
}

function PromptRow({
  prompt,
  onEdit,
}: {
  prompt: PlatformPrompt;
  onEdit: () => void;
}) {
  return (
    <div className="py-3 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{prompt.name}</span>
          <Badge variant="outline" className="text-xs">
            {prompt.prompt_key}
          </Badge>
        </div>
        {prompt.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {prompt.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="secondary" className="text-xs">
          temp: {prompt.temperature}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {prompt.max_tokens} tokens
        </Badge>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PromptEditDialog({
  prompt,
  onClose,
}: {
  prompt: PlatformPrompt;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: prompt.name,
    description: prompt.description || '',
    system_prompt: prompt.system_prompt,
    user_prompt: prompt.user_prompt || '',
    temperature: prompt.temperature,
    max_tokens: prompt.max_tokens,
  });

  const updatePrompt = useUpdatePrompt();

  const handleSave = () => {
    updatePrompt.mutate(
      { id: prompt.id, data: formData },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Prompt: {prompt.name}</DialogTitle>
          <DialogDescription>
            {prompt.module} / {prompt.prompt_key}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) =>
                setFormData((p) => ({ ...p, system_prompt: e.target.value }))
              }
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>User Prompt (template)</Label>
            <Textarea
              value={formData.user_prompt}
              onChange={(e) =>
                setFormData((p) => ({ ...p, user_prompt: e.target.value }))
              }
              className="min-h-[150px] font-mono text-sm"
              placeholder="Usa {variable} para variables dinamicas"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature: {formData.temperature}</Label>
              <Slider
                value={[formData.temperature]}
                onValueChange={([v]) =>
                  setFormData((p) => ({ ...p, temperature: v }))
                }
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                0 = mas determinista, 1 = mas creativo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    max_tokens: parseInt(e.target.value) || 2000,
                  }))
                }
              />
            </div>
          </div>

          {prompt.variables && prompt.variables.length > 0 && (
            <div className="space-y-2">
              <Label>Variables disponibles</Label>
              <div className="flex flex-wrap gap-2">
                {prompt.variables.map((v: PromptVariable) => (
                  <Badge
                    key={v.key}
                    variant={v.required ? 'default' : 'secondary'}
                  >
                    {'{' + v.key + '}'}
                    {v.required && ' *'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updatePrompt.isPending}>
            {updatePrompt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromptCreateDialog({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    module: 'scripts',
    prompt_key: '',
    name: '',
    description: '',
    system_prompt: '',
    user_prompt: '',
    temperature: 0.7,
    max_tokens: 2000,
    model: 'default',
    variables: [] as PromptVariable[],
    category: null as string | null,
    tags: null as string[] | null,
    is_active: true,
  });

  const createPrompt = useCreatePrompt();

  const handleCreate = () => {
    if (!formData.prompt_key || !formData.name || !formData.system_prompt) {
      return;
    }
    createPrompt.mutate(formData as any, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Prompt</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Modulo *</Label>
              <Select
                value={formData.module}
                onValueChange={(v) => setFormData((p) => ({ ...p, module: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">base</SelectItem>
                  <SelectItem value="scripts">scripts</SelectItem>
                  <SelectItem value="research">research</SelectItem>
                  <SelectItem value="content">content</SelectItem>
                  <SelectItem value="dna">dna</SelectItem>
                  <SelectItem value="social">social</SelectItem>
                  <SelectItem value="marketing">marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Key *</Label>
              <Input
                value={formData.prompt_key}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, prompt_key: e.target.value }))
                }
                placeholder="nombre_unico"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Nombre descriptivo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>System Prompt *</Label>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) =>
                setFormData((p) => ({ ...p, system_prompt: e.target.value }))
              }
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>User Prompt (template)</Label>
            <Textarea
              value={formData.user_prompt}
              onChange={(e) =>
                setFormData((p) => ({ ...p, user_prompt: e.target.value }))
              }
              className="min-h-[150px] font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature: {formData.temperature}</Label>
              <Slider
                value={[formData.temperature]}
                onValueChange={([v]) =>
                  setFormData((p) => ({ ...p, temperature: v }))
                }
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    max_tokens: parseInt(e.target.value) || 2000,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              createPrompt.isPending ||
              !formData.prompt_key ||
              !formData.name ||
              !formData.system_prompt
            }
          >
            {createPrompt.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
