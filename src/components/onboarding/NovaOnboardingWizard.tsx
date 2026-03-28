/**
 * NovaOnboardingWizard - Wizard de onboarding con diseño Nova
 *
 * Combina NovaProfileDataStep y LegalConsentStep con el tema Nova premium.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { NovaProfileDataStep } from './NovaProfileDataStep';
import { NovaLegalConsentStep } from './NovaLegalConsentStep';
import { cn } from '@/lib/utils';

export function NovaOnboardingWizard() {
  const { signOut } = useAuth();
  const { completionStatus, isLoading } = useOnboardingGate();
  const [activeStep, setActiveStep] = useState<'profile_data' | 'legal_consents'>('profile_data');
  const [profileSaved, setProfileSaved] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const goToLegalStep = () => {
    setProfileSaved(true);
    setActiveStep('legal_consents');
  };

  const goToProfileStep = () => {
    setActiveStep('profile_data');
  };

  // Determinar el paso a mostrar
  const displayStep = (profileSaved || completionStatus?.profile_completed) ? activeStep : 'profile_data';

  if (isLoading) {
    return <NovaOnboardingSplash />;
  }

  return (
    <AnimatePresence mode="wait">
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
          <NovaLegalConsentStep onBack={goToProfileStep} onLogout={handleLogout} />
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
