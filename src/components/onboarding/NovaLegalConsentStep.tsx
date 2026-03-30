/**
 * NovaLegalConsentStep - Paso de consentimientos legales con diseño Nova
 *
 * Features:
 * - Responsive: Mobile, Tablet, Desktop
 * - Dark/Light mode support
 * - Bordes sutilmente redondeados
 * - Aurora background effect
 * - Firma digital y aceptación de documentos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Lock, FileText, CheckCircle2,
  Loader2, AlertCircle, ScrollText, PenTool, Shield, LogOut, ArrowRight
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useOnboardingGate, PendingDocument } from '@/hooks/useOnboardingGate';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { SignatureModal } from '@/components/legal/SignatureModal';
import { SignatureReceipt } from '@/components/legal/SignatureReceipt';
import { getSignatureMethodForDocument } from '@/types/digital-signature';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';
import { getPermissionGroup } from '@/lib/permissionGroups';

interface NovaLegalConsentStepProps {
  onBack: () => void;
  onLogout?: () => void;
  userRole?: AppRole; // Rol del usuario para filtrar documentos
}

export function NovaLegalConsentStep({ onBack, onLogout, userRole }: NovaLegalConsentStepProps) {
  const {
    requiredPendingDocuments,
    completionStatus,
    completeOnboarding,
    isCompletingOnboarding,
    refetch,
  } = useOnboardingGate();

  const {
    acceptDocument,
    verifyAge,
    isAgeVerified,
    isAccepting,
    isVerifyingAge,
  } = useLegalConsent();

  const {
    mySignatures,
  } = useDigitalSignature();

  const [ageConfirmed, setAgeConfirmed] = useState(isAgeVerified());
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [openDocument, setOpenDocument] = useState<PendingDocument | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const [signatureModalDoc, setSignatureModalDoc] = useState<PendingDocument | null>(null);
  const [signatureModalContent, setSignatureModalContent] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<Set<string>>(new Set());

  // Filtrar documentos de registro que corresponden al rol del usuario
  // user_role puede ser: 'all', 'talent', 'client', o un rol específico
  const userPermissionGroup = userRole ? getPermissionGroup(userRole) : 'talent';

  const documentsToShow = requiredPendingDocuments.filter(doc => {
    // Solo documentos de registro
    if (doc.trigger_event && doc.trigger_event !== 'registration') return false;

    // Obtener el user_role del documento (viene del backend)
    const docUserRole = (doc as PendingDocument & { user_role?: string }).user_role;

    // Si no hay user_role o es 'all', mostrar a todos
    if (!docUserRole || docUserRole === 'all') return true;

    // Si el doc es para 'talent' y el usuario es talent
    if (docUserRole === 'talent' && userPermissionGroup === 'talent') return true;

    // Si el doc es para 'client' y el usuario es client
    if (docUserRole === 'client' && userPermissionGroup === 'client') return true;

    // Si el doc es para un rol específico
    if (docUserRole === userRole) return true;

    return false;
  });

  // Sincronizar documentos firmados al cargar
  useEffect(() => {
    const signedSet = new Set<string>();
    mySignatures.forEach(sig => {
      if (sig.status === 'valid') {
        const doc = documentsToShow.find(d => d.document_type === sig.document_type);
        if (doc) {
          signedSet.add(doc.document_id);
        }
      }
    });
    if (signedSet.size > 0) {
      setSignedDocuments(signedSet);
      setAcceptedDocs(prev => new Set([...prev, ...signedSet]));
    }
  }, [mySignatures, documentsToShow]);

  const allDocsAccepted = documentsToShow.every(
    doc => acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id)
  );
  const canComplete = ageConfirmed && allDocsAccepted;

  // Cargar contenido del documento
  const loadDocumentContent = useCallback(async (doc: PendingDocument) => {
    setLoadingContent(true);
    setHasReadToBottom(false);

    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('content_html')
        .eq('id', doc.document_id)
        .single();

      if (error) throw error;

      let content = data?.content_html || '';

      if (!content || content.trim().startsWith('<!--') || content.length < 100) {
        const version = doc.version || '1';
        const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
        const filename = `${doc.document_type}_v${majorVersion}.html`;

        try {
          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            content = await response.text();
          }
        } catch {
          // silently fail
        }
      }

      setDocumentContent(content || '<p>Contenido del documento no disponible.</p>');
    } catch {
      setDocumentContent('<p>Error cargando el documento. Intenta de nuevo.</p>');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const openDocumentDrawer = (doc: PendingDocument) => {
    setOpenDocument(doc);
    loadDocumentContent(doc);
  };

  const closeDocumentDrawer = () => {
    setOpenDocument(null);
    setDocumentContent('');
    setHasReadToBottom(false);
  };

  const openSignatureModal = async (doc: PendingDocument) => {
    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('content_html')
        .eq('id', doc.document_id)
        .single();

      if (error) throw error;

      let content = data?.content_html || '';

      if (!content || content.trim().startsWith('<!--') || content.length < 100) {
        const version = doc.version || '1';
        const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
        const filename = `${doc.document_type}_v${majorVersion}.html`;

        try {
          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            content = await response.text();
          }
        } catch {
          // silently fail
        }
      }

      setSignatureModalContent(content || '<p>Contenido del documento no disponible.</p>');
      setSignatureModalDoc(doc);
    } catch {
      toast.error('Error cargando el documento');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDocumentSigned = (signatureId: string) => {
    if (signatureModalDoc) {
      setSignedDocuments(prev => new Set([...prev, signatureModalDoc.document_id]));
      setAcceptedDocs(prev => new Set([...prev, signatureModalDoc.document_id]));
      setShowReceipt(signatureId);
    }
    setSignatureModalDoc(null);
    setSignatureModalContent('');
    refetch();
  };

  const handleAcceptDocument = async (docId: string) => {
    try {
      await acceptDocument(docId);
      setAcceptedDocs(prev => new Set([...prev, docId]));
      closeDocumentDrawer();
      toast.success('Documento aceptado');
    } catch {
      toast.error('Error al aceptar el documento');
    }
  };

  const handleAgeConfirm = async (confirmed: boolean) => {
    setAgeConfirmed(confirmed);
    if (confirmed && !isAgeVerified()) {
      try {
        await verifyAge(true);
      } catch {
        toast.error('Error al verificar edad');
        setAgeConfirmed(false);
      }
    }
  };

  const translateMissingField = (field: string): string => {
    const translations: Record<string, string> = {
      'full_name': 'nombre completo',
      'username': 'nombre de usuario',
      'phone': 'teléfono',
      'email': 'correo electrónico',
      'country': 'país',
      'city': 'ciudad',
      'address': 'dirección',
      'document_type': 'tipo de documento',
      'document_number': 'número de documento',
      'nationality': 'nacionalidad',
      'date_of_birth': 'fecha de nacimiento',
      'age_under_18': 'debes ser mayor de 18 años',
      'social': 'al menos una red social',
    };
    return translations[field] || field;
  };

  const handleComplete = async () => {
    if (!canComplete) {
      toast.error('Debes aceptar todos los documentos y confirmar tu edad');
      return;
    }

    if (completionStatus && !completionStatus.profile_completed && completionStatus.missing?.length > 0) {
      const missingFields = completionStatus.missing.map(translateMissingField).join(', ');
      toast.error(`Faltan campos en tu perfil: ${missingFields}`);
      return;
    }

    try {
      if (!isAgeVerified() && ageConfirmed) {
        await verifyAge(true);
      }

      const acceptPromises = documentsToShow.map(async (doc) => {
        try {
          await acceptDocument(doc.document_id);
          return { success: true };
        } catch {
          return { success: false };
        }
      });

      await Promise.all(acceptPromises);
      await new Promise(resolve => setTimeout(resolve, 300));
      await refetch();

      const result = await completeOnboarding();

      if (result) {
        toast.success('¡Bienvenido a KREOON!');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error('Error: Verifica que hayas completado tu perfil y aceptado todos los documentos requeridos.');
        refetch();
      }
    } catch (error: any) {
      toast.error(`Error al completar: ${error?.message || 'Error desconocido'}`);
      refetch();
    }
  };

  const getDocTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      terms_of_service: 'Términos de Servicio',
      privacy_policy: 'Política de Privacidad',
      acceptable_use_policy: 'Política de Uso Aceptable',
      cookie_policy: 'Política de Cookies',
      age_verification_policy: 'Verificación de Edad',
      creator_agreement: 'Acuerdo de Creador',
      content_moderation_policy: 'Política de Moderación',
      dmca_policy: 'Política DMCA',
      brand_agreement: 'Acuerdo de Marca',
      escrow_payment_terms: 'Términos de Escrow y Pagos',
      white_label_agreement: 'Acuerdo de Organización',
      data_processing_agreement: 'Acuerdo de Procesamiento de Datos (DPA)',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0a0a0f]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f14] border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-zinc-900 dark:text-white">KREOON</span>
            <span className="px-2.5 py-1 text-xs font-medium bg-purple-600 text-white rounded-full">
              Verificación
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4">
          {/* Step 1 - Completed */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">Datos personales</span>
          </div>
          {/* Line */}
          <div className="w-12 sm:w-16 h-px bg-zinc-300 dark:bg-zinc-700" />
          {/* Step 2 - Active */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              2
            </div>
            <span className="text-sm font-medium text-zinc-900 dark:text-white hidden sm:inline">Términos legales</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-sm p-6 sm:p-8 md:p-10",
            "bg-white dark:bg-[#14141f]",
            "border border-zinc-200 dark:border-zinc-800",
            "shadow-sm dark:shadow-none"
          )}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              Términos y Condiciones
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
              Los siguientes documentos regulan tu uso de la plataforma KREOON, operada por KREOON TECH LLC. Lee cada uno antes de aceptar.
            </p>
          </div>

          {/* Age Verification */}
          <section className="mb-8" aria-labelledby="age-verification-heading">
            <div
              className={cn(
                "p-4 rounded-sm border transition-colors",
                ageConfirmed
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                  : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
              )}
            >
              <label htmlFor="age-verification-checkbox" className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="age-verification-checkbox"
                  checked={ageConfirmed}
                  onCheckedChange={(checked) => handleAgeConfirm(checked === true)}
                  disabled={isVerifyingAge}
                  aria-required="true"
                  aria-describedby="age-verification-description"
                  className="mt-1"
                />
                <div>
                  <p id="age-verification-heading" className="font-medium text-zinc-900 dark:text-white">
                    Verificación de Edad <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
                    <span className="sr-only">(campo requerido)</span>
                  </p>
                  <p id="age-verification-description" className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    <strong>Declaro bajo juramento que soy mayor de 18 años de edad</strong> o tengo la mayoría de edad legal en mi jurisdicción, y tengo capacidad legal para aceptar estos términos.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Documents List */}
          <section className="space-y-3">
            {documentsToShow.map((doc) => {
              const isAccepted = acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id);
              const isSigned = signedDocuments.has(doc.document_id);
              const signatureMethod = getSignatureMethodForDocument(doc.document_type);
              const requiresSignature = signatureMethod !== 'clickwrap';

              return (
                <motion.div
                  key={doc.document_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "p-4 rounded-sm border transition-colors",
                    isAccepted
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                      : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#1a1a24]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {isAccepted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-white/30" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          {doc.title || getDocTypeLabel(doc.document_type)}
                          {doc.is_required && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              Requerido
                            </span>
                          )}
                          {requiresSignature && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <PenTool className="w-3 h-3" />
                              Firma
                            </span>
                          )}
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openDocumentDrawer(doc)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded transition-colors"
                          >
                            <ScrollText className="w-4 h-4" />
                            Leer
                          </button>

                          {!isAccepted && (
                            <button
                              onClick={() => requiresSignature ? openSignatureModal(doc) : openDocumentDrawer(doc)}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded",
                                "bg-purple-600 hover:bg-purple-500",
                                "transition-colors"
                              )}
                            >
                              {requiresSignature ? (
                                <>
                                  <PenTool className="w-4 h-4" />
                                  Firmar
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Aceptar
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {doc.summary && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{doc.summary}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">Versión {doc.version}</p>
                        {isSigned && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Firmado digitalmente
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* Legal Note */}
          <div className="mt-6 p-4 rounded-sm bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-500 flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Tu aceptación se registra con fecha, hora, dirección IP y navegador para cumplimiento legal. Esta información se almacena de forma segura y solo se utiliza para demostrar tu consentimiento.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBack}
              aria-label="Volver al paso anterior"
              className="flex items-center justify-center gap-2 h-12 px-6 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#14141f]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Volver
            </button>

            <button
              onClick={handleComplete}
              disabled={!canComplete || isCompletingOnboarding || isAccepting}
              aria-label={isCompletingOnboarding ? 'Procesando solicitud' : 'Completar verificacion y acceder a KREOON'}
              aria-disabled={!canComplete || isCompletingOnboarding || isAccepting}
              className={cn(
                "flex-1 h-12 sm:h-14 rounded font-semibold text-white",
                "bg-gradient-to-r from-purple-600 to-purple-500",
                "hover:from-purple-500 hover:to-purple-400",
                "shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#14141f]"
              )}
            >
              {isCompletingOnboarding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Procesando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" aria-hidden="true" />
                  Completar y acceder a KREOON
                </>
              )}
            </button>
          </div>

          {!canComplete && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-4 flex items-center justify-center gap-2" role="alert" aria-live="polite">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              Debes confirmar tu edad y aceptar todos los documentos
            </p>
          )}
        </motion.div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            © 2026 KREOON TECH LLC. Todos los derechos reservados.
          </p>
        </footer>
      </main>

      {/* Document Drawer */}
      <Sheet open={!!openDocument} onOpenChange={(open) => !open && closeDocumentDrawer()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-white dark:bg-[#0F0F23] border-zinc-200 dark:border-white/10 p-0 z-[200] flex flex-col h-full"
        >
          <SheetHeader className="p-4 sm:p-6 border-b border-zinc-200 dark:border-white/10 flex-shrink-0">
            <SheetTitle className="text-zinc-900 dark:text-white text-base sm:text-lg">
              {openDocument?.title || getDocTypeLabel(openDocument?.document_type || '')}
            </SheetTitle>
            <SheetDescription className="text-zinc-500 dark:text-white/60 text-xs sm:text-sm">
              Versión {openDocument?.version} — Lee el documento completo
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 sm:p-6">
              {loadingContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <DocumentContent
                  html={documentContent}
                  onScrollEnd={() => setHasReadToBottom(true)}
                />
              )}
            </div>
          </ScrollArea>

          <div className="p-4 sm:p-6 border-t border-zinc-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-[#0F0F23]">
            {openDocument && getSignatureMethodForDocument(openDocument.document_type) !== 'clickwrap' ? (
              <button
                onClick={() => {
                  closeDocumentDrawer();
                  openSignatureModal(openDocument);
                }}
                disabled={!hasReadToBottom}
                className={cn(
                  "w-full h-12 rounded font-semibold text-white",
                  "bg-purple-600 hover:bg-purple-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                  "transition-colors"
                )}
              >
                {hasReadToBottom ? (
                  <>
                    <PenTool className="w-5 h-5" />
                    Continuar a firma
                  </>
                ) : (
                  <>
                    <ScrollText className="w-5 h-5" />
                    Lee hasta el final para firmar
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => openDocument && handleAcceptDocument(openDocument.document_id)}
                disabled={!hasReadToBottom || isAccepting}
                className={cn(
                  "w-full h-12 rounded font-semibold text-white",
                  "bg-purple-600 hover:bg-purple-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                  "transition-colors"
                )}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Aceptando...
                  </>
                ) : hasReadToBottom ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    He leído y acepto
                  </>
                ) : (
                  <>
                    <ScrollText className="w-5 h-5" />
                    Lee hasta el final para aceptar
                  </>
                )}
              </button>
            )}
            {!hasReadToBottom && (
              <p className="text-xs text-zinc-400 dark:text-white/40 text-center mt-2">
                Desplázate hasta el final del documento para habilitarlo
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Signature Modal */}
      {signatureModalDoc && (
        <SignatureModal
          document={{
            document_id: signatureModalDoc.document_id,
            document_type: signatureModalDoc.document_type,
            title: signatureModalDoc.title,
            version: signatureModalDoc.version,
            summary: signatureModalDoc.summary,
            content_html: signatureModalContent,
          }}
          isOpen={!!signatureModalDoc}
          onClose={() => {
            setSignatureModalDoc(null);
            setSignatureModalContent('');
          }}
          onSigned={handleDocumentSigned}
        />
      )}

      {/* Signature Receipt */}
      {showReceipt && (
        <SignatureReceipt
          signatureId={showReceipt}
          isOpen={!!showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}
    </div>
  );
}

// Document Content Component
function DocumentContent({
  html,
  onScrollEnd,
}: {
  html: string;
  onScrollEnd: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onScrollEnd();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onScrollEnd]);

  return (
    <div className="prose prose-zinc dark:prose-invert prose-purple max-w-none">
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className={cn(
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-zinc-900 dark:[&_h1]:text-white",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-zinc-900 dark:[&_h2]:text-white",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-zinc-900 dark:[&_h3]:text-white",
          "[&_p]:text-zinc-700 dark:[&_p]:text-white/80 [&_p]:leading-relaxed [&_p]:mb-3",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
          "[&_li]:text-zinc-700 dark:[&_li]:text-white/80 [&_li]:mb-1",
          "[&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:underline",
          "[&_strong]:text-zinc-900 dark:[&_strong]:text-white [&_strong]:font-semibold",
          "[&_address]:text-zinc-600 dark:[&_address]:text-white/70 [&_address]:not-italic"
        )}
      />
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

export default NovaLegalConsentStep;
