/**
 * StreamTimer - Temporizador de transmisión en vivo
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Pause, Play } from 'lucide-react';

interface StreamTimerProps {
  startedAt?: string;
  isPaused?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-semibold',
  xl: 'text-3xl font-bold tabular-nums',
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function StreamTimer({
  startedAt,
  isPaused = false,
  size = 'md',
  showIcon = true,
  className,
}: StreamTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(startedAt).getTime();

    const updateElapsed = () => {
      if (!isPaused) {
        setElapsed(Date.now() - startTime);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isPaused]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        SIZE_CLASSES[size],
        isPaused && 'text-yellow-400',
        className
      )}
    >
      {showIcon && (
        isPaused ? (
          <Pause className="h-4 w-4" />
        ) : startedAt ? (
          <Clock className="h-4 w-4 animate-pulse text-red-400" />
        ) : (
          <Play className="h-4 w-4 text-gray-400" />
        )
      )}
      <span className={cn(size === 'xl' && 'font-mono')}>
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}

export default StreamTimer;
