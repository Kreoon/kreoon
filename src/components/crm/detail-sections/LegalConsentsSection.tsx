import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DetailSection } from '../DetailSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckCircle2,
  XCircle,
  PenTool,
  Shield,
  Clock,
  Eye,
  Loader2,
  AlertTriangle,
  Globe,
  Monitor,
  Fingerprint,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LegalConsentsSectionProps {
  userId: string;
  onboardingCompleted?: boolean;
}

interface UserConsent {
  id: string;
  document_type: string;
  document_version: string;
  accepted: boolean;
  accepted_at: string;
  consent_method: string;
  ip_address: string;
  user_agent: string;
}

interface DigitalSignature {
  id: string;
  document_type: string;
  document_version: string;
  signer_full_name: string;
  signature_method: string;
  typed_signature: string;
  signature_image_url: string;
  declaration_text: string;
  ip_address: string;
  timestamp_utc: string;
  status: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  terms_of_service: 'Términos de Servicio',
  privacy_policy: 'Política de Privacidad',
  acceptable_use_policy: 'Uso Aceptable',
  cookie_policy: 'Cookies',
  age_verification_policy: 'Verificación Edad',
  creator_agreement: 'Acuerdo Creador',
  content_moderation_policy: 'Moderación',
  dmca_policy: 'DMCA',
  brand_agreement: 'Acuerdo Marca',
  escrow_payment_terms: 'Escrow/Pagos',
  white_label_agreement: 'White Label',
  data_processing_agreement: 'DPA',
};

const SIGNATURE_METHOD_LABELS: Record<string, string> = {
  clickwrap: 'Click',
  typed_name: 'Nombre escrito',
  drawn_signature: 'Firma dibujada',
};

