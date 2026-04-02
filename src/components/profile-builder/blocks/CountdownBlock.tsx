import { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';

interface CountdownConfig {
  targetDate: string;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  completedText: string;
  style: 'cards' | 'inline' | 'minimal';
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

function CountdownBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as CountdownConfig;
  const styles = block.styles;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(config.targetDate)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(config.targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [config.targetDate]);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const textAlignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (timeLeft.isExpired) {
    return (
      <div
        className={cn(
          paddingClasses[styles.padding || 'md'],
          textAlignClasses[styles.textAlign || 'center'],
          styles.margin === 'sm' && 'my-2',
          styles.margin === 'md' && 'my-4',
          styles.margin === 'lg' && 'my-6',
        )}
      >
        <p className="text-lg text-muted-foreground">
          {config.completedText || 'Oferta terminada'}
        </p>
      </div>
    );
  }

  const units = [
    { value: timeLeft.days, label: 'Dias', show: config.showDays ?? true },
    { value: timeLeft.hours, label: 'Horas', show: config.showHours ?? true },
    { value: timeLeft.minutes, label: 'Min', show: config.showMinutes ?? true },
    { value: timeLeft.seconds, label: 'Seg', show: config.showSeconds ?? true },
  ].filter((u) => u.show);

  // Cards style
  if (config.style === 'cards') {
    return (
      <div
        className={cn(
          paddingClasses[styles.padding || 'md'],
          textAlignClasses[styles.textAlign || 'center'],
          styles.margin === 'sm' && 'my-2',
          styles.margin === 'md' && 'my-4',
          styles.margin === 'lg' && 'my-6',
          isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
        )}
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <div className="flex justify-center gap-3 md:gap-4">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="flex flex-col items-center p-3 md:p-4 rounded-lg bg-muted/50 min-w-[70px] md:min-w-[80px]"
            >
              <span className="text-2xl md:text-4xl font-bold tabular-nums text-foreground">
                {String(unit.value).padStart(2, '0')}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Inline style
  if (config.style === 'inline') {
    return (
      <div
        className={cn(
          paddingClasses[styles.padding || 'md'],
          textAlignClasses[styles.textAlign || 'center'],
          styles.margin === 'sm' && 'my-2',
          styles.margin === 'md' && 'my-4',
          styles.margin === 'lg' && 'my-6',
          isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
        )}
        style={{ backgroundColor: styles.backgroundColor }}
      >
        <p className="text-2xl md:text-3xl font-mono font-bold text-foreground">
          {units.map((unit, i) => (
            <span key={unit.label}>
              {String(unit.value).padStart(2, '0')}
              {i < units.length - 1 && <span className="text-muted-foreground mx-1">:</span>}
            </span>
          ))}
        </p>
      </div>
    );
  }

  // Minimal style (default)
  return (
    <div
      className={cn(
        paddingClasses[styles.padding || 'md'],
        textAlignClasses[styles.textAlign || 'center'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-6',
        isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
      )}
      style={{ backgroundColor: styles.backgroundColor }}
    >
      <div className="flex justify-center items-baseline gap-2 flex-wrap">
        {units.map((unit, i) => (
          <span key={unit.label} className="inline-flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-bold text-foreground">
              {unit.value}
            </span>
            <span className="text-sm text-muted-foreground">{unit.label}</span>
            {i < units.length - 1 && (
              <span className="text-muted-foreground/50 mx-1">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export const CountdownBlock = memo(CountdownBlockComponent);
