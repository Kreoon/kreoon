import { useState, useCallback, useRef } from 'react';
import { Building2, AlertTriangle, RefreshCw, Settings, ShieldCheck, KeyRound, Ban, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPanelShell } from './DetailPanelShell';
import { DetailSection } from './DetailSection';
import { useRecalculateHealthScore, useFullUserDetail } from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateUserCustomFields, useUpdateUserProfileFields } from '@/hooks/useCrmCustomFields';
import { useAuth } from '@/hooks/useAuth';
import type { UserWithHealth } from '@/services/crm/platformCrmService';
import { HEALTH_STATUS_LABELS, HEALTH_STATUS_COLORS } from '@/types/crm.types';
import type { HealthStatus } from '@/types/crm.types';

import { PersonalDataSection } from './detail-sections/PersonalDataSection';
import { ProfileSection } from './detail-sections/ProfileSection';
import { SocialLinksSection } from './detail-sections/SocialLinksSection';
import { SpecializationSection } from './detail-sections/SpecializationSection';
import { MarketplaceSection } from './detail-sections/MarketplaceSection';
import { PortfolioSection } from './detail-sections/PortfolioSection';
import { ServicesSection } from './detail-sections/ServicesSection';
import { RolesBadgesSection } from './detail-sections/RolesBadgesSection';
import { ScoresSection } from './detail-sections/ScoresSection';
import { CustomFieldsSection } from './detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from './detail-sections/CrmFieldsConfigDialog';
import { AdminActionsSection } from './detail-sections/AdminActionsSection';

const ROOT_EMAILS = ['jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'];

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getHealthColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

interface UserDetailPanelProps {
  user: UserWithHealth;
  onClose: () => void;
  onUpdate?: () => void;
}

