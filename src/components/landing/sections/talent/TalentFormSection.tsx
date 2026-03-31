import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WizardContainer } from '@/components/registration-v2';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface TalentFormSectionProps {
  id?: string;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function TalentFormSection({ id, open = true, onClose, onSuccess }: TalentFormSectionProps) {
  const analytics = useAnalyticsContext();
  const isModal = onClose != null;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isModal || !open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isModal, open]);

  // ESC to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isModal || !open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, open, handleKeyDown]);

  useEffect(() => {
    analytics.track({
      event_name: 'talent_registration_view',
      event_category: 'engagement',
      properties: { page: 'talento_landing' },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if modal mode and not open
  if (isModal && !open) return null;

  // Modal mode
  if (isModal) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <WizardContainer
              flow="general"
              compact
              onBack={onClose}
            />
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Inline section mode
  return (
    <section id={id} className="relative bg-kreoon-bg-primary py-20 md:py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-lg px-4 lg:px-8">
        <WizardContainer flow="general" />
      </div>
    </section>
  );
}
