/**
 * NovaOnboardingWizard - Wizard de onboarding con diseno Nova
 *
 * Flujo segun tipo de cuenta:
 * - Cliente: Tipo de cuenta -> Datos Personales -> Documentos Legales
 * - Organizacion: Tipo de cuenta -> Datos Personales -> Documentos Legales
 * - Talento: Tipo de cuenta -> Especialidades -> Datos Personales -> Documentos Legales
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { supabase } from '@/integrations/supabase/client';
import { NovaRoleSelectionStep } from './NovaRoleSelectionStep';
import { TalentSpecializationsStep } from './TalentSpecializationsStep';
import { NovaProfileDataStep } from './NovaProfileDataStep';
import { NovaLegalConsentStep } from './NovaLegalConsentStep';
import type { AccountType, AppRole } from '@/types/database';

type OnboardingDisplayStep =
  | 'account_type_selection'
  | 'talent_specializations'
  | 'profile_data'
  | 'legal_consents';

export function NovaOnboardingWizard() {
  const { signOut, profile, user } = useAuth();
  const { completionStatus, isLoading } = useOnboardingGate();
  const [activeStep, setActiveStep] = useState<OnboardingDisplayStep>('account_type_selection');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [accountTypeSaved, setAccountTypeSaved] = useState(false);
  const [specializationsSaved, setSpecializationsSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Si el usuario ya tiene user_type, saltar al siguiente paso
  useEffect(() => {
    if (profile?.user_type && !accountTypeSaved) {
      setAccountType(profile.user_type as AccountType);
      setAccountTypeSaved(true);

      // Si es talento y no tiene especialidades, ir a especialidades
      // Si ya tiene todo, ir a profile_data
      if (!completionStatus?.profile_completed) {
        // Para talento, verificar si ya tiene especialidades
        if (profile.user_type === 'talent') {
          // Por ahora asumimos que si tiene user_type='talent' pero no profile_completed,
          // puede necesitar elegir especialidades (el componente verificara)
          setActiveStep('talent_specializations');
        } else {
          setActiveStep('profile_data');
        }
      }
    }
  }, [profile?.user_type, accountTypeSaved, completionStatus?.profile_completed]);

  const handleLogout = async () => {
    await signOut();
  };

  // Callback cuando se selecciona tipo de cuenta
  const handleAccountTypeSelected = (type: AccountType) => {
    setAccountType(type);
    setAccountTypeSaved(true);
    // Para talento ya redirige a especialidades desde NovaRoleSelectionStep
    // Para otros tipos, ir a profile_data
    if (type !== 'talent') {
      setActiveStep('profile_data');
    }
  };

  // Callback para ir a especialidades (solo talento)
  const handleGoToSpecializations = () => {
    setAccountType('talent');
    setAccountTypeSaved(true);
    setActiveStep('talent_specializations');
  };

  // Callback cuando se completan especialidades
  const handleSpecializationsComplete = () => {
    setSpecializationsSaved(true);
    setActiveStep('profile_data');
  };

  // Callback para volver desde especialidades
  const handleBackFromSpecializations = async () => {
    // Resetear user_type en BD para poder volver a elegir
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ user_type: null })
        .eq('id', user.id);
    }
    setActiveStep('account_type_selection');
    setAccountType(null);
    setAccountTypeSaved(false);
  };

  // Callback cuando se completa el perfil
  const goToLegalStep = () => {
    setProfileSaved(true);
    setActiveStep('legal_consents');
  };

  const goToProfileStep = () => {
    setActiveStep('profile_data');
  };

  // Callback para volver desde el paso de perfil
  const handleBackFromProfile = async () => {
    // Si es talento, volver a especialidades
    if (accountType === 'talent') {
      setActiveStep('talent_specializations');
      setSpecializationsSaved(false);
    } else {
      // Para cliente/organizacion, resetear user_type y volver a seleccion
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ user_type: null })
          .eq('id', user.id);
      }
      setActiveStep('account_type_selection');
      setAccountType(null);
      setAccountTypeSaved(false);
    }
  };

  // Determinar el paso a mostrar basado en el estado
  const getDisplayStep = (): OnboardingDisplayStep => {
    // Si no tiene tipo de cuenta, mostrar seleccion
    if (!accountTypeSaved && !profile?.user_type) {
      return 'account_type_selection';
    }

    // Si es talento y no ha guardado especialidades
    if (accountType === 'talent' && !specializationsSaved && activeStep === 'talent_specializations') {
      return 'talent_specializations';
    }

    // Si tiene tipo pero no perfil completo
    if (!profileSaved && !completionStatus?.profile_completed) {
      return activeStep === 'account_type_selection' ? 'profile_data' : activeStep;
    }

    return activeStep;
  };

  const displayStep = getDisplayStep();

  if (isLoading) {
    return <NovaOnboardingSplash />;
  }

  // Calcular paso actual para mostrar en header
  const getTotalSteps = () => (accountType === 'talent' ? 4 : 3);
  const getCurrentStepNumber = () => {
    switch (displayStep) {
      case 'account_type_selection':
        return 1;
      case 'talent_specializations':
        return 2;
      case 'profile_data':
        return accountType === 'talent' ? 3 : 2;
      case 'legal_consents':
        return accountType === 'talent' ? 4 : 3;
      default:
        return 1;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {displayStep === 'account_type_selection' && (
        <motion.div
          key="account_type_selection"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <NovaRoleSelectionStep
            onComplete={handleAccountTypeSelected}
            onContinueToSpecializations={handleGoToSpecializations}
            onLogout={handleLogout}
          />
        </motion.div>
      )}

      {displayStep === 'talent_specializations' && (
        <motion.div
          key="talent_specializations"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <TalentSpecializationsStep
            onComplete={handleSpecializationsComplete}
            onBack={handleBackFromSpecializations}
            onLogout={handleLogout}
          />
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
          <NovaProfileDataStep
            onComplete={goToLegalStep}
            onBack={handleBackFromProfile}
            onLogout={handleLogout}
            isTalentFlow={accountType === 'talent'}
          />
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
            userRole={
              accountType === 'client'
                ? 'client'
                : accountType === 'talent'
                ? 'content_creator'
                : (profile?.active_role as AppRole) || undefined
            }
            accountType={accountType || (profile?.user_type as AccountType) || undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NovaOnboardingSplash() {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="text-center relative z-10">
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto mb-6 flex justify-center"
        >
          <img src="/logo.png" alt="KREOON" className="h-16 object-contain" />
        </motion.div>

        <h2 className="text-xl font-semibold text-foreground mb-2 font-mono uppercase">
          Verificando tu cuenta...
        </h2>
        <p className="text-sm text-muted-foreground font-mono">
          Por favor espera un momento
        </p>

        {/* Loading bar */}
        <div className="mt-6 w-48 h-1 mx-auto bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
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
