import { useState } from 'react';
import { AlertTriangle, Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface SaveAsTemplateFormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'private' | 'public';
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Hook de guardado inyectable.
   * Firma esperada: ({ formData }) => Promise<void>
   */
  onSave?: (data: SaveAsTemplateFormData) => Promise<void>;
}

const CATEGORIES = [
  { value: 'ugc', label: 'UGC' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'agencia', label: 'Agencia' },
  { value: 'profesional', label: 'Profesional B2B' },
  { value: 'creativo', label: 'Creativo' },
  { value: 'otro', label: 'Otro' },
] as const;

const DEFAULT_FORM: SaveAsTemplateFormData = {
  name: '',
  description: '',
  category: 'ugc',
  tags: [],
  visibility: 'private',
};

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  onSave,
}: SaveAsTemplateDialogProps) {
  const [form, setForm] = useState<SaveAsTemplateFormData>(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const update = (partial: Partial<SaveAsTemplateFormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || form.tags.includes(tag) || form.tags.length >= 8) return;
    update({ tags: [...form.tags, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    update({ tags: form.tags.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !onSave) return;

    setIsSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim() });
      setForm(DEFAULT_FORM);
      setTagInput('');
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm(DEFAULT_FORM);
    setTagInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Guardar como plantilla</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">
              Nombre <span className="text-red-400">*</span>
            </Label>
            <Input
              required
              maxLength={80}
              placeholder="Ej: Mi perfil UGC minimalista"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500"
            />
          </div>

          {/* Descripcion */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Descripcion</Label>
            <Textarea
              maxLength={300}
              rows={2}
              placeholder="Describe brevemente esta plantilla..."
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 resize-none"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => update({ category: v })}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white focus:border-purple-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="text-white hover:bg-gray-800 focus:bg-gray-800"
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                maxLength={30}
                placeholder="Agregar etiqueta y presionar Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!tagInput.trim() || form.tags.length >= 8}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-shrink-0"
                aria-label="Agregar etiqueta"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs border border-purple-500/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-white transition-colors"
                      aria-label={`Eliminar etiqueta ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibilidad */}
          <div className="space-y-2">
            <Label className="text-gray-300">Visibilidad</Label>
            <RadioGroup
              value={form.visibility}
              onValueChange={(v) => update({ visibility: v as SaveAsTemplateFormData['visibility'] })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="private" className="border-gray-600 text-purple-500" />
                <span className="text-sm text-gray-300">Solo yo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="public" className="border-gray-600 text-purple-500" />
                <span className="text-sm text-gray-300">Publica</span>
              </label>
            </RadioGroup>

            {/* Warning si es publica */}
            {form.visibility === 'public' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Sera revisada por el equipo de Kreoon antes de publicarse en la biblioteca.</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className={cn('flex gap-3 pt-1', 'justify-end')}>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.name.trim() || isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar plantilla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
