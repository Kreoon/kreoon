import { useState } from 'react';
import {
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Star,
  Upload,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { EscrowDistribution } from './EscrowDistribution';
import type { EscrowDisplay } from '../../types';

// ============================================
// Approve Content Modal
// ============================================
interface ApproveContentModalProps {
  escrow: EscrowDisplay;
  open: boolean;
  onClose: () => void;
  onApprove: (data: { rating: number; comment?: string }) => void;
  isLoading?: boolean;
}

export function ApproveContentModal({
  escrow,
  open,
  onClose,
  onApprove,
  isLoading,
}: ApproveContentModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleSubmit = () => {
    onApprove({ rating, comment: comment.trim() || undefined });
  };

  const handleClose = () => {
    setRating(5);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <DialogTitle>Aprobar Contenido</DialogTitle>
              <DialogDescription>
                Los fondos serán liberados automáticamente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Distribution preview */}
          <EscrowDistribution escrow={escrow} size="compact" showStatus={false} />

          {/* Warning */}
          <Alert className="bg-amber-500/5 border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-xs">
              Esta acción es irreversible. Los fondos serán transferidos inmediatamente.
            </AlertDescription>
          </Alert>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Calificación del contenido</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      (hoveredStar !== null ? star <= hoveredStar : star <= rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[hsl(270,30%,40%)]'
                    )}
                  />
                </button>
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                {rating}/5
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comentario (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Excelente trabajo, muy satisfecho con el resultado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Procesando...' : 'Aprobar y Liberar'}
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Request Changes Modal
// ============================================
interface RequestChangesModalProps {
  escrow: EscrowDisplay;
  open: boolean;
  onClose: () => void;
  onRequest: (data: { changes: string }) => void;
  isLoading?: boolean;
  revisionsUsed?: number;
  maxRevisions?: number;
}

export function RequestChangesModal({
  escrow,
  open,
  onClose,
  onRequest,
  isLoading,
  revisionsUsed = 0,
  maxRevisions = 3,
}: RequestChangesModalProps) {
  const [changes, setChanges] = useState('');

  const remainingRevisions = maxRevisions - revisionsUsed;
  const canRequest = changes.trim().length >= 10 && remainingRevisions > 0;

  const handleSubmit = () => {
    if (!canRequest) return;
    onRequest({ changes: changes.trim() });
  };

  const handleClose = () => {
    setChanges('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <RefreshCw className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle>Solicitar Cambios</DialogTitle>
              <DialogDescription>
                Los fondos permanecerán bloqueados hasta nueva entrega
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Revisions count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(270,100%,60%,0.05)]">
            <span className="text-sm text-muted-foreground">Revisiones restantes</span>
            <span
              className={cn(
                'font-medium',
                remainingRevisions > 1 ? 'text-white' : 'text-amber-400'
              )}
            >
              {remainingRevisions} de {maxRevisions}
            </span>
          </div>

          {remainingRevisions === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Has agotado el número de revisiones. Considera aprobar o abrir una disputa.
              </AlertDescription>
            </Alert>
          )}

          {/* Changes description */}
          <div className="space-y-2">
            <Label>
              ¿Qué cambios necesitas? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="Describe los cambios que necesitas de forma clara y específica..."
              rows={5}
              disabled={remainingRevisions === 0}
            />
            {changes.length > 0 && changes.length < 10 && (
              <p className="text-xs text-destructive">
                Mínimo 10 caracteres ({changes.length}/10)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canRequest || isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Open Dispute Modal
// ============================================
const DISPUTE_REASONS = [
  { value: 'brief_not_met', label: 'Contenido no cumple el brief' },
  { value: 'quality_issue', label: 'Calidad inaceptable' },
  { value: 'late_delivery', label: 'Entrega fuera de tiempo' },
  { value: 'plagiarism', label: 'Plagio/contenido copiado' },
  { value: 'communication', label: 'Falta de comunicación' },
  { value: 'other', label: 'Otro motivo' },
] as const;

interface OpenDisputeModalProps {
  escrow: EscrowDisplay;
  open: boolean;
  onClose: () => void;
  onDispute: (data: { reason: string; description: string; evidenceUrls?: string[] }) => void;
  isLoading?: boolean;
}

export function OpenDisputeModal({
  escrow,
  open,
  onClose,
  onDispute,
  isLoading,
}: OpenDisputeModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const canSubmit = reason && description.trim().length >= 20;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onDispute({
      reason,
      description: description.trim(),
      evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
    });
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setEvidenceUrls([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle>Abrir Disputa</DialogTitle>
              <DialogDescription>
                Los fondos quedarán congelados hasta resolución
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <Alert className="bg-amber-500/5 border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-xs">
              Una disputa congela los fondos hasta que el equipo de Kreoon resuelva el caso.
              Tiempo estimado de resolución: 3-5 días hábiles.
            </AlertDescription>
          </Alert>

          {/* Reason */}
          <div className="space-y-2">
            <Label>
              Motivo de la disputa <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>
              Descripción detallada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica en detalle qué sucedió y por qué estás abriendo esta disputa..."
              rows={5}
            />
            {description.length > 0 && description.length < 20 && (
              <p className="text-xs text-destructive">
                Mínimo 20 caracteres ({description.length}/20)
              </p>
            )}
          </div>

          {/* Evidence upload hint */}
          <div className="p-3 rounded-lg bg-[hsl(270,100%,60%,0.05)] border border-dashed border-[hsl(270,100%,60%,0.2)]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Adjuntar evidencia (opcional)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Puedes adjuntar capturas de pantalla o documentos después de abrir la disputa.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? 'Procesando...' : 'Abrir Disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
