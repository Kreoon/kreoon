import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RegistrationV2State,
  initialRegistrationState,
  RegistrationFlow,
  UserType,
  WizardStep,
  RegistrationFormData,
  getWizardSteps,
} from './types';

interface UseRegistrationV2Options {
  flow: RegistrationFlow;
  orgSlug?: string;
  orgId?: string;
  orgName?: string;
  orgLogo?: string | null;
  requiresInviteCode?: boolean;
}

export function useRegistrationV2(options: UseRegistrationV2Options) {
  const [searchParams] = useSearchParams();

  // Detectar referral code y partner community desde URL
  const referralCodeFromUrl = searchParams.get('ref') || searchParams.get('code');
  const partnerCommunityFromUrl = searchParams.get('community');

  // Detectar intent de URL (para compatibilidad con ReferralLanding)
  const intentFromUrl = searchParams.get('intent') as UserType | null;

  // Estado inicial con opciones
  const [state, setState] = useState<RegistrationV2State>(() => {
    const initialStep = options.flow === 'org' && options.requiresInviteCode
      ? 'invite-code'
      : 'type-selector';

    // Recuperar referral code de localStorage (guardado por ReferralLanding)
    const storedReferralCode = typeof window !== 'undefined'
      ? localStorage.getItem('kreoon_referral_code')
      : null;

    // Recuperar partner community de localStorage si existe
    const storedCommunity = typeof window !== 'undefined'
      ? localStorage.getItem('kreoon_partner_community')
      : null;

    // Determinar referral code (URL tiene prioridad)
    const finalReferralCode = referralCodeFromUrl || storedReferralCode || undefined;

    // Mapear intent viejo a userType nuevo
    let preselectedUserType: UserType | undefined;
    if (intentFromUrl) {
      if (intentFromUrl === 'talent') preselectedUserType = 'freelancer';
      else if (intentFromUrl === 'brand') preselectedUserType = 'brand';
      else if (intentFromUrl === 'organization') preselectedUserType = 'organization';
    }

    // Si hay un tipo preseleccionado, ir directo al formulario
    const actualInitialStep = preselectedUserType ? 'form' : initialStep;

    return {
      ...initialRegistrationState,
      flow: options.flow,
      currentStep: actualInitialStep,
      orgSlug: options.orgSlug,
      orgId: options.orgId,
      orgName: options.orgName,
      orgLogo: options.orgLogo,
      requiresInviteCode: options.requiresInviteCode,
      referralCode: finalReferralCode,
      partnerCommunity: partnerCommunityFromUrl || storedCommunity || undefined,
      userType: preselectedUserType,
    };
  });

  // Obtener pasos del wizard
  const steps = getWizardSteps(state.flow, !!state.requiresInviteCode);

  // Setters
  const setInviteCode = useCallback((code: string) => {
    setState(prev => ({ ...prev, inviteCode: code }));
  }, []);

  const setInviteCodeValid = useCallback((isValid: boolean) => {
    setState(prev => ({ ...prev, isValidInviteCode: isValid }));
  }, []);

  const setUserType = useCallback((type: UserType) => {
    setState(prev => ({ ...prev, userType: type }));
  }, []);

  const setFormData = useCallback((data: Partial<RegistrationFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({ ...prev, isSubmitting }));
  }, []);

  const setSubmitError = useCallback((error: string | undefined) => {
    setState(prev => ({ ...prev, submitError: error }));
  }, []);

  const setUserId = useCallback((userId: string) => {
    setState(prev => ({ ...prev, userId }));
  }, []);

  const setRequiresEmailConfirmation = useCallback((requires: boolean) => {
    setState(prev => ({ ...prev, requiresEmailConfirmation: requires }));
  }, []);

  // Navegación
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const goToNextStep = useCallback(() => {
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1]);
    }
  }, [steps, state.currentStep, goToStep]);

  const goToPrevStep = useCallback(() => {
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1]);
    }
  }, [steps, state.currentStep, goToStep]);

  // Validaciones para avanzar
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 'invite-code':
        return !!state.isValidInviteCode;
      case 'type-selector':
        return !!state.userType;
      case 'form':
        // La validación se hace en el formulario
        return true;
      case 'success':
        return true;
      default:
        return false;
    }
  }, [state.currentStep, state.isValidInviteCode, state.userType]);

  // Guardar partner community en localStorage si viene de URL
  useEffect(() => {
    if (partnerCommunityFromUrl && typeof window !== 'undefined') {
      localStorage.setItem('kreoon_partner_community', partnerCommunityFromUrl);
    }
  }, [partnerCommunityFromUrl]);

  return {
    state,
    steps,
    // Setters
    setInviteCode,
    setInviteCodeValid,
    setUserType,
    setFormData,
    setSubmitting,
    setSubmitError,
    setUserId,
    setRequiresEmailConfirmation,
    // Navegación
    goToStep,
    goToNextStep,
    goToPrevStep,
    canProceed,
  };
}
