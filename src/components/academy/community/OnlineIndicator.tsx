import { useSpacePresence } from '@/hooks/academy/useAcademyCommunityV3';

interface OnlineIndicatorProps {
  spaceId: string;
  showLabel?: boolean;
  className?: string;
}

export function OnlineIndicator({ spaceId, showLabel = true, className = '' }: OnlineIndicatorProps) {
  const { data: presence = [] } = useSpacePresence(spaceId);
  const count = presence.length;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-zinc-400 ${className}`}>
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      {showLabel && (
        <span>
          {count} {count === 1 ? 'en línea' : 'en línea'}
        </span>
      )}
    </div>
  );
}
