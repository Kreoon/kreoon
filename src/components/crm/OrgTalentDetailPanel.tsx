import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Star,
  Heart,
  Ban,
  Briefcase,
  DollarSign,
  Calendar,
  Plus,
  X,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPanelShell } from './DetailPanelShell';
import { DetailSection } from './DetailSection';
import {
  useUpdateCreatorRelationship,
  useToggleFavoriteCreator,
  useBlockCreator,
  useFullOrgCreatorDetail,
} from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateOrgCreatorCustomFields, useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import type { OrgCreatorWithStats, CreatorRelationshipType } from '@/types/crm.types';
import { CREATOR_RELATIONSHIP_TYPE_LABELS } from '@/types/crm.types';

import { PersonalDataSection } from './detail-sections/PersonalDataSection';
import { ProfileSection } from './detail-sections/ProfileSection';
import { SocialLinksSection } from './detail-sections/SocialLinksSection';
import { SpecializationSection } from './detail-sections/SpecializationSection';
import { MarketplaceSection } from './detail-sections/MarketplaceSection';
import { PortfolioSection } from './detail-sections/PortfolioSection';
import { ServicesSection } from './detail-sections/ServicesSection';
import { ScoresSection } from './detail-sections/ScoresSection';
import { CustomFieldsSection } from './detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from './detail-sections/CrmFieldsConfigDialog';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(n);
}

const RELATIONSHIP_COLORS: Record<CreatorRelationshipType, string> = {
  favorite: 'bg-pink-500/20 text-pink-400',
  blocked: 'bg-red-500/20 text-red-400',
  team_member: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-yellow-500/20 text-yellow-400',
  worked_with: 'bg-green-500/20 text-green-400',
};

