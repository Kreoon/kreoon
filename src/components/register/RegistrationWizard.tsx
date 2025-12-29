import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { WizardProgress } from './WizardProgress';
import {
  AccessTypeStep,
  ProfileTypeStep,
  BasicDataStep,
  PlanSelectionStep,
  TalentAccessStep,
  ConfirmationStep,
  JoinOrgStep,
} from './steps';
import { RegistrationData, initialRegistrationData } from './types';

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

export function RegistrationWizard() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { user, loading: authLoading, rolesLoaded, roles } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<RegistrationData>(initialRegistrationData);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading && rolesLoaded) {
      if (roles.length > 0) {
        navigate('/');
      }
    }
  }, [user, authLoading, rolesLoaded, roles, navigate]);

  // If slug is provided, pre-select join_org mode
  useEffect(() => {
    if (slug) {
      setData(prev => ({ 
        ...prev, 
        registrationMode: 'join_org',
        joinLink: slug 
      }));
      setCurrentStep(1); // Skip to join step
    }
  }, [slug]);

  const updateData = (updates: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  };

  const goToBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Determine which steps to show based on registration mode
  const getSteps = () => {
    const isOrgFlow = data.registrationMode === 'create_org';
    const isJoinFlow = data.registrationMode === 'join_org';
    const isIndividualFlow = data.registrationMode === 'individual';

    if (isOrgFlow) {
      return [
        { label: 'Tipo', component: AccessTypeStep },
        { label: 'Perfil', component: ProfileTypeStep },
        { label: 'Datos', component: BasicDataStep },
        { label: 'Plan', component: PlanSelectionStep },
        { label: 'Talento', component: TalentAccessStep },
        { label: 'Confirmar', component: ConfirmationStep },
      ];
    }

    if (isJoinFlow) {
      return [
        { label: 'Tipo', component: AccessTypeStep },
        { label: 'Unirse', component: JoinOrgStep },
        { label: 'Datos', component: BasicDataStep },
        { label: 'Confirmar', component: ConfirmationStep },
      ];
    }

    if (isIndividualFlow) {
      return [
        { label: 'Tipo', component: AccessTypeStep },
        { label: 'Perfil', component: ProfileTypeStep },
        { label: 'Datos', component: BasicDataStep },
        { label: 'Confirmar', component: ConfirmationStep },
      ];
    }

    // Default - still on step 1
    return [
      { label: 'Tipo', component: AccessTypeStep },
      { label: 'Perfil', component: ProfileTypeStep },
      { label: 'Datos', component: BasicDataStep },
      { label: 'Confirmar', component: ConfirmationStep },
    ];
  };

  const steps = getSteps();
  const CurrentStepComponent = steps[currentStep]?.component || AccessTypeStep;

  const stepLabels = steps.map(s => ({ label: s.label }));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a KREOON
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <button 
                onClick={() => navigate('/auth')}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Progress bar - only show after step 1 */}
          {currentStep > 0 && (
            <WizardProgress
              currentStep={currentStep}
              totalSteps={steps.length}
              steps={stepLabels}
            />
          )}

          {/* Step content with animation */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              <CurrentStepComponent
                data={data}
                updateData={updateData}
                onNext={goToNext}
                onBack={goToBack}
              />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-xs text-muted-foreground/60">
          © 2024 KREOON. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
