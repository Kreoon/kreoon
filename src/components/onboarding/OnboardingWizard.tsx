import { useState } from 'react';
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

  const handleLogout = async () => {
    await signOut();
  };

  const goToLegalStep = () => {
    setActiveStep('legal_consents');
  };

  const goToProfileStep = () => {
    setActiveStep('profile_data');
  };

  // Determinar el paso a mostrar
  const displayStep = completionStatus?.profile_completed ? activeStep : 'profile_data';
  const currentStepIndex = STEPS.findIndex(s => s.id === displayStep);

  if (isLoading) {
    return <OnboardingSplash />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F0F23] overflow-x-hidden overflow-y-auto">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(800px,200vw)] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0F0F23]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">KREOON</span>
              <span className="ml-2 text-xs text-purple-400">Verificación</span>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/10"
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
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                    : "bg-white/10 text-white/40"
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  "text-sm font-medium hidden sm:block",
                  index === currentStepIndex ? "text-white" : "text-white/40"
                )}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 sm:w-20 h-0.5 mx-2",
                    index < currentStepIndex ? "bg-green-500" : "bg-white/10"
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
      <footer className="fixed bottom-0 left-0 right-0 py-4 bg-[#0F0F23]/80 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-white/40">
            © 2026 SICOMMER INT LLC. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function OnboardingSplash() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0F0F23] flex items-center justify-center">
      <div className="text-center">
        {/* Logo animado */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
        >
          <Shield className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-xl font-semibold text-white mb-2">
          Verificando tu cuenta...
        </h2>
        <p className="text-sm text-white/60">
          Por favor espera un momento
        </p>

        {/* Loading bar */}
        <div className="mt-6 w-48 h-1 mx-auto bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
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
