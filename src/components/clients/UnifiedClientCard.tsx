import { Building2, Contact, Crown, Video, Users as UsersIcon, Briefcase, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UnifiedClientEntity } from '@/types/unifiedClient.types';
import { CONTACT_TYPE_LABELS, RELATIONSHIP_STRENGTH_LABELS, RELATIONSHIP_STRENGTH_COLORS } from '@/types/crm.types';

interface UnifiedClientCardProps {
  entity: UnifiedClientEntity;
  onClick: () => void;
  isSelected?: boolean;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function UnifiedClientCard({ entity, onClick, isSelected }: UnifiedClientCardProps) {
  const isEmpresa = entity.entity_type === 'empresa';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden',
        isSelected && 'ring-2 ring-[#8b5cf6] border-[#8b5cf6]/50',
        isEmpresa
          ? 'border-border hover:border-blue-500/30'
          : 'border-border hover:border-purple-500/30',
      )}
    >
      {/* VIP indicator */}
      {isEmpresa && entity.is_vip && (
        <div className="absolute top-2 right-2">
          <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar / Logo */}
        {isEmpresa ? (
          entity.avatar_url ? (
            <img src={entity.avatar_url} alt={entity.name} className="h-11 w-11 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <div className="h-11 w-11 rounded-lg bg-blue-500/10 flex items-center justify-center ring-1 ring-border">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
          )
        ) : (
          entity.avatar_url ? (
            <img src={entity.avatar_url} alt={entity.name} className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-purple-500/10 flex items-center justify-center ring-1 ring-border">
              <Contact className="h-5 w-5 text-purple-400" />
            </div>
          )
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate text-sm">{entity.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {/* Type badge */}
            <Badge variant="outline" className={cn(
              'text-[10px] h-5',
              isEmpresa ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            )}>
              {isEmpresa ? 'Empresa' : 'Contacto'}
            </Badge>

            {/* Contact type badge */}
            {!isEmpresa && entity.contact_type && (
              <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/60 border-white/10">
                {CONTACT_TYPE_LABELS[entity.contact_type]}
              </Badge>
            )}

            {/* Relationship strength */}
            {!isEmpresa && entity.relationship_strength && (
              <Badge variant="outline" className={cn('text-[10px] h-5', RELATIONSHIP_STRENGTH_COLORS[entity.relationship_strength])}>
                {RELATIONSHIP_STRENGTH_LABELS[entity.relationship_strength]}
              </Badge>
            )}

            {/* Internal brand */}
            {isEmpresa && entity.is_internal_brand && (
              <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                Marca interna
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Empresa info */}
      {isEmpresa && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
          {entity.email && (
            <span className="truncate max-w-[140px]">{entity.email}</span>
          )}
        </div>
      )}

      {/* Contact info */}
      {!isEmpresa && (
        <div className="space-y-1 mb-2">
          {entity.company && (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {entity.company}
              {entity.position && <span className="text-white/30">· {entity.position}</span>}
            </p>
          )}
          {entity.pipeline_stage && (
            <p className="text-xs text-white/40">
              Pipeline: <span className="text-white/60">{entity.pipeline_stage}</span>
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        {isEmpresa ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Video className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{entity.content_count}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{entity.active_projects}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <UsersIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{entity.users_count}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {entity.deal_value != null && entity.deal_value > 0 && (
                <div className="flex items-center gap-1 text-green-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{formatCurrency(entity.deal_value)}</span>
                </div>
              )}
            </div>
            {entity.tags && entity.tags.length > 0 && (
              <div className="flex gap-1">
                {entity.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#c084fc]">{tag}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
