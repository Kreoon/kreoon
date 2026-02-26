import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { FOMO_CONSEQUENCES } from '@/lib/unlock-access/constants';

export function FomoSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-red-500/5 border border-red-500/20"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Lo que perderas si no actuas</h3>
          <p className="text-xs text-red-300/70">Si no consigues las 3 llaves antes del 30 de abril</p>
        </div>
      </div>

      <ul className="space-y-3">
        {FOMO_CONSEQUENCES.map((consequence, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="flex items-start gap-3 text-sm text-white/70"
          >
            <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{consequence}</span>
          </motion.li>
        ))}
      </ul>

      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-xs text-red-300 text-center">
          No hay segunda oportunidad. Los beneficios de fundador son exclusivos para los primeros 500.
        </p>
      </div>
    </motion.div>
  );
}
