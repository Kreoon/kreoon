import { useParams } from 'react-router-dom';
import { OnboardingWizard } from '@/components/client-onboarding/OnboardingWizard';

/**
 * Página pública del formulario de onboarding de clientes: /onboarding/:token
 *
 * Sin sesión y sin ProtectedRoute — el enlace llega por WhatsApp y el cliente
 * no tiene cuenta en la plataforma. Toda la autorización la resuelve el token
 * contra las edge functions client-onboarding-get / -submit.
 */
export default function ClientOnboarding() {
  const { token } = useParams<{ token: string }>();

  return <OnboardingWizard token={token} />;
}
