import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Star, Heart, Ban, Briefcase, DollarSign, Calendar, Plus, X, Settings,
  Video, TrendingUp, Zap, Brain, Shield, UserMinus, Trash2, UserX,
  CheckCircle, Clock, AlertCircle, MapPin, Instagram, Globe, Users,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PersonalDataSection } from '@/components/crm/detail-sections/PersonalDataSection';
import { ProfileSection } from '@/components/crm/detail-sections/ProfileSection';
import { SocialLinksSection } from '@/components/crm/detail-sections/SocialLinksSection';
import { SpecializationSection } from '@/components/crm/detail-sections/SpecializationSection';
import { MarketplaceSection } from '@/components/crm/detail-sections/MarketplaceSection';
import { PortfolioSection } from '@/components/crm/detail-sections/PortfolioSection';
import { ServicesSection } from '@/components/crm/detail-sections/ServicesSection';
import { ScoresSection } from '@/components/crm/detail-sections/ScoresSection';
import { CustomFieldsSection } from '@/components/crm/detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from '@/components/crm/detail-sections/CrmFieldsConfigDialog';
import { DetailSection } from '@/components/crm/DetailSection';
import {
  useUpdateCreatorRelationship,
  useToggleFavoriteCreator,
  useBlockCreator,
  useFullOrgCreatorDetail,
  useFullUserDetail,
} from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateOrgCreatorCustomFields, useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import type { UnifiedTalentMember } from '@/types/unifiedTalent.types';
import type { CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { UnifiedRolePicker } from '@/components/roles/UnifiedRolePicker';
import { supabase } from '@/integrations/supabase/client';
import { usePurgeMember, useRemoveMember } from '@/hooks/useOrgMemberActions';
import type { Content, AppRole } from '@/types/database';
import { STATUS_LABELS } from '@/types/database';
import { TalentPaymentsTab } from './TalentPaymentsTab';
import { CreativeCardForm } from '@/components/settings/CreativeCardForm';

// ──────────────────────────────────────────────────────────────────────────────
// Constantes de UI
// ──────────────────────────────────────────────────────────────────────────────

const LEAD_SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  referral: 'Referido',
  whatsapp: 'WhatsApp',
  website: 'Sitio web',
  event: 'Evento',
};

const SOURCE_LABELS = { internal: 'Equipo', external: 'Externo', both: 'Equipo + CRM' };

