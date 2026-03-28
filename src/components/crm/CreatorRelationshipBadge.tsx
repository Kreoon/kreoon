import { Heart, Ban, Users, MessageCircle, Handshake, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgCreatorWithStats, CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';

interface CreatorRelationshipBadgeProps {
  relationship: OrgCreatorWithStats;
  compact?: boolean;
  onClick?: (relationship: OrgCreatorWithStats) => void;
}

const TYPE_CONFIG: Record<CreatorRelationshipType, { icon: typeof Heart; color: string; bg: string }> = {
  favorite: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  blocked: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/15' },
  team_member: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  contacted: { icon: MessageCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  worked_with: { icon: Handshake, color: 'text-green-400', bg: 'bg-green-500/15' },
};

export function CreatorRelationshipBadge({
  relationship,
  compact = false,
  onClick,
}: CreatorRelationshipBadgeProps) {
  const type = relationship.relationship_type as CreatorRelationshipType;
  const config = type ? TYPE_CONFIG[type] : TYPE_CONFIG.contacted;
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        onClick={() => onClick?.(relationship)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer',
          'transition-all hover:scale-105',
          config.bg,
          config.color,
        )}
        title={type ? CREATOR_RELATIONSHIP_TYPE_LABELS[type] : ''}
      >
        <Icon className="h-3 w-3" />
        {type && CREATOR_RELATIONSHIP_TYPE_LABELS[type]}
      </span>
    );
  }

  return (
    <div
      onClick={() => onClick?.(relationship)}
      className={cn(
        'group rounded-sm overflow-hidden cursor-pointer',
        'transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]',
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Creator avatar */}
        {relationship.creator_avatar ? (
          <img
            src={relationship.creator_avatar}
            alt={relationship.creator_name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          >
            {relationship.creator_name
              ?.split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() ?? '?'}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{relationship.creator_name}</p>
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', config.bg, config.color)}>
              <Icon className="h-3 w-3" />
              {type && CREATOR_RELATIONSHIP_TYPE_LABELS[type]}
            </span>
          </div>
          {relationship.list_name && (
            <p className="text-[10px] text-white/40 mt-0.5">{relationship.list_name}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {relationship.times_worked_together > 0 && (
            <div className="text-center">
              <p className="text-sm font-bold text-white/80">{relationship.times_worked_together}</p>
              <p className="text-[9px] text-white/30 uppercase">Colabs</p>
            </div>
          )}
          {relationship.average_rating_given != null && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium text-white/70">
                {relationship.average_rating_given.toFixed(1)}
              </span>
            </div>
          )}
          {relationship.total_paid > 0 && (
            <div className="text-center">
              <p className="text-xs font-semibold text-green-400">
                ${Math.round(relationship.total_paid / 1000)}k
              </p>
              <p className="text-[9px] text-white/30 uppercase">Pagado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
