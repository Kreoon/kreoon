import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Users, Video, Zap, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps } from '../types';
import { Button } from '@/components/ui/button';

interface Plan {
  id: 'starter' | 'growth' | 'scale';
  name: string;
  description: string;
  price: string;
  users: string;
  features: string[];
  icon: React.ElementType;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfecto para comenzar',
    price: '$29',
    users: 'Hasta 5 usuarios',
    icon: Zap,
    features: [
      'Gestión de contenido',
      'Panel de creadores',
      'Chat interno',
      'Reportes básicos'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Para equipos en crecimiento',
    price: '$79',
    users: 'Hasta 15 usuarios',
    icon: Video,
    popular: true,
    features: [
      'Todo de Starter',
      'IA para guiones',
      'Clientes ilimitados',
      'Métricas avanzadas',
      'Integraciones'
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Para operaciones grandes',
    price: '$149',
    users: 'Usuarios ilimitados',
    icon: Crown,
    features: [
      'Todo de Growth',
      'Multi-organización',
      'API access',
      'Soporte prioritario',
      'Custom branding'
    ]
  }
];

export function PlanSelectionStep({ data, updateData, onNext, onBack }: StepProps) {
  const handleSelect = (planId: 'starter' | 'growth' | 'scale') => {
    updateData({ selectedPlan: planId });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
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
        className="text-center mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Elige tu <span className="text-gradient-violet">plan</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          Todos incluyen <span className="text-primary font-semibold">1 mes gratis</span>
        </p>
        <p className="text-muted-foreground/80 text-sm">
          Prueba completa. Sin tarjeta de crédito.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan, index) => {
          const isSelected = data.selectedPlan === plan.id;
          const Icon = plan.icon;

          return (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(plan.id)}
              className={cn(
                'relative p-6 rounded-2xl border text-left transition-all duration-300',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-[0_0_30px_hsl(var(--primary)_/_0.15)]' 
                  : 'border-border bg-card/50 hover:border-primary/40',
                plan.popular && 'ring-2 ring-primary/50'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  Más popular
                </span>
              )}

              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
              )}>
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">/mes</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Users className="w-4 h-4" />
                {plan.users}
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className={cn(
                      'w-4 h-4',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onNext}
          disabled={!data.selectedPlan}
          className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          Continuar con {data.selectedPlan ? plans.find(p => p.id === data.selectedPlan)?.name : 'plan'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
