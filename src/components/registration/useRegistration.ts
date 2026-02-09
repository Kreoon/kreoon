import { useState, useCallback, useMemo } from 'react';
import type { UnifiedRegistrationData, RegistrationIntent, RegistrationStep } from './types';
import { INITIAL_DATA } from './types';

function getStepsForIntent(intent: RegistrationIntent | null): RegistrationStep[] {
  switch (intent) {
    case 'talent':
      return ['intent', 'credentials', 'talent-profile', 'terms'];
    case 'brand':
      return ['intent', 'credentials', 'brand-profile', 'terms'];
    case 'organization':
      return ['intent', 'credentials', 'org-details', 'terms'];
    case 'join':
      return ['intent', 'join-org', 'credentials', 'terms'];
    default:
      return ['intent'];
  }
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Débil', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Media', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Fuerte', color: 'bg-green-500' };
  return { score, label: 'Muy fuerte', color: 'bg-emerald-500' };
}

interface UseRegistrationOptions {
  initialIntent?: RegistrationIntent | null;
}

export function useRegistration(options?: UseRegistrationOptions) {
  const [data, setData] = useState<UnifiedRegistrationData>(() => ({
    ...INITIAL_DATA,
    intent: options?.initialIntent ?? null,
  }));

  const [stepIndex, setStepIndex] = useState(() =>
    options?.initialIntent ? 1 : 0,
  );

  const steps = useMemo(() => getStepsForIntent(data.intent), [data.intent]);
  const currentStep = steps[stepIndex] ?? 'intent';
  const totalSteps = steps.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const onChange = useCallback((updates: Partial<UnifiedRegistrationData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) return;
    // If going back from step 1 to intent, reset the intent
    if (stepIndex === 1) {
      setData(prev => ({ ...prev, intent: null }));
      setStepIndex(0);
      return;
    }
    setStepIndex(prev => prev - 1);
  }, [stepIndex]);

  const selectIntent = useCallback((intent: RegistrationIntent) => {
    setData(prev => ({ ...INITIAL_DATA, intent }));
    // Intent step is index 0, move to 1
    setStepIndex(1);
  }, []);

  const goToSuccess = useCallback(() => {
    // Append success step and navigate there
    setStepIndex(totalSteps);
  }, [totalSteps]);

  const reset = useCallback(() => {
    setData(INITIAL_DATA);
    setStepIndex(0);
  }, []);

  // Validation per step
  const validateCredentials = useCallback((): string | null => {
    if (!data.fullName.trim()) return 'Nombre completo es requerido';
    if (!data.email.trim()) return 'Email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Email no es válido';
    if (data.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (data.password !== data.confirmPassword) return 'Las contraseñas no coinciden';
    if (data.intent === 'brand' && !data.brandName.trim()) return 'Nombre de marca es requerido';
    return null;
  }, [data]);

  const validateTalentProfile = useCallback((): string | null => {
    if (!data.talentType) return 'Selecciona tu tipo de talento';
    if (data.marketplaceRoles.length === 0) return 'Selecciona al menos un rol';
    return null;
  }, [data]);

  const validateBrandProfile = useCallback((): string | null => {
    if (!data.brandIndustry) return 'Selecciona una industria';
    return null;
  }, [data]);

  const validateOrgDetails = useCallback((): string | null => {
    if (!data.orgSubType) return 'Selecciona el tipo de organización';
    if (!data.orgName.trim()) return 'Nombre de organización es requerido';
    if (!data.orgSlug.trim()) return 'URL de organización es requerida';
    if (!data.selectedPlan) return 'Selecciona un plan';
    return null;
  }, [data]);

  const validateJoinOrg = useCallback((): string | null => {
    if (!data.foundOrg) return 'Busca y selecciona una organización';
    return null;
  }, [data]);

  const validateTerms = useCallback((): string | null => {
    if (!data.acceptTerms) return 'Debes aceptar los términos';
    if (!data.locationCountry) return 'Selecciona tu país';
    return null;
  }, [data]);

  const validateCurrentStep = useCallback((): string | null => {
    switch (currentStep) {
      case 'credentials': return validateCredentials();
      case 'talent-profile': return validateTalentProfile();
      case 'brand-profile': return validateBrandProfile();
      case 'org-details': return validateOrgDetails();
      case 'join-org': return validateJoinOrg();
      case 'terms': return validateTerms();
      default: return null;
    }
  }, [currentStep, validateCredentials, validateTalentProfile, validateBrandProfile, validateOrgDetails, validateJoinOrg, validateTerms]);

  return {
    data,
    onChange,
    steps,
    currentStep: stepIndex >= totalSteps ? 'success' as RegistrationStep : currentStep,
    stepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    selectIntent,
    goToSuccess,
    reset,
    validateCurrentStep,
    getPasswordStrength,
  };
}
