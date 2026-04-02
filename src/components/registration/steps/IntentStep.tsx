import { motion } from 'framer-motion';
import { Sparkles, Building2, Users, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegistrationIntent, WizardMode } from '../types';

interface IntentStepProps {
  onSelect: (intent: RegistrationIntent) => void;
  mode: WizardMode;
}

const INTENTS: Array<{
  id: RegistrationIntent;
  label: string;
  description: string;
  icon: typeof Sparkles;
  gradient: string;
  border: string;
  glow: string;
}> = [
  {
    id: 'talent',
    label: 'Soy Talento Creativo',
    description: 'Muestra tu trabajo, recibe propuestas y crece como profesional',
    icon: Sparkles,
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    border: 'border-purple-500/30 hover:border-purple-400/60',
    glow: 'group-hover:shadow-purple-500/20',
  },
  {
    id: 'brand',
    label: 'Busco Talento',
    description: 'Encuentra creadores verificados para tu marca o empresa',
    icon: Building2,
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30 hover:border-emerald-400/60',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    id: 'organization',
    label: 'Gestiono una Organización',
    description: 'Agencia o comunidad con equipo de trabajo',
    icon: Users,
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30 hover:border-amber-400/60',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    id: 'join',
    label: 'Unirme a una Organización',
    description: 'Ya tengo un enlace o código de invitación',
    icon: Link2,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30 hover:border-blue-400/60',
    glow: 'group-hover:shadow-blue-500/20',
  },
];

export function IntentStep({ onSelect, mode }: IntentStepProps) {
  const isCompact = mode === 'compact';

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className={cn('font-bold text-white', isCompact ? 'text-xl' : 'text-2xl md:text-3xl')}>
          ¿Cómo quieres usar KREOON?
        </h2>
        <p className="text-sm text-gray-400 mt-1">Selecciona la opción que mejor te describe</p>
      </motion.div>

      <div className={cn('grid gap-3', isCompact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
        {INTENTS.map((intent, i) => {
          const Icon = intent.icon;
          return (
            <motion.button
              key={intent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(intent.id)}
              className={cn(
                'group relative text-left rounded-sm border p-4 transition-all duration-200',
                'bg-gradient-to-br', intent.gradient,
                intent.border,
                'hover:shadow-lg', intent.glow,
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-white/5">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">{intent.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{intent.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
