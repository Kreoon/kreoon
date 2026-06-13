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
  flow: RegistrationFlow;
  orgSlug?: string;
  orgId?: string;
  orgName?: string;
  orgLogo?: string | null;
  requiresInviteCode?: boolean;
  className?: string;
  onBack?: () => void;
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

  const handleTypeSelect = (type: UserType) => {
    registration.setUserType(type);
    // Delay para que el usuario vea el checkmark de selección antes de avanzar
    setTimeout(() => registration.goToNextStep(), 350);
  };

  const handleInviteValidated = (isValid: boolean) => {
    registration.setInviteCodeValid(isValid);
    if (isValid) registration.goToNextStep();
  };

  const handleFormSubmit = (data: RegistrationFormData) => {
    registration.setFormData(data);
    submit(data);
  };

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

  const isTypeSelector = state.currentStep === 'type-selector';

  return (
    <div className={cn(
      "w-full mx-auto",
      // TypeSelector necesita más espacio horizontal para las 2 big cards
      isTypeSelector
        ? (compact ? "max-w-lg" : "max-w-2xl")
        : (compact ? "max-w-md" : "max-w-lg"),
      className
    )}>
      {/* Botón volver */}
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-5 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Volver</span>
        </button>
      )}

      {/* Indicador de progreso */}
      <WizardProgress steps={steps} currentStep={state.currentStep} />

      {/* Card principal */}
      <div className={cn(
        "rounded-2xl border border-white/10 backdrop-blur-sm",
        "bg-slate-900/60 shadow-2xl",
        compact ? "p-6" : isTypeSelector ? "p-8 sm:p-10" : "p-8"
      )}>
        {/* Invite Code */}
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

        {/* Type Selector */}
        {state.currentStep === 'type-selector' && (
          <TypeSelectorStep
            flow={state.flow}
            selectedType={state.userType}
            onSelect={handleTypeSelect}
            orgName={state.orgName}
            forcedUserType={state.forcedUserType}
          />
        )}

        {/* Registration Form */}
        {state.currentStep === 'form' && state.userType && (
          <RegistrationFormStep
            userType={state.userType}
            initialData={state.formData}
            onSubmit={handleFormSubmit}
            isSubmitting={state.isSubmitting}
            submitError={state.submitError}
          />
        )}

        {/* Success */}
        {state.currentStep === 'success' && state.userType && (
          <SuccessStep
            email={state.formData.email || ''}
            userType={state.userType}
            requiresEmailConfirmation={state.requiresEmailConfirmation}
            orgSlug={state.orgSlug}
            redirectTo={state.redirectTo}
          />
        )}
      </div>

    </div>
  );
}
