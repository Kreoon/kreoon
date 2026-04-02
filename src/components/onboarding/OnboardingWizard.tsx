import { useState } from 'react';
import { KreoonLogo } from '@/components/ui/kreoon-logo';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { ProfileDataStep } from './ProfileDataStep';
import { LegalConsentStep } from './LegalConsentStep';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'profile_data', label: 'Datos personales' },
  { id: 'legal_consents', label: 'Términos legales' },
];

export function OnboardingWizard() {
  const { signOut } = useAuth();
  const { currentStep, isLoading, completionStatus } = useOnboardingGate();
  const [activeStep, setActiveStep] = useState<'profile_data' | 'legal_consents'>('profile_data');
  const [profileSaved, setProfileSaved] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const goToLegalStep = () => {
    setProfileSaved(true); // Marcar que ya guardó el perfil exitosamente
    setActiveStep('legal_consents');
  };

  const goToProfileStep = () => {
    setActiveStep('profile_data');
  };

  // Determinar el paso a mostrar
  // Si profileSaved es true (guardó exitosamente), confiar en activeStep
  // Si no, verificar completionStatus del servidor
  const displayStep = (profileSaved || completionStatus?.profile_completed) ? activeStep : 'profile_data';
  const currentStepIndex = STEPS.findIndex(s => s.id === displayStep);

  if (isLoading) {
    return <OnboardingSplash />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-x-hidden overflow-y-auto">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none bg-background" />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <KreoonLogo heightClass="h-8" />
            <div>
              <span className="font-bold text-lg text-foreground tracking-widest uppercase font-mono">KREOON</span>
              <span className="ml-2 text-xs text-muted-foreground font-mono">Verificación</span>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              {/* Step circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  index < currentStepIndex
                    ? "bg-green-500 text-white"
                    : index === currentStepIndex
                    ? "bg-primary text-primary-foreground font-mono"
                    : "bg-secondary border border-border text-muted-foreground font-mono"
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  "text-sm font-medium hidden sm:block",
                  index === currentStepIndex ? "text-foreground font-mono" : "text-muted-foreground font-mono"
                )}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 sm:w-20 h-0.5 mx-2",
                    index < currentStepIndex ? "bg-green-500" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 pb-24 sm:pb-16">
        <AnimatePresence mode="wait">
          {displayStep === 'profile_data' && (
            <motion.div
              key="profile_data"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <ProfileDataStep onComplete={goToLegalStep} />
            </motion.div>
          )}

          {displayStep === 'legal_consents' && (
            <motion.div
              key="legal_consents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LegalConsentStep onBack={goToProfileStep} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            © 2026 SICOMMER INT LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function OnboardingSplash() {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto mb-6 flex justify-center"
        >
          <KreoonLogo heightClass="h-16" />
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

export default OnboardingWizard;
