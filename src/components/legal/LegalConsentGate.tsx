import { useState, useCallback, type ReactNode } from 'react';
import { useLegalConsent, useConsentGate } from '@/hooks/useLegalConsent';
import { LegalConsentModal } from './LegalConsentModal';

type RequiredFor = 'registration' | 'first_upload' | 'first_transaction' | 'first_live';

interface LegalConsentGateProps {
  children: ReactNode;
  requiredFor?: RequiredFor;
  onBlocked?: () => void;
  onPassed?: () => void;
  /**
   * Si true, renderiza children pero intercepta onClick para verificar consentimiento.
   * Si false, envuelve children y solo renderiza si tiene consentimiento.
   */
  interceptClick?: boolean;
}

/**
 * Componente que verifica consentimientos legales antes de permitir una acción.
 *
 * Uso con interceptClick (recomendado para botones):
 * <LegalConsentGate requiredFor="first_upload" interceptClick>
 *   <Button onClick={handleUpload}>Subir contenido</Button>
 * </LegalConsentGate>
 *
 * Uso como wrapper (oculta contenido si no tiene consentimiento):
 * <LegalConsentGate requiredFor="first_upload">
 *   <UploadSection />
 * </LegalConsentGate>
 */
export function LegalConsentGate({
  children,
  requiredFor = 'registration',
  onBlocked,
  onPassed,
  interceptClick = false,
}: LegalConsentGateProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const {
    pendingConsents,
    isAgeVerified,
    isLoading,
  } = useLegalConsent();

  // Verificar si hay consentimientos pendientes requeridos
  const hasPendingRequired = pendingConsents?.some(p => p.is_required) ?? false;
  const needsAgeVerification = !isAgeVerified();
  const needsConsent = hasPendingRequired || needsAgeVerification;

  const handleInterceptedClick = useCallback((originalOnClick?: (e: React.MouseEvent) => void) => {
    return (e: React.MouseEvent) => {
      if (needsConsent) {
        e.preventDefault();
        e.stopPropagation();

        // Guardar la acción pendiente para ejecutarla después
        if (originalOnClick) {
          setPendingAction(() => () => originalOnClick(e));
        }

        setShowModal(true);
        onBlocked?.();
      } else {
        originalOnClick?.(e);
        onPassed?.();
      }
    };
  }, [needsConsent, onBlocked, onPassed]);

  const handleConsentComplete = useCallback(() => {
    setShowModal(false);

    // Ejecutar la acción pendiente si existe
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }

    onPassed?.();
  }, [pendingAction, onPassed]);

  // Si está cargando, mostrar children normalmente
  if (isLoading) {
    return <>{children}</>;
  }

  // Modo interceptClick: renderiza children pero intercepta clicks
  if (interceptClick) {
    // Clonar children y reemplazar onClick
    const childrenWithInterceptedClick = (() => {
      if (!children || typeof children !== 'object' || !('props' in (children as any))) {
        return children;
      }

      const child = children as React.ReactElement;
      const originalOnClick = child.props?.onClick;

      return {
        ...child,
        props: {
          ...child.props,
          onClick: handleInterceptedClick(originalOnClick),
        },
      };
    })();

    return (
      <>
        {childrenWithInterceptedClick}
        <LegalConsentModal
          open={showModal}
          onOpenChange={setShowModal}
          onComplete={handleConsentComplete}
          blockClose={true}
        />
      </>
    );
  }

  // Modo wrapper: solo renderiza si tiene consentimiento
  if (needsConsent) {
    return (
      <>
        <LegalConsentModal
          open={showModal}
          onOpenChange={setShowModal}
          onComplete={handleConsentComplete}
          blockClose={true}
        />
        {/* Opcionalmente mostrar un placeholder o nada */}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Hook para usar el gate programáticamente
 */
export function useLegalGate(requiredFor?: RequiredFor) {
  const [showModal, setShowModal] = useState(false);
  const { pendingConsents, isAgeVerified, isLoading } = useLegalConsent();

  const hasPendingRequired = pendingConsents?.some(p => p.is_required) ?? false;
  const needsAgeVerification = !isAgeVerified();
  const needsConsent = hasPendingRequired || needsAgeVerification;

  const checkAndProceed = useCallback(async (action: () => void | Promise<void>) => {
    if (needsConsent) {
      setShowModal(true);
      return false;
    }

    await action();
    return true;
  }, [needsConsent]);

  const GateModal = useCallback(() => (
    <LegalConsentModal
      open={showModal}
      onOpenChange={setShowModal}
      onComplete={() => setShowModal(false)}
      blockClose={true}
    />
  ), [showModal]);

  return {
    needsConsent,
    isLoading,
    showModal,
    setShowModal,
    checkAndProceed,
    GateModal,
  };
}

export default LegalConsentGate;
