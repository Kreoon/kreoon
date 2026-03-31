/**
 * TalentSpecializationsStep - Paso de seleccion de ROLES principales para Talento
 *
 * Permite al usuario seleccionar 1-4 roles principales.
 * Las especialidades especificas se seleccionan despues en el perfil.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Video, BarChart3, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TalentRole } from '@/types/database';
import { OnboardingShell, TALENT_STEPS } from './OnboardingShell';

interface TalentSpecializationsStepProps {
  onComplete: () => void;
  onBack: () => void;
  onLogout?: () => void;
}

interface RoleOption {
  id: TalentRole;
  label: string;
  description: string;
  icon: typeof Sparkles;
  gradient: string;
  borderColor: string;
}

const TALENT_ROLES: RoleOption[] = [
  {
    id: 'content_creator',
    label: 'Creador de Contenido',
    description: 'UGC, influencer, fotografo, streamer, podcaster',
    icon: Sparkles,
    gradient: 'from-pink-500 to-rose-500',
    borderColor: 'border-pink-500',
  },
  {
    id: 'editor',
    label: 'Editor / Post-Produccion',
    description: 'Video, motion graphics, colorista, sonido, animacion',
    icon: Video,
    gradient: 'from-purple-500 to-indigo-500',
    borderColor: 'border-purple-500',
  },
  {
    id: 'digital_strategist',
    label: 'Estratega Digital',
    description: 'SEO, SEM, trafficker, email marketing, growth',
    icon: BarChart3,
    gradient: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500',
  },
  {
    id: 'creative_strategist',
    label: 'Estratega Creativo',
    description: 'Contenido, social media, copywriting, diseno',
    icon: Lightbulb,
    gradient: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500',
  },
];

export function TalentSpecializationsStep({
  onComplete,
  onBack,
  onLogout,
}: TalentSpecializationsStepProps) {
  const { user } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<TalentRole[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleRole = useCallback((role: TalentRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      }
      if (prev.length >= 4) {
        toast.error('Maximo 4 roles');
        return prev;
      }
      return [...prev, role];
    });
  }, []);

  const handleContinue = async () => {
    if (selectedRoles.length === 0) {
      toast.error('Selecciona al menos un rol');
      return;
    }

    if (!user?.id) {
      toast.error('Error de autenticacion');
      return;
    }

    setSaving(true);
    try {
      // Guardar el primer rol seleccionado como active_role
      const primaryRole = selectedRoles[0];

      // Actualizar active_role en profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ active_role: primaryRole })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Guardar roles en user_roles (para usuarios sin organizacion)
      // Primero eliminar roles existentes
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      // Insertar nuevos roles
      const rolesToInsert = selectedRoles.map(role => ({
        user_id: user.id,
        role: role,
      }));

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(rolesToInsert);

      if (rolesError) {
        console.warn('Error saving to user_roles (may not exist):', rolesError);
        // No es critico si falla, el active_role ya se guardo
      }

      toast.success('Roles guardados');
      onComplete();
    } catch (err) {
      console.error('Error saving roles:', err);
      toast.error('Error al guardar roles');
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selectedRoles.length >= 1;

  return (
    <OnboardingShell currentStep={2} steps={TALENT_STEPS} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Que tipo de talento eres?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Selecciona tus areas de trabajo. Puedes elegir hasta 4.
          </p>

          {/* Counter */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-[0.125rem] bg-card border border-border">
            <span
              className={cn(
                'text-sm font-mono font-medium',
                selectedRoles.length === 0
                  ? 'text-muted-foreground'
                  : selectedRoles.length >= 4
                  ? 'text-amber-500'
                  : 'text-primary'
              )}
            >
              {selectedRoles.length}/4
            </span>
            <span className="text-sm text-muted-foreground">seleccionados</span>
          </div>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {TALENT_ROLES.map((role, index) => {
            const Icon = role.icon;
            const isSelected = selectedRoles.includes(role.id);

            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => toggleRole(role.id)}
                className={cn(
                  'group relative p-6 rounded-[0.125rem] border-2 transition-all duration-200 text-left',
                  'bg-card',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                  isSelected
                    ? `${role.borderColor}`
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-[0.125rem] flex items-center justify-center mb-4 transition-transform group-hover:scale-110',
                    isSelected
                      ? `bg-gradient-to-br ${role.gradient}`
                      : 'bg-secondary'
                  )}
                >
                  <Icon
                    className={cn('w-7 h-7', isSelected ? 'text-white' : 'text-muted-foreground')}
                  />
                </div>

                {/* Label */}
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {role.label}
                </h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className={cn('w-6 h-6', role.borderColor.replace('border-', 'text-'))} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Despues podras agregar especialidades especificas en tu perfil
        </motion.p>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex justify-center"
        >
          <button
            onClick={handleContinue}
            disabled={!canContinue || saving}
            className={cn(
              'flex items-center gap-2 px-8 py-3 rounded-[0.125rem] font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
              canContinue
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </motion.div>

        {/* Helper text */}
        {!canContinue && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Selecciona al menos 1 rol para continuar
          </p>
        )}
      </div>
    </OnboardingShell>
  );
}

export default TalentSpecializationsStep;
