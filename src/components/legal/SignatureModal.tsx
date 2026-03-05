import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, CheckCircle2, Lock, AlertCircle,
  ChevronDown, Loader2, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas } from './SignatureCanvas';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { SignatureMethod, getSignatureMethodForDocument } from '@/types/digital-signature';
import { cn } from '@/lib/utils';
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

export function SignatureModal({
  document,
  isOpen,
  onClose,
  onSigned,
  signatureMethod: overrideMethod,
}: SignatureModalProps) {
  const {
    signDocument,
    isSigning,
    signerFullName,
    signerEmail,
    signerDocumentType,
    signerDocumentNumber,
  } = useDigitalSignature();

  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [currentIP, setCurrentIP] = useState<string>('...');
  const [currentTime, setCurrentTime] = useState(new Date());

  const signatureMethod = overrideMethod || getSignatureMethodForDocument(document.document_type);

  // Actualizar hora cada segundo
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Obtener IP al abrir
  useEffect(() => {
    if (isOpen) {
      fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => setCurrentIP(d.ip || '...'))
        .catch(() => setCurrentIP('...'));
    }
  }, [isOpen]);

  // Detectar scroll al final del documento
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledToEnd(true);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [isOpen, document.content_html]);

  // Generar declaración automática
  const declarationText = `Yo, ${typedName || signerFullName}, identificado(a) con ${signerDocumentType || 'documento'} No. ${signerDocumentNumber || 'N/A'}, declaro que he leído y acepto el documento "${document.title}" versión ${document.version} de SICOMMER INT LLC. Confirmo que soy mayor de 18 años y que actúo de manera libre y voluntaria.`;

  // Validar si puede firmar
  const canSign = useCallback(() => {
    if (!hasScrolledToEnd) return false;
    if (!confirmChecked) return false;

    switch (signatureMethod) {
      case 'clickwrap':
        return true;
      case 'typed_name':
        return typedName.length >= 3 && typedName.toLowerCase() === signerFullName.toLowerCase();
      case 'drawn_signature':
        return signatureImage !== null;
      default:
        return false;
    }
  }, [hasScrolledToEnd, confirmChecked, signatureMethod, typedName, signerFullName, signatureImage]);

  // Firmar documento
  const handleSign = async () => {
    if (!canSign()) return;

    try {
      const signatureId = await signDocument({
        documentId: document.document_id,
        signerFullName: signerFullName,
        signatureMethod,
        typedSignature: signatureMethod === 'typed_name' ? typedName : undefined,
        signatureImageUrl: signatureMethod === 'drawn_signature' ? signatureImage || undefined : undefined,
        declarationText,
      });

      toast.success('Documento firmado correctamente');
      onSigned(signatureId);
    } catch (error: any) {
      toast.error(error.message || 'Error al firmar el documento');
    }
  };

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToEnd(false);
      setTypedName('');
      setSignatureImage(null);
      setConfirmChecked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-white truncate">{document.title}</h2>
                <p className="text-xs sm:text-sm text-white/60">v{document.version} — SICOMMER INT LLC</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Contenido del documento */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 prose prose-invert prose-sm max-w-none min-h-0"
          >
            {document.content_html ? (
              <>
                <div dangerouslySetInnerHTML={{ __html: document.content_html }} />
                <div ref={sentinelRef} className="h-4" />
              </>
            ) : (
              <div className="text-center py-12 text-white/40">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cargando contenido del documento...</p>
                <div ref={sentinelRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Indicador de scroll */}
          {!hasScrolledToEnd && (
            <div className="flex items-center justify-center gap-2 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
              <ChevronDown className="w-4 h-4 text-yellow-400 animate-bounce" />
              <span className="text-sm text-yellow-400">Desplázate para leer todo el documento</span>
            </div>
          )}

          {/* Sección de firma */}
          <div className="border-t border-white/10 p-4 sm:p-6 space-y-3 sm:space-y-4 bg-black/20 flex-shrink-0 max-h-[50vh] overflow-y-auto">
            {/* Estado de lectura */}
            <div className={cn(
              "flex items-center gap-2 text-sm",
              hasScrolledToEnd ? "text-green-400" : "text-white/40"
            )}>
              <CheckCircle2 className={cn("w-4 h-4", !hasScrolledToEnd && "opacity-40")} />
              Has leído el documento completo
            </div>

            {/* Campo de firma según método */}
            {signatureMethod === 'typed_name' && (
              <div className="space-y-2">
                <Label className="text-white/90">
                  Escribe tu nombre completo para firmar
                </Label>
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={signerFullName}
                  className="bg-white/5 border-white/10 text-white text-lg font-medium"
                  disabled={!hasScrolledToEnd}
                />
                {typedName && typedName.toLowerCase() !== signerFullName.toLowerCase() && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    El nombre debe coincidir exactamente con: {signerFullName}
                  </p>
                )}
              </div>
            )}

            {signatureMethod === 'drawn_signature' && (
              <div className="space-y-2">
                <Label className="text-white/90">Dibuja tu firma</Label>
                <SignatureCanvas
                  onSignatureChange={setSignatureImage}
                  fallbackName={signerFullName}
                  width={Math.min(400, window.innerWidth - 80)}
                  height={120}
                />
              </div>
            )}

            {/* Declaración */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wide">Declaración</p>
              <p className="text-sm text-white/80 italic">"{declarationText}"</p>
            </div>

            {/* Checkbox de confirmación */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                disabled={!hasScrolledToEnd}
                className="mt-0.5"
              />
              <label htmlFor="confirm" className="text-sm text-white/70 leading-relaxed cursor-pointer">
                Confirmo que la información anterior es correcta y que esta firma electrónica
                tiene la misma validez que mi firma manuscrita conforme a la Ley 527 de 1999
                (Colombia), ESIGN Act (USA), eIDAS (UE) y normativa aplicable.
              </label>
            </div>

            {/* Botón de firma */}
            <Button
              onClick={handleSign}
              disabled={!canSign() || isSigning}
              className={cn(
                "w-full h-12 text-base font-semibold",
                "bg-gradient-to-r from-purple-600 to-pink-600",
                "hover:from-purple-500 hover:to-pink-500",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Firmar documento
                </>
              )}
            </Button>

            {/* Metadata de la firma */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
              <span>Firmante: {signerFullName}</span>
              <span>IP: {currentIP}</span>
              <span>Fecha: {currentTime.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</span>
              <span>Doc v{document.version}</span>
            </div>

            {/* Badge de seguridad */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-white/30">
              <Shield className="w-3 h-3" />
              Firma electrónica segura — SHA-256 — SICOMMER INT LLC
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SignatureModal;
