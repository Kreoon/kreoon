import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, DollarSign, Paperclip, Send, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceProposals } from '@/hooks/useMarketplaceProposals';
import { useCreatorServices } from '@/hooks/useCreatorServices';
import type { CreatorService, BudgetType } from '@/types/marketplace';
import { SERVICE_TYPE_ICONS, SERVICE_TYPE_LABELS } from '@/types/marketplace';

const proposalSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres'),
  service_id: z.string().optional(),
  budget_type: z.enum(['fixed', 'range', 'hourly', 'open']),
  proposed_budget: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  budget_currency: z.string().default('USD'),
  desired_deadline: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  preselectedServiceId?: string;
}

export function ProposalForm({
  isOpen,
  onClose,
  providerId,
  providerName,
  providerAvatar,
  preselectedServiceId,
}: ProposalFormProps) {
  const { createProposal, isCreating } = useMarketplaceProposals();
  const { services } = useCreatorServices({ userId: providerId, activeOnly: true });

  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      service_id: preselectedServiceId,
      budget_type: 'fixed',
      budget_currency: 'USD',
    },
  });

  const budgetType = watch('budget_type');
  const selectedServiceId = watch('service_id');
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const onSubmit = async (data: ProposalFormData) => {
    try {
      await createProposal({
        provider_id: providerId,
        title: data.title,
        description: data.description,
        service_id: data.service_id || undefined,
        budget_type: data.budget_type as BudgetType,
        proposed_budget: data.proposed_budget,
        budget_max: data.budget_type === 'range' ? data.budget_max : undefined,
        budget_currency: data.budget_currency,
        desired_deadline: data.desired_deadline || undefined,
        attachments: [], // TODO: Upload attachments
      });

      reset();
      setAttachments([]);
      onClose();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-social-card border-social-border p-0">
        <ScrollArea className="max-h-[85vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-social-foreground">
                Enviar propuesta
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={providerAvatar || undefined} />
                  <AvatarFallback>{providerName[0]}</AvatarFallback>
                </Avatar>
                <span>para {providerName}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Service selection */}
            {services.length > 0 && (
              <div className="space-y-2">
                <Label>Servicio (opcional)</Label>
                <Select
                  value={selectedServiceId}
                  onValueChange={(value) => setValue('service_id', value)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue placeholder="Selecciona un servicio o deja vacío" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Servicio personalizado</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <span className="flex items-center gap-2">
                          <span>{SERVICE_TYPE_ICONS[service.service_type]}</span>
                          <span>{service.title}</span>
                          {service.price_amount && (
                            <span className="text-social-muted-foreground">
                              - ${service.price_amount}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título del proyecto *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Ej: Video UGC para lanzamiento de producto"
                className="bg-social-muted border-social-border"
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Describe tu proyecto *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Cuéntale al creador qué necesitas, el contexto de tu marca, y cualquier detalle relevante..."
                rows={4}
                className="bg-social-muted border-social-border resize-none"
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <Label>Presupuesto</Label>

              <div className="grid grid-cols-2 gap-2">
                {(['fixed', 'range', 'hourly', 'open'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('budget_type', type)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm transition-colors",
                      budgetType === type
                        ? "bg-social-accent/20 border-social-accent text-social-accent"
                        : "bg-social-muted border-social-border text-social-muted-foreground hover:border-social-accent/50"
                    )}
                  >
                    {type === 'fixed' && 'Precio fijo'}
                    {type === 'range' && 'Rango'}
                    {type === 'hourly' && 'Por hora'}
                    {type === 'open' && 'A convenir'}
                  </button>
                ))}
              </div>

              {budgetType !== 'open' && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
                    <Input
                      type="number"
                      {...register('proposed_budget', { valueAsNumber: true })}
                      placeholder={budgetType === 'range' ? 'Mínimo' : 'Monto'}
                      className="bg-social-muted border-social-border pl-9"
                    />
                  </div>
                  {budgetType === 'range' && (
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
                      <Input
                        type="number"
                        {...register('budget_max', { valueAsNumber: true })}
                        placeholder="Máximo"
                        className="bg-social-muted border-social-border pl-9"
                      />
                    </div>
                  )}
                  <Select
                    value={watch('budget_currency')}
                    onValueChange={(value) => setValue('budget_currency', value)}
                  >
                    <SelectTrigger className="w-24 bg-social-muted border-social-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Fecha límite deseada (opcional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
                <Input
                  id="deadline"
                  type="date"
                  {...register('desired_deadline')}
                  className="bg-social-muted border-social-border pl-9"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Adjuntos (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-social-muted text-sm"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-social-muted-foreground hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {attachments.length < 5 && (
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-social-border hover:border-social-accent/50 cursor-pointer text-sm text-social-muted-foreground hover:text-social-foreground transition-colors">
                    <Paperclip className="h-3 w-3" />
                    Adjuntar archivo
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-social-muted-foreground">
                Máximo 5 archivos. Formatos: PDF, DOC, imágenes, videos.
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1 gap-2 bg-gradient-to-r from-social-accent to-purple-600 hover:opacity-90"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar propuesta
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
