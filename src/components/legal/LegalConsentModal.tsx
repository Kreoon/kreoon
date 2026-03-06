import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Shield, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useLegalConsent, type PendingConsent } from '@/hooks/useLegalConsent';
import { cn } from '@/lib/utils';

interface LegalConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  blockClose?: boolean; // Si true, no se puede cerrar sin aceptar
}

export function LegalConsentModal({
  open,
  onOpenChange,
  onComplete,
  blockClose = true,
}: LegalConsentModalProps) {
  const {
    pendingConsents,
    isLoading,
    isAccepting,
    isVerifyingAge,
    acceptMultipleDocuments,
    verifyAge,
    isAgeVerified,
  } = useLegalConsent();

  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // Filtrar solo los documentos requeridos
  const requiredDocs = pendingConsents?.filter(d => d.is_required) || [];

  // Verificar si todos los requeridos están aceptados
  const allRequiredAccepted = requiredDocs.every(doc => acceptedDocs.has(doc.document_id));
  const canSubmit = allRequiredAccepted && (isAgeVerified() || ageConfirmed);

  // Reset state cuando se abre
  useEffect(() => {
    if (open) {
      setAcceptedDocs(new Set());
      setAgeConfirmed(isAgeVerified());
    }
  }, [open, isAgeVerified]);

  const handleAcceptDoc = (docId: string, checked: boolean) => {
    const newSet = new Set(acceptedDocs);
    if (checked) {
      newSet.add(docId);
    } else {
      newSet.delete(docId);
    }
    setAcceptedDocs(newSet);
  };

  const handleSubmit = async () => {
    try {
      // Primero verificar edad si no está verificada
      if (!isAgeVerified() && ageConfirmed) {
        await verifyAge(true);
      }

      // Luego aceptar todos los documentos marcados
      const docsToAccept = Array.from(acceptedDocs);
      if (docsToAccept.length > 0) {
        await acceptMultipleDocuments(docsToAccept);
      }

      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Error al registrar consentimientos:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Si blockClose está activo y hay documentos requeridos pendientes, no permitir cerrar
    if (!newOpen && blockClose && requiredDocs.length > 0) {
      return;
    }
    onOpenChange(newOpen);
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      terms_of_service: 'Términos de Servicio',
      privacy_policy: 'Política de Privacidad',
      acceptable_use_policy: 'Política de Uso Aceptable',
      age_verification_policy: 'Política de Verificación de Edad',
      creator_agreement: 'Acuerdo de Creador',
      brand_agreement: 'Acuerdo de Marca',
      dmca_policy: 'Política DMCA',
      content_moderation_policy: 'Política de Moderación',
      escrow_payment_terms: 'Términos de Escrow y Pagos',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[600px] max-h-[90vh] overflow-hidden",
          "bg-gradient-to-br from-background/95 via-background/98 to-background/95",
          "backdrop-blur-xl border-white/10"
        )}
        onPointerDownOutside={(e) => {
          if (blockClose && requiredDocs.length > 0) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (blockClose && requiredDocs.length > 0) {
            e.preventDefault();
          }
        }}
      >
        {/* Header con gradiente */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent pointer-events-none" />

        <DialogHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Documentos Legales
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Por favor revisa y acepta los siguientes documentos para continuar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-3">
                {/* Documentos pendientes */}
                {requiredDocs.map((doc) => (
                  <DocumentItem
                    key={doc.document_id}
                    document={doc}
                    isAccepted={acceptedDocs.has(doc.document_id)}
                    isExpanded={expandedDoc === doc.document_id}
                    onAcceptChange={(checked) => handleAcceptDoc(doc.document_id, checked)}
                    onToggleExpand={() => setExpandedDoc(
                      expandedDoc === doc.document_id ? null : doc.document_id
                    )}
                    getLabel={getDocumentTypeLabel}
                  />
                ))}

                {/* Verificación de edad */}
                {!isAgeVerified() && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      ageConfirmed
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-orange-500/30 bg-orange-500/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="age-verification"
                        checked={ageConfirmed}
                        onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                        className="mt-1"
                      />
                      <label
                        htmlFor="age-verification"
                        className="flex-1 cursor-pointer"
                      >
                        <p className="font-medium text-foreground">
                          Verificación de Edad
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Declaro bajo juramento que soy mayor de 18 años de edad</strong> o
                          tengo la mayoría de edad legal en mi jurisdicción, y tengo capacidad
                          legal para aceptar estos términos.
                        </p>
                      </label>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>
                  Tu aceptación se registra con fecha, hora e IP para cumplimiento legal.
                </span>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isAccepting || isVerifyingAge}
                className={cn(
                  "w-full h-12 text-base font-medium",
                  "bg-gradient-to-r from-purple-600 to-pink-600",
                  "hover:from-purple-500 hover:to-pink-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isAccepting || isVerifyingAge ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Aceptar y Continuar
                  </>
                )}
              </Button>

              {!canSubmit && (
                <p className="text-xs text-center text-orange-400">
                  Debes aceptar todos los documentos requeridos y confirmar tu edad para continuar.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DocumentItemProps {
  document: PendingConsent;
  isAccepted: boolean;
  isExpanded: boolean;
  onAcceptChange: (checked: boolean) => void;
  onToggleExpand: () => void;
  getLabel: (type: string) => string;
}

function DocumentItem({
  document,
  isAccepted,
  isExpanded,
  onAcceptChange,
  onToggleExpand,
  getLabel,
}: DocumentItemProps) {
  const docUrl = `/legal/${document.document_type.replace(/_/g, '-')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border transition-all",
        isAccepted
          ? "border-green-500/30 bg-green-500/5"
          : "border-white/10 bg-white/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={document.document_id}
          checked={isAccepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor={document.document_id}
              className="font-medium text-foreground cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              {document.title || getLabel(document.document_type)}
              {document.is_required && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                  Requerido
                </span>
              )}
            </label>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-purple-400 hover:text-purple-300"
            >
              <a href={docUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                Ver
              </a>
            </Button>
          </div>

          {document.summary && (
            <p className="text-sm text-muted-foreground mt-1">
              {document.summary}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Versión {document.version}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default LegalConsentModal;
