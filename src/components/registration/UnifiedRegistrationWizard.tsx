import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRegistration } from './useRegistration';
import { useRegistrationSubmit } from './useRegistrationSubmit';
import { RegistrationProgress } from './RegistrationProgress';
import { IntentStep } from './steps/IntentStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { TalentProfileStep } from './steps/TalentProfileStep';
import { BrandProfileStep } from './steps/BrandProfileStep';
import { OrgDetailsStep } from './steps/OrgDetailsStep';
import { JoinOrgStep } from './steps/JoinOrgStep';
import { TermsStep } from './steps/TermsStep';
import { SuccessStep } from './steps/SuccessStep';
import type { RegistrationIntent, WizardMode } from './types';

interface UnifiedRegistrationWizardProps {
  mode?: WizardMode;
  initialIntent?: RegistrationIntent | null;
  onSwitchToLogin?: () => void;
}

export function UnifiedRegistrationWizard({
  mode = 'full',
  initialIntent = null,
  onSwitchToLogin,
}: UnifiedRegistrationWizardProps) {
  const {
    data,
    onChange,
    steps,
    currentStep,
    stepIndex,
    goNext,
    goBack,
    selectIntent,
    goToSuccess,
  } = useRegistration({ initialIntent });

  const { submit, submitting } = useRegistrationSubmit();
  const [hasSession, setHasSession] = useState(false);

  const handleSubmit = async (): Promise<boolean> => {
    const success = await submit(data);
    if (success) {
      // Check if we got a session back (instant login) vs email confirmation needed
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      setHasSession(!!session);
      goToSuccess();
    }
    return success;
  };

  const isCompact = mode === 'compact';

  const stepProps = {
    data,
    onChange,
    onNext: goNext,
    onBack: goBack,
    mode,
  };

  return (
    <div className={cn('w-full', isCompact ? 'max-w-md mx-auto' : '')}>
      {/* Progress indicator (not shown on intent or success) */}
      {currentStep !== 'intent' && currentStep !== 'success' && (
        <RegistrationProgress
          steps={steps}
          currentIndex={stepIndex}
          intent={data.intent}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {currentStep === 'intent' && (
            <IntentStep onSelect={selectIntent} mode={mode} />
          )}

          {currentStep === 'credentials' && (
            <CredentialsStep {...stepProps} />
          )}

          {currentStep === 'talent-profile' && (
            <TalentProfileStep {...stepProps} />
          )}

          {currentStep === 'brand-profile' && (
            <BrandProfileStep {...stepProps} />
          )}

          {currentStep === 'org-details' && (
            <OrgDetailsStep {...stepProps} />
          )}

          {currentStep === 'join-org' && (
            <JoinOrgStep {...stepProps} />
          )}

          {currentStep === 'terms' && (
            <TermsStep
              {...stepProps}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}

          {currentStep === 'success' && (
            <SuccessStep
              intent={data.intent}
              mode={mode}
              hasSession={hasSession}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Switch to login (compact mode) */}
      {currentStep === 'intent' && onSwitchToLogin && (
        <p className="text-center text-xs text-gray-500 mt-5">
          ¿Ya tienes cuenta?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Inicia sesión
          </button>
        </p>
      )}
    </div>
  );
}