export function UserDetailPanel({ user, onClose, onUpdate }: UserDetailPanelProps) {
  const { profile } = useAuth();
  const currentUserEmail = profile?.email || '';
  const isRoot = ROOT_EMAILS.includes(currentUserEmail);
  const isPlatformAdmin = isRoot; // Platform CRM is already admin-gated

  const recalculate = useRecalculateHealthScore();
  const { data: full, isLoading: fullLoading } = useFullUserDetail(user.id);
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(
    full?.organization_id || undefined,
    'user',
  );
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const updateCustomFields = useUpdateUserCustomFields();
  const updateProfileFields = useUpdateUserProfileFields();

  // Local state for custom field values (optimistic)
  const customFieldsRef = useRef<Record<string, unknown>>(full?.crm_custom_fields || {});
  if (full?.crm_custom_fields) customFieldsRef.current = { ...customFieldsRef.current, ...full.crm_custom_fields };

  const healthColor = getHealthColor(user.health_score);
  const healthStatus = (user.health_status || 'healthy') as HealthStatus;

  const handleRecalculate = () => {
    recalculate.mutate(user.id, {
      onSuccess: () => onUpdate?.(),
    });
  };

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ userId: user.id, fields: updated });
  }, [user.id, updateCustomFields]);

  const handleProfileFieldSave = useCallback((data: Record<string, string | null>) => {
    updateProfileFields.mutate({ userId: user.id, data });
  }, [user.id, updateProfileFields]);

  const avatar = user.avatar_url ? (
    <img src={user.avatar_url} alt={user.full_name || ''} className="w-11 h-11 rounded-full object-cover" />
  ) : (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
    >
      {getInitials(user.full_name)}
    </div>
  );

  return (
    <DetailPanelShell
      onClose={onClose}
      avatar={avatar}
      name={user.full_name || 'Sin nombre'}
      subtitle={user.role || undefined}
      badges={
        <>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', HEALTH_STATUS_COLORS[healthStatus])}>
            {HEALTH_STATUS_LABELS[healthStatus]}
          </span>
          {user.is_platform_admin && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">
              Admin Plataforma
            </span>
          )}
          {user.is_banned && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/20 text-red-500">
              Bloqueado
            </span>
          )}
          {!user.has_profile && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">
              Sin perfil
            </span>
          )}
          {!user.email_confirmed_at && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400">
              Sin confirmar
            </span>
          )}
          {user.needs_attention && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400">
              Necesita atención
            </span>
          )}
        </>
      }
      menuItems={isPlatformAdmin ? (
        <>
          <DropdownMenuItem onClick={() => {}} className="gap-2 text-xs text-white/70">
            <ShieldCheck className="h-3.5 w-3.5" />
            {user.is_platform_admin ? 'Quitar admin' : 'Hacer admin'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}} className="gap-2 text-xs text-white/70">
            <KeyRound className="h-3.5 w-3.5" />
            Reset contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => {}} className="gap-2 text-xs text-red-400">
            <Ban className="h-3.5 w-3.5" />
            {user.is_banned ? 'Desbloquear' : 'Bloquear'}
          </DropdownMenuItem>
          {isRoot && (
            <DropdownMenuItem onClick={() => {}} className="gap-2 text-xs text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar usuario
            </DropdownMenuItem>
          )}
        </>
      ) : undefined}
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
        email={user.email}
        documentType={full?.document_type ?? null}
        documentNumber={full?.document_number ?? null}
        address={full?.address ?? null}
        city={full?.city ?? null}
        country={full?.country ?? null}
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
      {full && (
        <SpecializationSection
          categories={full.content_categories}
          contentTypes={full.content_types}
          experienceLevel={full.experience_level}
          specialtiesTags={full.specialties_tags}
          industries={full.industries}
          languages={full.languages}
          styleKeywords={full.style_keywords}
          bestAt={full.best_at}
          interests={full.interests}
        />
      )}

      {/* Marketplace (only if user is a creator) */}
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

      {/* Roles & Badges */}
      {full && (
        <RolesBadgesSection
          roles={full.roles}
          badges={full.badges}
          ambassadorLevel={full.ambassador_level}
        />
      )}

      {/* Scores */}
      {full && (
        <ScoresSection
          qualityScoreAvg={full.quality_score_avg}
          reliabilityScore={full.reliability_score}
          velocityScore={full.velocity_score}
          editorRating={full.editor_rating}
          aiRecommendedLevel={full.ai_recommended_level}
          aiRiskFlag={full.ai_risk_flag}
        />
      )}

      {/* Health Score */}
      <DetailSection
        title="Health Score"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
            className="h-6 px-2 text-[10px] text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/10"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', recalculate.isPending && 'animate-spin')} />
            Recalcular
          </Button>
        }
      >
        <div className="flex items-center gap-4">
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${healthColor} ${user.health_score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
            }}
          >
            <div className="absolute inset-1 rounded-full bg-[#0a0118] flex items-center justify-center">
              <span className="text-lg font-bold" style={{ color: healthColor }}>
                {user.health_score}
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-[10px] text-white/40">
              {user.health_score >= 70
                ? 'Usuario activo y saludable'
                : user.health_score >= 40
                  ? 'Actividad en descenso'
                  : 'Riesgo de abandono'}
            </p>
          </div>
        </div>
      </DetailSection>

      {/* Activity */}
      <DetailSection title="Actividad">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Logins totales</span>
          <span className="text-white/70 font-medium">{user.total_logins}</span>
          <span className="text-white/40">Acciones</span>
          <span className="text-white/70 font-medium">{user.total_actions}</span>
          <span className="text-white/40">Días inactivo</span>
          <span className={cn('font-medium', (user.days_since_last_activity ?? 0) > 14 ? 'text-red-400' : 'text-white/70')}>
            {user.days_since_last_activity ?? '—'}
          </span>
          <span className="text-white/40">Último login</span>
          <span className="text-white/70">
            {user.last_login_at
              ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: es })
              : 'Nunca'}
          </span>
        </div>
      </DetailSection>

      {/* Organization */}
      {user.organization_name && (
        <DetailSection title="Organización">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
            <span className="text-sm text-white/70">{user.organization_name}</span>
          </div>
        </DetailSection>
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

      {/* Info */}
      <DetailSection title="Info">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Creado</span>
          <span className="text-white/70">
            {format(new Date(user.created_at), "d MMM yyyy", { locale: es })}
          </span>
          {user.needs_attention && (
            <>
              <span className="text-white/40">Estado</span>
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Necesita atención
              </span>
            </>
          )}
        </div>
      </DetailSection>

      {/* Admin Actions */}
      {isPlatformAdmin && (
        <AdminActionsSection
          userId={user.id}
          userEmail={user.email}
          userName={user.full_name}
          hasProfile={user.has_profile}
          isPlatformAdmin={user.is_platform_admin}
          isBanned={user.is_banned}
          orgId={user.organization_id}
          orgName={user.organization_name}
          currentUserEmail={currentUserEmail}
          onActionComplete={() => onUpdate?.()}
        />
      )}

      {/* Custom Fields Config Dialog */}
      {showFieldsConfig && full?.organization_id && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="user"
          organizationId={full.organization_id}
        />
      )}
    </DetailPanelShell>
  );
}
