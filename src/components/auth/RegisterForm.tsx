import { UnifiedRegistrationWizard } from '@/components/registration';
import type { RegistrationIntent } from '@/components/registration';

export interface RegisterFormProps {
  onSuccess?: (role: string) => void;
  onSwitchToLogin: () => void;
  preselectedRole?: string;
  organizationSlug?: string;
  initialIntent?: RegistrationIntent | null;
}

/**
 * Thin wrapper around UnifiedRegistrationWizard for compact mode (Auth page).
 * Preserves the same interface so Auth.tsx doesn't need major changes.
 */
export function RegisterForm({
  onSwitchToLogin,
  preselectedRole,
  initialIntent,
}: RegisterFormProps) {
  // Map legacy preselectedRole to new intent system
  const resolvedIntent: RegistrationIntent | null = initialIntent ?? mapLegacyRole(preselectedRole);

  return (
    <UnifiedRegistrationWizard
      mode="compact"
      initialIntent={resolvedIntent}
      onSwitchToLogin={onSwitchToLogin}
    />
  );
}

function mapLegacyRole(role?: string): RegistrationIntent | null {
  switch (role) {
    case 'creator':
    case 'editor':
      return 'talent';
    case 'client':
      return 'brand';
    case 'agency':
      return 'organization';
    default:
      return null;
  }
}

RegisterForm.displayName = 'RegisterForm';
