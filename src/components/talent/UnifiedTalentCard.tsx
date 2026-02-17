import type { MouseEvent } from 'react';
import {
  User, Video, Star, Zap, Clock, TrendingUp, AlertTriangle,
  Crown, Shield, Sparkles, Heart, Ban, Users, MessageCircle, Handshake,
  DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { UnifiedTalentMember, TalentSource } from '@/types/unifiedTalent.types';
import type { CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';

interface UnifiedTalentCardProps {
  member: UnifiedTalentMember;
  onClick: () => void;
  onAmbassadorToggle?: (e: MouseEvent) => void;
  isAdmin?: boolean;
  isSelected?: boolean;
}

const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  team_leader: { label: 'Líder', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  strategist: { label: 'Estratega', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  trafficker: { label: 'Trafficker', className: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  creator: { label: 'Creador', className: 'bg-primary/10 text-primary border-primary/20' },
  editor: { label: 'Editor', className: 'bg-info/10 text-info border-info/20' },
  client: { label: 'Cliente', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

const LEVEL_STYLES: Record<string, { label: string; icon: typeof Shield; className: string }> = {
  junior: { label: 'Junior', icon: Shield, className: 'bg-muted text-muted-foreground' },
  pro: { label: 'Pro', icon: Zap, className: 'bg-blue-500/10 text-blue-500' },
  elite: { label: 'Elite', icon: Crown, className: 'bg-amber-500/10 text-amber-500' },
};

const SOURCE_STYLES: Record<TalentSource, { label: string; className: string }> = {
  internal: { label: 'Equipo', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  external: { label: 'Externo', className: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  both: { label: 'Equipo + CRM', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

const REL_ICONS: Record<CreatorRelationshipType, typeof Heart> = {
  favorite: Heart,
  blocked: Ban,
  team_member: Users,
  contacted: MessageCircle,
  worked_with: Handshake,
};

const REL_COLORS: Record<CreatorRelationshipType, string> = {
  favorite: 'bg-pink-500/15 text-pink-400',
  blocked: 'bg-red-500/15 text-red-400',
  team_member: 'bg-blue-500/15 text-blue-400',
  contacted: 'bg-yellow-500/15 text-yellow-400',
  worked_with: 'bg-green-500/15 text-green-400',
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function UnifiedTalentCard({ member, onClick, onAmbassadorToggle, isAdmin, isSelected }: UnifiedTalentCardProps) {
  const hasInternal = member.source !== 'external';
  const hasExternal = member.source !== 'internal';

  const level = (member.ai_recommended_level as keyof typeof LEVEL_STYLES) || 'junior';
  const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.junior;
  const LevelIcon = levelStyle.icon;

  const isAmbassador = member.is_ambassador && member.ambassador_level && member.ambassador_level !== 'none';
  const riskFlag = member.ai_risk_flag && member.ai_risk_flag !== 'none';

  const qualityScore = member.quality_score_avg || 0;
  const reliabilityScore = member.reliability_score || 0;
  const velocityScore = member.velocity_score || 0;
  const overallScore = Math.round(((qualityScore + reliabilityScore + velocityScore) / 30) * 100);

  return (
    <TooltipProvider>
      <div
        onClick={onClick}
        className={cn(
          'group rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden',
          isSelected && 'ring-2 ring-[#8b5cf6] border-[#8b5cf6]/50',
          isAmbassador
            ? 'border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_-3px_rgba(245,158,11,0.5)] hover:border-amber-500 bg-gradient-to-br from-card via-card to-amber-500/5'
            : riskFlag
            ? 'border-destructive/30 hover:border-destructive/50'
            : 'border-border hover:border-primary/20',
        )}
      >
        {/* Risk indicator */}
        {riskFlag && (
          <div className={cn('absolute top-2 right-2', member.ai_risk_flag === 'high' ? 'text-destructive' : 'text-warning')}>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>{member.ai_risk_flag === 'high' ? 'Alto riesgo' : 'Riesgo medio'}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.full_name} className="h-12 w-12 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border text-sm font-bold text-primary">
                {getInitials(member.full_name)}
              </div>
            )}
            {hasInternal && (
              <div className={cn('absolute -bottom-1 -right-1 rounded-full p-0.5', levelStyle.className)}>
                <LevelIcon className="h-3 w-3" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-card-foreground truncate text-sm">{member.full_name}</h3>
              {isAmbassador && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
            </div>
            <div className="flex flex-wrap gap-1">
              {/* Source badge */}
              <Badge variant="outline" className={cn('text-[10px] h-5', SOURCE_STYLES[member.source].className)}>
                {SOURCE_STYLES[member.source].label}
              </Badge>
              {/* Role badge (internal) */}
              {member.org_role && ROLE_STYLES[member.org_role] && (
                <Badge variant="outline" className={cn('text-[10px] h-5', ROLE_STYLES[member.org_role].className)}>
                  {ROLE_STYLES[member.org_role].label}
                </Badge>
              )}
              {/* Relationship badge (external) */}
              {hasExternal && member.relationship_type && (
                <Badge variant="outline" className={cn('text-[10px] h-5 gap-0.5', REL_COLORS[member.relationship_type])}>
                  {(() => { const I = REL_ICONS[member.relationship_type]; return <I className="h-2.5 w-2.5" />; })()}
                  {CREATOR_RELATIONSHIP_TYPE_LABELS[member.relationship_type]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Internal KPIs */}
        {hasInternal && (
          <div className="space-y-2 mb-3">
            {/* Star rating */}
            {member.avg_star_rating != null && member.avg_star_rating > 0 && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('h-3 w-3', s <= Math.round(member.avg_star_rating!) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')} />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">({member.avg_star_rating.toFixed(1)})</span>
              </div>
            )}

            {/* Performance bar */}
            {overallScore > 0 && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Performance</span>
                  <span className={cn('font-medium', overallScore >= 70 ? 'text-success' : overallScore >= 40 ? 'text-warning' : 'text-destructive')}>
                    {overallScore}%
                  </span>
                </div>
                <Progress value={overallScore} className="h-1" />
              </div>
            )}

            {/* UP Points */}
            {member.up_points > 0 && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <Zap className="h-3 w-3 text-primary" />
                <span className="font-bold text-primary">{member.up_points} UP</span>
                {member.up_level && (
                  <span className="text-muted-foreground">({member.up_level})</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* External CRM Stats */}
        {hasExternal && (member.times_worked_together > 0 || member.total_paid > 0) && (
          <div className="flex items-center gap-3 mb-3 text-[10px]">
            {member.times_worked_together > 0 && (
              <div className="flex items-center gap-1 text-white/60">
                <Handshake className="h-3 w-3" />
                <span>{member.times_worked_together} colabs</span>
              </div>
            )}
            {member.total_paid > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="h-3 w-3" />
                <span>${Math.round(member.total_paid / 1000)}k</span>
              </div>
            )}
            {member.average_rating_given != null && (
              <div className="flex items-center gap-0.5 text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                <span>{member.average_rating_given.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            {hasInternal && (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Video className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{member.content_count}</span>
                </div>
                {member.active_tasks > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-info">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{member.active_tasks}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Tareas activas</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
            {/* Marketplace categories */}
            {member.categories && member.categories.length > 0 && (
              <span className="text-[10px] text-white/40 truncate max-w-[120px]">
                {member.categories.slice(0, 2).join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && onAmbassadorToggle && hasInternal && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => { e.stopPropagation(); onAmbassadorToggle(e); }}
                    className={cn(
                      'flex items-center justify-center h-6 w-6 rounded-md border transition-all cursor-pointer',
                      member.is_ambassador
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-muted/50 border-border hover:border-amber-500/50 hover:bg-amber-500/10',
                    )}
                  >
                    <Star className={cn('h-3 w-3', member.is_ambassador && 'fill-current')} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{member.is_ambassador ? 'Quitar embajador' : 'Hacer embajador'}</TooltipContent>
              </Tooltip>
            )}
            {hasInternal && level === 'elite' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>Recomendado por IA</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
