import { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface CountdownConfig {
  targetDate: string;
  title?: string;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  completedText: string;
  style: 'cards' | 'inline' | 'minimal';
  accentColor?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const difference = new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isExpired: false,
  };
}

const TEXT_ALIGN_CLASSES: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function CountdownBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as CountdownConfig;
  const styles = block.styles;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(config.targetDate),
  );

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(config.targetDate));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(config.targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [config.targetDate]);

  const containerClass = cn(
    TEXT_ALIGN_CLASSES[styles.textAlign || 'center'],
    isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
  );

  const blockStyle = getBlockStyleObject(styles);

  const units = [
    { value: timeLeft.days, label: 'Días', show: config.showDays ?? true },
    { value: timeLeft.hours, label: 'Horas', show: config.showHours ?? true },
    { value: timeLeft.minutes, label: 'Min', show: config.showMinutes ?? true },
    { value: timeLeft.seconds, label: 'Seg', show: config.showSeconds ?? true },
  ].filter((u) => u.show);

  const accentColor = config.accentColor || styles.backgroundColor;

  // Estado expirado
  if (timeLeft.isExpired) {
    return (
      <div className={containerClass} style={blockStyle}>
        {config.title && (
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-3">
            {config.title}
          </p>
        )}
        <p
          className="text-xl font-semibold"
          style={{ color: styles.textColor }}
        >
          {config.completedText || 'Oferta terminada'}
        </p>
      </div>
    );
  }

  // Estilo cards (principal — números grandes con tarjetas)
  if (!config.style || config.style === 'cards') {
    return (
      <div className={containerClass} style={blockStyle}>
        {config.title && (
          <p
            className="text-sm font-medium uppercase tracking-widest mb-5 opacity-70"
            style={{ color: styles.textColor }}
          >
            {config.title}
          </p>
        )}
        <div
          className={cn(
            'flex gap-3 md:gap-4',
            styles.textAlign === 'left'
              ? 'justify-start'
              : styles.textAlign === 'right'
                ? 'justify-end'
                : 'justify-center',
          )}
        >
          {units.map((unit, index) => (
            <div key={unit.label} className="flex items-center gap-3 md:gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-xl',
                    'min-w-[64px] md:min-w-[88px] h-[72px] md:h-[96px]',
                    'shadow-lg',
                    !accentColor && 'bg-zinc-800/80 dark:bg-zinc-800/80',
                  )}
                  style={accentColor ? { backgroundColor: accentColor } : undefined}
                >
                  <span
                    className={cn(
                      'text-3xl md:text-5xl font-extrabold tabular-nums leading-none',
                      !styles.textColor && 'text-foreground',
                    )}
                    style={styles.textColor ? { color: styles.textColor } : undefined}
                  >
                    {String(unit.value).padStart(2, '0')}
                  </span>
                </div>
                <span
                  className={cn(
                    'mt-2 text-[10px] md:text-xs uppercase tracking-widest font-medium',
                    !styles.textColor && 'text-muted-foreground',
                  )}
                  style={styles.textColor ? { color: styles.textColor, opacity: 0.65 } : undefined}
                >
                  {unit.label}
                </span>
              </div>
              {index < units.length - 1 && (
                <span
                  className={cn(
                    'text-2xl md:text-4xl font-bold mb-6 select-none',
                    !styles.textColor && 'text-muted-foreground/60',
                  )}
                  style={styles.textColor ? { color: styles.textColor, opacity: 0.4 } : undefined}
                  aria-hidden="true"
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Estilo inline (reloj monospace)
  if (config.style === 'inline') {
    return (
      <div className={containerClass} style={blockStyle}>
        {config.title && (
          <p
            className="text-sm font-medium uppercase tracking-widest mb-3 opacity-70"
            style={{ color: styles.textColor }}
          >
            {config.title}
          </p>
        )}
        <p
          className={cn(
            'text-3xl md:text-5xl font-mono font-bold tracking-tight',
            !styles.textColor && 'text-foreground',
          )}
          style={styles.textColor ? { color: styles.textColor } : undefined}
        >
          {units.map((unit, i) => (
            <span key={unit.label}>
              <span>{String(unit.value).padStart(2, '0')}</span>
              {i < units.length - 1 && (
                <span className="opacity-40 mx-1">:</span>
              )}
            </span>
          ))}
        </p>
        <p
          className={cn(
            'mt-1 text-xs uppercase tracking-widest opacity-50',
            !styles.textColor && 'text-muted-foreground',
          )}
          style={styles.textColor ? { color: styles.textColor } : undefined}
        >
          {units.map((u, i) => (
            <span key={u.label}>
              {u.label}
              {i < units.length - 1 && <span className="mx-2 opacity-40">·</span>}
            </span>
          ))}
        </p>
      </div>
    );
  }

  // Estilo minimal
  return (
    <div className={containerClass} style={blockStyle}>
      {config.title && (
        <p
          className="text-sm font-medium uppercase tracking-widest mb-3 opacity-70"
          style={{ color: styles.textColor }}
        >
          {config.title}
        </p>
      )}
      <div
        className={cn(
          'flex items-baseline gap-3 flex-wrap',
          styles.textAlign === 'left'
            ? 'justify-start'
            : styles.textAlign === 'right'
              ? 'justify-end'
              : 'justify-center',
        )}
      >
        {units.map((unit, i) => (
          <span key={unit.label} className="inline-flex items-baseline gap-1">
            <span
              className={cn(
                'text-2xl md:text-3xl font-bold tabular-nums',
                !styles.textColor && 'text-foreground',
              )}
              style={styles.textColor ? { color: styles.textColor } : undefined}
            >
              {String(unit.value).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'text-xs uppercase tracking-wider',
                !styles.textColor && 'text-muted-foreground',
              )}
              style={styles.textColor ? { color: styles.textColor, opacity: 0.6 } : undefined}
            >
              {unit.label}
            </span>
            {i < units.length - 1 && (
              <span
                className="text-muted-foreground/40 mx-1 text-lg"
                aria-hidden="true"
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export const CountdownBlock = memo(CountdownBlockComponent);
