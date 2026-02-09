import { useState } from 'react';
import { Mail, User, Building2, Phone, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
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
import { INQUIRY_TYPE_LABELS } from '../types/marketplace';
import type { InquiryType } from '../types/marketplace';

interface OrgContactDialogProps {
  organizationId: string;
  organizationName: string;
  accentColor: string;
  open: boolean;
  onClose: () => void;
}

const BUDGET_RANGES = [
  { value: 'under_1m', label: 'Menos de $1,000,000 COP' },
  { value: '1m_3m', label: '$1,000,000 - $3,000,000 COP' },
  { value: '3m_5m', label: '$3,000,000 - $5,000,000 COP' },
  { value: '5m_10m', label: '$5,000,000 - $10,000,000 COP' },
  { value: 'over_10m', label: 'Más de $10,000,000 COP' },
  { value: 'flexible', label: 'Flexible / Por definir' },
];

const INQUIRY_TYPES: { value: InquiryType; label: string }[] = Object.entries(INQUIRY_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as InquiryType, label })
);

export function OrgContactDialog({ organizationId, organizationName, accentColor, open, onClose }: OrgContactDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    sender_name: '',
    sender_email: '',
    sender_company: '',
    sender_phone: '',
    subject: '',
    message: '',
    inquiry_type: '' as string,
    budget_range: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sender_name.trim() || !form.sender_email.trim() || !form.subject.trim() || !form.message.trim()) return;

    setSubmitting(true);

    const { error } = await (supabase as any)
      .from('org_inquiries')
      .insert({
        organization_id: organizationId,
        sender_name: form.sender_name.trim(),
        sender_email: form.sender_email.trim(),
        sender_company: form.sender_company.trim() || null,
        sender_phone: form.sender_phone.trim() || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
        inquiry_type: form.inquiry_type || 'general',
        budget_range: form.budget_range || null,
      });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
              <CheckCircle className="h-8 w-8" style={{ color: accentColor }} />
            </div>
            <h3 className="text-lg font-semibold">Consulta enviada</h3>
            <p className="text-sm text-muted-foreground">
              Tu mensaje ha sido enviado a {organizationName}. Te contactarán pronto.
            </p>
            <Button onClick={onClose} variant="outline">Cerrar</Button>
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
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5" />Nombre completo *</Label>
            <Input required placeholder="Tu nombre" value={form.sender_name} onChange={e => updateField('sender_name', e.target.value)} maxLength={100} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><Mail className="h-3.5 w-3.5" />Email *</Label>
            <Input required type="email" placeholder="tu@email.com" value={form.sender_email} onChange={e => updateField('sender_email', e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5" />Empresa</Label>
              <Input placeholder="Tu empresa" value={form.sender_company} onChange={e => updateField('sender_company', e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5" />Teléfono</Label>
              <Input placeholder="+57..." value={form.sender_phone} onChange={e => updateField('sender_phone', e.target.value)} maxLength={20} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de consulta</Label>
            <Select value={form.inquiry_type} onValueChange={v => updateField('inquiry_type', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {INQUIRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Presupuesto estimado</Label>
            <Select value={form.budget_range} onValueChange={v => updateField('budget_range', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rango..." /></SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES.map(br => <SelectItem key={br.value} value={br.value}>{br.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Asunto *</Label>
            <Input required placeholder="Asunto de tu consulta" value={form.subject} onChange={e => updateField('subject', e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><MessageSquare className="h-3.5 w-3.5" />Mensaje *</Label>
            <Textarea required placeholder="Cuéntanos sobre tu proyecto o necesidades..." value={form.message} onChange={e => updateField('message', e.target.value)} maxLength={2000} rows={4} />
          </div>

          <Button
            type="submit"
            disabled={submitting || !form.sender_name.trim() || !form.sender_email.trim() || !form.subject.trim() || !form.message.trim()}
            className="w-full text-white"
            style={{ backgroundColor: accentColor }}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Enviar consulta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
