import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, MessageSquare, Coins, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepProps } from '../types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const rules = [
  {
    icon: MessageSquare,
    title: 'Contacto vía organización',
    description: 'Los creadores se contactan a través de su organización asignada'
  },
  {
    icon: Coins,
    title: 'Tokens para contacto directo',
    description: 'Usa tokens para contactar directamente a creadores destacados'
  },
  {
    icon: Shield,
    title: 'Protección del talento',
    description: 'Los creadores están protegidos contra spam y contactos no deseados'
  },
  {
    icon: Lock,
    title: 'Información privada',
    description: 'Los datos de contacto se comparten solo con autorización'
  }
];

export function TalentAccessStep({ data, updateData, onNext, onBack }: StepProps) {
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
        className="text-center mb-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Acceso al <span className="text-gradient-violet">Talento</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          En KREOON protegemos a nuestros creadores. Esto es lo que debes saber:
        </p>
      </motion.div>

      <div className="space-y-4 mb-8">
        {rules.map((rule, index) => {
          const Icon = rule.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-5 rounded-xl bg-card/50 border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{rule.title}</h3>
                <p className="text-sm text-muted-foreground">{rule.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-5 rounded-xl bg-primary/5 border border-primary/20 mb-8"
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={data.talentAccessAcknowledged}
            onCheckedChange={(checked) => 
              updateData({ talentAccessAcknowledged: checked === true })
            }
            className="mt-0.5"
          />
          <div>
            <span className="font-medium text-foreground">
              Entiendo cómo funciona el acceso al talento
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Me comprometo a respetar las reglas de contacto y protección de creadores
            </p>
          </div>
        </label>
      </motion.div>

      <Button
        onClick={onNext}
        disabled={!data.talentAccessAcknowledged}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        Continuar
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
