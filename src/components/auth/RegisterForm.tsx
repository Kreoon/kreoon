import { WizardContainer } from '@/components/registration-v2';

export interface RegisterFormProps {
  onSuccess?: (role: string) => void;
  onSwitchToLogin: () => void;
  preselectedRole?: string;
  organizationSlug?: string;
}

/**
 * Wrapper around WizardContainer (registration-v2) for modal usage.
 * Uses the same wizard as /register page for consistency.
 */
export function RegisterForm({
  onSwitchToLogin,
}: RegisterFormProps) {
  return (
    <WizardContainer
      flow="general"
      compact={true}
      onBack={onSwitchToLogin}
    />
  );
}

RegisterForm.displayName = 'RegisterForm';
