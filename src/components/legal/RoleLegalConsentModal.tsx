/**
 * RoleLegalConsentModal - Modal para aceptar documentos legales al asignar un rol
 *
 * Este modal aparece cuando un usuario recibe un rol que requiere documentos adicionales
 * (ej: creator, editor). Es bloqueante hasta que se firmen todos los documentos.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle2, Loader2, AlertCircle,
  ScrollText, PenTool, Shield, X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SignatureModal } from '@/components/legal/SignatureModal';
import { useLegalConsent } from '@/hooks/useLegalConsent';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { getSignatureMethodForDocument } from '@/types/digital-signature';
import { getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { RoleGateDocument } from '@/hooks/useRoleLegalGate';

interface RoleLegalConsentModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onComplete: () => void;
  targetRole: string;
  gateTitle: string;
  gateDescription?: string;
  documents: RoleGateDocument[];
  isBlocking?: boolean; // Si true, no se puede cerrar sin firmar
}

export function RoleLegalConsentModal({
  isOpen,
  onClose,
  onComplete,
  targetRole,
  gateTitle,
  gateDescription,
  documents,
  isBlocking = true,
}: RoleLegalConsentModalProps) {
  const { acceptDocument, isAccepting } = useLegalConsent();
  const { mySignatures } = useDigitalSignature();

  const [signedDocuments, setSignedDocuments] = useState<Set<string>>(new Set());
  const [openDocument, setOpenDocument] = useState<RoleGateDocument | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [hasReadToBottom, setHasReadToBottom] = useState(false);

  const [signatureModalDoc, setSignatureModalDoc] = useState<RoleGateDocument | null>(null);
  const [signatureModalContent, setSignatureModalContent] = useState<string>('');

  // Sincronizar documentos ya firmados
  useEffect(() => {
    const signedSet = new Set<string>();
    documents.forEach(doc => {
      if (doc.already_signed) {
        signedSet.add(doc.document_id);
      }
    });
    mySignatures.forEach(sig => {
      if (sig.status === 'valid') {
        const doc = documents.find(d => d.document_type === sig.document_type);
        if (doc) {
          signedSet.add(doc.document_id);
        }
      }
    });
    if (signedSet.size > 0) {
      setSignedDocuments(signedSet);
    }
  }, [mySignatures, documents]);

  const totalDocuments = documents.length;
  const signedCount = signedDocuments.size;
  const progress = totalDocuments > 0 ? (signedCount / totalDocuments) * 100 : 0;
  const allSigned = signedCount === totalDocuments && totalDocuments > 0;

  // Cargar contenido del documento
  const loadDocumentContent = useCallback(async (doc: RoleGateDocument) => {
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

      // Si no hay contenido en BD, intentar cargar del archivo HTML
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

  const openDocumentDrawer = (doc: RoleGateDocument) => {
    setOpenDocument(doc);
    loadDocumentContent(doc);
  };

  const closeDocumentDrawer = () => {
    setOpenDocument(null);
    setDocumentContent('');
    setHasReadToBottom(false);
  };

  const openSignatureModal = async (doc: RoleGateDocument) => {
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

  const handleDocumentSigned = () => {
    if (signatureModalDoc) {
      setSignedDocuments(prev => new Set([...prev, signatureModalDoc.document_id]));
    }
    setSignatureModalDoc(null);
    setSignatureModalContent('');
  };

  const handleAcceptDocument = async (docId: string) => {
    try {
      await acceptDocument(docId);
      setSignedDocuments(prev => new Set([...prev, docId]));
      closeDocumentDrawer();
      toast.success('Documento aceptado');
    } catch {
      toast.error('Error al aceptar el documento');
    }
  };

  const handleComplete = () => {
    if (!allSigned) {
      toast.error('Debes firmar todos los documentos para continuar');
      return;
    }
    onComplete();
  };

  const handleClose = () => {
    if (isBlocking && !allSigned) {
      toast.warning('Debes completar todos los documentos para continuar');
      return;
    }
    onClose?.();
  };

  const getDocTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      creator_agreement: 'Acuerdo de Creador',
      brand_agreement: 'Acuerdo de Marca',
      content_moderation_policy: 'Politica de Moderacion',
      dmca_policy: 'Politica DMCA',
      escrow_payment_terms: 'Terminos de Escrow y Pagos',
    };
    return labels[type] || type;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={isBlocking ? undefined : handleClose}>
        <DialogContent
          className={cn(
            "sm:max-w-2xl max-h-[90vh] overflow-hidden",
            "bg-white dark:bg-[#14141f]",
            "border border-zinc-200 dark:border-zinc-800"
          )}
          onPointerDownOutside={isBlocking ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={isBlocking ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-white">
              <Shield className="w-5 h-5 text-purple-500" />
              {gateTitle}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              {gateDescription || `Para activar tu rol de ${getRoleLabel(targetRole)}, debes aceptar los siguientes documentos.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>Progreso: {signedCount} de {totalDocuments} documentos</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Documents List */}
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 pr-4">
                {documents.map((doc) => {
                  const isSigned = signedDocuments.has(doc.document_id) || doc.already_signed;
                  const signatureMethod = getSignatureMethodForDocument(doc.document_type);
                  const requiresSignature = signatureMethod !== 'clickwrap';

                  return (
                    <motion.div
                      key={doc.document_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-sm border transition-colors",
                        isSigned
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#1a1a24]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isSigned ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-white/30" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-500" />
                              {doc.title || getDocTypeLabel(doc.document_type)}
                              {requiresSignature && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <PenTool className="w-3 h-3" />
                                  Firma
                                </span>
                              )}
                            </p>

                            {!isSigned && (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDocumentDrawer(doc)}
                                  className="text-purple-600 dark:text-purple-400"
                                >
                                  <ScrollText className="w-4 h-4 mr-1" />
                                  Leer
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => requiresSignature ? openSignatureModal(doc) : openDocumentDrawer(doc)}
                                  className="bg-purple-600 hover:bg-purple-500"
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
                              </div>
                            )}
                          </div>

                          {doc.summary && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                              {doc.summary}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                              Version {doc.version}
                            </p>
                            {isSigned && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Firmado
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Warning */}
            {!allSigned && (
              <div className="p-3 rounded-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No podras usar las funcionalidades de {getRoleLabel(targetRole)} hasta completar todos los documentos.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {!isBlocking && (
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleComplete}
                disabled={!allSigned}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {allSigned ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Continuar
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 mr-2" />
                    Completa los documentos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Reader Drawer */}
      <Sheet open={!!openDocument} onOpenChange={(open) => !open && closeDocumentDrawer()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-white dark:bg-[#0F0F23] border-zinc-200 dark:border-white/10 p-0 z-[250] flex flex-col h-full"
        >
          <SheetHeader className="p-4 sm:p-6 border-b border-zinc-200 dark:border-white/10 flex-shrink-0">
            <SheetTitle className="text-zinc-900 dark:text-white text-base sm:text-lg">
              {openDocument?.title || getDocTypeLabel(openDocument?.document_type || '')}
            </SheetTitle>
            <SheetDescription className="text-zinc-500 dark:text-white/60 text-xs sm:text-sm">
              Version {openDocument?.version} - Lee el documento completo
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 sm:p-6">
              {loadingContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div
                  className="prose prose-zinc dark:prose-invert prose-purple max-w-none"
                  dangerouslySetInnerHTML={{ __html: documentContent }}
                  onScroll={(e) => {
                    const target = e.target as HTMLElement;
                    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
                    if (isAtBottom) setHasReadToBottom(true);
                  }}
                />
              )}
            </div>
          </ScrollArea>

          <div className="p-4 sm:p-6 border-t border-zinc-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-[#0F0F23]">
            {openDocument && getSignatureMethodForDocument(openDocument.document_type) !== 'clickwrap' ? (
              <Button
                onClick={() => {
                  closeDocumentDrawer();
                  openSignatureModal(openDocument);
                }}
                className="w-full bg-purple-600 hover:bg-purple-500"
              >
                <PenTool className="w-5 h-5 mr-2" />
                Continuar a firma
              </Button>
            ) : (
              <Button
                onClick={() => openDocument && handleAcceptDocument(openDocument.document_id)}
                disabled={isAccepting}
                className="w-full bg-purple-600 hover:bg-purple-500"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    He leido y acepto
                  </>
                )}
              </Button>
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
    </>
  );
}

export default RoleLegalConsentModal;
