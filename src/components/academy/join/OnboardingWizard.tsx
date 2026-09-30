import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCompleteOnboarding } from '@/hooks/academy/useAcademyJoinSpace';

const KREOON_PURPLE = '#7c3aed';

interface OnboardingWizardProps {
  spaceId: string;
  spaceSlug: string;
  spaceName: string;
  open: boolean;
  onClose: () => void;
}

type StepKey = 'profile' | 'intro' | 'follow' | 'react';

interface Step {
  key: StepKey;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  ctaTo: string;
  reward: string;
}

/**
 * Wizard de 4 pasos post-join.
 * Cada paso linkea a la acción concreta. Marca completos en localStorage
 * y dispara el RPC academy_complete_onboarding al terminar.
 */
export function OnboardingWizard({
  spaceId,
  spaceSlug,
  spaceName,
  open,
  onClose,
}: OnboardingWizardProps) {
  const complete = useCompleteOnboarding();
  const [doneSteps, setDoneSteps] = useState<Set<StepKey>>(() => {
    try {
      const raw = localStorage.getItem(`academy_onboarding_${spaceId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const steps: Step[] = [
    {
      key: 'profile',
      emoji: '👤',
      title: 'Completa tu perfil',
      description: 'Sube una foto y cuéntanos quién eres. Hace que la gente te reconozca.',
      cta: 'Editar perfil',
      ctaTo: `/academia/${spaceSlug}/members?edit=me`,
      reward: '+10 XP',
    },
    {
      key: 'intro',
      emoji: '👋',
      title: 'Preséntate al feed',
      description: 'Publica en la categoría "Presentación" con tu historia. Te damos un bonus enorme.',
      cta: 'Ir al feed',
      ctaTo: `/academia/${spaceSlug}/feed?category=intro`,
      reward: '+50 XP + 🌟 Insignia Bienvenido',
    },
    {
      key: 'follow',
      emoji: '🤝',
      title: 'Sigue a 3 creadores',
      description: 'Personas que te inspiren o cuyos posts quieras ver primero.',
      cta: 'Ver creadores',
      ctaTo: `/academia/${spaceSlug}/members`,
      reward: '+10 XP',
    },
    {
      key: 'react',
      emoji: '❤️',
      title: 'Reacciona a 5 posts',
      description: 'Una reacción dice "te leí, me importa". Activa la comunidad.',
      cta: 'Ir al feed',
      ctaTo: `/academia/${spaceSlug}/feed`,
      reward: '+10 XP',
    },
  ];

  function markDone(key: StepKey) {
    const next = new Set(doneSteps);
    next.add(key);
    setDoneSteps(next);
    try {
      localStorage.setItem(`academy_onboarding_${spaceId}`, JSON.stringify(Array.from(next)));
    } catch {}
  }

  const totalDone = steps.filter((s) => doneSteps.has(s.key)).length;
  const allDone = totalDone === steps.length;
  const progressPct = Math.round((totalDone / steps.length) * 100);

  async function handleFinish() {
    try {
      await complete.mutateAsync(spaceId);
    } catch {
      // no-op: el RPC es idempotente, no bloquea cerrar
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl border-2 border-border bg-kreoon-bg-card p-0 overflow-hidden">
        {/* Header con progress */}
        <div
          className="p-5 md:p-6 border-b border-border"
          style={{ background: `linear-gradient(135deg, ${KREOON_PURPLE}20, transparent)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl" aria-hidden="true">🎉</div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-extrabold text-foreground">
                ¡Bienvenido a {spaceName}!
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Completa estos 4 pasos para empezar con buen pie
              </DialogDescription>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted-foreground">{totalDone} de {steps.length} pasos</span>
              <span style={{ color: KREOON_PURPLE }}>{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${KREOON_PURPLE}, #a855f7)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-4 md:p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {steps.map((step, i) => {
            const isDone = doneSteps.has(step.key);
            return (
              <div
                key={step.key}
                className={cn(
                  'rounded-2xl border-2 p-4 transition-all',
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border bg-muted/30 hover:border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border-2',
                      isDone ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border bg-muted/50'
                    )}
                    aria-hidden="true"
                  >
                    {isDone ? <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> : step.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className={cn(
                          'font-bold text-base',
                          isDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                        )}
                      >
                        {i + 1}. {step.title}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: `${KREOON_PURPLE}20`,
                          color: '#a855f7',
                        }}
                      >
                        {step.reward}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {step.description}
                    </p>
                    {!isDone && (
                      <div className="flex items-center gap-2">
                        <Link to={step.ctaTo} onClick={() => markDone(step.key)}>
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold rounded-xl text-white"
                            style={{ backgroundColor: KREOON_PURPLE }}
                          >
                            {step.cta} <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                        <button
                          onClick={() => markDone(step.key)}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline"
                        >
                          Marcar como hecho
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-border bg-muted/60">
          {allDone ? (
            <Button
              onClick={handleFinish}
              disabled={complete.isPending}
              className="w-full h-11 rounded-2xl font-bold text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                boxShadow: `0 6px 20px -4px ${KREOON_PURPLE}80`,
              }}
            >
              🏁 Terminar onboarding
            </Button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground underline mx-auto block"
            >
              Continuar después
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
