import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_INDUSTRIES } from '../types';
import type { StepComponentProps } from '../types';

export function BrandProfileStep({ data, onChange, onNext, onBack, mode }: StepComponentProps) {
  const [error, setError] = useState('');
  const isCompact = mode === 'compact';

  const handleNext = () => {
    if (!data.brandIndustry) return setError('Selecciona una industria');
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
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <h2 className={cn('font-bold text-white mb-1', isCompact ? 'text-lg' : 'text-xl')}>
        Sobre tu marca
      </h2>
      <p className="text-sm text-gray-400 mb-5">Cuéntanos más sobre tu empresa para conectarte con el talento ideal</p>

      {/* Industry */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-300 mb-2">Industria</label>
        <div className="flex flex-wrap gap-2">
          {BRAND_INDUSTRIES.map(ind => {
            const selected = data.brandIndustry === ind;
            return (
              <button
                key={ind}
                onClick={() => onChange({ brandIndustry: ind })}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all',
                  selected
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20',
                )}
              >
                {selected && <Check className="h-3 w-3" />}
                {ind}
              </button>
            );
          })}
        </div>
      </div>

      {/* Website (optional) */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-300 mb-1">
          Sitio web <span className="text-gray-500">(opcional)</span>
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="url"
            value={data.brandWebsite}
            onChange={e => onChange({ brandWebsite: e.target.value })}
            placeholder="https://mimarca.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 text-sm transition-colors"
      >
        Continuar
      </button>
    </motion.div>
  );
}
