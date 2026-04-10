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

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Lock, FileText, CheckCircle2,
  Loader2, AlertCircle, ScrollText, PenTool, Shield
} from 'lucide-react';
import { OnboardingShell, TALENT_STEPS, CLIENT_STEPS } from './OnboardingShell';
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
import type { AppRole, AccountType } from '@/types/database';
import { getPermissionGroup } from '@/lib/permissionGroups';

interface NovaLegalConsentStepProps {
  onBack: () => void;
  onLogout?: () => void;
  userRole?: AppRole; // Rol del usuario para filtrar documentos
  accountType?: AccountType; // Tipo de cuenta: 'talent' | 'client' | 'organization'
}

export function NovaLegalConsentStep({ onBack, onLogout, userRole, accountType }: NovaLegalConsentStepProps) {
  // Determinar si es flujo de talento o cliente
  const isTalentFlow = userRole !== 'client';
  const steps = isTalentFlow ? TALENT_STEPS : CLIENT_STEPS;
  const currentStep = isTalentFlow ? 4 : 3; // Último paso en ambos flujos
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

  // Filtrar documentos de registro que corresponden al rol y tipo de cuenta del usuario
  // user_role puede ser: 'all', 'talent', 'client', o un rol específico
  // account_type puede ser: 'talent', 'client', 'organization', o null
  const userPermissionGroup = userRole ? getPermissionGroup(userRole) : 'talent';

  const documentsToShow = requiredPendingDocuments.filter(doc => {
    // Solo documentos de registro
    if (doc.trigger_event && doc.trigger_event !== 'registration') return false;

    // Obtener user_role y account_type del documento
    const docUserRole = doc.user_role;
    const docAccountType = doc.account_type;

    // PRIORIDAD 1: Filtrar por account_type si existe
    // Si el documento tiene account_type, SOLO mostrarlo si coincide con el del usuario
    if (docAccountType) {
      return docAccountType === accountType;
    }

    // PRIORIDAD 2: Filtrar por user_role (sistema legacy)
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

  const allDocsAccepted = useMemo(
    () => documentsToShow.every(
      doc => acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id)
    ),
    [documentsToShow, acceptedDocs, signedDocuments]
  );

  const canComplete = useMemo(
    () => ageConfirmed && allDocsAccepted,
    [ageConfirmed, allDocsAccepted]
  );

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
      console.log('[Onboarding] Iniciando proceso de completar...');

      if (!isAgeVerified() && ageConfirmed) {
        console.log('[Onboarding] Verificando edad...');
        await verifyAge(true);
      }

      console.log('[Onboarding] Aceptando documentos...');
      const acceptPromises = documentsToShow.map(async (doc) => {
        try {
          await acceptDocument(doc.document_id);
          console.log('[Onboarding] Documento aceptado:', doc.document_type);
          return { success: true, doc: doc.document_type };
        } catch (err) {
          console.error('[Onboarding] Error aceptando documento:', doc.document_type, err);
          return { success: false, doc: doc.document_type };
        }
      });

      const results = await Promise.all(acceptPromises);
      const failedDocs = results.filter(r => !r.success);
      if (failedDocs.length > 0) {
        console.warn('[Onboarding] Algunos documentos fallaron:', failedDocs);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      await refetch();

      console.log('[Onboarding] Llamando completeOnboarding...');
      const result = await completeOnboarding();
      console.log('[Onboarding] Resultado:', result);

      if (result) {
        toast.success('¡Bienvenido a KREOON!');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.error('[Onboarding] completeOnboarding devolvió false. completionStatus:', completionStatus);
        toast.error('Error: Verifica que hayas completado tu perfil y aceptado todos los documentos requeridos.');
        refetch();
      }
    } catch (error: unknown) {
      console.error('[Onboarding] Error en handleComplete:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al completar: ${errorMessage}`);
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
      // Documentos unificados por tipo de cuenta (v1.0 - Marzo 2026)
      talent_agreement: 'Acuerdo de Talento KREOON',
      client_agreement: 'Acuerdo de Cliente KREOON',
      organization_agreement: 'Acuerdo de Organización KREOON',
    };
    return labels[type] || type;
  };

  return (
    <OnboardingShell currentStep={currentStep} steps={steps} onLogout={onLogout}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-[0.125rem] p-6 sm:p-8 md:p-10",
            "bg-card",
            "border border-border"
          )}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Términos y Condiciones
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Los siguientes documentos regulan tu uso de la plataforma KREOON, operada por KREOON TECH LLC. Lee cada uno antes de aceptar.
            </p>
          </div>

          {/* Age Verification */}
          <section className="mb-8" aria-labelledby="age-verification-heading">
            <div
              className={cn(
                "p-4 rounded-[0.125rem] border transition-colors",
                ageConfirmed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
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
                  <p id="age-verification-heading" className="font-medium text-foreground">
                    Verificación de Edad <span className="text-destructive" aria-hidden="true">*</span>
                    <span className="sr-only">(campo requerido)</span>
                  </p>
                  <p id="age-verification-description" className="text-sm text-muted-foreground mt-1">
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
                    "p-4 rounded-[0.125rem] border transition-colors",
                    isAccepted
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-secondary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {isAccepted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          {doc.title || getDocTypeLabel(doc.document_type)}
                          {doc.is_required && (
                            <span className="text-xs font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-[0.125rem]">
                              Requerido
                            </span>
                          )}
                          {requiresSignature && (
                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-[0.125rem] flex items-center gap-1">
                              <PenTool className="w-3 h-3" />
                              Firma
                            </span>
                          )}
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openDocumentDrawer(doc)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-[0.125rem] transition-colors"
                          >
                            <ScrollText className="w-4 h-4" />
                            Leer
                          </button>

                          {!isAccepted && (
                            <button
                              onClick={() => requiresSignature ? openSignatureModal(doc) : openDocumentDrawer(doc)}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-foreground rounded-[0.125rem]",
                                "bg-primary hover:bg-primary/90",
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
                        <p className="text-sm text-muted-foreground mt-1">{doc.summary}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs font-mono text-muted-foreground">Versión {doc.version}</p>
                        {isSigned && (
                          <p className="text-xs text-green-500 flex items-center gap-1">
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
          <div className="mt-6 p-4 rounded-[0.125rem] bg-secondary border border-border">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Tu aceptación se registra con fecha, hora, dirección IP y navegador para cumplimiento legal. Esta información se almacena de forma segura y solo se utiliza para demostrar tu consentimiento.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBack}
              aria-label="Volver al paso anterior"
              className="flex items-center justify-center gap-2 h-12 px-6 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[0.125rem] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
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
                "flex-1 h-12 sm:h-14 rounded-[0.125rem] font-semibold text-primary-foreground",
                "bg-primary hover:bg-primary/90",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
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
            <p className="text-center text-sm text-amber-500 mt-4 flex items-center justify-center gap-2" role="alert" aria-live="polite">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              Debes confirmar tu edad y aceptar todos los documentos
            </p>
          )}
        </motion.div>

      {/* Document Drawer */}
      <Sheet open={!!openDocument} onOpenChange={(open) => !open && closeDocumentDrawer()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-background border-border p-0 z-[200] flex flex-col h-full"
        >
          <SheetHeader className="p-4 sm:p-6 border-b border-border flex-shrink-0">
            <SheetTitle className="text-foreground text-base sm:text-lg">
              {openDocument?.title || getDocTypeLabel(openDocument?.document_type || '')}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-xs sm:text-sm">
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

          <div className="p-4 sm:p-6 border-t border-border flex-shrink-0 bg-background">
            {openDocument && getSignatureMethodForDocument(openDocument.document_type) !== 'clickwrap' ? (
              <button
                onClick={() => {
                  closeDocumentDrawer();
                  openSignatureModal(openDocument);
                }}
                disabled={!hasReadToBottom}
                className={cn(
                  "w-full h-12 rounded-[0.125rem] font-semibold text-primary-foreground",
                  "bg-primary hover:bg-primary/90",
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
                  "w-full h-12 rounded-[0.125rem] font-semibold text-primary-foreground",
                  "bg-primary hover:bg-primary/90",
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
              <p className="text-xs text-muted-foreground text-center mt-2">
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
    </OnboardingShell>
  );
}

// Document Content Component
const DocumentContent = memo(function DocumentContent({
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
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className={cn(
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-foreground",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-foreground",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
          "[&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
          "[&_li]:text-muted-foreground [&_li]:mb-1",
          "[&_a]:text-primary [&_a]:underline",
          "[&_strong]:text-foreground [&_strong]:font-semibold",
          "[&_address]:text-muted-foreground [&_address]:not-italic"
        )}
      />
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
});

export default NovaLegalConsentStep;
