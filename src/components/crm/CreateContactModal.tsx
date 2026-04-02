import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Snowflake,
  Sun,
  Flame,
  Plus,
  X,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateOrgContact, useOrgPipelines } from '@/hooks/useCrm';
import type {
  ContactType,
  RelationshipStrength,
} from '@/types/crm.types';
import {
  CONTACT_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
} from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const CONTACT_TYPES: ContactType[] = ['lead', 'client', 'partner', 'vendor', 'influencer', 'other'];

const STRENGTH_OPTIONS: {
  value: RelationshipStrength;
  icon: typeof Snowflake;
  color: string;
  activeColor: string;
}[] = [
  { value: 'cold', icon: Snowflake, color: 'text-blue-400/40', activeColor: 'text-blue-400 border-blue-500/60 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)]' },
  { value: 'warm', icon: Sun, color: 'text-yellow-400/40', activeColor: 'text-yellow-400 border-yellow-500/60 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.15)]' },
  { value: 'hot', icon: Flame, color: 'text-red-400/40', activeColor: 'text-red-400 border-red-500/60 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]' },
];

// =====================================================
// Schema
// =====================================================

const contactSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  contact_type: z.string().optional(),
  relationship_strength: z.string().optional(),
  pipeline_stage: z.string().optional(),
  deal_value: z.string().optional(),
  expected_close_date: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  tiktok: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

// =====================================================
// Component
// =====================================================

interface CreateContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function CreateContactModal({
  open,
  onOpenChange,
  organizationId,
}: CreateContactModalProps) {
  const createContact = useCreateOrgContact(organizationId);
  const { data: pipelines = [] } = useOrgPipelines(organizationId);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showSocial, setShowSocial] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      contact_type: '',
      relationship_strength: '',
      pipeline_stage: '',
      deal_value: '',
      expected_close_date: '',
      instagram: '',
      linkedin: '',
      tiktok: '',
      notes: '',
    },
  });

  const contactType = form.watch('contact_type');
  const strength = form.watch('relationship_strength');
  const isLead = contactType === 'lead';

  // Get default pipeline stages
  const defaultPipeline = useMemo(() => {
    return pipelines.find((p) => p.is_default) || pipelines[0];
  }, [pipelines]);

  const pipelineStages = defaultPipeline?.stages || [];

  // Tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (data: ContactFormData) => {
    const socialLinks: Record<string, string> = {};
    if (data.instagram) socialLinks.instagram = data.instagram;
    if (data.linkedin) socialLinks.linkedin = data.linkedin;
    if (data.tiktok) socialLinks.tiktok = data.tiktok;

    createContact.mutate(
      {
        full_name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
        position: data.position || undefined,
        contact_type: data.contact_type as ContactType || undefined,
        relationship_strength: data.relationship_strength as RelationshipStrength || undefined,
        pipeline_stage: data.pipeline_stage || undefined,
        deal_value: data.deal_value ? parseFloat(data.deal_value) : undefined,
        expected_close_date: data.expected_close_date || undefined,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setTags([]);
          setTagInput('');
          setShowSocial(false);
          onOpenChange(false);
        },
      },
    );
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      form.reset();
      setTags([]);
      setTagInput('');
      setShowSocial(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-lg max-h-[90dvh] sm:max-h-[90vh] p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Nuevo Contacto</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

            {/* ---- Basic Info ---- */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Nombre completo *</Label>
                <Input
                  {...form.register('full_name')}
                  placeholder="María López"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-red-400">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Email</Label>
                <Input
                  {...form.register('email')}
                  type="email"
                  placeholder="maria@empresa.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Teléfono</Label>
                <Input
                  {...form.register('phone')}
                  placeholder="+57 300..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Empresa</Label>
                <Input
                  {...form.register('company')}
                  placeholder="Acme Corp"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Cargo</Label>
                <Input
                  {...form.register('position')}
                  placeholder="CEO"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* ---- Classification ---- */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Tipo de contacto</Label>
                <Select
                  value={contactType}
                  onValueChange={(v) => form.setValue('contact_type', v)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-[#8b5cf6]/30">
                    {CONTACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-white focus:bg-white/10">
                        {CONTACT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Temperatura</Label>
                <div className="flex gap-2">
                  {STRENGTH_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = strength === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => form.setValue('relationship_strength', opt.value)}
                        className={cn(
                          'flex-1 flex flex-col items-center gap-1 py-2 rounded-sm border transition-all',
                          isActive
                            ? opt.activeColor
                            : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', isActive ? '' : opt.color)} />
                        <span className={cn('text-[10px] font-medium', isActive ? '' : 'text-white/40')}>
                          {RELATIONSHIP_STRENGTH_LABELS[opt.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ---- Pipeline (only for leads) ---- */}
            {isLead && pipelineStages.length > 0 && (
              <div
                className="p-3 rounded-sm space-y-3"
                style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
              >
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Pipeline</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Etapa</Label>
                    <Select
                      value={form.watch('pipeline_stage')}
                      onValueChange={(v) => form.setValue('pipeline_stage', v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Etapa" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-[#8b5cf6]/30">
                        {pipelineStages
                          .sort((a, b) => a.order - b.order)
                          .map((s) => (
                            <SelectItem key={s.name} value={s.name} className="text-white focus:bg-white/10">
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Valor del deal</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input
                        {...form.register('deal_value')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Cierre esperado</Label>
                    <Input
                      {...form.register('expected_close_date')}
                      type="date"
                      className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---- Tags ---- */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Etiquetas</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Agregar etiqueta..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addTag}
                  className="h-9 w-9 bg-white/5 hover:bg-white/10 text-white/50"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ---- Notes ---- */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Notas</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Notas sobre este contacto..."
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            {/* ---- Social Links (collapsible) ---- */}
            <div>
              <button
                type="button"
                onClick={() => setShowSocial(!showSocial)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showSocial && 'rotate-180')} />
                Redes sociales
              </button>
              {showSocial && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[10px]">Instagram</Label>
                    <Input
                      {...form.register('instagram')}
                      placeholder="@usuario"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[10px]">LinkedIn</Label>
                    <Input
                      {...form.register('linkedin')}
                      placeholder="linkedin.com/in/..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[10px]">TikTok</Label>
                    <Input
                      {...form.register('tiktok')}
                      placeholder="@usuario"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ---- Actions ---- */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createContact.isPending}
                className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
              >
                {createContact.isPending && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                )}
                Crear Contacto
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
