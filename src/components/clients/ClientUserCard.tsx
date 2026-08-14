import { Users, Building2, Phone, MapPin, MoreVertical, Tag, TagsIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ClientUser } from '@/types/unifiedClient.types';

interface ClientUserCardProps {
  user: ClientUser;
  onClick: () => void;
  isSelected?: boolean;
  /** Admin: abre el diálogo para marcar este usuario como lead */
  onMarkAsLead?: (user: ClientUser) => void;
  /** Admin: quita la marca de lead de este usuario */
  onUnmarkLead?: (user: ClientUser) => void;
}

export function ClientUserCard({ user, onClick, isSelected, onMarkAsLead, onUnmarkLead }: ClientUserCardProps) {
  const showLeadMenu = !!(onMarkAsLead || (user.es_lead && onUnmarkLead));

  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-sm border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden',
        isSelected
          ? 'ring-2 ring-[#8b5cf6] border-[#8b5cf6]/50'
          : 'border-border hover:border-emerald-500/30',
      )}
    >
      {/* Menú de acciones (marcar/quitar lead) */}
      {showLeadMenu && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={e => e.stopPropagation()}
                className="h-6 w-6 rounded-sm flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                aria-label={`Más acciones para ${user.full_name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              {user.es_lead ? (
                onUnmarkLead && (
                  <DropdownMenuItem onClick={() => onUnmarkLead(user)}>
                    <TagsIcon className="h-4 w-4 mr-2" />
                    Quitar marca de lead
                  </DropdownMenuItem>
                )
              ) : (
                onMarkAsLead && (
                  <DropdownMenuItem onClick={() => onMarkAsLead(user)}>
                    <Tag className="h-4 w-4 mr-2" />
                    Marcar como lead
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name} className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-border">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
        )}

        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-card-foreground truncate text-sm">{user.full_name}</h3>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Usuario
          </Badge>
          {user.es_lead && (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
              Lead
            </Badge>
          )}
        </div>
      </div>

      {/* Linked companies */}
      <div className="flex flex-wrap gap-1 mb-2">
        {user.linked_companies.length > 0 ? (
          <>
            {user.linked_companies.slice(0, 2).map(c => (
              <span
                key={c.client_id}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400"
              >
                <Building2 className="h-2.5 w-2.5" />
                <span className="truncate max-w-[100px]">{c.client_name}</span>
              </span>
            ))}
            {user.linked_companies.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                +{user.linked_companies.length - 2}
              </span>
            )}
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
            Sin empresa vinculada
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
        {user.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {user.phone}
          </span>
        )}
        {user.city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {user.city}
          </span>
        )}
        {!user.phone && !user.city && (
          <span className="text-white/30">Sin datos de contacto</span>
        )}
      </div>
    </div>
  );
}
