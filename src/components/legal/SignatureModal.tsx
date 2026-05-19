import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronDown, Loader2, User } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SignatureMethod, getSignatureMethodForDocument } from '@/types/digital-signature';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { toast } from 'sonner';

interface LegalDocument {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary?: string;
  content_html?: string;
}

interface SignatureModalProps {
  document: LegalDocument;
  isOpen: boolean;
  onClose: () => void;
  onSigned: (signatureId: string) => void;
  signatureMethod?: SignatureMethod;
}

const DOC_EMOJI: Record<string, string> = {
  age_verification_policy: '🎂', age_verification: '🎂',
  terms_of_service: '📋', talent_agreement: '🎬', client_agreement: '🤝',
  brand_agreement: '🏢', privacy_policy: '🔒', creator_agreement: '✍️',
  organization_agreement: '🏛️', data_processing_agreement: '📊',
  escrow_payment_terms: '💳', white_label_agreement: '🏷️',
};

// Resumen de 3 puntos por tipo de documento (para mostrar antes de firmar)
const DOC_SUMMARY_POINTS: Record<string, string[]> = {
  client_agreement: [
    '💰 Pagas el 100% antes de que inicie cualquier trabajo',
    '✅ Los derechos del contenido son tuyos tras la aprobación',
    '⚠️ Si incumples pagos, tu cuenta puede ser suspendida',
  ],
  creator_agreement: [
    '🎬 Entregas contenido de calidad según el brief acordado',
    '💸 Recibes el pago tras la aprobación del cliente',
    '🤝 KREOON actúa como intermediario y cobra una comisión',
  ],
  talent_agreement: [
    '🎭 Produces contenido bajo las instrucciones del brief',
    '💸 El pago se libera automáticamente tras la aprobación',
    '🔒 Mantienes confidencialidad sobre la información del cliente',
  ],
  brand_agreement: [
    '🏢 Contratas creadores a través de la plataforma KREOON',
    '💳 El pago anticipado activa la producción del contenido',
    '📦 Los derechos de uso se transfieren al aprobar el entregable',
  ],
  organization_agreement: [
    '🏛️ Representas a tu empresa ante KREOON',
    '👥 Eres responsable de las acciones de los miembros de tu org',
    '📜 Aceptas los términos en nombre de la organización',
  ],
  escrow_payment_terms: [
    '💳 Los pagos van directamente a KREOON (Stripe o transferencia)',
    '✅ El trabajo comienza solo tras confirmar el pago',
    '🔄 KREOON libera el pago al creador tras tu aprobación',
  ],
};

