// Componente principal
export { WizardContainer } from './WizardContainer';

// Hooks
export { useRegistrationV2 } from './useRegistrationV2';
export { useRegistrationSubmitV2 } from './useRegistrationSubmitV2';

// Componentes de pasos
export { InviteCodeStep } from './steps/InviteCodeStep';
export { TypeSelectorStep } from './steps/TypeSelectorStep';
export { RegistrationFormStep } from './steps/RegistrationFormStep';
export { SuccessStep } from './steps/SuccessStep';

// Componentes compartidos
export { PhoneInput } from './shared/PhoneInput';
export { LegalCheckboxes } from './shared/LegalCheckboxes';
export { PasswordField } from './shared/PasswordField';

// Indicador de progreso
export { WizardProgress } from './WizardProgress';

// Tipos
export type {
  RegistrationFlow,
  UserType,
  WizardStep,
  RegistrationFormData,
  RegistrationV2State,
  CountryOption,
  UserTypeOption,
} from './types';

// Constantes
export {
  LATAM_COUNTRIES,
  ORG_USER_TYPE_OPTIONS,
  GENERAL_USER_TYPE_OPTIONS,
  registrationFormSchema,
  registrationFormSchemaWithCompany,
  requiresCompanyName,
  getWizardSteps,
  getStepIndex,
  getStepLabel,
} from './types';