export function LegalConsentsSection({ userId, onboardingCompleted: onboardingCompletedProp }: LegalConsentsSectionProps) {
  const [selectedSignature, setSelectedSignature] = useState<DigitalSignature | null>(null);
  const [selectedConsent, setSelectedConsent] = useState<UserConsent | null>(null);

  // Cargar estado de onboarding del perfil si no se proporciona
  const { data: profileData } = useQuery({
    queryKey: ['user-onboarding-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (error) return { onboarding_completed: false };
      return data;
    },
    enabled: !!userId && onboardingCompletedProp === undefined,
  });

  const onboardingCompleted = onboardingCompletedProp ?? profileData?.onboarding_completed ?? false;

  // Cargar consentimientos del usuario usando RPC (bypasses RLS for admins)
  const { data: consents, isLoading: loadingConsents } = useQuery({
    queryKey: ['user-consents-crm', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc('get_user_consents', { p_user_id: userId });

      if (error) {
        console.error('[LegalConsentsSection] Error:', error);
        return [];
      }
      return (data || []) as UserConsent[];
    },
    enabled: !!userId,
  });

  // Cargar firmas digitales del usuario usando RPC
  const { data: signatures, isLoading: loadingSignatures } = useQuery({
    queryKey: ['user-signatures-crm', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc('get_user_signatures', { p_user_id: userId });

      if (error) {
        console.error('[LegalConsentsSection] Signatures error:', error);
        return [];
      }
      return (data || []) as DigitalSignature[];
    },
    enabled: !!userId,
  });

  const isLoading = loadingConsents || loadingSignatures;
  const hasConsents = (consents?.length || 0) > 0;
  const hasSignatures = (signatures?.length || 0) > 0;
  const hasAnyLegal = hasConsents || hasSignatures;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <DetailSection
      title="Consentimientos Legales"
      badge={
        onboardingCompleted ? (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        ) : hasAnyLegal ? (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">
            <Clock className="h-3 w-3 mr-1" />
            Parcial
          </Badge>
        ) : (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : !hasAnyLegal ? (
        <div className="text-center py-4 text-white/40 text-xs">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sin consentimientos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Consentimientos */}
          {hasConsents && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">
                Documentos Aceptados ({consents?.length})
              </p>
              <div className="space-y-1.5">
                {consents?.map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {consent.accepted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className="text-white/80">
                        {DOC_TYPE_LABELS[consent.document_type] || consent.document_type}
                      </span>
                      <span className="text-white/40">v{consent.document_version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">{SIGNATURE_METHOD_LABELS[consent.consent_method] || consent.consent_method}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/40">{formatDate(consent.accepted_at)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConsent(consent)}
                        className="h-6 w-6 p-0 text-white/40 hover:text-white"
                        title="Ver detalles legales"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firmas Digitales */}
          {hasSignatures && (
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">
                Firmas Digitales ({signatures?.length})
              </p>
              <div className="space-y-1.5">
                {signatures?.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <PenTool className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-white/80">
                        {DOC_TYPE_LABELS[sig.document_type] || sig.document_type}
                      </span>
                      <span className="text-white/40">v{sig.document_version}</span>
                      {sig.status === 'valid' && (
                        <Shield className="h-3 w-3 text-green-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">{formatDate(sig.timestamp_utc)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSignature(sig)}
                        className="h-6 w-6 p-0 text-white/40 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
            <span>
              {consents?.length || 0} consentimientos • {signatures?.length || 0} firmas
            </span>
            {onboardingCompleted && (
              <span className="flex items-center gap-1 text-green-400">
                <Shield className="h-3 w-3" />
                Onboarding completo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalle de firma */}
      <Dialog open={!!selectedSignature} onOpenChange={() => setSelectedSignature(null)}>
        <DialogContent className="max-w-lg bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-green-400" />
              Detalle de Firma Digital
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Información completa de la firma electrónica
            </DialogDescription>
          </DialogHeader>
          {selectedSignature && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">Firmante</p>
                  <p className="text-white font-medium">{selectedSignature.signer_full_name}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Documento</p>
                  <p className="text-white">
                    {DOC_TYPE_LABELS[selectedSignature.document_type] || selectedSignature.document_type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">Método</p>
                  <p className="text-white">
                    {SIGNATURE_METHOD_LABELS[selectedSignature.signature_method] || selectedSignature.signature_method}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Fecha UTC</p>
                  <p className="text-white">{formatDate(selectedSignature.timestamp_utc)}</p>
                </div>
              </div>

              {selectedSignature.typed_signature && (
                <div>
                  <p className="text-white/40 text-xs">Firma Escrita</p>
                  <p className="text-white text-lg italic">"{selectedSignature.typed_signature}"</p>
                </div>
              )}

              {selectedSignature.signature_image_url && (
                <div>
                  <p className="text-white/40 text-xs mb-2">Firma Dibujada</p>
                  <div className="bg-white rounded-lg p-3">
                    <img
                      src={selectedSignature.signature_image_url}
                      alt="Firma digital"
                      className="max-h-20 mx-auto"
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="text-white/40 text-xs">Declaración</p>
                <p className="text-white/80 text-xs italic bg-white/5 p-3 rounded-lg">
                  "{selectedSignature.declaration_text}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">IP</p>
                  <p className="text-white font-mono text-xs">{selectedSignature.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Estado</p>
                  <Badge className={cn(
                    "text-[10px]",
                    selectedSignature.status === 'valid'
                      ? "bg-green-500/10 text-green-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  )}>
                    {selectedSignature.status === 'valid' ? 'Válida' : selectedSignature.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-white/40 text-xs">ID de Firma</p>
                <p className="text-white/60 font-mono text-[10px]">{selectedSignature.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de detalle de consentimiento */}
      <Dialog open={!!selectedConsent} onOpenChange={() => setSelectedConsent(null)}>
        <DialogContent className="max-w-lg bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Fingerprint className="h-5 w-5 text-blue-400" />
              Detalle de Consentimiento Legal
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Información completa del consentimiento para fines legales
            </DialogDescription>
          </DialogHeader>
          {selectedConsent && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">Documento</p>
                  <p className="text-white font-medium">
                    {DOC_TYPE_LABELS[selectedConsent.document_type] || selectedConsent.document_type}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Versión</p>
                  <p className="text-white">v{selectedConsent.document_version}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs">Estado</p>
                  <div className="flex items-center gap-2">
                    {selectedConsent.accepted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium">Aceptado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 font-medium">Rechazado</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Método de Consentimiento</p>
                  <p className="text-white">
                    {SIGNATURE_METHOD_LABELS[selectedConsent.consent_method] || selectedConsent.consent_method}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-white/40 text-xs">Fecha y Hora UTC</p>
                <p className="text-white">{formatDate(selectedConsent.accepted_at)}</p>
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-wide mb-3">
                  Datos Técnicos (Prueba Legal)
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Globe className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white/40 text-xs">Dirección IP</p>
                      <p className="text-white font-mono text-sm">{selectedConsent.ip_address || 'No registrada'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Monitor className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white/40 text-xs">User Agent (Navegador/Dispositivo)</p>
                      <p className="text-white/70 text-xs break-all font-mono leading-relaxed">
                        {selectedConsent.user_agent || 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-white/40 text-xs">ID de Consentimiento</p>
                <p className="text-white/60 font-mono text-[10px]">{selectedConsent.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}

export default LegalConsentsSection;
