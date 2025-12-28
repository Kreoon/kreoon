import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Flag } from 'lucide-react';
import { useContentReport, ReportReason, ContentType } from '@/hooks/useContentReport';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId?: string;
  reportedUserId?: string;
  contentType: ContentType;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Publicidad o contenido repetitivo' },
  { value: 'harassment', label: 'Acoso', description: 'Contenido abusivo o intimidante' },
  { value: 'hate_speech', label: 'Discurso de odio', description: 'Contenido que promueve odio' },
  { value: 'violence', label: 'Violencia', description: 'Contenido violento o amenazante' },
  { value: 'nudity', label: 'Desnudez', description: 'Contenido sexual o inapropiado' },
  { value: 'false_info', label: 'Información falsa', description: 'Desinformación o noticias falsas' },
  { value: 'other', label: 'Otro', description: 'Otro motivo no listado' },
];

export function ReportDialog({
  open,
  onOpenChange,
  contentId,
  reportedUserId,
  contentType,
}: ReportDialogProps) {
  const { submitReport, loading } = useContentReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;

    const success = await submitReport({
      contentId,
      reportedUserId,
      contentType,
      reason,
      description: description.trim() || undefined,
    });

    if (success) {
      onOpenChange(false);
      setReason(null);
      setDescription('');
    }
  };

  const contentTypeLabels: Record<ContentType, string> = {
    post: 'publicación',
    story: 'historia',
    profile: 'perfil',
    comment: 'comentario',
    content: 'contenido',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Reportar {contentTypeLabels[contentType]}
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener la comunidad segura reportando contenido inapropiado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={reason || ''}
            onValueChange={(v) => setReason(v as ReportReason)}
          >
            {REPORT_REASONS.map((item) => (
              <div
                key={item.value}
                className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <RadioGroupItem value={item.value} id={item.value} className="mt-1" />
                <Label htmlFor={item.value} className="cursor-pointer flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {reason === 'other' && (
            <Textarea
              placeholder="Describe el motivo del reporte..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
