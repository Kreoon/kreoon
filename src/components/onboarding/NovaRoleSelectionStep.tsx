/**
 * NovaRoleSelectionStep - Paso de seleccion de tipo de cuenta con Design System Nova
 *
 * Primer paso del onboarding obligatorio.
 * El usuario debe seleccionar su tipo de cuenta:
 * - Cliente: Marca/Empresa que contrata talento
 * - Organizacion: Agencia que gestiona equipos
 * - Talento: Creador independiente con multiples especialidades
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Building2, ArrowRight, CheckCircle2, Users2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { AccountType } from '@/types/database';
import { OnboardingShell, TALENT_STEPS } from './OnboardingShell';

interface NovaRoleSelectionStepProps {
  onComplete: (accountType: AccountType) => void;
  onContinueToSpecializations?: () => void;
  onLogout?: () => void;
}

interface AccountTypeOption {
  id: AccountType;
  label: string;
  description: string;
  features: string[];
  icon: typeof Sparkles;
  gradient: string;
  borderColor: string;
}

const ACCOUNT_TYPES: AccountTypeOption[] = [
  {
    id: 'talent',
    label: 'Soy Talento',
    description: 'Creador, editor, estratega o profesional creativo',
    features: [
      'Perfil publico en el marketplace',
      'Multiples especialidades',
      'Recibe propuestas de trabajo',
      'Gestiona tu portafolio',
    ],
    icon: Sparkles,
    gradient: 'from-pink-500 to-purple-500',
    borderColor: 'border-pink-500',
  },
  {
    id: 'organization',
    label: 'Tengo una Agencia',
    description: 'Gestiono un equipo de creadores y talento',
    features: [
      'Invita miembros a tu equipo',
      'Asigna roles y permisos',
      'Gestiona proyectos internos',
      'Dashboard de organizacion',
    ],
    icon: Users2,
    gradient: 'from-purple-500 to-indigo-500',
    borderColor: 'border-purple-500',
  },
  {
    id: 'client',
    label: 'Soy Cliente / Marca',
    description: 'Busco contratar talento creativo',
    features: [
      'Acceso al marketplace',
      'Publica proyectos',
      'Contrata creadores',
      'Gestiona campanas',
    ],
    icon: Building2,
    gradient: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500',
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

    // Para talento, navegar inmediatamente y guardar en background
    if (selectedType === 'talent' && onContinueToSpecializations) {
      // Guardar en background sin esperar
      supabase
        .from('profiles')
        .update({ user_type: selectedType })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            // Error silencioso - el usuario ya navegó
          }
        })
        .catch(() => {
          // Error de red silencioso
        });

      // Navegar inmediatamente
      onContinueToSpecializations();
      setSaving(false);
      return;
    }

    // Para cliente/organizacion, esperar a guardar
    try {
      const updateData: Record<string, unknown> = {
        user_type: selectedType,
      };

      if (selectedType === 'client') {
        updateData.active_role = 'client';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Tipo de cuenta seleccionado');
      onComplete(selectedType);
    } catch (err) {
      toast.error('Error al guardar el tipo de cuenta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell currentStep={1} steps={TALENT_STEPS} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Bienvenido a KREOON
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Selecciona como quieres usar la plataforma
          </p>
        </motion.div>

        {/* Account Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {ACCOUNT_TYPES.map((type, index) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;

            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  'group relative p-6 rounded-[0.125rem] border-2 transition-all duration-200 text-left',
                  'bg-card',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                  isSelected
                    ? `${type.borderColor}`
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-[0.125rem] flex items-center justify-center mb-4 transition-transform group-hover:scale-110',
                    isSelected
                      ? `bg-gradient-to-br ${type.gradient}`
                      : 'bg-secondary'
                  )}
                >
                  <Icon
                    className={cn('w-7 h-7', isSelected ? 'text-white' : 'text-muted-foreground')}
                  />
                </div>

                {/* Label */}
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {type.label}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{type.description}</p>

                {/* Features */}
                <ul className="space-y-1.5">
                  {type.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2
                        className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-green-500' : 'text-muted-foreground/50')}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className={cn('w-6 h-6', type.borderColor.replace('border-', 'text-'))} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Continue Button */}
        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 sm:mt-12 flex justify-center"
          >
            <button
              onClick={handleContinue}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-8 py-3 rounded-[0.125rem] font-medium transition-all duration-200',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
              )}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {selectedType === 'talent' ? 'Elegir especialidades' : 'Continuar'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Helper text for talent */}
        {selectedType === 'talent' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground mt-4"
          >
            En el siguiente paso podras elegir hasta 5 especialidades
          </motion.p>
        )}
      </div>
    </OnboardingShell>
  );
}

export default NovaRoleSelectionStep;
