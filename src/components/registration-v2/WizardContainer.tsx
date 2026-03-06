import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegistrationV2 } from './useRegistrationV2';
import { useRegistrationSubmitV2 } from './useRegistrationSubmitV2';
import { WizardProgress } from './WizardProgress';
import { InviteCodeStep } from './steps/InviteCodeStep';
import { TypeSelectorStep } from './steps/TypeSelectorStep';
import { RegistrationFormStep } from './steps/RegistrationFormStep';
import { SuccessStep } from './steps/SuccessStep';
import { RegistrationFlow, RegistrationFormData, UserType } from './types';

interface WizardContainerProps {
  /**
   * Tipo de flujo de registro
   * - 'org': Registro desde una organización específica
   * - 'general': Registro general
   */
  flow: RegistrationFlow;

  /**
   * Datos de la organización (solo para flujo 'org')
   */
  orgSlug?: string;
  orgId?: string;
  orgName?: string;
  orgLogo?: string | null;
  requiresInviteCode?: boolean;

  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;

  /**
   * Callback cuando el usuario quiere volver (cerrar wizard)
   */
  onBack?: () => void;

  /**
   * Si es true, muestra diseño compacto (para modales)
   */
  compact?: boolean;
}

export function WizardContainer({
  flow,
  orgSlug,
  orgId,
  orgName,
  orgLogo,
  requiresInviteCode,
  className,
  onBack,
  compact = false,
}: WizardContainerProps) {
  const registration = useRegistrationV2({
    flow,
    orgSlug,
    orgId,
    orgName,
    orgLogo,
    requiresInviteCode,
  });

  const { state, steps } = registration;

  const { submit } = useRegistrationSubmitV2({
    state,
    setSubmitting: registration.setSubmitting,
    setSubmitError: registration.setSubmitError,
    setUserId: registration.setUserId,
    setRequiresEmailConfirmation: registration.setRequiresEmailConfirmation,
    goToNextStep: registration.goToNextStep,
  });

  // Handler para selección de tipo
  const handleTypeSelect = (type: UserType) => {
    registration.setUserType(type);
    registration.goToNextStep();
  };

  // Handler para código de invitación validado
  const handleInviteValidated = (isValid: boolean) => {
    registration.setInviteCodeValid(isValid);
    if (isValid) {
      registration.goToNextStep();
    }
  };

  // Handler para submit del formulario
  const handleFormSubmit = (data: RegistrationFormData) => {
    registration.setFormData(data);
    submit(data);
  };

  // ¿Mostrar botón de volver?
  const showBackButton = state.currentStep !== 'success' && (
    onBack || steps.indexOf(state.currentStep) > 0
  );

  const handleBack = () => {
    if (steps.indexOf(state.currentStep) > 0) {
      registration.goToPrevStep();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className={cn(
      "w-full",
      compact ? "max-w-md mx-auto" : "max-w-lg mx-auto",
      className
    )}>
      {/* Header con botón de volver */}
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver</span>
        </button>
      )}

      {/* Indicador de progreso */}
      {state.currentStep !== 'success' && (
        <WizardProgress
          steps={steps}
          currentStep={state.currentStep}
        />
      )}

      {/* Contenido del paso actual */}
      <div className={cn(
        "rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm",
        compact ? "p-6" : "p-8"
      )}>
        {/* Invite Code Step */}
        {state.currentStep === 'invite-code' && (
          <InviteCodeStep
            orgSlug={state.orgSlug || ''}
            orgName={state.orgName}
            orgLogo={state.orgLogo}
            value={state.inviteCode || ''}
            onChange={registration.setInviteCode}
            onValidated={handleInviteValidated}
            isValid={state.isValidInviteCode}
          />
        )}

        {/* Type Selector Step */}
        {state.currentStep === 'type-selector' && (
          <TypeSelectorStep
            flow={state.flow}
            selectedType={state.userType}
            onSelect={handleTypeSelect}
            orgName={state.orgName}
          />
        )}

        {/* Registration Form Step */}
        {state.currentStep === 'form' && state.userType && (
          <RegistrationFormStep
            userType={state.userType}
            initialData={state.formData}
            onSubmit={handleFormSubmit}
            isSubmitting={state.isSubmitting}
            submitError={state.submitError}
          />
        )}

        {/* Success Step */}
        {state.currentStep === 'success' && state.userType && (
          <SuccessStep
            email={state.formData.email || ''}
            userType={state.userType}
            requiresEmailConfirmation={state.requiresEmailConfirmation}
            orgSlug={state.orgSlug}
          />
        )}
      </div>

      {/* Footer */}
      {state.currentStep !== 'success' && (
        <div className="mt-6 text-center space-y-3">
          {onBack && steps.indexOf(state.currentStep) === 0 && (
            <p className="text-sm text-white/60">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={onBack}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Inicia sesión
              </button>
            </p>
          )}
          <p className="text-xs text-white/40">
            Al continuar, aceptas nuestros términos de servicio
          </p>
        </div>
      )}
    </div>
  );
}
