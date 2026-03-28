import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Target, Heart, Sparkles, ShieldX, Briefcase, PenLine, MessageSquare } from 'lucide-react';
import type { ResearchVariables } from '../types/ad-generator.types';

interface ManualResearchPanelProps {
  values: ResearchVariables;
  onChange: (field: keyof ResearchVariables, value: string) => void;
  productDescription?: string;
}

const FIELDS = [
  {
    key: 'selectedAvatar' as const,
    label: 'Público objetivo',
    placeholder: 'Ej: Mujeres 25-45 años, profesionales, interesadas en skincare',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    key: 'selectedPain' as const,
    label: 'Dolor / Problema principal',
    placeholder: 'Ej: Piel seca y sin brillo por el estrés diario',
    icon: Heart,
    color: 'text-red-500',
  },
  {
    key: 'selectedDesire' as const,
    label: 'Deseo / Resultado deseado',
    placeholder: 'Ej: Piel hidratada, luminosa y de apariencia joven',
    icon: Sparkles,
    color: 'text-emerald-500',
  },
  {
    key: 'selectedAngleOrHook' as const,
    label: 'Hook / Ángulo del anuncio',
    placeholder: 'Ej: "¿Sabías que el 80% de las mujeres no hidratan correctamente?"',
    icon: Target,
    color: 'text-amber-500',
  },
  {
    key: 'selectedObjection' as const,
    label: 'Objeción a romper',
    placeholder: 'Ej: "Es muy caro" → Relación calidad-precio superior',
    icon: ShieldX,
    color: 'text-orange-500',
  },
  {
    key: 'selectedJTBD' as const,
    label: 'Job To Be Done',
    placeholder: 'Ej: Sentirme segura al salir sin maquillaje',
    icon: Briefcase,
    color: 'text-blue-500',
  },
] as const;

export function ManualResearchPanel({ values, onChange, productDescription }: ManualResearchPanelProps) {
  const hasAnyValue = FIELDS.some((f) => values[f.key]?.trim());

  return (
    <div className="rounded-sm border border-border/50 bg-muted/10 overflow-hidden">
      <div className="px-4 py-3 bg-muted/20 border-b border-border/30">
        <div className="flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Contexto del anuncio</span>
          <span className="text-[10px] text-muted-foreground">(opcional — mejora la calidad del resultado)</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Describe tu producto y audiencia para que la IA genere anuncios más relevantes y persuasivos.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Product context — quick description if not already in the product */}
        {!productDescription && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Descripción del producto
            </Label>
            <Textarea
              placeholder="Describe brevemente qué es tu producto, qué hace y para quién es..."
              value={values.selectedKeyMessage || ''}
              onChange={(e) => onChange('selectedKeyMessage', e.target.value)}
              rows={2}
              maxLength={300}
              className="text-xs resize-none"
            />
          </div>
        )}

        {/* Research fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Icon className={`h-3.5 w-3.5 ${field.color}`} />
                  {field.label}
                </Label>
                <Input
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="text-xs h-9"
                  maxLength={200}
                />
              </div>
            );
          })}
        </div>

        {hasAnyValue && (
          <p className="text-[10px] text-primary/70 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            La IA usará este contexto para personalizar el copy y el estilo visual del anuncio.
          </p>
        )}
      </div>
    </div>
  );
}
