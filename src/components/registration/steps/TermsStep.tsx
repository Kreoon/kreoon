import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Rocket, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES } from '@/components/marketplace/types/marketplace';
import type { StepComponentProps } from '../types';

interface TermsStepProps extends StepComponentProps {
  onSubmit: () => Promise<boolean>;
  submitting: boolean;
}

const INTENT_COLORS: Record<string, string> = {
  talent: 'bg-purple-600 hover:bg-purple-700',
  brand: 'bg-emerald-600 hover:bg-emerald-700',
  organization: 'bg-amber-600 hover:bg-amber-700',
  join: 'bg-blue-600 hover:bg-blue-700',
};

export function TermsStep({ data, onChange, onBack, onSubmit, submitting, mode }: TermsStepProps) {
  const [error, setError] = useState('');
  const isCompact = mode === 'compact';
  const btnColor = INTENT_COLORS[data.intent || 'talent'];

  const handleSubmit = async () => {
    if (!data.locationCountry) return setError('Selecciona tu país');
    if (!data.acceptTerms) return setError('Debes aceptar los términos');
    setError('');
    await onSubmit();
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
        Últimos detalles
      </h2>
      <p className="text-sm text-muted-foreground mb-5">Casi listo para crear tu cuenta</p>

      {/* Country */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">País</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            value={data.locationCountry}
            onChange={e => onChange({ locationCountry: e.target.value })}
            className="w-full appearance-none rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-card text-white">
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bio (optional) */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">
          Bio corta <span className="text-gray-500">(opcional)</span>
        </label>
        <textarea
          value={data.bio}
          onChange={e => onChange({ bio: e.target.value })}
          placeholder="Cuéntanos un poco sobre ti..."
          rows={2}
          maxLength={200}
          className="w-full rounded-sm border border-border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
        />
        <p className="text-right text-[10px] text-gray-500 mt-0.5">{data.bio.length}/200</p>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={data.acceptTerms}
          onChange={e => onChange({ acceptTerms: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/30"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          Acepto los{' '}
          <a href="/terms" target="_blank" className="text-purple-400 hover:underline">Términos de Servicio</a>
          {' '}y la{' '}
          <a href="/privacy" target="_blank" className="text-purple-400 hover:underline">Política de Privacidad</a>
          {' '}de KREOON
        </span>
      </label>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-sm text-white font-medium py-3 text-sm transition-colors disabled:opacity-50',
          btnColor,
        )}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Crear cuenta
            <Rocket className="h-4 w-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}
