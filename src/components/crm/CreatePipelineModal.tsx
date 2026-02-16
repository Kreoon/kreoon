import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  GripVertical,
  Palette,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useCreateOrgPipeline,
  useUpdateOrgPipeline,
} from '@/hooks/useCrm';
import type { OrgPipeline, PipelineType, PipelineStage } from '@/types/crm.types';
import { PIPELINE_TYPE_LABELS } from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const PIPELINE_TYPES: PipelineType[] = ['sales', 'creators', 'partnerships', 'custom'];

const DEFAULT_STAGES: Record<PipelineType, { name: string; color: string }[]> = {
  sales: [
    { name: 'Prospecto', color: '#8B5CF6' },
    { name: 'Contactado', color: '#3B82F6' },
    { name: 'Propuesta', color: '#F59E0B' },
    { name: 'Negociación', color: '#F97316' },
    { name: 'Cerrado', color: '#22C55E' },
    { name: 'Perdido', color: '#EF4444' },
  ],
  creators: [
    { name: 'Identificado', color: '#8B5CF6' },
    { name: 'Contactado', color: '#3B82F6' },
    { name: 'Interesado', color: '#F59E0B' },
    { name: 'Contratado', color: '#22C55E' },
    { name: 'Completado', color: '#10B981' },
  ],
  partnerships: [
    { name: 'Lead', color: '#8B5CF6' },
    { name: 'Reunión', color: '#3B82F6' },
    { name: 'Propuesta', color: '#F59E0B' },
    { name: 'Negociación', color: '#F97316' },
    { name: 'Alianza activa', color: '#22C55E' },
  ],
  custom: [
    { name: 'Nuevo', color: '#8B5CF6' },
    { name: 'En progreso', color: '#3B82F6' },
    { name: 'Completado', color: '#22C55E' },
  ],
};

const PRESET_COLORS = [
  '#8B5CF6', '#7C3AED', '#6D28D9',
  '#3B82F6', '#2563EB', '#0EA5E9',
  '#22C55E', '#10B981', '#14B8A6',
  '#F59E0B', '#F97316', '#EF4444',
  '#EC4899', '#D946EF', '#6366F1',
];

// =====================================================
// Schema
// =====================================================

const pipelineSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  pipeline_type: z.string().min(1, 'Selecciona un tipo'),
  is_default: z.boolean(),
});

type PipelineFormData = z.infer<typeof pipelineSchema>;

// =====================================================
// Stage Editor Row
// =====================================================

