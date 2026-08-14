import { Contact, Mail, Phone, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UnifiedClientEntity } from '@/types/unifiedClient.types';
import { RELATIONSHIP_STRENGTH_LABELS, RELATIONSHIP_STRENGTH_COLORS } from '@/types/crm.types';

interface LeadCardProps {
  lead: UnifiedClientEntity;
  onClick: () => void;
  isSelected?: boolean;
}

/**
 * Tarjeta simple para la pestaña "Leads": cuentas que nunca compraron, pensada
 * para que el admin las tenga a mano de cara a remarketing.
 */
export function LeadCard({ lead, onClick, isSelected }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-sm border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden flex flex-col h-full',
        isSelected
          ? 'ring-2 ring-[#8b5cf6] border-[#8b5cf6]/50'
          : 'border-border hover:border-amber-500/30',
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        {lead.avatar_url ? (
          <img src={lead.avatar_url} alt={lead.name} className="h-11 w-11 rounded-full object-cover ring-1 ring-border flex-shrink-0" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-border flex-shrink-0">
            <Contact className="h-5 w-5 text-amber-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate text-sm">{lead.name}</h3>
          {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
        </div>

        {lead.relationship_strength && (
          <Badge variant="outline" className={cn('text-[10px] h-5 flex-shrink-0', RELATIONSHIP_STRENGTH_COLORS[lead.relationship_strength])}>
            {RELATIONSHIP_STRENGTH_LABELS[lead.relationship_strength]}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 mb-2 flex-1">
        {lead.email && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <Mail className="h-3 w-3 flex-shrink-0" />
            {lead.email}
          </p>
        )}
        {lead.phone && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <Phone className="h-3 w-3 flex-shrink-0" />
            {lead.phone}
          </p>
        )}
        {!lead.email && !lead.phone && (
          <p className="text-xs text-muted-foreground/50">Sin datos de contacto</p>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#c084fc] inline-flex items-center gap-0.5">
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
