import { Key } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralProgressRingProps {
  qualified: number;
  total?: number;
}

export function ReferralProgressRing({ qualified, total = 3 }: ReferralProgressRingProps) {
  const pct = Math.min(qualified / total, 1);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="hsl(270 100% 60% / 0.1)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="url(#gateGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="gateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(270, 100%, 60%)" />
              <stop offset="100%" stopColor="hsl(330, 100%, 60%)" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{qualified}/{total}</span>
          <span className="text-xs text-white/50 mt-0.5">llaves</span>
        </div>
      </div>

      {/* Key indicators */}
      <div className="flex gap-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              i < qualified
                ? 'bg-purple-500/20 border border-purple-500/40 shadow-[0_0_12px_-3px_hsl(270,100%,60%,0.4)]'
                : 'bg-white/5 border border-white/10'
            )}
          >
            <Key className={cn(
              'w-5 h-5 transition-colors',
              i < qualified ? 'text-purple-400' : 'text-white/20'
            )} />
          </div>
        ))}
      </div>
    </div>
  );
}
