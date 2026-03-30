/**
 * NovaOnboardingWizard - Wizard de onboarding con diseño Nova
 *
 * Flujo: Rol -> Datos Personales -> Documentos Legales
 * El rol se selecciona primero para filtrar los documentos legales correspondientes.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { NovaRoleSelectionStep } from './NovaRoleSelectionStep';
import { NovaProfileDataStep } from './NovaProfileDataStep';
import { NovaLegalConsentStep } from './NovaLegalConsentStep';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/database';

type OnboardingDisplayStep = 'role_selection' | 'profile_data' | 'legal_consents';

export function NovaOnboardingWizard() {
  const { signOut, profile } = useAuth();
  const { completionStatus, isLoading } = useOnboardingGate();
  const [activeStep, setActiveStep] = useState<OnboardingDisplayStep>('role_selection');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [roleSaved, setRoleSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Si el usuario ya tiene rol, saltar al siguiente paso
  useEffect(() => {
    if (profile?.active_role && !roleSaved) {
      setSelectedRole(profile.active_role as AppRole);
      setRoleSaved(true);
      // Si ya tiene rol pero no perfil completo, ir a profile_data
      if (!completionStatus?.profile_completed) {
        setActiveStep('profile_data');
      }
    }
  }, [profile?.active_role, roleSaved, completionStatus?.profile_completed]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleRoleSelected = (role: AppRole) => {
    setSelectedRole(role);
    setRoleSaved(true);
    setActiveStep('profile_data');
  };

  const goToLegalStep = () => {
    setProfileSaved(true);
    setActiveStep('legal_consents');
  };

  const goToProfileStep = () => {
    setActiveStep('profile_data');
  };

  const goToRoleStep = () => {
    setActiveStep('role_selection');
  };

  // Determinar el paso a mostrar basado en el estado
  const getDisplayStep = (): OnboardingDisplayStep => {
    // Si no tiene rol seleccionado, mostrar seleccion de rol
    if (!roleSaved && !profile?.active_role) {
      return 'role_selection';
    }
    // Si tiene rol pero no perfil completo
    if (!profileSaved && !completionStatus?.profile_completed) {
      return activeStep === 'role_selection' ? 'profile_data' : activeStep;
    }
    return activeStep;
  };

  const displayStep = getDisplayStep();

  if (isLoading) {
    return <NovaOnboardingSplash />;
  }

  return (
    <AnimatePresence mode="wait">
      {displayStep === 'role_selection' && (
        <motion.div
          key="role_selection"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <NovaRoleSelectionStep onComplete={handleRoleSelected} onLogout={handleLogout} />
        </motion.div>
      )}

      {displayStep === 'profile_data' && (
        <motion.div
          key="profile_data"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <NovaProfileDataStep onComplete={goToLegalStep} onLogout={handleLogout} />
        </motion.div>
      )}

      {displayStep === 'legal_consents' && (
        <motion.div
          key="legal_consents"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <NovaLegalConsentStep
            onBack={goToProfileStep}
            onLogout={handleLogout}
            userRole={selectedRole || (profile?.active_role as AppRole) || undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NovaOnboardingSplash() {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-200 dark:bg-[#030308] flex items-center justify-center">
      <div className="text-center relative z-10">
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded bg-purple-600 flex items-center justify-center"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Verificando tu cuenta...
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Por favor espera un momento
        </p>

        {/* Loading bar */}
        <div className="mt-6 w-48 h-1 mx-auto bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-purple-600"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />
        </div>
      </div>
    </div>
  );
}

export default NovaOnboardingWizard;
