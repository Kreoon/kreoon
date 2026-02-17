import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Star, Heart, Ban, Briefcase, DollarSign, Calendar,
  Plus, X, Settings, Video, TrendingUp, Zap, Brain, Shield,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPanelShell } from '@/components/crm/DetailPanelShell';
import { DetailSection } from '@/components/crm/DetailSection';
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
import {
  useUpdateCreatorRelationship,
  useToggleFavoriteCreator,
  useBlockCreator,
  useFullOrgCreatorDetail,
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
import type { Content, AppRole } from '@/types/database';

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

interface Props {
  member: UnifiedTalentMember;
  organizationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function UnifiedTalentDetailPanel({ member, organizationId, onClose, onUpdate }: Props) {
  const { isAdmin, user: authUser } = useAuth();
  const { toast } = useToast();
  const hasInternal = member.source !== 'external';
  const hasExternal = member.source !== 'internal';
  const hasRelationship = hasExternal && member.relationship_id;

  // Role management state (admin only, internal members only)
  const [memberRoles, setMemberRoles] = useState<AppRole[]>([]);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<AppRole>('creator');
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch roles for internal members
  useEffect(() => {
    if (!hasInternal || !isAdmin) return;
    supabase
      .from('organization_member_roles')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', member.id)
      .then(({ data }) => {
        setMemberRoles((data || []).map(r => r.role as AppRole));
      });
  }, [member.id, hasInternal, isAdmin, organizationId]);

  const handleAddRole = async () => {
    setLoadingRoles(true);
    try {
      // Check if role already exists
      if (memberRoles.includes(selectedNewRole)) {
        toast({ description: `El rol ${getRoleLabel(selectedNewRole)} ya está asignado` });
        setRolePickerOpen(false);
        setLoadingRoles(false);
        return;
      }

      // Insert the new role (not replacing existing ones)
      const { error } = await supabase
        .from('organization_member_roles')
        .insert({
          organization_id: organizationId,
          user_id: member.id,
          role: selectedNewRole,
          assigned_by: authUser?.id,
        });
      if (error) throw error;

      const newRoles = [...memberRoles, selectedNewRole];
      setMemberRoles(newRoles);

      // Backward compat: update legacy single-role column with the highest-priority role
      const rolePriority: AppRole[] = ['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client'];
      const primaryRole = newRoles.sort((a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b))[0];
      await supabase
        .from('organization_members')
        .update({ role: primaryRole })
        .eq('user_id', member.id)
        .eq('organization_id', organizationId);

      setRolePickerOpen(false);
      toast({ description: `Rol ${getRoleLabel(selectedNewRole)} agregado` });
      onUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar el rol', variant: 'destructive' });
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleRemoveRole = async (role: AppRole) => {
    setLoadingRoles(true);
    try {
      await supabase
        .from('organization_member_roles')
        .delete()
        .eq('user_id', member.id)
        .eq('organization_id', organizationId)
        .eq('role', role);

      const remaining = memberRoles.filter(r => r !== role);
      setMemberRoles(remaining);

      // Update backward compat with highest-priority remaining role
      if (remaining.length > 0) {
        const rolePriority: AppRole[] = ['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client'];
        const primaryRole = [...remaining].sort((a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b))[0];
        await supabase
          .from('organization_members')
          .update({ role: primaryRole })
          .eq('user_id', member.id)
          .eq('organization_id', organizationId);
      }

      toast({ description: `Rol ${getRoleLabel(role)} eliminado` });
      onUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el rol', variant: 'destructive' });
    } finally {
      setLoadingRoles(false);
    }
  };

  // CRM hooks (only used if external relationship exists)
  const updateRelationship = useUpdateCreatorRelationship(organizationId);
  const toggleFavorite = useToggleFavoriteCreator(organizationId);
  const blockCreator = useBlockCreator(organizationId);
  const { data: full, isLoading: fullLoading } = useFullOrgCreatorDetail(
    organizationId,
    hasRelationship ? member.id : undefined,
  );
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId, 'org_creator');
  const updateCustomFields = useUpdateOrgCreatorCustomFields(organizationId);
  const updateProfileFields = useUpdateUserProfileFields();

  // Local state for tags, notes, custom fields
  const customFieldsRef = useRef<Record<string, unknown>>(full?.custom_fields || {});
  if (full?.custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...full.custom_fields };

  const [tags, setTags] = useState<string[]>(member.internal_tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(member.internal_notes || '');
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);

  // Content for internal members
  const [assignedContent, setAssignedContent] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Reset on member change
  useEffect(() => {
    setTags(member.internal_tags || []);
    setNotes(member.internal_notes || '');
  }, [member.id]);

  // Fetch assigned content for internal members
  useEffect(() => {
    if (!hasInternal || !member.org_role) return;
    setLoadingContent(true);
    const field = member.org_role === 'creator' ? 'creator_id' : member.org_role === 'editor' ? 'editor_id' : 'strategist_id';
    supabase
      .from('content')
      .select('*, client:clients(name)')
      .eq(field, member.id)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setAssignedContent((data || []) as Content[]);
        setLoadingContent(false);
      });
  }, [member.id, member.org_role, hasInternal, organizationId]);

  // Handlers
  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    if (!member.relationship_id) return;
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ relationshipId: member.relationship_id, fields: updated });
  }, [member.relationship_id, updateCustomFields]);

  const handleProfileFieldSave = useCallback((data: Record<string, string | null>) => {
    updateProfileFields.mutate({ userId: member.id, data });
  }, [member.id, updateProfileFields]);

  // Debounced notes
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveNotes = useCallback((value: string) => {
    if (!member.relationship_id) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      updateRelationship.mutate(
        { id: member.relationship_id!, data: { internal_notes: value } },
        { onSuccess: onUpdate },
      );
    }, 1500);
  }, [member.relationship_id, updateRelationship, onUpdate]);

  useEffect(() => () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current); }, []);

  const handleNotesChange = (value: string) => { setNotes(value); saveNotes(value); };

  // Tags
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

  // Favorite/Block
  const isFavorite = member.relationship_type === 'favorite';
  const isBlocked = member.relationship_type === 'blocked';

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({ creatorId: member.id, isFavorite }, { onSuccess: onUpdate });
  };
  const handleBlock = () => {
    if (isBlocked) return;
    if (!confirm('¿Bloquear este talento? No aparecerá en búsquedas.')) return;
    blockCreator.mutate({ creatorId: member.id }, { onSuccess: onUpdate });
  };

  // Content stats
  const completedContent = assignedContent.filter(c => c.status === 'approved' || c.status === 'paid');
  const activeContent = assignedContent.filter(c => !['approved', 'paid'].includes(c.status));

  const avatar = member.avatar_url ? (
    <img src={member.avatar_url} alt={member.full_name} className="w-11 h-11 rounded-full object-cover" />
  ) : (
    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
      {getInitials(member.full_name)}
    </div>
  );

  const badges = (
    <>
      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
        member.source === 'internal' ? 'bg-blue-500/20 text-blue-400' :
        member.source === 'external' ? 'bg-pink-500/20 text-pink-400' :
        'bg-purple-500/20 text-purple-400'
      )}>
        {SOURCE_LABELS[member.source]}
      </span>
      {member.org_role && (
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', getRoleBadgeColor(member.org_role))}>
          {getRoleLabel(member.org_role)}
        </span>
      )}
      {member.is_owner && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">
          Owner
        </span>
      )}
      {hasExternal && member.relationship_type && (
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', RELATIONSHIP_COLORS[member.relationship_type])}>
          {CREATOR_RELATIONSHIP_TYPE_LABELS[member.relationship_type]}
        </span>
      )}
    </>
  );

  return (
    <DetailPanelShell onClose={onClose} avatar={avatar} name={member.full_name} subtitle={member.email} badges={badges}>
      {/* Loading for full detail */}
      {fullLoading && hasRelationship && (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg bg-white/5" />
          <Skeleton className="h-12 rounded-lg bg-white/5" />
        </div>
      )}

      {/* 1. Personal Data */}
      <PersonalDataSection
        phone={full?.phone ?? member.phone}
        email={member.email}
        documentType={null}
        documentNumber={null}
        address={null}
        city={full?.city ?? full?.location_city ?? null}
        country={full?.country ?? full?.location_country ?? null}
        onSave={handleProfileFieldSave}
      />

      {/* 2. Profile */}
      {full && (
        <ProfileSection
          bio={full.bio}
          bioFull={full.bio_full}
          tagline={full.tagline}
          bannerUrl={full.banner_url}
          coverUrl={full.cover_url}
          featuredVideoUrl={null}
          showreelUrl={full.showreel_url}
          showreelThumbnail={full.showreel_thumbnail}
        />
      )}

      {/* 3. Social Links */}
      {full && (
        <SocialLinksSection
          instagram={full.instagram}
          tiktok={full.tiktok}
          facebook={full.facebook}
          linkedin={full.social_linkedin}
          twitter={full.social_twitter}
          youtube={full.social_youtube}
          portfolioUrl={full.portfolio_url}
          creatorSocialLinks={full.creator_social_links}
        />
      )}

      {/* 4. Internal Performance (only for internal/both) */}
      {hasInternal && (
        <DetailSection title="Rendimiento Interno">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <span className="text-white/40">Contenido creado</span>
            <span className="text-white/70 font-medium flex items-center gap-1">
              <Video className="h-3 w-3 text-blue-400" />
              {member.content_count}
            </span>
            <span className="text-white/40">Tareas activas</span>
            <span className="text-white/70 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-info" />
              {member.active_tasks}
            </span>
            {member.up_points > 0 && (
              <>
                <span className="text-white/40">UP Points</span>
                <span className="text-white/70 font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3 text-primary" />
                  {member.up_points} {member.up_level && `(${member.up_level})`}
                </span>
              </>
            )}
            {member.avg_star_rating != null && member.avg_star_rating > 0 && (
              <>
                <span className="text-white/40">Rating promedio</span>
                <span className="text-white/70 font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  {member.avg_star_rating.toFixed(1)} ({member.rated_content_count} calificados)
                </span>
              </>
            )}
            {member.ai_recommended_level && (
              <>
                <span className="text-white/40">Nivel IA</span>
                <span className="text-white/70 font-medium flex items-center gap-1">
                  <Brain className="h-3 w-3 text-amber-400" />
                  {member.ai_recommended_level}
                </span>
              </>
            )}
          </div>
        </DetailSection>
      )}

      {/* 4b. Role Management (admin only, internal members) */}
      {isAdmin && hasInternal && (
        <DetailSection title="Roles">
          {memberRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {memberRoles.map(role => (
                <span
                  key={role}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    getRoleBadgeColor(role),
                  )}
                >
                  <Shield className="h-2.5 w-2.5" />
                  {getRoleLabel(role)}
                  {memberRoles.length > 1 && (
                    <button
                      onClick={() => handleRemoveRole(role)}
                      disabled={loadingRoles}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                      title="Eliminar rol"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30 mb-2">Sin roles asignados</p>
          )}

          {rolePickerOpen ? (
            <div className="space-y-2">
              <UnifiedRolePicker value={selectedNewRole} onChange={setSelectedNewRole} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddRole}
                  disabled={loadingRoles}
                  className="h-7 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                >
                  {loadingRoles ? 'Guardando...' : 'Agregar rol'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRolePickerOpen(false)}
                  className="h-7 text-xs text-white/50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRolePickerOpen(true)}
              className="h-7 text-xs bg-white/5 hover:bg-white/10 text-white/60"
            >
              <Shield className="h-3 w-3 mr-1.5" />
              Agregar rol
            </Button>
          )}
        </DetailSection>
      )}

      {/* 5. CRM Relationship (only for external/both) */}
      {hasExternal && hasRelationship && (
        <>
          <DetailSection title="Relación CRM">
            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                disabled={toggleFavorite.isPending}
                className={cn(
                  'h-8 px-3 text-xs border transition-all',
                  isFavorite
                    ? 'bg-pink-500/20 border-pink-500/30 text-pink-400 hover:bg-pink-500/30'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-pink-400 hover:bg-pink-500/10',
                )}
              >
                <Heart className={cn('h-3.5 w-3.5 mr-1.5', isFavorite && 'fill-current')} />
                {isFavorite ? 'Favorito' : 'Agregar favorito'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBlock}
                disabled={blockCreator.isPending || isBlocked}
                className={cn(
                  'h-8 px-3 text-xs border transition-all',
                  isBlocked
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10',
                )}
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                {isBlocked ? 'Bloqueado' : 'Bloquear'}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <span className="text-white/40">Colaboraciones</span>
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-blue-400" />
                {member.times_worked_together}
              </span>
              <span className="text-white/40">Pagado</span>
              <span className="text-white/70 font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-400" />
                {formatCurrency(member.total_paid)}
              </span>
              {member.average_rating_given != null && (
                <>
                  <span className="text-white/40">Rating dado</span>
                  <span className="text-white/70 font-medium flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400" />
                    {member.average_rating_given.toFixed(1)}
                  </span>
                </>
              )}
              {member.last_collaboration_at && (
                <>
                  <span className="text-white/40">Última colab.</span>
                  <span className="text-white/70 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-white/30" />
                    {formatDistanceToNow(new Date(member.last_collaboration_at), { addSuffix: true, locale: es })}
                  </span>
                </>
              )}
            </div>
          </DetailSection>

          {/* Tags */}
          <DetailSection title="Etiquetas">
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Agregar etiqueta..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8 flex-1"
              />
              <Button type="button" variant="ghost" size="icon" onClick={addTag} className="h-8 w-8 bg-white/5 hover:bg-white/10 text-white/50">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    title="Click para eliminar"
                  >
                    {tag}
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
            )}
          </DetailSection>

          {/* Notes */}
          <DetailSection title="Notas internas">
            <Textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Notas sobre este talento..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-xs"
            />
            {updateRelationship.isPending && <p className="text-[10px] text-white/30">Guardando...</p>}
          </DetailSection>

          {/* Custom Fields */}
          <CustomFieldsSection
            customFields={customFieldsRef.current}
            fieldDefs={fieldDefs.filter(d => d.is_active)}
            onChange={handleCustomFieldChange}
            configAction={
              <button onClick={() => setShowFieldsConfig(true)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Configurar campos">
                <Settings className="h-3.5 w-3.5 text-white/40 hover:text-white/60" />
              </button>
            }
          />
        </>
      )}

      {/* 6. Specialization */}
      <SpecializationSection
        categories={full?.categories ?? member.categories ?? null}
        contentTypes={full?.content_types ?? member.content_types ?? null}
        experienceLevel={full?.experience_level ?? null}
        specialtiesTags={full?.specialties_tags ?? null}
        industries={null}
        languages={full?.languages ?? null}
        styleKeywords={null}
        bestAt={null}
        interests={null}
      />

      {/* 7. Marketplace */}
      {(full?.creator_profile_id || member.creator_profile_id) && full && (
        <MarketplaceSection
          slug={full.slug}
          level={full.level}
          basePrice={full.base_price}
          currency={full.currency}
          ratingAvg={full.rating_avg}
          ratingCount={full.rating_count}
          completedProjects={full.completed_projects}
          marketplaceRoles={full.marketplace_roles}
          isVerified={full.is_verified}
          acceptsProductExchange={full.accepts_product_exchange}
          responseTimeHours={full.response_time_hours}
          onTimeDeliveryPct={full.on_time_delivery_pct}
          repeatClientsPct={full.repeat_clients_pct}
          totalEarned={null}
        />
      )}

      {/* 8. Portfolio */}
      {full?.portfolio && full.portfolio.length > 0 && (
        <PortfolioSection portfolio={full.portfolio} />
      )}

      {/* 9. Services */}
      {full?.services && full.services.length > 0 && (
        <ServicesSection services={full.services} />
      )}

      {/* 10. Scores */}
      {full && (
        <ScoresSection
          qualityScoreAvg={member.quality_score_avg}
          reliabilityScore={member.reliability_score}
          velocityScore={member.velocity_score}
          editorRating={null}
          aiRecommendedLevel={member.ai_recommended_level}
          aiRiskFlag={member.ai_risk_flag}
        />
      )}

      {/* 11. Assigned Content (internal) */}
      {hasInternal && (
        <DetailSection title={`Contenido (${assignedContent.length})`}>
          {loadingContent ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 bg-white/5 rounded" />)}
            </div>
          ) : assignedContent.length === 0 ? (
            <p className="text-xs text-white/30">Sin contenido asignado</p>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {assignedContent.slice(0, 15).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="text-white/70 truncate">{c.title || 'Sin título'}</p>
                    <p className="text-[10px] text-white/30">{(c as any).client?.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-4 ml-2 flex-shrink-0">{c.status}</Badge>
                </div>
              ))}
              {assignedContent.length > 15 && (
                <p className="text-[10px] text-white/30 text-center">+{assignedContent.length - 15} más</p>
              )}
            </div>
          )}
          {assignedContent.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <span className="text-white/40">Completados</span>
              <span className="text-white/70">{completedContent.length}</span>
              <span className="text-white/40">Activos</span>
              <span className="text-white/70">{activeContent.length}</span>
            </div>
          )}
        </DetailSection>
      )}

      {/* Ambassador badge display */}
      {member.is_ambassador && member.ambassador_level && member.ambassador_level !== 'none' && (
        <DetailSection title="Embajador">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm text-white/70 font-medium capitalize">{member.ambassador_level}</span>
          </div>
        </DetailSection>
      )}

      {/* Info */}
      <DetailSection title="Info">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">ID</span>
          <span className="text-white/50 font-mono text-[10px] truncate">{member.id}</span>
        </div>
      </DetailSection>

      {/* Custom Fields Config Dialog */}
      {showFieldsConfig && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="org_creator"
          organizationId={organizationId}
        />
      )}
    </DetailPanelShell>
  );
}
