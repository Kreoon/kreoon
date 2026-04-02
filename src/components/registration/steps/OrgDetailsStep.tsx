import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Users, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_OPTIONS } from '../types';
import type { StepComponentProps } from '../types';

const ORG_TYPES = [
  { id: 'agency' as const, label: 'Agencia', description: 'Gestión de talento y campañas', icon: Building2 },
  { id: 'community' as const, label: 'Comunidad', description: 'Grupo de creadores y profesionales', icon: Users },
];

export function OrgDetailsStep({ data, onChange, onNext, onBack, mode }: StepComponentProps) {
  const [error, setError] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const isCompact = mode === 'compact';

  // Auto-generate slug from org name
  useEffect(() => {
    if (data.orgName) {
      const slug = data.orgName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      onChange({ orgSlug: slug });
    }
  }, [data.orgName]);

  // Check slug availability
  useEffect(() => {
    if (!data.orgSlug || data.orgSlug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', data.orgSlug)
          .maybeSingle();
        setSlugAvailable(!existing);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data.orgSlug]);

  const handleNext = () => {
    if (!data.orgSubType) return setError('Selecciona el tipo de organización');
    if (!data.orgName.trim()) return setError('Ingresa el nombre');
    if (!data.orgSlug.trim() || data.orgSlug.length < 3) return setError('URL debe tener al menos 3 caracteres');
    if (slugAvailable === false) return setError('Esta URL ya está en uso');
    if (!data.selectedPlan) return setError('Selecciona un plan');
    setError('');
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <h2 className={cn('font-bold text-white mb-1', isCompact ? 'text-lg' : 'text-xl')}>
        Detalles de tu organización
      </h2>
      <p className="text-sm text-muted-foreground mb-5">Configura tu espacio de trabajo</p>

      {/* Org type */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {ORG_TYPES.map(t => {
            const Icon = t.icon;
            const selected = data.orgSubType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange({ orgSubType: t.id })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-sm border p-3 text-xs transition-all',
                  selected
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-border bg-muted/20 text-muted-foreground hover:border-border',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{t.label}</span>
                <span className="text-[10px] text-gray-500">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">Nombre</label>
        <input
          type="text"
          value={data.orgName}
          onChange={e => onChange({ orgName: e.target.value })}
          placeholder="Mi Organización"
          className="w-full rounded-sm border border-border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {/* Slug */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">URL de tu organización</label>
        <div className="flex items-center rounded-sm border border-border bg-white/5 overflow-hidden">
          <span className="px-3 text-xs text-gray-500 border-r border-border">kreoon.com/org/</span>
          <input
            type="text"
            value={data.orgSlug}
            onChange={e => onChange({ orgSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="mi-org"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <div className="px-2">
            {checkingSlug && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
            {!checkingSlug && slugAvailable === true && <Check className="h-3.5 w-3.5 text-green-400" />}
            {!checkingSlug && slugAvailable === false && <span className="text-[10px] text-red-400">Ocupada</span>}
          </div>
        </div>
      </div>

      {/* Plan selection */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-2">Plan (30 días gratis)</label>
        <div className="space-y-2">
          {PLAN_OPTIONS.map(plan => {
            const selected = data.selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => onChange({ selectedPlan: plan.id })}
                className={cn(
                  'w-full text-left rounded-sm border p-3 transition-all',
                  selected
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-border bg-muted/20 hover:border-border',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-sm font-semibold', selected ? plan.color : 'text-white')}>
                    {plan.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                <div className="flex flex-wrap gap-x-3 mt-1.5">
                  {plan.features.map(f => (
                    <span key={f} className="text-[10px] text-gray-500">{f}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        className="w-full rounded-sm bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 text-sm transition-colors"
      >
        Continuar
      </button>
    </motion.div>
  );
}
