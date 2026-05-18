import { useState, useEffect } from 'react';
import {
  Building2, Contact, Crown, Video, Users as UsersIcon, Briefcase,
  DollarSign, Globe, Tag, MapPin, Phone, Instagram, Facebook, Linkedin,
  Calendar, UserCog, Star, Mail, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedClientEntity } from '@/types/unifiedClient.types';
import { CONTACT_TYPE_LABELS, RELATIONSHIP_STRENGTH_LABELS, RELATIONSHIP_STRENGTH_COLORS } from '@/types/crm.types';
import { ClientActivityStatusBadge } from '@/components/clients/ClientActivityStatusBadge';
import type { ClientActivityMetrics } from '@/types/clientActivity.types';

interface AssignedStrategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_primary: boolean;
}

interface UnifiedClientCardProps {
  entity: UnifiedClientEntity;
  onClick: () => void;
  isSelected?: boolean;
  canEdit?: boolean;
  onUpdate?: () => void;
  orgId?: string;
  activityMetrics?: ClientActivityMetrics;
  onOpenStrategists?: (entity: UnifiedClientEntity) => void;
  onOpenUsers?: (entity: UnifiedClientEntity) => void;
  onOpenServices?: (entity: UnifiedClientEntity) => void;
  onOpenProjects?: (entity: UnifiedClientEntity) => void;
  onOpenVideos?: (entity: UnifiedClientEntity) => void;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function UnifiedClientCard({
  entity,
  onClick,
  isSelected,
  canEdit,
  onUpdate,
  orgId,
  activityMetrics,
  onOpenStrategists,
  onOpenUsers,
  onOpenServices,
  onOpenProjects,
  onOpenVideos,
}: UnifiedClientCardProps) {
  const isEmpresa = entity.entity_type === 'empresa';
  const [toggling, setToggling] = useState(false);
  const [strategists, setStrategists] = useState<AssignedStrategist[]>([]);
  const { toast } = useToast();

  void orgId;
  void onOpenServices;
  void onOpenProjects;
  void onOpenVideos;

  useEffect(() => {
    if (!isEmpresa) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('client_strategists')
        .select('strategist_id, is_primary')
        .eq('client_id', entity.id);

      if (error || cancelled || !data?.length) {
        if (!cancelled) setStrategists([]);
        return;
      }

      const ids = [...new Set(data.map(d => d.strategist_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);

      if (cancelled) return;

      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      const list = data
        .map(d => ({
          id: d.strategist_id,
          full_name: profileMap.get(d.strategist_id)?.full_name || 'Sin nombre',
          avatar_url: profileMap.get(d.strategist_id)?.avatar_url || null,
          is_primary: d.is_primary || false,
        }))
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

      setStrategists(list);
    }

    load();
    return () => { cancelled = true; };
  }, [entity.id, isEmpresa]);

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

  const createdDate = entity.created_at
    ? format(new Date(entity.created_at), "d MMM yyyy", { locale: es })
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-sm border bg-card p-4 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden flex flex-col h-full',
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

      {/* ── CABECERA: logo + nombre + etiquetas ── */}
      <div className="flex items-start gap-3 mb-3">
        {isEmpresa ? (
          entity.avatar_url ? (
            <img
              src={entity.avatar_url}
              alt={entity.name}
              className="h-12 w-12 object-cover ring-1 rounded-sm ring-border flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center ring-1 rounded-sm bg-blue-500/10 ring-border flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
          )
        ) : (
          entity.avatar_url ? (
            <img src={entity.avatar_url} alt={entity.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-border flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center ring-1 ring-border flex-shrink-0">
              <Contact className="h-5 w-5 text-purple-400" />
            </div>
          )
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate">{entity.name}</h3>

          <div className="flex flex-wrap gap-1 mt-1">
            {isEmpresa && (
              <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20">
                Empresa
              </Badge>
            )}

            {!isEmpresa && entity.contact_type && (
              <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/60 border-white/10">
                {CONTACT_TYPE_LABELS[entity.contact_type]}
              </Badge>
            )}

            {!isEmpresa && entity.relationship_strength && (
              <Badge variant="outline" className={cn('text-[10px] h-5', RELATIONSHIP_STRENGTH_COLORS[entity.relationship_strength])}>
                {RELATIONSHIP_STRENGTH_LABELS[entity.relationship_strength]}
              </Badge>
            )}

            {isEmpresa && entity.category && (
              <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/60 border-white/10">
                {entity.category}
              </Badge>
            )}

            {isEmpresa && entity.is_internal_brand && (
              <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                Marca propia
              </Badge>
            )}

            {isEmpresa && !entity.is_internal_brand && activityMetrics && (
              <ClientActivityStatusBadge metrics={activityMetrics} size="sm" showDetail />
            )}
          </div>
        </div>
      </div>

      {/* ── ESTADÍSTICAS (solo empresas) ── */}
      {isEmpresa && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {/* Proyectos — abre tab Campañas del cliente */}
          <div
            className="flex flex-col items-center p-2.5 rounded-sm bg-muted/40 border border-border/50 cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
            onClick={e => { e.stopPropagation(); onOpenProjects ? onOpenProjects(entity) : onClick(); }}
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-400 mb-1" />
            <span className="font-bold text-lg leading-none text-foreground">{entity.active_projects}</span>
            <p className="text-[10px] text-blue-400/70 mt-1 text-center leading-tight">
              Campañas<br /><span className="underline">Ver todas</span>
            </p>
          </div>

          {/* Videos — abre tab Videos del cliente */}
          <div
            className="flex flex-col items-center p-2.5 rounded-sm bg-muted/40 border border-border/50 cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
            onClick={e => { e.stopPropagation(); onOpenVideos ? onOpenVideos(entity) : onClick(); }}
          >
            <Video className="h-3.5 w-3.5 text-purple-400 mb-1" />
            <span className="font-bold text-lg leading-none text-foreground">{entity.content_count}</span>
            <p className="text-[10px] text-purple-400/70 mt-1 text-center leading-tight">
              Videos<br /><span className="underline">Ver todos</span>
            </p>

          </div>

          {/* Usuarios — abre el panel de gestión de equipo y WA */}
          <div
            className={cn(
              'flex flex-col items-center p-2.5 rounded-sm border cursor-pointer transition-all',
              onOpenUsers
                ? 'bg-primary/8 border-primary/25 hover:bg-primary/15 hover:border-primary/50'
                : 'bg-muted/40 border-border/50 hover:bg-muted/60',
            )}
            onClick={e => { e.stopPropagation(); onOpenUsers ? onOpenUsers(entity) : onClick(); }}
          >
            <UsersIcon className={cn('h-3.5 w-3.5 mb-1', onOpenUsers ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('font-bold text-lg leading-none', onOpenUsers ? 'text-primary' : 'text-foreground')}>
              {entity.users_count}
            </span>
            <p className={cn('text-[10px] mt-1 text-center leading-tight', onOpenUsers ? 'text-primary/70' : 'text-muted-foreground')}>
              Equipo WA<br /><span className="underline">Ver / editar</span>
            </p>
          </div>
        </div>
      )}

      {/* ── INFORMACIÓN DE CONTACTO (empresas) ── */}
      {isEmpresa ? (
        <div className="space-y-1.5 mb-2 flex-1">
          {(entity.bio || entity.brand_description) && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {entity.bio || entity.brand_description}
            </p>
          )}

          {entity.main_contact && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 w-[48px] shrink-0">Contacto</span>
              <p className="text-xs text-white/70 truncate flex items-center gap-1">
                <Contact className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                {entity.main_contact}
              </p>
            </div>
          )}

          {entity.email && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 w-[48px] shrink-0">Correo</span>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                {entity.email}
              </p>
            </div>
          )}

          {entity.phone && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 w-[48px] shrink-0">Teléfono</span>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {entity.phone}
              </p>
            </div>
          )}

          {(entity.city || entity.country) && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 w-[48px] shrink-0">Ciudad</span>
              <p className="text-xs text-white/50 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {[entity.city, entity.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {(entity.website || entity.brand_website || entity.instagram || entity.tiktok || entity.facebook || entity.linkedin) && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground/60 w-[48px] shrink-0">Redes</span>
              <div className="flex items-center gap-2">
                {(entity.website || entity.brand_website) && (
                  <a href={entity.website || entity.brand_website!} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors" title="Sitio web">
                    <Globe className="h-3.5 w-3.5" />
                  </a>
                )}
                {entity.instagram && (
                  <a href={`https://instagram.com/${entity.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-pink-400 transition-colors" title={entity.instagram}>
                    <Instagram className="h-3.5 w-3.5" />
                  </a>
                )}
                {entity.tiktok && (
                  <a href={`https://tiktok.com/${entity.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-white transition-colors" title={entity.tiktok}>
                    <span className="text-[10px] font-bold leading-none">TT</span>
                  </a>
                )}
                {entity.facebook && (
                  <a href={`https://facebook.com/${entity.facebook.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-blue-400 transition-colors" title={entity.facebook}>
                    <Facebook className="h-3.5 w-3.5" />
                  </a>
                )}
                {entity.linkedin && (
                  <a href={`https://linkedin.com/company/${entity.linkedin.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-blue-500 transition-colors" title={entity.linkedin}>
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── INFORMACIÓN DE CONTACTO (personas) ── */
        <div className="space-y-1 mb-2 flex-1">
          {entity.company && (
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {entity.company}
              {entity.position && <span className="text-white/30">· {entity.position}</span>}
            </p>
          )}
          {entity.pipeline_stage && (
            <p className="text-xs text-white/40">
              Etapa: <span className="text-white/60">{entity.pipeline_stage}</span>
            </p>
          )}
        </div>
      )}

      {/* ── EQUIPO ASIGNADO / ESTRATEGAS (solo empresas) ── */}
      {isEmpresa && (
        <TooltipProvider>
          <div
            className="mb-3 p-2.5 rounded-sm border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group/strat"
            onClick={e => {
              e.stopPropagation();
              onOpenStrategists ? onOpenStrategists(entity) : onClick();
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Equipo asignado</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {strategists.length} {strategists.length === 1 ? 'persona' : 'personas'}
                </Badge>
              </div>
              <span className="text-[10px] text-primary flex items-center gap-0.5 group-hover/strat:underline">
                {strategists.length > 0 ? 'Editar' : 'Asignar'}
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {strategists.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {strategists.slice(0, 4).map(s => (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className={cn(
                            'h-6 w-6 border-2 border-card',
                            s.is_primary && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                          )}>
                            <AvatarImage src={s.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary/10">
                              {s.full_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          {s.is_primary && (
                            <Star className="h-2 w-2 text-primary fill-primary absolute -top-0.5 -right-0.5" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{s.full_name}{s.is_primary && ' — Principal'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                {strategists.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{strategists.length - 4} más</span>
                )}
                <span className="flex-1" />
                <span className="text-[10px] text-muted-foreground">
                  {strategists.find(s => s.is_primary)?.full_name || strategists[0]?.full_name || ''}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 italic">
                Sin equipo asignado — toca para asignar
              </p>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* ── PIE DE TARJETA ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
        {isEmpresa ? (
          <>
            {createdDate && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Cliente desde {createdDate}</span>
              </div>
            )}

            {canEdit && (
              <div
                className="flex items-center gap-2 cursor-pointer group/brand"
                onClick={handleToggleInternalBrand}
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
                <div>
                  <p className={cn(
                    'text-[10px] font-medium select-none leading-tight',
                    entity.is_internal_brand ? 'text-amber-400' : 'text-muted-foreground',
                  )}>
                    {entity.is_internal_brand ? 'Marca propia ✓' : 'Marca propia'}
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 select-none leading-tight">
                    {entity.is_internal_brand ? 'Es de tu agencia' : 'Toca para activar'}
                  </p>
                </div>
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
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#c084fc]">
                    <Tag className="h-2.5 w-2.5 inline mr-0.5" />{tag}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
