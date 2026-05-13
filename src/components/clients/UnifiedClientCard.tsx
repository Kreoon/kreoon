import { useState } from 'react';
import { Building2, Contact, Crown, Video, Users as UsersIcon, Briefcase, DollarSign, Link2, Unlink, Globe, Tag, MapPin, Phone, Instagram, Facebook, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnlinkBrand } from '@/hooks/useBrandOrgLinks';
import type { UnifiedClientEntity } from '@/types/unifiedClient.types';
import { CONTACT_TYPE_LABELS, RELATIONSHIP_STRENGTH_LABELS, RELATIONSHIP_STRENGTH_COLORS } from '@/types/crm.types';
import { ClientActivityStatusBadge } from '@/components/clients/ClientActivityStatusBadge';
import type { ClientActivityMetrics } from '@/types/clientActivity.types';

interface UnifiedClientCardProps {
  entity: UnifiedClientEntity;
  onClick: () => void;
  isSelected?: boolean;
  canEdit?: boolean;
  onUpdate?: () => void;
  orgId?: string;
  onLinkBrand?: (clientId: string) => void;
  activityMetrics?: ClientActivityMetrics;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function UnifiedClientCard({ entity, onClick, isSelected, canEdit, onUpdate, orgId, onLinkBrand, activityMetrics }: UnifiedClientCardProps) {
  const isEmpresa = entity.entity_type === 'empresa';
  const [toggling, setToggling] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { mutate: unlinkBrand, isPending: unlinking } = useUnlinkBrand();

  // Una empresa es "vinculada" si tiene brand_id pero NO organization_id directo
  // (viene del UNION de brands_organization_links en get_unified_clients)
  const isLinkedBrand = isEmpresa && !!entity.brand_id;

  const handleUnlink = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlinkConfirmOpen(true);
  };

  const confirmUnlink = () => {
    if (!entity.brand_id || !orgId) return;
    unlinkBrand(
      { brandId: entity.brand_id, orgId },
      { onSuccess: () => { onUpdate?.(); setUnlinkConfirmOpen(false); } },
    );
  };

