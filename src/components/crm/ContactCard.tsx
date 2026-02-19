import { Mail, Phone, Building2, MoreVertical, Edit, Trash2, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OrgContact } from '@/types/crm.types';
import {
  CONTACT_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
  RELATIONSHIP_STRENGTH_COLORS,
} from '@/types/crm.types';

interface ContactCardProps {
  contact: OrgContact;
  onEdit?: (contact: OrgContact) => void;
  onDelete?: (contactId: string) => void;
  onClick?: (contact: OrgContact) => void;
}

const STRENGTH_DOTS: Record<string, string> = {
  cold: 'bg-blue-400',
  warm: 'bg-yellow-400',
  hot: 'bg-red-400',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ContactCard({ contact, onEdit, onDelete, onClick }: ContactCardProps) {
  return (
    <div
      onClick={() => onClick?.(contact)}
      className={cn(
        'group relative rounded-xl overflow-hidden cursor-pointer',
        'transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
        'hover:border-[rgba(168,85,247,0.5)]',
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {contact.avatar_url ? (
              <img
                src={contact.avatar_url}
                alt={contact.full_name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10"
              />
            ) : (
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                {getInitials(contact.full_name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
              {contact.company && (
                <p className="text-xs text-white/50 truncate flex items-center gap-1">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  {contact.company}
                  {contact.position && <span className="text-white/30">- {contact.position}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Strength indicator + Menu */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {contact.relationship_strength && (
              <div className="flex items-center gap-1" title={RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength]}>
                <span className={cn('w-2 h-2 rounded-full', STRENGTH_DOTS[contact.relationship_strength])} />
                <span className="text-[10px] text-white/40">
                  {RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength]}
                </span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/30 hover:bg-black/50 text-white"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 bg-popover border-[#8b5cf6]/30"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => onEdit?.(contact)}
                  className="gap-2 text-[#f8fafc] focus:bg-white/10"
                >
                  <Edit className="h-4 w-4 text-[#a855f7]" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => onDelete?.(contact.id)}
                  className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {contact.contact_type && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300">
              {CONTACT_TYPE_LABELS[contact.contact_type]}
            </span>
          )}
          {contact.pipeline_stage && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70">
              {contact.pipeline_stage}
            </span>
          )}
          {contact.tags?.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Deal value */}
        {contact.deal_value != null && contact.deal_value > 0 && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-green-400" />
            <span className="text-sm font-semibold text-green-400">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(contact.deal_value)}
            </span>
            {contact.expected_close_date && (
              <span className="text-[10px] text-white/30 ml-auto">
                Cierre: {contact.expected_close_date}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2 -mx-4 -mb-4 px-4 py-2"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <span className="text-[10px] text-white/30">
            {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true, locale: es })}
          </span>
          <div className="flex items-center gap-2">
            {contact.email && (
              <Mail className="h-3 w-3 text-white/20 hover:text-white/50 transition-colors cursor-pointer" />
            )}
            {contact.phone && (
              <Phone className="h-3 w-3 text-white/20 hover:text-white/50 transition-colors cursor-pointer" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
