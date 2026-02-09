import { useState } from 'react';
import { Mail, User, Building2, Phone, MessageSquare, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioContactFormProps {
  organizationId: string;
  organizationName: string;
  accentColor: string;
  open: boolean;
  onClose: () => void;
}

const BUDGET_RANGES = [
  { value: 'under_500k', label: 'Menos de $500,000 COP' },
  { value: '500k_1m', label: '$500,000 - $1,000,000 COP' },
  { value: '1m_3m', label: '$1,000,000 - $3,000,000 COP' },
  { value: '3m_5m', label: '$3,000,000 - $5,000,000 COP' },
  { value: 'over_5m', label: 'Más de $5,000,000 COP' },
  { value: 'flexible', label: 'Flexible / Por definir' },
];

const SERVICE_TYPES = [
  { value: 'ugc', label: 'UGC (User Generated Content)' },
  { value: 'social_media', label: 'Contenido para Redes Sociales' },
  { value: 'video_production', label: 'Producción de Video' },
  { value: 'photography', label: 'Fotografía' },
  { value: 'strategy', label: 'Estrategia de Contenido' },
  { value: 'campaign', label: 'Campaña Completa' },
  { value: 'other', label: 'Otro' },
];

export function PortfolioContactForm({
  organizationId,
  organizationName,
  accentColor,
  open,
  onClose,
}: PortfolioContactFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    budget_range: '',
    service_type: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    setSubmitting(true);

    const { error } = await (supabase as any)
      .from('portfolio_inquiries')
      .insert({
        organization_id: organizationId,
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        message: form.message.trim(),
        budget_range: form.budget_range || null,
        service_type: form.service_type || null,
      });

    setSubmitting(false);

    if (!error) {
      setSubmitted(true);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: accentColor }} />
            </div>
            <h3 className="text-lg font-semibold">Mensaje enviado</h3>
            <p className="text-sm text-muted-foreground">
              Tu solicitud ha sido enviada a {organizationName}. Te contactarán pronto.
            </p>
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: accentColor }} />
            Contactar a {organizationName}
          </DialogTitle>
          <DialogDescription>
            Completa el formulario y el equipo se pondrá en contacto contigo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <User className="h-3.5 w-3.5" />
              Nombre completo *
            </Label>
            <Input
              required
              placeholder="Tu nombre"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5" />
              Email *
            </Label>
            <Input
              required
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Company + Phone (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5" />
                Empresa
              </Label>
              <Input
                placeholder="Tu empresa"
                value={form.company}
                onChange={(e) => updateField('company', e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Phone className="h-3.5 w-3.5" />
                Teléfono
              </Label>
              <Input
                placeholder="+57..."
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          {/* Service Type */}
          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de servicio</Label>
            <Select value={form.service_type} onValueChange={(v) => updateField('service_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(st => (
                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <DollarSign className="h-3.5 w-3.5" />
              Presupuesto estimado
            </Label>
            <Select value={form.budget_range} onValueChange={(v) => updateField('budget_range', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rango..." />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES.map(br => (
                  <SelectItem key={br.value} value={br.value}>{br.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              Mensaje *
            </Label>
            <Textarea
              required
              placeholder="Cuéntanos sobre tu proyecto o necesidades..."
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim() || !form.message.trim()}
            className="w-full text-white"
            style={{ backgroundColor: accentColor }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Enviar solicitud
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
