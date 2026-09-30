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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6 md:p-8 bg-muted/50 border-border">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Paso {step} de 2
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-3">
          {step === 1 ? '¿Desde dónde te unís?' : '¿Qué buscás lograr?'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          {step === 1
            ? 'Esto nos ayuda a personalizar contenido y conectarte con creadores cercanos.'
            : 'Tu objetivo guía las recomendaciones y a quién te conectamos primero.'}
        </p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> País
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCountry(c)}
                    className={`text-xs py-2 px-2 rounded-md border transition-colors ${
                      country === c
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-muted/60 border-border text-muted-foreground hover:border-border'
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
              <Target className="h-4 w-4 text-primary" /> Tu objetivo
            </Label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value.slice(0, 280))}
              placeholder="Ej: Quiero aprender a vivir de creación de contenido y conseguir mis primeras 10k seguidores en TikTok."
              className="w-full bg-muted border border-border rounded-md p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 h-28 resize-none"
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {objective.length}/280 caracteres
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          {step === 2 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="text-muted-foreground hover:text-foreground"
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
            className="bg-primary hover:bg-primary/90 text-white"
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
