// ============================================================================
// Gate obligatorio: bloquea el acceso al feed/cursos hasta que el miembro
// complete: país + objetivo (mínimo viable). Avatar es opcional.
// Una vez completado, llama save_academy_onboarding_data que setea
// onboarding_completed_at y desbloquea todo.
// ============================================================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Globe, Target, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  spaceId: string;
  spaceName: string;
}

const COUNTRY_OPTIONS = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Guatemala',
  'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela', 'Otro',
];

export function MandatoryOnboardingGate({ spaceId, spaceName }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [country, setCountry] = useState('');
  const [objective, setObjective] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('save_academy_onboarding_data', {
        p_space_id: spaceId,
        p_country: country,
        p_objective: objective,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'my-membership'] });
      toast.success('¡Bienvenido a ' + spaceName + '!');
    },
    onError: (e: any) => {
      const msg = e?.message?.includes('invalid_country') ? 'Selecciona un país'
        : e?.message?.includes('invalid_objective') ? 'Cuéntanos un poco más (mínimo 10 caracteres)'
        : 'No pudimos guardar tus datos';
      toast.error(msg);
    },
  });

  const canContinue = step === 1 ? !!country : objective.trim().length >= 10;

  return (
    <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6 md:p-8 bg-white/5 border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="text-xs text-zinc-400 uppercase tracking-wider">
            Paso {step} de 2
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mt-3">
          {step === 1 ? '¿Desde dónde te unís?' : '¿Qué buscás lograr?'}
        </h1>
        <p className="text-sm text-zinc-400 mt-2 mb-6">
          {step === 1
            ? 'Esto nos ayuda a personalizar contenido y conectarte con creadores cercanos.'
            : 'Tu objetivo guía las recomendaciones y a quién te conectamos primero.'}
        </p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-400" /> País
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCountry(c)}
                    className={`text-xs py-2 px-2 rounded-md border transition-colors ${
                      country === c
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-100'
                        : 'bg-black/20 border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" /> Tu objetivo
            </Label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value.slice(0, 280))}
              placeholder="Ej: Quiero aprender a vivir de creación de contenido y conseguir mis primeras 10k seguidores en TikTok."
              className="w-full bg-black/30 border border-white/10 rounded-md p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 h-28 resize-none"
            />
            <div className="text-[10px] text-zinc-500 text-right">
              {objective.length}/280 caracteres
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
          {step === 2 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              ← Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => {
              if (step === 1) setStep(2);
              else saveMutation.mutate();
            }}
            disabled={!canContinue || saveMutation.isPending}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
            ) : step === 1 ? (
              <>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              <>Entrar a la academia <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