  const handleToggleInternalBrand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_internal_brand: !entity.is_internal_brand })
        .eq('id', entity.id);
      if (error) throw error;
      toast({
        title: entity.is_internal_brand ? 'Marca interna desactivada' : 'Marca interna activada',
        description: entity.name,
      });
      onUpdate?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
    <div
      onClick={onClick}
      className={cn(
        'group rounded-sm border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden',
        isSelected && 'ring-2 ring-[#8b5cf6] border-[#8b5cf6]/50',
        isLinkedBrand
          ? 'border-primary/30 hover:border-primary/60 bg-gradient-to-br from-card to-primary/5'
          : isEmpresa
            ? 'border-border hover:border-blue-500/30'
            : 'border-border hover:border-purple-500/30',
      )}
    >
      {/* Franja lateral para tarjetas vinculadas */}
      {isLinkedBrand && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-purple-400 to-blue-400 rounded-l-sm" />
      )}

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
            <img
              src={entity.avatar_url}
              alt={entity.name}
              className={cn(
                'h-11 w-11 object-cover ring-1',
                isLinkedBrand
                  ? 'rounded-full ring-primary/40'
                  : 'rounded-sm ring-border',
              )}
            />
          ) : (
            <div className={cn(
              'h-11 w-11 flex items-center justify-center ring-1',
              isLinkedBrand
                ? 'rounded-full bg-primary/15 ring-primary/30'
                : 'rounded-sm bg-blue-500/10 ring-border',
            )}>
              <Building2 className={cn('h-5 w-5', isLinkedBrand ? 'text-primary' : 'text-blue-400')} />
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

          {/* Slug de la brand vinculada */}
          {isLinkedBrand && entity.brand_slug && (
            <p className="text-[11px] text-primary/70 truncate mt-0.5">@{entity.brand_slug}</p>
          )}

          <div className="flex flex-wrap gap-1 mt-1">
            {/* Brand vinculada badge — solo si es linked */}
            {isLinkedBrand ? (
              <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/30 flex items-center gap-0.5">
                <Link2 className="h-2.5 w-2.5" />
                Brand vinculada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20">
                Empresa
              </Badge>
            )}

            {/* Industria de la brand */}
            {isLinkedBrand && entity.brand_industry && (
              <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/60 border-white/10 flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" />
                {entity.brand_industry}
              </Badge>
            )}

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

            {/* Categoría */}
            {isEmpresa && entity.category && (
              <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/60 border-white/10">
                {entity.category}
              </Badge>
            )}

            {/* Internal brand */}
            {isEmpresa && !isLinkedBrand && entity.is_internal_brand && (
              <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                Marca interna
              </Badge>
            )}

            {/* Estado de actividad — solo empresas reales (no marcas internas) */}
            {isEmpresa && !entity.is_internal_brand && activityMetrics && (
              <ClientActivityStatusBadge metrics={activityMetrics} size="sm" showDetail />
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo: datos de empresa */}
      {isEmpresa ? (
        <div className="space-y-1.5 mb-2">
          {/* Descripción */}
          {(entity.bio || entity.brand_description) && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {entity.bio || entity.brand_description}
            </p>
          )}

          {/* Contacto principal + teléfono */}
          {entity.main_contact && (
            <p className="text-xs text-white/60 flex items-center gap-1 truncate">
              <Contact className="h-3 w-3 flex-shrink-0" />
              {entity.main_contact}
            </p>
          )}

          {/* Email */}
          {entity.email && (
            <p className="text-xs text-muted-foreground truncate">{entity.email}</p>
          )}

          {/* Teléfono */}
          {entity.phone && (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {entity.phone}
            </p>
          )}

          {/* Ubicación */}
          {(entity.city || entity.country) && (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {[entity.city, entity.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Web + redes sociales */}
          {(entity.website || entity.brand_website || entity.instagram || entity.tiktok || entity.facebook || entity.linkedin) && (
            <div className="flex items-center gap-2 pt-0.5">
              {(entity.website || entity.brand_website) && (
                <a
                  href={entity.website || entity.brand_website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Sitio web"
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
              )}
              {entity.instagram && (
                <a
                  href={`https://instagram.com/${entity.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-pink-400 transition-colors"
                  title={entity.instagram}
                >
                  <Instagram className="h-3.5 w-3.5" />
                </a>
              )}
              {entity.tiktok && (
                <a
                  href={`https://tiktok.com/${entity.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-white transition-colors"
                  title={entity.tiktok}
                >
                  {/* TikTok no tiene ícono en lucide, uso texto pequeño */}
                  <span className="text-[10px] font-bold leading-none">TT</span>
                </a>
              )}
              {entity.facebook && (
                <a
                  href={`https://facebook.com/${entity.facebook.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-blue-400 transition-colors"
                  title={entity.facebook}
                >
                  <Facebook className="h-3.5 w-3.5" />
                </a>
              )}
              {entity.linkedin && (
                <a
                  href={`https://linkedin.com/company/${entity.linkedin.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-blue-500 transition-colors"
                  title={entity.linkedin}
                >
                  <Linkedin className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
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
            {canEdit && isLinkedBrand && orgId && (
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                title="Desvincular brand"
              >
                <Unlink className="h-3 w-3" />
                Desvincular
              </button>
            )}
            {canEdit && !isLinkedBrand && onLinkBrand && (
              <button
                onClick={(e) => { e.stopPropagation(); onLinkBrand(entity.id); }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                title="Vincular con brand"
              >
                <Link2 className="h-3 w-3" />
                Vincular Brand
              </button>
            )}
            {canEdit && !isLinkedBrand && (
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={handleToggleInternalBrand}
                title={entity.is_internal_brand ? 'Desmarcar como marca interna' : 'Marcar como marca interna'}
              >
                <Checkbox
                  checked={entity.is_internal_brand}
                  disabled={toggling}
                  className={cn(
                    'h-3.5 w-3.5 border-amber-500/50',
                    entity.is_internal_brand && 'bg-amber-500 border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500',
                  )}
                  tabIndex={-1}
                />
                <span className={cn(
                  'text-[10px] select-none',
                  entity.is_internal_brand ? 'text-amber-400' : 'text-muted-foreground',
                )}>
                  Marca interna
                </span>
              </div>
            )}
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

    <AlertDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desvincular brand?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{entity.name}</strong> dejará de aparecer en la lista de clientes de esta organización.
            La brand y su información continuarán existiendo de forma independiente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmUnlink}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Desvincular
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
