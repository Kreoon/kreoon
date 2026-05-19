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
  ChevronLeft, CheckCircle2,
  Loader2, Shield, X, ChevronDown
} from 'lucide-react';
import { OnboardingShell, TALENT_STEPS, CLIENT_STEPS } from './OnboardingShell';
import { useOnboardingGate, PendingDocument } from '@/hooks/useOnboardingGate';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
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
  const [scrollProgress, setScrollProgress] = useState(0);

  const [signatureModalDoc, setSignatureModalDoc] = useState<PendingDocument | null>(null);
  const [signatureModalContent, setSignatureModalContent] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<Set<string>>(new Set());

  const docScrollRef = useRef<HTMLDivElement>(null);

  // Si el contenido cabe sin scroll, marcar como leído automáticamente
  useEffect(() => {
    if (!documentContent || loadingContent) return;
    requestAnimationFrame(() => {
      const el = docScrollRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 10) {
        setHasReadToBottom(true);
      }
    });
  }, [documentContent, loadingContent]);

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

  const AGE_DOC_TYPES = ['age_verification_policy', 'age_verification'];

  const isAgeDoc = (docType: string) => AGE_DOC_TYPES.includes(docType);

  const hasAgeDocInList = documentsToShow.some(d => isAgeDoc(d.document_type));

  const allDocsAccepted = useMemo(
    () => documentsToShow.every(
      doc => acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id)
    ),
    [documentsToShow, acceptedDocs, signedDocuments]
  );

  // Si la lista ya incluye un documento de edad, ese acepta la verificación implícitamente
  const canComplete = useMemo(
    () => hasAgeDocInList ? allDocsAccepted : (ageConfirmed && allDocsAccepted),
    [hasAgeDocInList, ageConfirmed, allDocsAccepted]
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
    setScrollProgress(0);
  };

  const handleDocScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight <= el.clientHeight) { setHasReadToBottom(true); return; }
    const progress = Math.min(100, Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100));
    setScrollProgress(progress);
    if (progress >= 95) setHasReadToBottom(true);
  }, []);

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

      // Si es el documento de declaración de edad, verificar edad automáticamente
      if (isAgeDoc(signatureModalDoc.document_type) && !isAgeVerified()) {
        setAgeConfirmed(true);
        verifyAge(true).catch(() => {});
      }

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

      // Si es el documento de declaración de edad, verificar edad automáticamente
      const doc = documentsToShow.find(d => d.document_id === docId);
      if (doc && isAgeDoc(doc.document_type) && !isAgeVerified()) {
        setAgeConfirmed(true);
        verifyAge(true).catch(() => {});
      }

      closeDocumentDrawer();
      toast.success('Documento aceptado');
    } catch {
      toast.error('Error al aceptar el documento');
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
          return { success: true, doc: doc.document_type };
        } catch {
          return { success: false, doc: doc.document_type };
        }
      });

      await Promise.all(acceptPromises);

      await new Promise(resolve => setTimeout(resolve, 300));
      await refetch();

      const result = await completeOnboarding();

      if (result) {
        toast.success('¡Bienvenido a KREOON!');

        // Determinar la ruta según el rol del usuario
        let redirectPath = '/creator-dashboard';
        if (userRole === 'admin' || userRole === 'team_leader') {
          redirectPath = '/dashboard';
        } else if (userRole === 'strategist') {
          redirectPath = '/strategist-dashboard';
        } else if (userRole === 'creator' || userRole === 'content_creator') {
          redirectPath = '/creator-dashboard';
        } else if (userRole === 'editor') {
          redirectPath = '/editor-dashboard';
        } else if (userRole === 'client') {
          redirectPath = '/client-dashboard';
        }

        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
      } else {
        toast.error('Error: Verifica que hayas completado tu perfil y aceptado todos los documentos requeridos.');
        refetch();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al completar: ${errorMessage}`);
      refetch();
    }
  };

  const getDocEmoji = (type: string): string => {
    const map: Record<string, string> = {
      age_verification_policy: '🎂',
      age_verification: '🎂',
      terms_of_service: '📋',
      talent_agreement: '🎬',
      client_agreement: '🤝',
      brand_agreement: '🏢',
      privacy_policy: '🔒',
      data_processing_agreement: '🛡️',
      escrow_payment_terms: '💳',
      creator_agreement: '✍️',
      organization_agreement: '🏗️',
      white_label_agreement: '🏗️',
    };
    return map[type] ?? '📄';
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

  // Progreso: solo documentos (el de edad es uno más de la lista)
  const totalItems = documentsToShow.length;
  const doneItems = documentsToShow.filter(
    d => acceptedDocs.has(d.document_id) || signedDocuments.has(d.document_id)
  ).length;

  // Suprimir advertencia de isVerifyingAge no usado
  void isVerifyingAge;

  return (
    <OnboardingShell currentStep={currentStep} steps={steps} onLogout={onLogout}>
      <div className="max-w-lg mx-auto">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <p className="text-5xl mb-4">{canComplete ? '🎉' : '📋'}</p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {canComplete ? '¡Todo listo!' : '¡Casi terminamos!'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lee y acepta los documentos para entrar a KREOON. Solo se hace una vez.
          </p>
        </motion.div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Progreso</p>
            <p className="text-xs font-semibold text-foreground">{doneItems} de {totalItems} completados</p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalItems }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 flex-1 rounded-full transition-all duration-300',
                  i < doneItems ? 'bg-green-500' : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>

        {/* Documentos */}
        <div className="space-y-3 mb-6">
          {documentsToShow.map((doc, index) => {
            const isAccepted = acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id);
            const isSigned = signedDocuments.has(doc.document_id);
            const requiresSignature = getSignatureMethodForDocument(doc.document_type) !== 'clickwrap';
            const emoji = getDocEmoji(doc.document_type);

            return (
              <motion.div
                key={doc.document_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.05 }}
              >
                <div className={cn(
                  'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all',
                  isAccepted ? 'border-green-500 bg-green-500/10' : 'border-border/50 bg-card'
                )}>
                  <span className="text-3xl shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight">
                      {doc.title || getDocTypeLabel(doc.document_type)}
                    </p>
                    {doc.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {doc.summary}
                      </p>
                    )}
                    {isSigned && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Firmado digitalmente
                      </p>
                    )}
                  </div>

                  {isAccepted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  ) : (
                    <button
                      onClick={() => requiresSignature ? openSignatureModal(doc) : openDocumentDrawer(doc)}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      {requiresSignature ? '✍️ Firmar' : '👀 Leer y aceptar'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Nota de seguridad */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card mb-8">
          <span className="text-xl shrink-0">🔒</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tu aceptación queda registrada con fecha y hora de forma segura. Solo sirve para demostrar que leíste los términos.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-4 rounded-2xl border-2 border-border font-medium text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={!canComplete || isCompletingOnboarding || isAccepting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCompletingOnboarding ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
            ) : (
              <>🎉 Entrar a KREOON</>
            )}
          </button>
        </div>

        {/* Hint de qué falta */}
        {!canComplete && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {!ageConfirmed
              ? '⬆️ Primero confirma que tienes más de 18 años'
              : '⬆️ Acepta todos los documentos para continuar'}
          </p>
        )}

      </div>

      {/* Document Modal */}
      {openDocument && (() => {
        const modalRequiresSignature = getSignatureMethodForDocument(openDocument.document_type) !== 'clickwrap';
        return (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-background border-t-2 sm:border-2 border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[86vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50 shrink-0">
                <span className="text-3xl shrink-0">{getDocEmoji(openDocument.document_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base leading-tight">
                    {openDocument.title || getDocTypeLabel(openDocument.document_type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modalRequiresSignature ? 'Lee y firma este documento' : 'Lee y acepta este documento'}
                  </p>
                </div>
                <button
                  onClick={closeDocumentDrawer}
                  className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Barra de progreso de lectura */}
              <div className="h-1.5 bg-muted/30 shrink-0">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground py-1.5 shrink-0">
                {scrollProgress < 95 ? `Llevas ${scrollProgress}% leído — sigue hasta el final` : '¡Lo leíste todo! 🎉'}
              </p>

              {/* Contenido */}
              <div
                ref={docScrollRef}
                className="flex-1 overflow-y-auto px-5 pb-5 min-h-0"
                onScroll={handleDocScroll}
              >
                {loadingContent ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <DocumentContent
                    html={documentContent}
                    onScrollEnd={() => { setHasReadToBottom(true); setScrollProgress(100); }}
                  />
                )}
              </div>

              {/* CTA */}
              <div className="p-5 border-t border-border/50 shrink-0 bg-background">
                {!hasReadToBottom ? (
                  <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <ChevronDown className="w-4 h-4 text-amber-500 animate-bounce shrink-0" />
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">Sigue leyendo para continuar</span>
                  </div>
                ) : modalRequiresSignature ? (
                  <button
                    onClick={() => {
                      closeDocumentDrawer();
                      openSignatureModal(openDocument);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all"
                  >
                    ✍️ Siguiente: Firmar el documento
                  </button>
                ) : (
                  <button
                    onClick={() => handleAcceptDocument(openDocument.document_id)}
                    disabled={isAccepting}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                    ) : (
                      '✅ He leído y acepto este documento'
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        );
      })()}

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
      {/* SECURITY: Sanitize HTML to prevent XSS attacks */}
      <div
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }}
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
