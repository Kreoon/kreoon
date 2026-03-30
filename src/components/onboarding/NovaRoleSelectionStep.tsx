/**
 * NovaRoleSelectionStep - Paso de seleccion de rol con Design System Nova
 *
 * Primer paso del onboarding obligatorio.
 * El usuario debe seleccionar si es Talento o Cliente antes de continuar.
 * Esto determina que documentos legales debe firmar.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Building2, ArrowRight, LogOut, CheckCircle2,
  Camera, Film, TrendingUp, Palette, Users, Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { AppRole } from '@/types/database';

interface NovaRoleSelectionStepProps {
  onComplete: (role: AppRole) => void;
  onLogout?: () => void;
}

type UserType = 'talent' | 'client';

interface TalentRoleOption {
  id: AppRole;
  label: string;
  description: string;
  icon: typeof Camera;
  color: string;
}

const TALENT_ROLES: TalentRoleOption[] = [
  {
    id: 'content_creator',
    label: 'Creador de Contenido',
    description: 'UGC, influencer, fotografo, streamer',
    icon: Camera,
    color: 'text-pink-500',
  },
  {
    id: 'editor',
    label: 'Editor / Post-Produccion',
    description: 'Video, motion graphics, audio',
    icon: Film,
    color: 'text-blue-500',
  },
  {
    id: 'digital_strategist',
    label: 'Estratega Digital',
    description: 'SEO, SEM, trafficker, growth',
    icon: TrendingUp,
    color: 'text-green-500',
  },
  {
    id: 'creative_strategist',
    label: 'Estratega Creativo',
    description: 'Content strategy, copywriting',
    icon: Palette,
    color: 'text-orange-500',
  },
  {
    id: 'community_manager',
    label: 'Community Manager',
    description: 'Gestion de comunidades y redes',
    icon: Users,
    color: 'text-teal-500',
  },
];

const CLIENT_ROLES: TalentRoleOption[] = [
  {
    id: 'client',
    label: 'Marca / Empresa',
    description: 'Busco contratar talento creativo',
    icon: Building2,
    color: 'text-amber-500',
  },
];

export function NovaRoleSelectionStep({ onComplete, onLogout }: NovaRoleSelectionStepProps) {
  const { user } = useAuth();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole || !user?.id) return;

    setSaving(true);
    try {
      // Guardar el rol en el perfil
      const { error } = await supabase
        .from('profiles')
        .update({ active_role: selectedRole })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Rol seleccionado correctamente');
      onComplete(selectedRole);
    } catch (err) {
      console.error('Error saving role:', err);
      toast.error('Error al guardar el rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#030308] relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-pink-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-100/80 dark:bg-[#030308]/80 border-b border-zinc-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-zinc-900 dark:text-white">KREOON</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Paso 1 de 3</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
            Bienvenido a KREOON
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Primero, cuentanos que tipo de usuario eres para personalizar tu experiencia
          </p>
        </motion.div>

        {/* Step 1: User Type Selection */}
        {!userType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto"
            role="radiogroup"
            aria-label="Selecciona tu tipo de usuario"
          >
            {/* Talent Option */}
            <button
              onClick={() => setUserType('talent')}
              aria-label="Seleccionar tipo de usuario: Talento - Creador, editor, estratega o profesional creativo"
              aria-pressed={false}
              className={cn(
                'group relative p-6 sm:p-8 rounded-sm border-2 transition-all duration-200',
                'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
                'border-zinc-200 dark:border-white/10',
                'hover:border-purple-500 dark:hover:border-purple-500/50',
                'hover:shadow-lg hover:shadow-purple-500/10',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#030308]'
              )}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-sm bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-purple-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                    Soy Talento
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Creador, editor, estratega o profesional creativo
                  </p>
                </div>
              </div>
            </button>

            {/* Client Option */}
            <button
              onClick={() => {
                setUserType('client');
                setSelectedRole('client');
              }}
              aria-label="Seleccionar tipo de usuario: Cliente o Marca - Busco contratar talento creativo"
              aria-pressed={false}
              className={cn(
                'group relative p-6 sm:p-8 rounded-sm border-2 transition-all duration-200',
                'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
                'border-zinc-200 dark:border-white/10',
                'hover:border-amber-500 dark:hover:border-amber-500/50',
                'hover:shadow-lg hover:shadow-amber-500/10',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-[#030308]'
              )}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-sm bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-amber-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                    Soy Cliente / Marca
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Busco contratar talento creativo
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        )}

        {/* Step 2: Role Selection (Talent) */}
        {userType === 'talent' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="mb-6">
              <button
                onClick={() => {
                  setUserType(null);
                  setSelectedRole(null);
                }}
                className="text-sm text-purple-500 hover:text-purple-400 transition-colors"
              >
                &larr; Cambiar tipo de usuario
              </button>
            </div>

            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Cual es tu rol principal?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Selecciona el rol que mejor describe tu trabajo. Podras agregar mas roles despues.
            </p>

            <div className="space-y-3" role="radiogroup" aria-label="Selecciona tu rol principal de talento">
              {TALENT_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;

                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    aria-label={`Seleccionar rol: ${role.label} - ${role.description}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-sm border-2 transition-all duration-200 text-left',
                      'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#030308]',
                      isSelected
                        ? 'border-purple-500 dark:border-purple-500/50 shadow-lg shadow-purple-500/10'
                        : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-sm flex items-center justify-center shrink-0',
                      isSelected ? 'bg-purple-500/20' : 'bg-zinc-100 dark:bg-white/5'
                    )}>
                      <Icon className={cn('w-6 h-6', isSelected ? 'text-purple-500' : role.color)} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-zinc-900 dark:text-white">
                        {role.label}
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                        {role.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 2: Client Confirmation */}
        {userType === 'client' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="mb-6">
              <button
                onClick={() => {
                  setUserType(null);
                  setSelectedRole(null);
                }}
                className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
              >
                &larr; Cambiar tipo de usuario
              </button>
            </div>

            <div className={cn(
              'p-6 rounded-sm border-2 border-amber-500 dark:border-amber-500/50',
              'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
              'shadow-lg shadow-amber-500/10'
            )}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-sm bg-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">
                    Cuenta de Cliente / Marca
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Acceso al marketplace para contratar talento
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-amber-500 ml-auto" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Como cliente tendras acceso a buscar y contratar creadores, gestionar campanas
                y revisar entregas de contenido.
              </p>
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        {selectedRole && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 sm:mt-12 flex justify-center"
          >
            <button
              onClick={handleContinue}
              disabled={saving}
              aria-label={saving ? 'Guardando seleccion de rol' : 'Continuar al siguiente paso'}
              className={cn(
                'flex items-center gap-2 px-8 py-3 rounded-sm font-medium transition-all duration-200',
                'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
                'hover:from-purple-500 hover:to-pink-400',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#030308]'
              )}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default NovaRoleSelectionStep;
