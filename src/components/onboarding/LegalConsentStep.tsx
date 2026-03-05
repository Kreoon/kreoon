import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Lock, FileText, ExternalLink, CheckCircle2,
  Loader2, AlertCircle, X, ScrollText, PenTool, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnboardingGate, PendingDocument } from '@/hooks/useOnboardingGate';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { SignatureModal } from '@/components/legal/SignatureModal';
import { SignatureReceipt } from '@/components/legal/SignatureReceipt';
import { getSignatureMethodForDocument, getSignatureMethodLabel } from '@/types/digital-signature';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LegalConsentStepProps {
  onBack: () => void;
}

export function LegalConsentStep({ onBack }: LegalConsentStepProps) {
  const { user, permissionGroup } = useAuth();
  const {
    requiredPendingDocuments,
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
    isDocumentSigned,
    getSignatureForDocument,
    mySignatures,
  } = useDigitalSignature();

  const [ageConfirmed, setAgeConfirmed] = useState(isAgeVerified());
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [openDocument, setOpenDocument] = useState<PendingDocument | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // Estado para modal de firma
  const [signatureModalDoc, setSignatureModalDoc] = useState<PendingDocument | null>(null);
  const [signatureModalContent, setSignatureModalContent] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<Set<string>>(new Set());

  // Determinar qué documentos mostrar según el tipo de usuario
  const userType = permissionGroup || 'freelancer';
  const documentsToShow = requiredPendingDocuments.filter(doc => {
    // Documentos para todos
    const forAll = ['terms_of_service', 'privacy_policy', 'acceptable_use_policy', 'cookie_policy', 'age_verification_policy'];
    if (forAll.includes(doc.document_type)) return true;

    // Documentos para creadores
    if (userType === 'freelancer' || userType === 'internal') {
      const forCreators = ['creator_agreement', 'content_moderation_policy', 'dmca_policy'];
      if (forCreators.includes(doc.document_type)) return true;
    }

    // Documentos para marcas/clientes
    if (userType === 'brand') {
      const forBrands = ['brand_agreement', 'escrow_payment_terms'];
      if (forBrands.includes(doc.document_type)) return true;
    }

    // Documentos para organizaciones
    if (userType === 'organization') {
      const forOrgs = ['white_label_agreement', 'data_processing_agreement'];
      if (forOrgs.includes(doc.document_type)) return true;
    }

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

  // Verificar si todos los documentos están aceptados/firmados
  const allDocsAccepted = documentsToShow.every(
    doc => acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id)
  );
  const canComplete = ageConfirmed && allDocsAccepted;

  // Cargar contenido del documento desde BD o archivo público
  const loadDocumentContent = useCallback(async (doc: PendingDocument) => {
    setLoadingContent(true);
    setHasReadToBottom(false);

    try {
      // Primero intentar cargar de la BD
      const { data, error } = await supabase
        .from('legal_documents')
        .select('content_html')
        .eq('id', doc.document_id)
        .single();

      if (error) throw error;

      let content = data?.content_html || '';

      // Si el contenido es un placeholder, cargar desde archivo HTML público
      if (!content || content.trim().startsWith('<!--') || content.length < 100) {
        // Extraer número de versión mayor (ej: "1.0" -> "1", "v1" -> "1", "2.3" -> "2")
        const version = doc.version || '1';
        const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
        const filename = `${doc.document_type}_v${majorVersion}.html`;

        try {
          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            content = await response.text();
          } else {
            console.warn(`[loadDocumentContent] No se encontró /legal/${filename}`);
          }
        } catch (fetchError) {
          console.warn(`[loadDocumentContent] Error cargando /legal/${filename}:`, fetchError);
        }
      }

      setDocumentContent(content || '<p>Contenido del documento no disponible.</p>');
    } catch (error) {
      console.error('Error loading document:', error);
      setDocumentContent('<p>Error cargando el documento. Intenta de nuevo.</p>');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  // Abrir documento en drawer
  const openDocumentDrawer = (doc: PendingDocument) => {
    setOpenDocument(doc);
    loadDocumentContent(doc);
  };

  // Cerrar drawer
  const closeDocumentDrawer = () => {
    setOpenDocument(null);
    setDocumentContent('');
    setHasReadToBottom(false);
  };

  // Abrir modal de firma para un documento
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

      // Si el contenido es un placeholder, cargar desde archivo HTML público
      if (!content || content.trim().startsWith('<!--') || content.length < 100) {
        // Extraer número de versión mayor (ej: "1.0" -> "1", "v1" -> "1", "2.3" -> "2")
        const version = doc.version || '1';
        const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
        const filename = `${doc.document_type}_v${majorVersion}.html`;

        try {
          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            content = await response.text();
          } else {
            console.warn(`[openSignatureModal] No se encontró /legal/${filename}`);
          }
        } catch (fetchError) {
          console.warn(`[openSignatureModal] Error cargando /legal/${filename}:`, fetchError);
        }
      }

      setSignatureModalContent(content || '<p>Contenido del documento no disponible.</p>');
      setSignatureModalDoc(doc);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Error cargando el documento');
    } finally {
      setLoadingContent(false);
    }
  };

  // Cuando se completa la firma
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

  // Marcar documento como aceptado (para clickwrap simple)
  const handleAcceptDocument = async (docId: string) => {
    try {
      await acceptDocument(docId);
      setAcceptedDocs(prev => new Set([...prev, docId]));
      closeDocumentDrawer();
      toast.success('Documento aceptado');
    } catch (error) {
      toast.error('Error al aceptar el documento');
    }
  };

  // Toggle checkbox de documento
  const toggleDocument = (docId: string, checked: boolean) => {
    if (checked) {
      // No permitir marcar sin haber leído
      const doc = documentsToShow.find(d => d.document_id === docId);
      if (doc) {
        openDocumentDrawer(doc);
      }
    } else {
      setAcceptedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
    }
  };

  // Confirmar edad
  const handleAgeConfirm = async (confirmed: boolean) => {
    setAgeConfirmed(confirmed);
    if (confirmed && !isAgeVerified()) {
      try {
        await verifyAge(true);
      } catch (error) {
        toast.error('Error al verificar edad');
        setAgeConfirmed(false);
      }
    }
  };

  // Completar onboarding
  const handleComplete = async () => {
    if (!canComplete) return;

    try {
      // Aceptar documentos que falten
      for (const doc of documentsToShow) {
        if (!acceptedDocs.has(doc.document_id)) {
          await acceptDocument(doc.document_id);
        }
      }

      // Verificar edad si no está verificada
      if (!isAgeVerified() && ageConfirmed) {
        await verifyAge(true);
      }

      // Completar onboarding
      await completeOnboarding();
      toast.success('¡Bienvenido a KREOON!');

      // Refrescar estado y redirigir
      refetch();
      window.location.reload();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Error al completar. Intenta de nuevo.');
    }
  };

  // Helper para obtener label legible
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
    <>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Términos y Condiciones
          </h1>
          <p className="text-white/60">
            Los siguientes documentos regulan tu uso de la plataforma KREOON,
            operada por SICOMMER INT LLC. Lee cada uno antes de aceptar.
          </p>
        </div>

        {/* Verificación de edad */}
        <section className="mb-8">
          <div
            className={cn(
              "p-4 rounded-xl border transition-all",
              ageConfirmed
                ? "border-green-500/30 bg-green-500/5"
                : "border-orange-500/30 bg-orange-500/5"
            )}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={ageConfirmed}
                onCheckedChange={(checked) => handleAgeConfirm(checked === true)}
                disabled={isVerifyingAge}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-white">
                  Verificación de Edad <span className="text-red-400">*</span>
                </p>
                <p className="text-sm text-white/60 mt-1">
                  <strong>Declaro bajo juramento que soy mayor de 18 años de edad</strong> o
                  tengo la mayoría de edad legal en mi jurisdicción, y tengo capacidad
                  legal para aceptar estos términos.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Lista de documentos */}
        <section className="space-y-3">
          {documentsToShow.map((doc) => {
            const isAccepted = acceptedDocs.has(doc.document_id) || signedDocuments.has(doc.document_id);
            const isSigned = signedDocuments.has(doc.document_id);
            const signatureMethod = getSignatureMethodForDocument(doc.document_type);
            const requiresSignature = signatureMethod !== 'clickwrap';

            return (
              <motion.div
                key={doc.document_id}
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
                  {/* Icono de estado */}
                  <div className="mt-1">
                    {isAccepted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="font-medium text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        {doc.title || getDocTypeLabel(doc.document_type)}
                        {doc.is_required && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                            Requerido
                          </span>
                        )}
                        {requiresSignature && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <PenTool className="w-3 h-3" />
                            Firma
                          </span>
                        )}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDocumentDrawer(doc)}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <ScrollText className="w-4 h-4 mr-1" />
                          Leer
                        </Button>

                        {!isAccepted && (
                          <Button
                            size="sm"
                            onClick={() => requiresSignature ? openSignatureModal(doc) : openDocumentDrawer(doc)}
                            className={cn(
                              "bg-gradient-to-r from-purple-600 to-pink-600",
                              "hover:from-purple-500 hover:to-pink-500"
                            )}
                          >
                            {requiresSignature ? (
                              <>
                                <PenTool className="w-4 h-4 mr-1" />
                                Firmar
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Aceptar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {doc.summary && (
                      <p className="text-sm text-white/60 mt-1">{doc.summary}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-white/40">Versión {doc.version}</p>
                      {isSigned && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
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

        {/* Nota legal */}
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs text-white/60 flex items-start gap-2">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Tu aceptación se registra con fecha, hora, dirección IP y navegador
            para cumplimiento legal. Esta información se almacena de forma segura
            y solo se utiliza para demostrar tu consentimiento.
          </p>
        </div>

        {/* Botones */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white/60 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          <Button
            onClick={handleComplete}
            disabled={!canComplete || isCompletingOnboarding || isAccepting}
            className={cn(
              "flex-1 h-12 text-base font-semibold",
              "bg-gradient-to-r from-purple-600 to-pink-600",
              "hover:from-purple-500 hover:to-pink-500",
              "disabled:opacity-50"
            )}
          >
            {isCompletingOnboarding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Completar y acceder a KREOON
              </>
            )}
          </Button>
        </div>

        {!canComplete && (
          <p className="text-center text-sm text-orange-400 mt-4 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Debes confirmar tu edad y aceptar todos los documentos
          </p>
        )}
      </div>

      {/* Document Drawer (para lectura) */}
      <Sheet open={!!openDocument} onOpenChange={(open) => !open && closeDocumentDrawer()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-[#0F0F23] border-white/10 p-0 z-[200]"
        >
          <SheetHeader className="p-6 border-b border-white/10">
            <SheetTitle className="text-white text-lg">
              {openDocument?.title || getDocTypeLabel(openDocument?.document_type || '')}
            </SheetTitle>
            <SheetDescription className="text-white/60 text-sm">
              Versión {openDocument?.version} — Lee el documento completo antes de aceptar
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-6">
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

          <div className="p-6 border-t border-white/10">
            {openDocument && getSignatureMethodForDocument(openDocument.document_type) !== 'clickwrap' ? (
              <Button
                onClick={() => {
                  closeDocumentDrawer();
                  openSignatureModal(openDocument);
                }}
                disabled={!hasReadToBottom}
                className={cn(
                  "w-full h-12 text-base font-semibold",
                  "bg-gradient-to-r from-purple-600 to-pink-600",
                  "hover:from-purple-500 hover:to-pink-500",
                  "disabled:opacity-50"
                )}
              >
                {hasReadToBottom ? (
                  <>
                    <PenTool className="w-5 h-5 mr-2" />
                    Continuar a firma
                  </>
                ) : (
                  <>
                    <ScrollText className="w-5 h-5 mr-2" />
                    Lee hasta el final para firmar
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => openDocument && handleAcceptDocument(openDocument.document_id)}
                disabled={!hasReadToBottom || isAccepting}
                className={cn(
                  "w-full h-12 text-base font-semibold",
                  "bg-gradient-to-r from-purple-600 to-pink-600",
                  "hover:from-purple-500 hover:to-pink-500",
                  "disabled:opacity-50"
                )}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Aceptando...
                  </>
                ) : hasReadToBottom ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    He leído y acepto
                  </>
                ) : (
                  <>
                    <ScrollText className="w-5 h-5 mr-2" />
                    Lee hasta el final para aceptar
                  </>
                )}
              </Button>
            )}
            {!hasReadToBottom && (
              <p className="text-xs text-white/40 text-center mt-2">
                Desplázate hasta el final del documento para habilitarlo
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Firma Digital */}
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

      {/* Comprobante de Firma */}
      {showReceipt && (
        <SignatureReceipt
          signatureId={showReceipt}
          isOpen={!!showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}
    </>
  );
}

// Componente para renderizar el contenido HTML del documento
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
    <div className="prose prose-invert prose-purple max-w-none">
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className={cn(
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-white",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-white",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-white",
          "[&_p]:text-white/80 [&_p]:leading-relaxed [&_p]:mb-3",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
          "[&_li]:text-white/80 [&_li]:mb-1",
          "[&_a]:text-purple-400 [&_a]:underline",
          "[&_strong]:text-white [&_strong]:font-semibold",
          "[&_address]:text-white/70 [&_address]:not-italic"
        )}
      />
      {/* Sentinel para detectar scroll al final */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

export default LegalConsentStep;
