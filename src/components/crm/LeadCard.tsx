import { useState } from 'react';
import { MoreVertical, Mail, Phone, Edit, Trash2, ArrowRight, Star, Zap, Award, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PlatformLeadSummary, LeadStage, ExperienceLevel } from '@/types/crm.types';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_SOURCE_LABELS,
  LEAD_TYPE_LABELS,
  TALENT_CATEGORY_LABELS,
  TALENT_CATEGORY_COLORS,
  SPECIFIC_ROLE_LABELS,
  type LeadSource,
  type SpecificRole,
} from '@/types/crm.types';

interface LeadCardProps {
  lead: PlatformLeadSummary;
  onEdit?: (lead: PlatformLeadSummary) => void;
  onStageChange?: (leadId: string, stage: LeadStage) => void;
  onDelete?: (leadId: string) => void;
  onClick?: (lead: PlatformLeadSummary) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

const STAGES: LeadStage[] = ['new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'lost'];

const EXPERIENCE_ICONS: Record<ExperienceLevel, { icon: typeof Star; label: string }> = {
  beginner: { icon: Star, label: 'Principiante' },
  intermediate: { icon: Zap, label: 'Intermedio' },
  advanced: { icon: Award, label: 'Avanzado' },
  expert: { icon: Crown, label: 'Experto' },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function LeadCard({
  lead,
  onEdit,
  onStageChange,
  onDelete,
  onClick,
  draggable,
  onDragStart,
}: LeadCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const experienceInfo = lead.experience_level ? EXPERIENCE_ICONS[lead.experience_level] : null;
  const ExperienceIcon = experienceInfo?.icon;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onClick?.(lead)}
      className={cn(
        'group relative rounded-xl overflow-hidden cursor-pointer',
        'transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
        'hover:border-[rgba(168,85,247,0.5)]',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header: Avatar + Name + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              }}
            >
              {getInitials(lead.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white truncate">
                  {lead.full_name || 'Sin nombre'}
                </p>
                {ExperienceIcon && (
                  <span title={experienceInfo!.label}>
                    <ExperienceIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                  </span>
                )}
              </div>
              {lead.email && (
                <p className="text-xs text-white/50 truncate flex items-center gap-1">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {lead.email}
                </p>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/30 hover:bg-black/50 text-white flex-shrink-0"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-popover border-[#8b5cf6]/30"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => onEdit?.(lead)}
                className="gap-2 text-[#f8fafc] focus:bg-white/10"
              >
                <Edit className="h-4 w-4 text-[#a855f7]" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-[#f8fafc] focus:bg-white/10">
                  <ArrowRight className="h-4 w-4 text-[#60a5fa]" />
                  Cambiar etapa
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-popover border-[#8b5cf6]/30">
                  {STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => onStageChange?.(lead.id, stage)}
                      className="gap-2 text-[#f8fafc] focus:bg-white/10"
                      disabled={lead.stage === stage}
                    >
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', LEAD_STAGE_COLORS[stage])}>
                        {LEAD_STAGE_LABELS[stage]}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => onDelete?.(lead.id)}
                className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', LEAD_STAGE_COLORS[lead.stage])}>
            {LEAD_STAGE_LABELS[lead.stage]}
          </span>
          {lead.lead_source && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70">
              {LEAD_SOURCE_LABELS[lead.lead_source as LeadSource] ?? lead.lead_source}
            </span>
          )}
          {lead.lead_type && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300">
              {LEAD_TYPE_LABELS[lead.lead_type]}
            </span>
          )}
        </div>

        {/* Category & Role Badges */}
        {(lead.talent_category || lead.specific_role) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {lead.talent_category && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                TALENT_CATEGORY_COLORS[lead.talent_category],
              )}>
                {TALENT_CATEGORY_LABELS[lead.talent_category]}
              </span>
            )}
            {lead.specific_role && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/8 text-white/60">
                {SPECIFIC_ROLE_LABELS[lead.specific_role as SpecificRole] ?? lead.specific_role}
              </span>
            )}
          </div>
        )}

        {/* Lead Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Score</span>
            <span className="text-xs font-bold text-white/80">{lead.lead_score}</span>
          </div>
          <Progress
            value={lead.lead_score}
            className="h-1.5 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-[#8b5cf6] [&>div]:to-[#ec4899]"
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2 -mx-4 -mb-4 px-4 py-2"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <span className="text-[10px] text-white/30">
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            {lead.interaction_count > 0 && (
              <span>{lead.interaction_count} interacciones</span>
            )}
            {lead.phone && <Phone className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}
