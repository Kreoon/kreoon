import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── TabIntro ─────────────────────────────────────────────────────────────────
// Bloque grande que aparece arriba de cada tab. Explica qué se ve, qué significan
// los números y qué decisiones se pueden tomar. Lenguaje claro, sin tecnicismos.

interface TabIntroProps {
  emoji: string;
  title: string;
  /** Qué hace esta pestaña, en una frase corta */
  subtitle: string;
  /** Lista de bullets: qué se ve aquí, en lenguaje sencillo */
  bullets: string[];
  /** Color de acento */
  accent?: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red';
}

const ACCENTS: Record<NonNullable<TabIntroProps['accent']>, string> = {
  blue:   'from-blue-500/15 to-blue-600/5 border-blue-500/20',
  green:  'from-green-500/15 to-green-600/5 border-green-500/20',
  orange: 'from-orange-500/15 to-orange-600/5 border-orange-500/20',
  purple: 'from-purple-500/15 to-purple-600/5 border-purple-500/20',
  cyan:   'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20',
  red:    'from-red-500/15 to-red-600/5 border-red-500/20',
};

export function TabIntro({ emoji, title, subtitle, bullets, accent = 'blue' }: TabIntroProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`relative bg-gradient-to-br ${ACCENTS[accent]} border rounded-md p-4 md:p-5`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/30 hover:text-white/70 transition-colors"
        title="Ocultar guía"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0 leading-none">{emoji}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-bold text-white mb-1">{title}</h2>
          <p className="text-white/70 text-sm mb-2">{subtitle}</p>
          {bullets.length > 0 && (
            <ul className="space-y-0.5 mt-2">
              {bullets.map((b, i) => (
                <li key={i} className="text-white/60 text-xs flex items-start gap-1.5">
                  <span className="text-white/30 shrink-0 mt-0.5">›</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HelpTip ──────────────────────────────────────────────────────────────────
// Icono de pregunta que muestra explicación al hover/click.

interface HelpTipProps {
  text: string;
  className?: string;
}

export function HelpTip({ text, className = '' }: HelpTipProps) {
  return (
    <span className={`relative inline-flex items-center group ${className}`}>
      <HelpCircle className="w-3 h-3 text-white/40 hover:text-white/80 cursor-help transition-colors" />
      <span className="
        invisible group-hover:visible
        absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1
        w-56 p-2.5 rounded-md
        bg-[#0a0a0a] border border-white/15
        text-white text-xs font-normal leading-relaxed
        shadow-lg pointer-events-none
      ">
        {text}
      </span>
    </span>
  );
}

// ─── HealthBadge ──────────────────────────────────────────────────────────────
// Semáforo visual verde/amarillo/rojo con un mensaje corto que indica si algo
// "está bien o mal".

interface HealthBadgeProps {
  level: 'good' | 'warn' | 'bad' | 'neutral';
  label: string;
}

export function HealthBadge({ level, label }: HealthBadgeProps) {
  const styles = {
    good:    'bg-green-500/15 text-green-300 border-green-500/30',
    warn:    'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    bad:     'bg-red-500/15 text-red-300 border-red-500/30',
    neutral: 'bg-white/5 text-white/50 border-white/10',
  }[level];

  const dot = {
    good: 'bg-green-400',
    warn: 'bg-yellow-400',
    bad:  'bg-red-400',
    neutral: 'bg-white/40',
  }[level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
// Header con título grande, descripción y opcional HelpTip a la derecha.

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  helpText?: string;
  actions?: ReactNode;
}

export function SectionHeader({ icon, title, description, helpText, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {helpText && <HelpTip text={helpText} />}
          </div>
          {description && <p className="text-white/40 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
