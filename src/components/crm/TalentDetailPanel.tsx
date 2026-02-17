import { useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPanelShell } from './DetailPanelShell';
import { DetailSection } from './DetailSection';
import { useFullCreatorDetail } from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateUserCustomFields, useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import type { CreatorWithMetrics } from '@/services/crm/platformCrmService';

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

interface TalentDetailPanelProps {
  creator: CreatorWithMetrics;
  onClose: () => void;
}

export function TalentDetailPanel({ creator, onClose }: TalentDetailPanelProps) {
  const { data: full, isLoading: fullLoading } = useFullCreatorDetail(creator.id);
  const userId = full?.user_id || full?.id;
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(
    undefined, // platform-level: no org scope needed for creator entity type
    'creator',
  );
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const updateCustomFields = useUpdateUserCustomFields();
  const updateProfileFields = useUpdateUserProfileFields();

  const customFieldsRef = useRef<Record<string, unknown>>(full?.crm_custom_fields || {});
  if (full?.crm_custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...full.crm_custom_fields };

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    if (!userId) return;
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ userId, fields: updated });
  }, [userId, updateCustomFields]);

  const handleProfileFieldSave = useCallback((data: Record<string, string | null>) => {
    if (!userId) return;
    updateProfileFields.mutate({ userId, data });
  }, [userId, updateProfileFields]);

  const avatar = creator.avatar_url ? (
    <img
      src={creator.avatar_url}
      alt={creator.full_name}
      className="w-11 h-11 rounded-full object-cover"
    />
  ) : (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
      style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}
    >
      {getInitials(creator.full_name)}
    </div>
  );

  return (
    <DetailPanelShell
      onClose={onClose}
      avatar={avatar}
      name={creator.full_name}
      subtitle={creator.username ? `@${creator.username}` : creator.email}
      badges={
        <>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 capitalize">
            {creator.level}
          </span>
          {creator.is_verified && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400">
              Verificado
            </span>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
              creator.is_available
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/10 text-white/50',
            )}
          >
            {creator.is_available ? 'Disponible' : 'No disponible'}
          </span>
        </>
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
        email={creator.email}
        documentType={null}
        documentNumber={null}
        address={null}
        city={full?.location_city ?? creator.location_city ?? null}
        country={full?.location_country ?? creator.location_country ?? null}
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
          featuredVideoUrl={full.featured_video_url}
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

      {/* Specialization */}
      <SpecializationSection
        categories={full?.categories ?? creator.categories}
        contentTypes={full?.content_types ?? creator.content_types}
        experienceLevel={full?.experience_level ?? null}
        specialtiesTags={full?.specialties_tags ?? null}
        industries={full?.industries ?? null}
        languages={full?.languages ?? null}
        styleKeywords={full?.style_keywords ?? null}
        bestAt={full?.best_at ?? null}
        interests={full?.interests ?? null}
      />

      {/* Marketplace */}
      <MarketplaceSection
        slug={full?.slug ?? null}
        level={full?.level ?? creator.level}
        basePrice={full?.base_price ?? creator.base_price}
        currency={full?.currency ?? creator.currency}
        ratingAvg={full?.rating_avg ?? creator.rating_avg}
        ratingCount={full?.rating_count ?? creator.rating_count}
        completedProjects={full?.completed_projects ?? creator.completed_projects}
        marketplaceRoles={full?.marketplace_roles ?? creator.marketplace_roles}
        isVerified={full?.is_verified ?? creator.is_verified}
        acceptsProductExchange={full?.accepts_product_exchange ?? false}
        responseTimeHours={full?.response_time_hours ?? null}
        onTimeDeliveryPct={full?.on_time_delivery_pct ?? null}
        repeatClientsPct={full?.repeat_clients_pct ?? null}
        totalEarned={full?.total_earned ?? creator.total_earned}
      />

      {/* Portfolio */}
      {full?.portfolio && full.portfolio.length > 0 && (
        <PortfolioSection portfolio={full.portfolio} />
      )}

      {/* Services */}
      {full?.services && full.services.length > 0 && (
        <ServicesSection services={full.services} />
      )}

      {/* Scores */}
      {full && (
        <ScoresSection
          qualityScoreAvg={full.quality_score_avg}
          reliabilityScore={full.reliability_score}
          velocityScore={full.velocity_score}
          editorRating={full.editor_rating}
          aiRecommendedLevel={null}
          aiRiskFlag={null}
        />
      )}

      {/* Custom Fields */}
      {full && (
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
      )}

      {/* Status */}
      <DetailSection title="Estado">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Disponible</span>
          <span className="flex items-center gap-1">
            {creator.is_available ? (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            ) : (
              <XCircle className="h-3 w-3 text-red-400" />
            )}
            <span className="text-white/70">{creator.is_available ? 'Sí' : 'No'}</span>
          </span>
          <span className="text-white/40">Verificado</span>
          <span className="flex items-center gap-1">
            {creator.is_verified ? (
              <CheckCircle2 className="h-3 w-3 text-blue-400" />
            ) : (
              <XCircle className="h-3 w-3 text-white/30" />
            )}
            <span className="text-white/70">{creator.is_verified ? 'Sí' : 'No'}</span>
          </span>
          <span className="text-white/40">Activo</span>
          <span className="flex items-center gap-1">
            {creator.is_active ? (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            ) : (
              <Clock className="h-3 w-3 text-white/30" />
            )}
            <span className="text-white/70">{creator.is_active ? 'Sí' : 'No'}</span>
          </span>
          <span className="text-white/40">Registrado</span>
          <span className="text-white/70">
            {format(new Date(creator.created_at), 'd MMM yyyy', { locale: es })}
          </span>
        </div>
      </DetailSection>

      {/* Custom Fields Config Dialog */}
      {showFieldsConfig && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="creator"
          organizationId=""
        />
      )}
    </DetailPanelShell>
  );
}
