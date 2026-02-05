import { motion } from 'framer-motion';
import { Building2, Users, Link2, Mail, User, Camera, Globe, Store, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps, RegistrationMode } from '../types';

interface AccessOption {
  id: RegistrationMode;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  subOptions?: { id: string; icon: React.ElementType; label: string }[];
}

const accessOptions: AccessOption[] = [
  {
    id: 'create_org',
    icon: Building2,
    title: 'Soy una Organización',
    description: 'Agencia o comunidad que gestiona equipos de trabajo',
    badge: '30 días gratis',
    subOptions: [
      { id: 'agency', icon: Users, label: 'Agencia' },
      { id: 'community', icon: Globe, label: 'Comunidad' },
    ]
  },
  {
    id: 'brand',
    icon: Store,
    title: 'Soy una Marca / Empresa',
    description: 'Busco creadores y editores para mi marca',
    subOptions: [
      { id: 'hire', icon: Briefcase, label: 'Contratar talento' },
      { id: 'content', icon: Camera, label: 'Crear contenido' },
    ]
  },
  {
    id: 'join_org',
    icon: Users,
    title: 'Unirme a una Organización',
    description: 'Ya tengo un enlace o código de invitación',
    subOptions: [
      { id: 'link', icon: Link2, label: 'Con enlace' },
      { id: 'code', icon: Mail, label: 'Con invitación' },
    ]
  },
  {
    id: 'individual',
    icon: User,
    title: 'Soy Creador / Editor',
    description: 'Portafolio personal y acceso a oportunidades',
    subOptions: [
      { id: 'portfolio', icon: Camera, label: 'Portafolio personal' },
      { id: 'social', icon: Globe, label: 'Red social' },
    ]
  }
];

export function AccessTypeStep({ data, updateData, onNext }: StepProps) {
  const handleSelect = (mode: RegistrationMode) => {
    updateData({ registrationMode: mode });
    onNext();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          ¿Cómo quieres usar{' '}
          <span className="text-gradient-violet">KREOON</span>?
        </h1>
        <p className="text-muted-foreground text-lg">
          Elige el camino que mejor describe tu situación
        </p>
      </motion.div>

      <div className="space-y-4">
        {accessOptions.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(option.id)}
            className={cn(
              'w-full p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm',
              'hover:border-primary/50 hover:bg-card transition-all duration-300',
              'group cursor-pointer text-left',
              'hover:shadow-[0_0_30px_hsl(var(--primary)_/_0.1)]'
            )}
          >
            <div className="flex items-start gap-5">
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
                'transition-all duration-300'
              )}>
                <option.icon className="w-7 h-7" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">
                    {option.title}
                  </h3>
                  {option.badge && (
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      {option.badge}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">
                  {option.description}
                </p>
                
                {option.subOptions && (
                  <div className="flex flex-wrap gap-2">
                    {option.subOptions.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 text-muted-foreground rounded-lg"
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        {sub.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-muted-foreground group-hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
