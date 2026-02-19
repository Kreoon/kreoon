import { cn } from '@/lib/utils';
import type { AdPlatform } from '../../types/marketing.types';

const platformSvgs: Record<AdPlatform, { viewBox: string; path: string; color: string }> = {
  meta: {
    viewBox: '0 0 24 24',
    path: 'M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z',
    color: '#1877F2',
  },
  tiktok: {
    viewBox: '0 0 24 24',
    path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 00-.82-.05C6.21 8.96 3.5 11.67 3.5 15a6 6 0 006 6 6 6 0 006-5.96V9.75a8.19 8.19 0 004.09 1.09V7.39s-1.66.07-3-.7z',
    color: '#000000',
  },
  google: {
    viewBox: '0 0 24 24',
    path: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z',
    color: '#4285F4',
  },
};

interface AdPlatformIconProps {
  platform: AdPlatform;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  withBg?: boolean;
  className?: string;
}

const sizeMap = { xs: 'w-4 h-4', sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8' };
const bgSizeMap = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };

export function AdPlatformIcon({ platform, size = 'sm', withBg = false, className }: AdPlatformIconProps) {
  const config = platformSvgs[platform];
  if (!config) return null;

  const icon = (
    <svg
      viewBox={config.viewBox}
      className={cn(sizeMap[size], className)}
      fill={config.color}
    >
      <path d={config.path} />
    </svg>
  );

  if (withBg) {
    return (
      <div className={cn(
        bgSizeMap[size],
        'rounded-lg flex items-center justify-center',
        'bg-white/10 border border-white/5'
      )}>
        {icon}
      </div>
    );
  }

  return icon;
}
