import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DEMO_TOUR_STEPS } from '@/lib/demo-data';

export function DemoTour() {
  const { tourActive, tourStep, setTourStep, endTour } = useDemoMode();
  const step = DEMO_TOUR_STEPS[tourStep];
  const isLast = tourStep === DEMO_TOUR_STEPS.length - 1;

  if (!tourActive || !step) return null;

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={endTour}
      />

      {/* Tour card — centered modal */}
      <motion.div
        key={`step-${tourStep}`}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-gray-900 shadow-2xl overflow-hidden">
          {/* Header gradient */}
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

          <div className="p-6">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {DEMO_TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                      i === tourStep
                        ? 'bg-purple-500 w-8'
                        : i < tourStep
                        ? 'bg-purple-500/60'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={endTour}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
                Paso {tourStep + 1} de {DEMO_TOUR_STEPS.length}
              </p>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{step.description}</p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTourStep(tourStep - 1)}
                disabled={tourStep === 0}
                className="text-gray-400 hover:text-white gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              {isLast ? (
                <Button
                  size="sm"
                  onClick={endTour}
                  className="bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Empezar a explorar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setTourStep(tourStep + 1)}
                  className="bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 gap-1.5"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
