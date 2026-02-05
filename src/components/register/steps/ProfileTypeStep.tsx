import { motion } from 'framer-motion';
import { Building2, Store, Users, Video, Scissors, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps, OrganizationType, UserRolePrimary } from '../types';
import { Button } from '@/components/ui/button';

interface ProfileOption {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const orgTypes: ProfileOption[] = [
  {
    id: 'agency',
    icon: Building2,
    title: 'Agencia',
    description: 'Gestiono creadores y campañas para clientes'
  },
  {
    id: 'community',
    icon: Users,
    title: 'Comunidad',
    description: 'Gestiono una comunidad de creadores'
  }
];

const userRoles: ProfileOption[] = [
  {
    id: 'creator',
    icon: Video,
    title: 'Creador',
    description: 'Creo contenido de video y UGC'
  },
  {
    id: 'editor',
    icon: Scissors,
    title: 'Editor',
    description: 'Edito videos profesionalmente'
  },
  {
    id: 'both',
    icon: Sparkles,
    title: 'Ambos',
    description: 'Creo y edito contenido'
  }
];

export function ProfileTypeStep({ data, updateData, onNext, onBack }: StepProps) {
  const isOrgFlow = data.registrationMode === 'create_org';
  const options = isOrgFlow ? orgTypes : userRoles;

  const handleSelect = (id: string) => {
    if (isOrgFlow) {
      updateData({ organizationType: id as OrganizationType });
    } else {
      updateData({ userRolePrimary: id as UserRolePrimary });
    }
    onNext();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-8 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Atrás
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {isOrgFlow ? (
            <>¿Qué tipo de <span className="text-gradient-violet">organización</span> eres?</>
          ) : (
            <>¿Cómo quieres usar <span className="text-gradient-violet">KREOON</span>?</>
          )}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isOrgFlow 
            ? 'Esto nos ayuda a personalizar tu experiencia'
            : 'Selecciona tu rol principal'
          }
        </p>
      </motion.div>

      <div className="grid gap-4">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(option.id)}
            className={cn(
              'p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm',
              'hover:border-primary/50 hover:bg-card transition-all duration-300',
              'group cursor-pointer text-left flex items-center gap-5',
              'hover:shadow-[0_0_30px_hsl(var(--primary)_/_0.1)]'
            )}
          >
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
              'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
              'transition-all duration-300'
            )}>
              <option.icon className="w-7 h-7" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">
                {option.title}
              </h3>
              <p className="text-muted-foreground">
                {option.description}
              </p>
            </div>

            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
