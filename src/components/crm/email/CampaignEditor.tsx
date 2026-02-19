import { useState } from "react";
import { Send, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmailTemplates, useEmailSegments, useCreateCampaign, useSendCampaign } from "@/hooks/useEmailMarketing";
import type { EmailCampaign } from "@/types/email-marketing.types";

interface CampaignEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: EmailCampaign | null;
}

export function CampaignEditor({ open, onOpenChange, campaign }: CampaignEditorProps) {
  const [name, setName] = useState(campaign?.name || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [segmentId, setSegmentId] = useState(campaign?.segment_id || "");
  const [templateId, setTemplateId] = useState(campaign?.template_id || "");
  const [fromName, setFromName] = useState(campaign?.from_name || "KREOON");
  const [fromEmail, setFromEmail] = useState(campaign?.from_email || "noreply@kreoon.com");
  const [replyTo, setReplyTo] = useState(campaign?.reply_to || "");
  const [htmlBody, setHtmlBody] = useState(campaign?.html_body || "");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: templates = [] } = useEmailTemplates();
  const { data: segments = [] } = useEmailSegments();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const isEditing = !!campaign;

  const handleSaveDraft = async () => {
    await createCampaign.mutateAsync({
      name,
      subject,
      segment_id: segmentId || null,
      template_id: templateId || null,
      html_body: htmlBody || null,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo || null,
      scheduled_at: null,
    });
    onOpenChange(false);
  };

  const handleSendNow = async () => {
    const created = await createCampaign.mutateAsync({
      name,
      subject,
      segment_id: segmentId || null,
      template_id: templateId || null,
      html_body: htmlBody || null,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo || null,
      scheduled_at: null,
    });
    if (created?.id) {
      await sendCampaign.mutateAsync({ campaign_id: created.id });
    }
    onOpenChange(false);
  };

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    const created = await createCampaign.mutateAsync({
      name,
      subject,
      segment_id: segmentId || null,
      template_id: templateId || null,
      html_body: htmlBody || null,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
    });
    if (created?.id) {
      await sendCampaign.mutateAsync({
        campaign_id: created.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
    }
    onOpenChange(false);
  };

  const handleTemplateChange = (tId: string) => {
    setTemplateId(tId);
    const template = templates.find((t) => t.id === tId);
    if (template) {
      if (!subject) setSubject(template.subject);
      setHtmlBody(template.html_body);
    }
  };

  const isValid = name.trim() && subject.trim() && segmentId;
  const isSaving = createCampaign.isPending || sendCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
          <DialogDescription>
            Configura y envía un email a un segmento de contactos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la campaña *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Newsletter Febrero"
              />
            </div>
            <div className="space-y-2">
              <Label>Segmento *</Label>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.contact_count} contactos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Asunto del email *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Novedades de febrero en KREOON"
            />
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre remitente</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email remitente</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reply-To (opcional)</Label>
            <Input
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="soporte@kreoon.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Contenido HTML</Label>
            <Textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="<h1>Hola {{first_name}}</h1>..."
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Variables disponibles: {"{{first_name}}"}, {"{{last_name}}"}, {"{{email}}"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Programar envío (opcional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={!isValid || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Guardar borrador
          </Button>
          {scheduledAt ? (
            <Button onClick={handleSchedule} disabled={!isValid || isSaving}>
              <Calendar className="h-4 w-4 mr-2" />
              Programar
            </Button>
          ) : (
            <Button onClick={handleSendNow} disabled={!isValid || isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Enviar ahora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