const RELATIONSHIP_COLORS: Record<CreatorRelationshipType, string> = {
  favorite: 'bg-pink-500/20 text-pink-400',
  blocked: 'bg-red-500/20 text-red-400',
  team_member: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-yellow-500/20 text-yellow-400',
  worked_with: 'bg-green-500/20 text-green-400',
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface Props {
  member: UnifiedTalentMember | null;
  organizationId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────

export function TalentProfileModal({ member, organizationId, open, onClose, onUpdate }: Props) {
  const { isAdmin, user: authUser } = useAuth();
  const { toast } = useToast();

  // Derivados seguros (null-safe) — no hooks, solo cálculos
  const hasInternal = member ? member.source !== 'external' : false;
  const hasExternal = member ? member.source !== 'internal' : false;
  const hasRelationship = hasExternal && !!member?.relationship_id;

  // ── Role management ────────────────────────────────────────────────────────
  const [memberRoles, setMemberRoles] = useState<AppRole[]>([]);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<AppRole>('content_creator');
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (!hasInternal || !isAdmin || !member) return;
    supabase
      .from('organization_member_roles')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', member.id)
      .then(({ data }) => { setMemberRoles((data || []).map(r => r.role as AppRole)); });
  }, [member?.id, hasInternal, isAdmin, organizationId]);

  const handleAddRole = async () => {
    setLoadingRoles(true);
    try {
      if (memberRoles.includes(selectedNewRole)) {
        toast({ description: `El rol ${getRoleLabel(selectedNewRole)} ya está asignado` });
        setRolePickerOpen(false);
        return;
      }
      const { error } = await supabase.from('organization_member_roles').insert({
        organization_id: organizationId, user_id: member.id,
        role: selectedNewRole, assigned_by: authUser?.id,
      });
      if (error) throw error;
      const newRoles = [...memberRoles, selectedNewRole];
      setMemberRoles(newRoles);
      const rolePriority: AppRole[] = ['admin', 'content_creator', 'editor', 'digital_strategist', 'creative_strategist', 'community_manager', 'client'];
      const primaryRole = [...newRoles].sort((a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b))[0];
      await supabase.from('organization_members').update({ role: primaryRole })
        .eq('user_id', member.id).eq('organization_id', organizationId);
      setRolePickerOpen(false);
      toast({ description: `Rol ${getRoleLabel(selectedNewRole)} agregado` });
      onUpdate();
    } catch { toast({ title: 'Error', description: 'No se pudo agregar el rol', variant: 'destructive' }); }
    finally { setLoadingRoles(false); }
  };

  const handleRemoveRole = async (role: AppRole) => {
    setLoadingRoles(true);
    try {
      await supabase.from('organization_member_roles').delete()
        .eq('user_id', member.id).eq('organization_id', organizationId).eq('role', role);
      const remaining = memberRoles.filter(r => r !== role);
      setMemberRoles(remaining);
      if (remaining.length > 0) {
        const rolePriority: AppRole[] = ['admin', 'content_creator', 'editor', 'digital_strategist', 'creative_strategist', 'community_manager', 'client'];
        const primaryRole = [...remaining].sort((a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b))[0];
        await supabase.from('organization_members').update({ role: primaryRole })
          .eq('user_id', member.id).eq('organization_id', organizationId);
      }
      toast({ description: `Rol ${getRoleLabel(role)} eliminado` });
      onUpdate();
    } catch { toast({ title: 'Error', description: 'No se pudo eliminar el rol', variant: 'destructive' }); }
    finally { setLoadingRoles(false); }
  };

  // ── Membership hooks ───────────────────────────────────────────────────────
  const purgeMember = usePurgeMember();
  const removeMember = useRemoveMember();

  // ── CRM hooks ──────────────────────────────────────────────────────────────
  const updateRelationship = useUpdateCreatorRelationship(organizationId);
  const toggleFavorite = useToggleFavoriteCreator(organizationId);
  const blockCreator = useBlockCreator(organizationId);
  const { data: full, isLoading: fullLoading } = useFullOrgCreatorDetail(
    organizationId,
    hasRelationship ? member?.id : undefined,
  );
  // Carga datos completos de perfil para miembros internos (bio, redes, portfolio, etc.)
  const { data: fullUser, isLoading: fullUserLoading } = useFullUserDetail(
    hasInternal ? member?.id : undefined,
  );
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId, 'org_creator');
  const updateCustomFields = useUpdateOrgCreatorCustomFields(organizationId);
  const updateProfileFields = useUpdateUserProfileFields();

  // ── Local state ────────────────────────────────────────────────────────────
  const customFieldsRef = useRef<Record<string, unknown>>(full?.custom_fields || {});
  if (full?.custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...full.custom_fields };

  const [tags, setTags] = useState<string[]>(member?.internal_tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(member?.internal_notes || '');
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);

  // Origen/comunidad
  const [leadSource, setLeadSource] = useState(member?.lead_source || '');
  const [communityName, setCommunityName] = useState(member?.community_name || '');
  const [referredBy, setReferredBy] = useState(member?.referred_by || '');
  const [savingOrigin, setSavingOrigin] = useState(false);


  // Contenido asignado
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  // Reset on member change
  useEffect(() => {
    if (!member) return;
    setTags(member.internal_tags || []);
    setNotes(member.internal_notes || '');
    setContentFilter('active');
    setLeadSource(member.lead_source || '');
    setCommunityName(member.community_name || '');
    setReferredBy(member.referred_by || '');
  }, [member?.id]);

  // Fetch content
  useEffect(() => {
    if (!hasInternal || !open || !member) return;
    setLoadingContent(true);
    const base = { organization_id: organizationId };
    Promise.all([
      supabase.from('content').select('*, client:clients(name)').match({ ...base, creator_id: member.id }).order('created_at', { ascending: false }).limit(50),
      supabase.from('content').select('*, client:clients(name)').match({ ...base, editor_id: member.id }).order('created_at', { ascending: false }).limit(30),
      supabase.from('content').select('*, client:clients(name)').match({ ...base, strategist_id: member.id }).order('created_at', { ascending: false }).limit(30),
    ]).then(([r1, r2, r3]) => {
      const seen = new Set<string>();
      const merged = [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAssignedContent(merged as Content[]);
      setLoadingContent(false);
    });
  }, [member?.id, hasInternal, organizationId, open]);


  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    if (!member?.relationship_id) return;
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ relationshipId: member.relationship_id, fields: updated });
  }, [member?.relationship_id, updateCustomFields]);

  const handleProfileFieldSave = useCallback((data: Record<string, string | null>) => {
    if (!member) return;
    updateProfileFields.mutate({ userId: member.id, data });
  }, [member?.id, updateProfileFields]);

  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveNotes = useCallback((value: string) => {
    if (!member?.relationship_id) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      updateRelationship.mutate(
        { id: member.relationship_id!, data: { internal_notes: value } },
        { onSuccess: onUpdate },
      );
    }, 1500);
  }, [member?.relationship_id, updateRelationship, onUpdate]);
  useEffect(() => () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current); }, []);

  // Todos los hooks ya están declarados — ahora es seguro hacer un early return
  if (!member) return null;

  const addTag = () => {
    if (!member.relationship_id) return;
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      updateRelationship.mutate({ id: member.relationship_id, data: { internal_tags: newTags } }, { onSuccess: onUpdate });
    }
  };
  const removeTag = (tag: string) => {
    if (!member.relationship_id) return;
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    updateRelationship.mutate({ id: member.relationship_id, data: { internal_tags: newTags } }, { onSuccess: onUpdate });
  };

  const isFavorite = member.relationship_type === 'favorite';
  const isBlocked = member.relationship_type === 'blocked';
  const handleToggleFavorite = () => toggleFavorite.mutate({ creatorId: member.id, isFavorite }, { onSuccess: onUpdate });
  const handleBlock = () => {
    if (isBlocked) return;
    if (!confirm('¿Bloquear este talento?')) return;
    blockCreator.mutate({ creatorId: member.id }, { onSuccess: onUpdate });
  };

  const handleSaveOrigin = async () => {
    setSavingOrigin(true);
    try {
      await updateProfileFields.mutateAsync({
        userId: member.id,
        data: {
          lead_source: leadSource || null,
          community_name: communityName || null,
          referred_by: referredBy || null,
        },
      });
      onUpdate();
    } finally { setSavingOrigin(false); }
  };

  const handleUnassign = async (content: Content) => {
    if (!confirm(`¿Desasignar a ${member.full_name} de "${content.title || 'este contenido'}"?`)) return;
    setUnassigningId(content.id);
    try {
      const updates: Record<string, null> = {};
      if (content.creator_id === member.id)    updates.creator_id    = null;
      if (content.editor_id === member.id)     updates.editor_id     = null;
      if (content.strategist_id === member.id) updates.strategist_id = null;
      if (!Object.keys(updates).length) { setUnassigningId(null); return; }
      const { error } = await supabase.from('content').update(updates).eq('id', content.id).eq('organization_id', organizationId);
      if (error) throw error;
      setAssignedContent(prev => prev.filter(c => c.id !== content.id));
      toast({ description: `${member.full_name} desasignado del contenido` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast({ title: 'Error al desasignar', description: msg, variant: 'destructive' });
    } finally { setUnassigningId(null); }
  };

  // Listas derivadas
  const isCompleted = (c: Content) => c.status === 'approved' || c.status === 'paid' || c.marketing_campaign_id != null;
  const completedContent = assignedContent.filter(isCompleted);
  const activeContent = assignedContent.filter(c => !isCompleted(c));

  const totalPaid = member.total_paid || 0;

  // Avatar
  const avatar = member.avatar_url ? (
    <img src={member.avatar_url} alt={member.full_name} className="w-14 h-14 rounded-full object-cover ring-2 ring-border" />
  ) : (
    <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
      {getInitials(member.full_name)}
    </div>
  );

  const isLoadingProfile = hasInternal ? fullUserLoading : fullLoading;

  // Fuente unificada de datos de perfil: CRM full detail > user full detail
  const p = full ?? fullUser;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0"
        style={{ background: 'var(--nova-glass-bg)', backdropFilter: 'blur(24px)' }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-4">
            {avatar}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-bold truncate">{member.full_name}</DialogTitle>
                  {(fullUser?.tagline || p?.tagline) && (
                    <p className="text-sm text-primary/80 truncate mt-0.5 italic">"{fullUser?.tagline ?? p?.tagline}"</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {member.email && <span>{member.email}</span>}
                    {(p?.phone ?? member.phone) && <span>· {p?.phone ?? member.phone}</span>}
                    {(p?.city ?? (p as any)?.location_city) && (
                      <span className="flex items-center gap-1">
                        · <MapPin className="h-3 w-3" />
                        {[p?.city ?? (p as any)?.location_city, p?.country ?? (p as any)?.location_country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Health score badge */}
                {fullUser?.health_score != null && fullUser.health_score > 0 && (
                  <div className={cn('flex-shrink-0 px-2 py-1 rounded-sm text-xs font-bold border',
                    fullUser.health_score >= 70 ? 'bg-success/10 text-success border-success/20' :
                    fullUser.health_score >= 40 ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-destructive/10 text-destructive border-destructive/20')}>
                    HS {fullUser.health_score}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  member.source === 'internal' ? 'bg-blue-500/20 text-blue-400' :
                  member.source === 'external' ? 'bg-pink-500/20 text-pink-400' :
                  'bg-purple-500/20 text-purple-400',
                )}>
                  {SOURCE_LABELS[member.source]}
                </span>
                {member.org_role && (
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', getRoleBadgeColor(member.org_role))}>
                    {getRoleLabel(member.org_role)}
                  </span>
                )}
                {member.is_owner && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">Owner</span>
                )}
                {(member.is_ambassador || fullUser?.is_ambassador) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400">
                    Embajador {fullUser?.ambassador_level ?? member.ambassador_level ?? ''}
                  </span>
                )}
                {hasExternal && member.relationship_type && (
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', RELATIONSHIP_COLORS[member.relationship_type])}>
                    {CREATOR_RELATIONSHIP_TYPE_LABELS[member.relationship_type]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="perfil" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 px-6 pt-2 bg-transparent border-b border-border rounded-none justify-start gap-1 h-auto pb-0">
            <TabsTrigger value="perfil" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Perfil</TabsTrigger>
            <TabsTrigger value="rendimiento" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Rendimiento</TabsTrigger>
            {hasInternal && (
              <TabsTrigger value="ficha-creativa" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Ficha Creativa</TabsTrigger>
            )}
            {hasExternal && hasRelationship && (
              <TabsTrigger value="crm" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">CRM</TabsTrigger>
            )}
            {hasInternal && (
              <TabsTrigger value="finanzas" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Finanzas</TabsTrigger>
            )}
            <TabsTrigger value="origen" className="text-xs px-3 py-1.5 rounded-t-sm rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Origen</TabsTrigger>
          </TabsList>

          {/* ── TAB: Perfil ─────────────────────────────────────────────── */}
          <TabsContent value="perfil" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
            {isLoadingProfile && (
              <div className="space-y-3 mb-4">
                <Skeleton className="h-16 bg-white/5" />
                <Skeleton className="h-12 bg-white/5" />
                <Skeleton className="h-20 bg-white/5" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Columna izquierda */}
              <div className="space-y-4">
                <PersonalDataSection
                  phone={p?.phone ?? member.phone}
                  email={member.email}
                  documentType={(fullUser as any)?.document_type ?? null}
                  documentNumber={(fullUser as any)?.document_number ?? null}
                  address={(fullUser as any)?.address ?? null}
                  city={p?.city ?? (p as any)?.location_city ?? null}
                  country={p?.country ?? (p as any)?.location_country ?? null}
                  nationality={(fullUser as any)?.nationality ?? null}
                  dateOfBirth={(fullUser as any)?.date_of_birth ?? null}
                  username={p?.username ?? null}
                  onSave={handleProfileFieldSave}
                />

                {p && (
                  <ProfileSection
                    bio={p.bio}
                    bioFull={p.bio_full}
                    tagline={p.tagline}
                    bannerUrl={p.banner_url}
                    coverUrl={p.cover_url}
                    featuredVideoUrl={(fullUser as any)?.featured_video_url ?? null}
                    showreelUrl={p.showreel_url}
                    showreelThumbnail={p.showreel_thumbnail}
                  />
                )}

                {p && (
                  <SocialLinksSection
                    instagram={p.instagram}
                    tiktok={p.tiktok}
                    facebook={p.facebook}
                    linkedin={p.social_linkedin}
                    twitter={p.social_twitter}
                    youtube={p.social_youtube}
                    portfolioUrl={p.portfolio_url}
                    creatorSocialLinks={p.creator_social_links}
                  />
                )}
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                <SpecializationSection
                  categories={p?.categories ?? member.categories ?? null}
                  contentTypes={p?.content_types ?? member.content_types ?? null}
                  experienceLevel={p?.experience_level ?? null}
                  specialtiesTags={(p as any)?.specialties_tags ?? null}
                  industries={(fullUser as any)?.industries ?? null}
                  languages={(p as any)?.languages ?? null}
                  styleKeywords={(fullUser as any)?.style_keywords ?? null}
                  bestAt={(fullUser as any)?.best_at ?? null}
                  interests={(fullUser as any)?.interests ?? null}
                />

                {(p?.creator_profile_id || member.creator_profile_id) && p && (
                  <MarketplaceSection
                    slug={p.slug}
                    level={p.level}
                    basePrice={p.base_price}
                    currency={p.currency}
                    ratingAvg={p.rating_avg}
                    ratingCount={p.rating_count}
                    completedProjects={p.completed_projects}
                    marketplaceRoles={p.marketplace_roles}
                    isVerified={p.is_verified}
                    acceptsProductExchange={p.accepts_product_exchange}
                    responseTimeHours={p.response_time_hours}
                    onTimeDeliveryPct={p.on_time_delivery_pct}
                    repeatClientsPct={p.repeat_clients_pct}
                    totalEarned={null}
                  />
                )}

                {/* Miembro desde */}
                {fullUser?.created_at && (
                  <DetailSection title="Cuenta">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <span className="text-white/40">Miembro desde</span>
                      <span className="text-white/70">{format(new Date(fullUser.created_at), 'd MMM yyyy', { locale: es })}</span>
                      {fullUser.last_login_at && (
                        <>
                          <span className="text-white/40">Último acceso</span>
                          <span className="text-white/70">{formatDistanceToNow(new Date(fullUser.last_login_at), { addSuffix: true, locale: es })}</span>
                        </>
                      )}
                      {fullUser.ambassador_level && (
                        <>
                          <span className="text-white/40">Embajador</span>
                          <span className="text-amber-400 capitalize font-medium">{fullUser.ambassador_level}</span>
                        </>
                      )}
                      {fullUser.health_score > 0 && (
                        <>
                          <span className="text-white/40">Health score</span>
                          <span className={cn('font-semibold', fullUser.health_score >= 70 ? 'text-success' : fullUser.health_score >= 40 ? 'text-warning' : 'text-destructive')}>
                            {fullUser.health_score}/100
                          </span>
                        </>
                      )}
                    </div>
                  </DetailSection>
                )}
              </div>
            </div>

            {/* Portfolio y servicios (ancho completo) */}
            <div className="mt-4 space-y-4">
              {p?.portfolio && p.portfolio.length > 0 && <PortfolioSection portfolio={p.portfolio} />}
              {p?.services && p.services.length > 0 && <ServicesSection services={p.services} />}
            </div>
          </TabsContent>

          {/* ── TAB: Rendimiento ────────────────────────────────────────── */}
          <TabsContent value="rendimiento" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
            <ScoresSection
              qualityScoreAvg={member.quality_score_avg ?? fullUser?.quality_score_avg ?? null}
              reliabilityScore={member.reliability_score ?? fullUser?.reliability_score ?? null}
              velocityScore={member.velocity_score ?? fullUser?.velocity_score ?? null}
              editorRating={fullUser?.editor_rating ?? null}
              aiRecommendedLevel={member.ai_recommended_level ?? fullUser?.ai_recommended_level ?? null}
              aiRiskFlag={member.ai_risk_flag ?? fullUser?.ai_risk_flag ?? null}
            />

            {hasInternal && (
              <DetailSection title="KPIs internos">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <span className="text-white/40">Contenido creado</span>
                  <span className="text-white/70 font-medium flex items-center gap-1">
                    <Video className="h-3 w-3 text-blue-400" />{member.content_count}
                  </span>
                  <span className="text-white/40">Tareas activas</span>
                  <span className="text-white/70 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-info" />{member.active_tasks}
                  </span>
                  {member.up_points > 0 && (
                    <>
                      <span className="text-white/40">UP Points</span>
                      <span className="text-white/70 font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3 text-primary" />{member.up_points} {member.up_level && `(${member.up_level})`}
                      </span>
                    </>
                  )}
                  {member.avg_star_rating != null && member.avg_star_rating > 0 && (
                    <>
                      <span className="text-white/40">Rating promedio</span>
                      <span className="text-white/70 font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />{member.avg_star_rating.toFixed(1)} ({member.rated_content_count} calificados)
                      </span>
                    </>
                  )}
                  {member.ai_recommended_level && (
                    <>
                      <span className="text-white/40">Nivel IA</span>
                      <span className="text-white/70 font-medium flex items-center gap-1">
                        <Brain className="h-3 w-3 text-amber-400" />{member.ai_recommended_level}
                      </span>
                    </>
                  )}
                </div>
              </DetailSection>
            )}

            {/* Roles (admin) */}
            {isAdmin && hasInternal && (
              <DetailSection title="Roles">
                {memberRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {memberRoles.map(role => (
                      <span key={role} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', getRoleBadgeColor(role))}>
                        <Shield className="h-2.5 w-2.5" />
                        {getRoleLabel(role)}
                        {memberRoles.length > 1 && (
                          <button onClick={() => handleRemoveRole(role)} disabled={loadingRoles} className="ml-0.5 hover:text-red-400 transition-colors" title="Eliminar rol">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs text-white/30 mb-2">Sin roles asignados</p>}

                {rolePickerOpen ? (
                  <div className="space-y-2">
                    <UnifiedRolePicker value={selectedNewRole} onChange={setSelectedNewRole} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddRole} disabled={loadingRoles} className="h-7 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
                        {loadingRoles ? 'Guardando...' : 'Agregar rol'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRolePickerOpen(false)} className="h-7 text-xs text-white/50">Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setRolePickerOpen(true)} className="h-7 text-xs bg-white/5 hover:bg-white/10 text-white/60">
                    <Shield className="h-3 w-3 mr-1.5" />Agregar rol
                  </Button>
                )}
              </DetailSection>
            )}

            {/* Membership actions (admin, not owner) */}
            {isAdmin && hasInternal && !member.is_owner && (
              <DetailSection title="Membresía">
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={purgeMember.isPending} className="h-7 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20">
                        <UserMinus className="h-3 w-3 mr-1.5" />Depurar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Depurar miembro</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminarán todos los roles de <strong>{member.full_name}</strong>.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-orange-600 text-white hover:bg-orange-700"
                          onClick={() => purgeMember.mutate({ userId: member.id, orgId: organizationId, userName: member.full_name }, { onSuccess: () => { onUpdate(); onClose(); } })}>
                          Depurar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={removeMember.isPending} className="h-7 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                        <Trash2 className="h-3 w-3 mr-1.5" />Eliminar de la org
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar de la organización</AlertDialogTitle>
                        <AlertDialogDescription><strong>{member.full_name}</strong> será eliminado completamente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => removeMember.mutate({ userId: member.id, orgId: organizationId, userName: member.full_name }, { onSuccess: () => { onUpdate(); onClose(); } })}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </DetailSection>
            )}

            {/* Contenido asignado */}
            {hasInternal && (
              <DetailSection title={`Contenido (${assignedContent.length})`}>
                {loadingContent ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 bg-white/5 rounded" />)}</div>
                ) : assignedContent.length === 0 ? (
                  <p className="text-xs text-white/30">Sin contenido asignado</p>
                ) : (
                  <>
                    <div className="flex gap-1 mb-2">
                      {([
                        { key: 'active', label: `Activos (${activeContent.length})` },
                        { key: 'completed', label: `Completados (${completedContent.length})` },
                        { key: 'all', label: `Todos (${assignedContent.length})` },
                      ] as const).map(tab => (
                        <button key={tab.key} onClick={() => setContentFilter(tab.key)}
                          className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                            contentFilter === tab.key ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10')}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {(contentFilter === 'active' ? activeContent : contentFilter === 'completed' ? completedContent : assignedContent).slice(0, 20).map(c => (
                        <div key={c.id} className="flex items-start justify-between text-xs p-1.5 rounded bg-white/5 gap-2 group">
                          <div className="min-w-0 flex-1">
                            <p className="text-white/70 truncate">{c.title || 'Sin título'}</p>
                            <p className="text-[10px] text-white/30">{(c as any).client?.name}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="outline" className={cn('text-[9px] h-4',
                              isCompleted(c) ? 'border-success/30 text-success bg-success/10' : 'border-info/30 text-info bg-info/10')}>
                              {c.marketing_campaign_id ? 'En campaña' : (STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status)}
                            </Badge>
                            {isAdmin && (
                              <button onClick={() => handleUnassign(c)} disabled={unassigningId === c.id}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center rounded hover:bg-red-500/20 text-white/30 hover:text-red-400">
                                {unassigningId === c.id
                                  ? <span className="h-2.5 w-2.5 border border-current border-t-transparent rounded-full animate-spin block" />
                                  : <UserX className="h-2.5 w-2.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </DetailSection>
            )}
          </TabsContent>

          {/* ── TAB: Ficha Creativa ─────────────────────────────────────── */}
          {hasInternal && (
            <TabsContent value="ficha-creativa" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <CreativeCardForm userId={member.id} onSaved={onUpdate} />
            </TabsContent>
          )}

          {/* ── TAB: CRM ─────────────────────────────────────────────────── */}
          {hasExternal && hasRelationship && (
            <TabsContent value="crm" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
              <DetailSection title="Relación">
                <div className="flex items-center gap-2 mb-3">
                  <Button type="button" variant="ghost" size="sm" onClick={handleToggleFavorite} disabled={toggleFavorite.isPending}
                    className={cn('h-8 px-3 text-xs border transition-all',
                      isFavorite ? 'bg-pink-500/20 border-pink-500/30 text-pink-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-pink-400')}>
                    <Heart className={cn('h-3.5 w-3.5 mr-1.5', isFavorite && 'fill-current')} />
                    {isFavorite ? 'Favorito' : 'Agregar favorito'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleBlock} disabled={blockCreator.isPending || isBlocked}
                    className={cn('h-8 px-3 text-xs border transition-all',
                      isBlocked ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-red-400')}>
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    {isBlocked ? 'Bloqueado' : 'Bloquear'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <span className="text-white/40">Colaboraciones</span>
                  <span className="text-white/70 font-medium flex items-center gap-1"><Briefcase className="h-3 w-3 text-blue-400" />{member.times_worked_together}</span>
                  <span className="text-white/40">Total pagado</span>
                  <span className="text-white/70 font-medium flex items-center gap-1"><DollarSign className="h-3 w-3 text-green-400" />{formatCurrency(totalPaid)}</span>
                  {member.average_rating_given != null && (
                    <>
                      <span className="text-white/40">Rating dado</span>
                      <span className="text-white/70 font-medium flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{member.average_rating_given.toFixed(1)}</span>
                    </>
                  )}
                  {member.last_collaboration_at && (
                    <>
                      <span className="text-white/40">Última colab.</span>
                      <span className="text-white/70 flex items-center gap-1"><Calendar className="h-3 w-3 text-white/30" />{formatDistanceToNow(new Date(member.last_collaboration_at), { addSuffix: true, locale: es })}</span>
                    </>
                  )}
                </div>
              </DetailSection>

              <DetailSection title="Etiquetas">
                <div className="flex items-center gap-2">
                  <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Agregar etiqueta..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8 flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={addTag} className="h-8 w-8 bg-white/5 hover:bg-white/10 text-white/50">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {tags.map(tag => (
                      <button key={tag} onClick={() => removeTag(tag)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors">
                        {tag}<X className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Notas internas">
                <Textarea value={notes} onChange={e => { setNotes(e.target.value); saveNotes(e.target.value); }}
                  placeholder="Notas sobre este talento..." rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-xs" />
                {updateRelationship.isPending && <p className="text-[10px] text-white/30">Guardando...</p>}
              </DetailSection>

              <CustomFieldsSection
                customFields={customFieldsRef.current}
                fieldDefs={fieldDefs.filter(d => d.is_active)}
                onChange={handleCustomFieldChange}
                configAction={
                  <button onClick={() => setShowFieldsConfig(true)} className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Settings className="h-3.5 w-3.5 text-white/40 hover:text-white/60" />
                  </button>
                }
              />
            </TabsContent>
          )}

          {/* ── TAB: Finanzas ────────────────────────────────────────────── */}
          <TabsContent value="finanzas" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
            <TalentPaymentsTab
              userId={member.id}
              organizationId={organizationId}
              memberName={member.full_name}
            />
          </TabsContent>

          {/* ── TAB: Origen ──────────────────────────────────────────────── */}
          <TabsContent value="origen" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
            <DetailSection title="Origen y comunidad">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Fuente de captación</Label>
                  <Select value={leadSource || 'none'} onValueChange={v => setLeadSource(v === 'none' ? '' : v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                      <SelectValue placeholder="¿Cómo llegó a la plataforma?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Comunidad de origen</Label>
                  <Input
                    value={communityName}
                    onChange={e => setCommunityName(e.target.value)}
                    placeholder="Ej: Los Reyes del Contenido"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">Referido por</Label>
                  <Input
                    value={referredBy}
                    onChange={e => setReferredBy(e.target.value)}
                    placeholder="Nombre del referidor"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-9"
                  />
                </div>

                <Button onClick={handleSaveOrigin} disabled={savingOrigin || updateProfileFields.isPending}
                  className="h-8 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
                  {savingOrigin ? 'Guardando...' : 'Guardar origen'}
                </Button>
              </div>
            </DetailSection>

            {/* Info de perfil: ciudad/país (solo lectura, se edita desde tab Perfil) */}
            {(full?.city || full?.country || full?.location_city || full?.location_country) && (
              <DetailSection title="Ubicación">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{[full?.city || full?.location_city, full?.country || full?.location_country].filter(Boolean).join(', ')}</span>
                </div>
              </DetailSection>
            )}

            {/* Resumen de origen actual */}
            {(member.lead_source || member.community_name || member.referred_by) && (
              <DetailSection title="Datos actuales guardados">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {member.lead_source && (
                    <>
                      <span className="text-white/40">Fuente</span>
                      <span className="text-white/70">{LEAD_SOURCE_LABELS[member.lead_source] || member.lead_source}</span>
                    </>
                  )}
                  {member.community_name && (
                    <>
                      <span className="text-white/40">Comunidad</span>
                      <span className="text-white/70">{member.community_name}</span>
                    </>
                  )}
                  {member.referred_by && (
                    <>
                      <span className="text-white/40">Referido por</span>
                      <span className="text-white/70">{member.referred_by}</span>
                    </>
                  )}
                </div>
              </DetailSection>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Custom Fields Config Dialog */}
      {showFieldsConfig && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="org_creator"
          organizationId={organizationId}
        />
      )}
    </Dialog>
  );
}