interface StageRowProps {
  stage: { name: string; color: string };
  index: number;
  total: number;
  onChange: (index: number, field: 'name' | 'color', value: string) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function StageRow({ stage, index, total, onChange, onRemove, onMoveUp, onMoveDown }: StageRowProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="flex items-center gap-2 group">
      {/* Drag handle / order buttons */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          className="p-0.5 text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Mover arriba"
        >
          <GripVertical className="h-3 w-3 rotate-0" />
        </button>
      </div>

      {/* Order number */}
      <span className="w-5 text-center text-[10px] text-white/30 font-mono flex-shrink-0">
        {index + 1}
      </span>

      {/* Color picker */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowColors(!showColors)}
          className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors"
          style={{ backgroundColor: stage.color + '30' }}
        >
          <span
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
        </button>
        {showColors && (
          <div
            className="absolute top-full left-0 mt-1 z-10 p-2 rounded-lg grid grid-cols-5 gap-1"
            style={{
              background: 'rgba(10, 1, 24, 0.98)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(index, 'color', c);
                  setShowColors(false);
                }}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                  stage.color === c ? 'border-white scale-110' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      <Input
        value={stage.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        placeholder={`Stage ${index + 1}`}
        className="bg-white/5 border-white/10 text-white text-sm h-8 flex-1 placeholder:text-white/20"
      />

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={total <= 1}
        className="p-1 text-white/20 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        title="Eliminar stage"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// =====================================================
// Component
// =====================================================

interface CreatePipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  editPipeline?: OrgPipeline | null;
}

export function CreatePipelineModal({
  open,
  onOpenChange,
  organizationId,
  editPipeline,
}: CreatePipelineModalProps) {
  const createPipeline = useCreateOrgPipeline(organizationId);
  const updatePipeline = useUpdateOrgPipeline(organizationId);
  const isEditing = !!editPipeline;

  const [stages, setStages] = useState<{ name: string; color: string }[]>(
    DEFAULT_STAGES.sales,
  );

  const form = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: '',
      pipeline_type: 'sales',
      is_default: false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editPipeline) {
      form.reset({
        name: editPipeline.name,
        pipeline_type: editPipeline.pipeline_type || 'custom',
        is_default: editPipeline.is_default,
      });
      setStages(
        (editPipeline.stages || [])
          .sort((a, b) => a.order - b.order)
          .map((s) => ({ name: s.name, color: s.color || '#8B5CF6' })),
      );
    } else {
      form.reset({ name: '', pipeline_type: 'sales', is_default: false });
      setStages([...DEFAULT_STAGES.sales]);
    }
  }, [editPipeline, open]);

  // Auto-suggest stages when pipeline_type changes (only in create mode)
  const handleTypeChange = useCallback(
    (type: string) => {
      form.setValue('pipeline_type', type, { shouldValidate: true });
      if (!isEditing) {
        setStages([...DEFAULT_STAGES[type as PipelineType]]);
      }
    },
    [form, isEditing],
  );

  // Stage operations
  const updateStage = (index: number, field: 'name' | 'color', value: string) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      { name: '', color: PRESET_COLORS[prev.length % PRESET_COLORS.length] },
    ]);
  };

  const moveStageUp = (index: number) => {
    if (index === 0) return;
    setStages((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveStageDown = (index: number) => {
    if (index === stages.length - 1) return;
    setStages((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleSubmit = (data: PipelineFormData) => {
    // Filter out empty stage names
    const validStages: PipelineStage[] = stages
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        name: s.name.trim(),
        order: i + 1,
        color: s.color,
      }));

    if (validStages.length === 0) {
      form.setError('name', { message: 'Agrega al menos un stage' });
      return;
    }

    const payload = {
      name: data.name,
      pipeline_type: data.pipeline_type as PipelineType,
      stages: validStages,
      is_default: data.is_default,
    };

    if (isEditing && editPipeline) {
      updatePipeline.mutate(
        { id: editPipeline.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        },
      );
    } else {
      createPipeline.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          setStages([...DEFAULT_STAGES.sales]);
        },
      });
    }
  };

  const isSaving = createPipeline.isPending || updatePipeline.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Editar Pipeline' : 'Crear Pipeline'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Nombre del pipeline *</Label>
            <Input
              {...form.register('name')}
              placeholder="Ej: Ventas 2026"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Pipeline Type */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Tipo</Label>
            <Controller
              control={form.control}
              name="pipeline_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleTypeChange}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                    {PIPELINE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-white focus:bg-white/10">
                        {PIPELINE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Is Default */}
          <Controller
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="is_default"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-white/20 data-[state=checked]:bg-[#8b5cf6] data-[state=checked]:border-[#8b5cf6]"
                />
                <Label htmlFor="is_default" className="text-sm text-white/70 cursor-pointer">
                  Pipeline por defecto
                </Label>
              </div>
            )}
          />

          {/* Stages Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white/70 text-xs flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Stages ({stages.length})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addStage}
                className="h-7 px-2 text-[10px] text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar stage
              </Button>
            </div>

            <div
              className="space-y-2 p-3 rounded-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {stages.map((stage, i) => (
                <StageRow
                  key={i}
                  stage={stage}
                  index={i}
                  total={stages.length}
                  onChange={updateStage}
                  onRemove={removeStage}
                  onMoveUp={moveStageUp}
                  onMoveDown={moveStageDown}
                />
              ))}
            </div>

            {stages.filter((s) => s.name.trim()).length === 0 && (
              <p className="text-xs text-red-400">Agrega al menos un stage con nombre</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              )}
              {isEditing ? 'Guardar cambios' : 'Crear pipeline'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
