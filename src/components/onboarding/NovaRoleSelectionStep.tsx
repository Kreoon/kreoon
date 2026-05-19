import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { AccountType } from '@/types/database';
import { OnboardingShell, TALENT_STEPS, CLIENT_STEPS } from './OnboardingShell';

interface NovaRoleSelectionStepProps {
  onComplete: (accountType: AccountType) => void;
  onContinueToSpecializations?: () => void;
  onLogout?: () => void;
}

interface AccountTypeOption {
  id: AccountType;
  emoji: string;
  label: string;
  description: string;
  features: string[];
}

const ACCOUNT_TYPES: AccountTypeOption[] = [
  {
    id: 'talent',
    emoji: '🎬',
    label: 'Soy Creador / Talento',
    description: 'Videógrafo, editor, creador UGC, fotógrafo, estratega creativo...',
    features: [
      '✅ Aparezco en el marketplace de marcas',
      '✅ Recibo propuestas de trabajo y campañas',
      '✅ Gestiono mis proyectos y portafolio',
      '✅ Cobro mis pagos desde la plataforma',
    ],
  },
  {
    id: 'client',
    emoji: '🏢',
    label: 'Soy una Marca / Empresa',
    description: 'Startup, empresa, agencia o negocio que necesita contenido',
    features: [
      '✅ Busco y contrato creadores verificados',
      '✅ Publico proyectos con brief detallado',
      '✅ Reviso, apruebo y descargo el contenido',
      '✅ Gestiono todas mis campañas en un lugar',
    ],
  },
];

export function NovaRoleSelectionStep({
  onComplete,
  onContinueToSpecializations,
  onLogout,
}: NovaRoleSelectionStepProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedType || !user?.id) return;

    setSaving(true);

    if (selectedType === 'talent' && onContinueToSpecializations) {
      supabase
        .from('profiles')
        .update({ user_type: selectedType })
        .eq('id', user.id)
        .then(({ error }) => { if (error) {} })
        .catch(() => {});

      onContinueToSpecializations();
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: selectedType, active_role: 'client' })
        .eq('id', user.id);

      if (error) throw error;

      onComplete(selectedType);
    } catch {
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const steps = selectedType === 'talent' ? TALENT_STEPS : CLIENT_STEPS;

  return (
    <OnboardingShell currentStep={1} steps={steps} onLogout={onLogout}>
      <div className="max-w-lg mx-auto">

        {/* Hero de plataforma */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-xs font-medium text-primary tracking-widest uppercase mb-4">
            ✨ Plataforma todo en uno para contenido UGC
          </p>

          <h2 className="text-2xl font-bold text-foreground mb-3">
            ¡Bienvenido a KREOON! 👋
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            La plataforma donde <strong>marcas y creadores</strong> se conectan para producir contenido que vende.
            Marketplace, producción y gestión en un solo lugar.
          </p>
        </motion.div>

        {/* Features de la plataforma — mini tarjetas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {[
            { emoji: '🛒', text: 'Marketplace de creadores' },
            { emoji: '🎬', text: 'Producción de contenido' },
            { emoji: '📊', text: 'Gestión de proyectos' },
            { emoji: '💰', text: 'Pagos y contratos' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/50 bg-card"
            >
              <span className="text-xl">{item.emoji}</span>
              <p className="text-xs text-muted-foreground leading-snug">{item.text}</p>
            </div>
          ))}
        </motion.div>

        {/* Divisor con pregunta */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex-1 h-px bg-border/50" />
          <p className="text-sm font-semibold text-foreground shrink-0">
            ¿Cómo quieres usar KREOON?
          </p>
          <div className="flex-1 h-px bg-border/50" />
        </motion.div>

        {/* BigCards */}
        <div className="flex flex-col gap-4">
          {ACCOUNT_TYPES.map((type, index) => {
            const isSelected = selectedType === type.id;

            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  'flex items-center gap-4 px-6 py-5 rounded-2xl border-2 text-left transition-all w-full',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40 bg-card'
                )}
              >
                {/* Emoji */}
                <span className="text-4xl shrink-0">{type.emoji}</span>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-foreground">
                    {type.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                  {isSelected && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-1"
                    >
                      {type.features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{f}</li>
                      ))}
                    </motion.ul>
                  )}
                </div>

                {/* Radio visual */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Botón continuar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedType ? 1 : 0 }}
          className="mt-8"
        >
          <button
            onClick={handleContinue}
            disabled={!selectedType || saving}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-base transition-all',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                {selectedType === 'talent' ? 'Elegir mis especialidades' : 'Continuar'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {selectedType === 'talent' && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              En el siguiente paso elegirás tus áreas de especialización
            </p>
          )}
        </motion.div>
      </div>
    </OnboardingShell>
  );
}

export default NovaRoleSelectionStep;
