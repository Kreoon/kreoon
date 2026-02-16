import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Phone,
  Video,
  MessageSquare,
  FileText,
  FileSignature,
  StickyNote,
  Send,
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
import type { OrgInteractionType, LeadInteractionType, InteractionOutcome } from '@/types/crm.types';
import { INTERACTION_OUTCOME_LABELS } from '@/types/crm.types';

// =====================================================
// Types
// =====================================================

type InteractionTypeOption = {
  value: string;
  label: string;
  icon: typeof Mail;
  color: string;
};

const ORG_INTERACTION_TYPES: InteractionTypeOption[] = [
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-400' },
  { value: 'call', label: 'Llamada', icon: Phone, color: 'text-yellow-400' },
  { value: 'meeting', label: 'Reunión', icon: Video, color: 'text-purple-400' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-400' },
  { value: 'proposal_sent', label: 'Propuesta enviada', icon: FileText, color: 'text-orange-400' },
  { value: 'contract_signed', label: 'Contrato firmado', icon: FileSignature, color: 'text-emerald-400' },
  { value: 'note', label: 'Nota', icon: StickyNote, color: 'text-white/50' },
];

const LEAD_INTERACTION_TYPES: InteractionTypeOption[] = [
  { value: 'email_sent', label: 'Email enviado', icon: Send, color: 'text-blue-400' },
  { value: 'whatsapp_sent', label: 'WhatsApp enviado', icon: MessageSquare, color: 'text-green-400' },
  { value: 'call', label: 'Llamada', icon: Phone, color: 'text-yellow-400' },
  { value: 'meeting', label: 'Reunión', icon: Video, color: 'text-purple-400' },
  { value: 'demo', label: 'Demo', icon: Video, color: 'text-purple-400' },
  { value: 'note', label: 'Nota', icon: StickyNote, color: 'text-white/50' },
];

const OUTCOMES: InteractionOutcome[] = ['positive', 'neutral', 'negative'];

// =====================================================
// Schema
// =====================================================

const interactionSchema = z.object({
  interaction_type: z.string().min(1, 'Selecciona un tipo'),
  subject: z.string().optional(),
  content: z.string().optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

// =====================================================
// Component
// =====================================================

interface AddInteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InteractionFormData) => void;
  isSubmitting?: boolean;
  variant?: 'lead' | 'contact';
}

export function AddInteractionModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  variant = 'contact',
}: AddInteractionModalProps) {
  const types = variant === 'lead' ? LEAD_INTERACTION_TYPES : ORG_INTERACTION_TYPES;
  const showOutcome = variant === 'contact';

  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      interaction_type: '',
      subject: '',
      content: '',
      outcome: '',
      next_action: '',
      next_action_date: '',
    },
  });

  const selectedType = form.watch('interaction_type');
  const selectedTypeConfig = types.find((t) => t.value === selectedType);

  const handleSubmit = (data: InteractionFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Registrar interaccion</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Interaction Type as icon grid */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs">Tipo de interaccion</Label>
            <div className="grid grid-cols-4 gap-2">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => form.setValue('interaction_type', t.value, { shouldValidate: true })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-center',
                      isSelected
                        ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected ? t.color : 'text-white/40')} />
                    <span className={cn('text-[10px] leading-tight', isSelected ? 'text-white/90' : 'text-white/40')}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {form.formState.errors.interaction_type && (
              <p className="text-xs text-red-400">{form.formState.errors.interaction_type.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Asunto</Label>
            <Input
              {...form.register('subject')}
              placeholder="Ej: Seguimiento propuesta Q1"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Contenido / Notas</Label>
            <Textarea
              {...form.register('content')}
              placeholder="Describe la interaccion..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
            />
          </div>

          {/* Outcome (only for contacts) */}
          {showOutcome && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Resultado</Label>
              <Select
                value={form.watch('outcome')}
                onValueChange={(v) => form.setValue('outcome', v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o} className="text-white focus:bg-white/10">
                      {INTERACTION_OUTCOME_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Next Action */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Siguiente accion</Label>
              <Input
                {...form.register('next_action')}
                placeholder="Ej: Enviar propuesta"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Fecha</Label>
              <Input
                {...form.register('next_action_date')}
                type="date"
                className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
              />
            </div>
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
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : selectedTypeConfig ? (
                <selectedTypeConfig.icon className="h-4 w-4 mr-2" />
              ) : null}
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