export function SignatureModal({
  document,
  isOpen,
  onClose,
  onSigned,
  signatureMethod: overrideMethod,
}: SignatureModalProps) {
  const { user } = useAuth();
  const {
    signDocument,
    isSigning,
    signerFullName,
  } = useDigitalSignature();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const signatureMethod = overrideMethod || getSignatureMethodForDocument(document.document_type);
  const summaryPoints = DOC_SUMMARY_POINTS[document.document_type];
  const docEmoji = DOC_EMOJI[document.document_type] ?? '📄';

  // Detectar scroll al final del documento
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHasScrolledToEnd(true); },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, document.content_html]);

  const declarationText = `${signerFullName} confirma que leyó y acepta "${document.title}" versión ${document.version} de KREOON.`;

  const canSign = useCallback(() => {
    if (!hasScrolledToEnd || !confirmChecked) return false;
    if (signatureMethod === 'drawn_signature') return signatureImage !== null;
    // Para clickwrap y typed_name: solo necesita nombre en el perfil
    return signerFullName.length >= 2;
  }, [hasScrolledToEnd, confirmChecked, signatureMethod, signatureImage, signerFullName]);

  const handleSign = async () => {
    if (!canSign()) return;

    try {
      const signatureId = await signDocument({
        documentId: document.document_id,
        signerFullName,
        signatureMethod: signatureMethod === 'typed_name' ? 'clickwrap' : signatureMethod,
        typedSignature: signatureMethod === 'typed_name' ? signerFullName : undefined,
        signatureImageUrl: signatureMethod === 'drawn_signature' ? signatureImage ?? undefined : undefined,
        declarationText,
      });

      toast.success('¡Documento firmado! Enviando comprobante...');
      onSigned(signatureId);

      // Enviar email + WhatsApp en segundo plano (fire-and-forget)
      if (user?.id) {
        supabase.functions.invoke('notify-signature', {
          body: { signature_id: signatureId, user_id: user.id },
        }).then(({ error }) => {
          if (error) {
            console.warn('[SignatureModal] notify-signature falló:', error);
          } else {
            toast.success('Comprobante enviado a tu email y WhatsApp', { duration: 4000 });
          }
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al firmar el documento';
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToEnd(false);
      setSignatureImage(null);
      setConfirmChecked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = !hasScrolledToEnd ? 'reading' : 'signing';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="bg-background border-t-2 sm:border-2 border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[96vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50 shrink-0">
            <span className="text-3xl shrink-0">{docEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-base leading-tight truncate">{document.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 'reading' ? '⬇️ Lee hasta el final para poder firmar' : '✅ Leíste todo — ya puedes firmar'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="h-1.5 bg-muted/30 shrink-0">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: step === 'signing' ? '100%' : '30%' }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Contenido del documento */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
            {document.content_html ? (
              <>
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(document.content_html) }}
                  className={cn(
                    "pt-4",
                    "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-foreground",
                    "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-foreground",
                    "[&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:text-sm [&_li]:text-muted-foreground [&_li]:mb-1",
                    "[&_strong]:text-foreground [&_strong]:font-semibold",
                    "[&_table]:w-full [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:py-2 [&_th]:px-3 [&_th]:bg-muted/30",
                    "[&_td]:text-xs [&_td]:py-2 [&_td]:px-3 [&_td]:border-t [&_td]:border-border/30"
                  )}
                />
                <div ref={sentinelRef} className="h-4" />
              </>
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div ref={sentinelRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Hint de scroll — solo mientras lee */}
          {step === 'reading' && (
            <div className="flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 border-t border-amber-500/20 shrink-0">
              <ChevronDown className="w-4 h-4 text-amber-500 animate-bounce" />
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Sigue leyendo para poder firmar</span>
            </div>
          )}

          {/* Sección de firma — solo tras leer todo */}
          <AnimatePresence>
            {step === 'signing' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-border/50 p-5 space-y-3 shrink-0"
              >
                {/* Resumen del documento */}
                {summaryPoints && (
                  <div className="bg-muted/20 rounded-2xl px-4 py-3 space-y-1.5 border border-border/30">
                    <p className="text-xs font-semibold text-foreground mb-1">Lo que estás aceptando:</p>
                    {summaryPoints.map((point, i) => (
                      <p key={i} className="text-xs text-muted-foreground leading-relaxed">{point}</p>
                    ))}
                  </div>
                )}

                {/* Identidad — mostrar nombre, no pedir que lo escriban */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-border/50 bg-card">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Firmando como</p>
                    <p className="font-semibold text-foreground text-sm truncate">{signerFullName || 'Tu nombre'}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>

                {/* Canvas de firma dibujada (solo para drawn_signature) */}
                {signatureMethod === 'drawn_signature' && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">✍️ Dibuja tu firma</p>
                    <SignatureCanvas
                      onSignatureChange={setSignatureImage}
                      fallbackName={signerFullName}
                      width={Math.min(400, window.innerWidth - 80)}
                      height={120}
                    />
                  </div>
                )}

                {/* BigCard de confirmación */}
                <button
                  type="button"
                  onClick={() => setConfirmChecked(!confirmChecked)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                    confirmChecked ? 'border-primary bg-primary/10' : 'border-border/50 bg-card'
                  )}
                >
                  <span className="text-2xl shrink-0">{confirmChecked ? '✅' : '☑️'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Leí y acepto este documento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tiene la misma validez legal que una firma en papel</p>
                  </div>
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    confirmChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  )}>
                    {confirmChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>

                {/* Botón firmar */}
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!canSign() || isSigning}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all',
                    'bg-primary text-primary-foreground',
                    canSign() && !isSigning ? 'hover:bg-primary/90 scale-100' : 'opacity-40 cursor-not-allowed scale-95'
                  )}
                >
                  {isSigning ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Firmando...</>
                  ) : (
                    '🖊️ Firmar ahora'
                  )}
                </button>

                <p className="text-xs text-muted-foreground/50 text-center">
                  🔒 {new Date().toLocaleDateString('es-CO')} · versión {document.version}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SignatureModal;