interface OrgTalentDetailPanelProps {
  creator: OrgCreatorWithStats;
  organizationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrgTalentDetailPanel({
  creator,
  organizationId,
  onClose,
  onUpdate,
}: OrgTalentDetailPanelProps) {
  const updateRelationship = useUpdateCreatorRelationship(organizationId);
  const toggleFavorite = useToggleFavoriteCreator(organizationId);
  const blockCreator = useBlockCreator(organizationId);
  const { data: full, isLoading: fullLoading } = useFullOrgCreatorDetail(organizationId, creator.creator_id);
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId, 'org_creator');
  const updateCustomFields = useUpdateOrgCreatorCustomFields(organizationId);
  const updateProfileFields = useUpdateUserProfileFields();
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);

  // Local ref for custom field values (optimistic)
  const customFieldsRef = useRef<Record<string, unknown>>(full?.custom_fields || {});
  if (full?.custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...full.custom_fields };

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ relationshipId: creator.id, fields: updated });
  }, [creator.id, updateCustomFields]);

  const handleProfileFieldSave = useCallback((data: Record<string, string | null>) => {
    if (!creator.creator_id) return;
    updateProfileFields.mutate({ userId: creator.creator_id, data });
  }, [creator.creator_id, updateProfileFields]);

  const [tags, setTags] = useState<string[]>(creator.internal_tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(creator.internal_notes || '');

  const isFavorite = creator.relationship_type === 'favorite';
  const isBlocked = creator.relationship_type === 'blocked';

  // Reset state on creator change
  useEffect(() => {
    setTags(creator.internal_tags || []);
    setNotes(creator.internal_notes || '');
  }, [creator.id]);

  // Debounced notes save
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveNotes = useCallback(
    (value: string) => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateRelationship.mutate(
          { id: creator.id, data: { internal_notes: value } },
          { onSuccess: onUpdate },
        );
      }, 1500);
    },
    [creator.id, updateRelationship, onUpdate],
  );

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, []);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveNotes(value);
  };

  // Tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      updateRelationship.mutate(
        { id: creator.id, data: { internal_tags: newTags } },
        { onSuccess: onUpdate },
      );
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    updateRelationship.mutate(
      { id: creator.id, data: { internal_tags: newTags } },
      { onSuccess: onUpdate },
    );
  };

  // Favorite toggle
  const handleToggleFavorite = () => {
    toggleFavorite.mutate(
      { creatorId: creator.creator_id, isFavorite },
      { onSuccess: onUpdate },
    );
  };

  // Block
  const handleBlock = () => {
    if (isBlocked) return;
    if (!confirm('¿Bloquear este talento? No aparecerá en búsquedas.')) return;
    blockCreator.mutate(
      { creatorId: creator.creator_id },
      { onSuccess: onUpdate },
    );
  };

  const avatar = creator.creator_avatar ? (
    <img
      src={creator.creator_avatar}
      alt={creator.creator_name}
      className="w-11 h-11 rounded-full object-cover"
    />
  ) : (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
      style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
    >
      {getInitials(creator.creator_name)}
    </div>
  );

  return (
    <DetailPanelShell
      onClose={onClose}
      avatar={avatar}
      name={creator.creator_name}
      subtitle={creator.creator_email}
      badges={
        creator.relationship_type ? (
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
              RELATIONSHIP_COLORS[creator.relationship_type],
            )}
          >
            {CREATOR_RELATIONSHIP_TYPE_LABELS[creator.relationship_type]}
          </span>
        ) : undefined
      }
    >
      {/* Loading indicator for full detail */}
      {fullLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg bg-white/5" />
          <Skeleton className="h-12 rounded-lg bg-white/5" />
        </div>
      )}

      {/* Personal Data */}
      <PersonalDataSection
        phone={full?.phone ?? null}
        email={creator.creator_email}
        documentType={null}
        documentNumber={null}
        address={null}
        city={full?.city ?? full?.location_city ?? null}
        country={full?.country ?? full?.location_country ?? null}
        onSave={handleProfileFieldSave}
      />

      {/* Profile */}
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

      {/* Social Links */}
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

      {/* Relationship controls */}
      <DetailSection title="Relación">
        <div className="flex items-center gap-2">
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
                : 'bg-white/5 border-white/10 text-white/50 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/30',
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
                : 'bg-white/5 border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30',
            )}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            {isBlocked ? 'Bloqueado' : 'Bloquear'}
          </Button>
        </div>
      </DetailSection>

      {/* Stats */}
      <DetailSection title="Estadísticas">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Colaboraciones</span>
          <span className="text-white/70 font-medium flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-blue-400" />
            {creator.times_worked_together}
          </span>
          <span className="text-white/40">Pagado</span>
          <span className="text-white/70 font-medium flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-400" />
            {formatCurrency(creator.total_paid)}
          </span>
          {creator.average_rating_given != null && (
            <>
              <span className="text-white/40">Rating dado</span>
              <span className="text-white/70 font-medium flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400" />
                {creator.average_rating_given.toFixed(1)}
              </span>
            </>
          )}
          {creator.last_collaboration_at && (
            <>
              <span className="text-white/40">Última colaboración</span>
              <span className="text-white/70 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-white/30" />
                {formatDistanceToNow(new Date(creator.last_collaboration_at), { addSuffix: true, locale: es })}
              </span>
            </>
          )}
        </div>
      </DetailSection>

      {/* Specialization */}
      <SpecializationSection
        categories={full?.categories ?? creator.categories ?? null}
        contentTypes={full?.content_types ?? creator.content_types ?? null}
        experienceLevel={full?.experience_level ?? null}
        specialtiesTags={full?.specialties_tags ?? null}
        industries={null}
        languages={full?.languages ?? null}
        styleKeywords={null}
        bestAt={null}
        interests={null}
      />

      {/* Marketplace */}
      {full?.creator_profile_id && (
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

      {/* Portfolio */}
      {full?.portfolio && full.portfolio.length > 0 && (
        <PortfolioSection portfolio={full.portfolio} />
      )}

      {/* Services */}
      {full?.services && full.services.length > 0 && (
        <ServicesSection services={full.services} />
      )}

      {/* Scores (from profiles table) */}
      {full && (
        <ScoresSection
          qualityScoreAvg={null}
          reliabilityScore={null}
          velocityScore={null}
          editorRating={null}
          aiRecommendedLevel={null}
          aiRiskFlag={null}
        />
      )}

      {/* Tags */}
      <DetailSection title="Etiquetas">
        <div className="flex items-center gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Agregar etiqueta..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8 flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={addTag}
            className="h-8 w-8 bg-white/5 hover:bg-white/10 text-white/50"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {tags.map((tag) => (
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
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Notas sobre este talento..."
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-xs"
        />
        {updateRelationship.isPending && (
          <p className="text-[10px] text-white/30">Guardando...</p>
        )}
      </DetailSection>

      {/* Custom Fields */}
      <CustomFieldsSection
        customFields={customFieldsRef.current}
        fieldDefs={fieldDefs.filter(d => d.is_active)}
        onChange={handleCustomFieldChange}
        configAction={
          <button
            onClick={() => setShowFieldsConfig(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Configurar campos"
          >
            <Settings className="h-3.5 w-3.5 text-white/40 hover:text-white/60" />
          </button>
        }
      />

      {/* Info */}
      <DetailSection title="Info">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Creado</span>
          <span className="text-white/70">
            {format(new Date(full?.created_at || creator.created_at), 'd MMM yyyy', { locale: es })}
          </span>
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
