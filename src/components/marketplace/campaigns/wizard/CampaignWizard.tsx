import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, FileText, Eye, Video, ImageIcon, DollarSign, ClipboardList, CheckCircle2, Radio, Clapperboard, UserSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignMediaType } from '@/hooks/useMarketplaceCampaigns';
import { useCampaignAnalytics } from '@/analytics';
import { useCampaignInvitations } from '@/hooks/useCampaignInvitations';
import { CampaignStepBasicInfo } from './CampaignStepBasicInfo';
import { CampaignStepVisibility } from './CampaignStepVisibility';
import { CampaignStepContent } from './CampaignStepContent';
import { CampaignStepMedia } from './CampaignStepMedia';
import type { CampaignMediaData } from './CampaignStepMedia';
import { CampaignStepBudget } from './CampaignStepBudget';
import { CampaignStepReview } from './CampaignStepReview';
import type { CampaignBasicInfo } from './CampaignStepBasicInfo';
import type { CampaignBudgetData } from './CampaignStepBudget';
import type { CampaignContentRequirement, CampaignCreatorRequirements, CampaignVisibilityData, MarketplaceRoleId } from '../../types/marketplace';
import { MarketplaceRoleSelector } from '../../roles/MarketplaceRoleSelector';
import { ActivationCampaignConfig } from './ActivationCampaignConfig';
import type { BrandActivationConfig } from '../../types/brandActivation';

type CampaignPurpose = 'content' | 'activation' | 'talent';

const STEPS = [
  { id: 'basic', title: 'Basicos', icon: FileText },
  { id: 'visibility', title: 'Alcance', icon: Eye },
  { id: 'content', title: 'Contenido', icon: Video },
  { id: 'media', title: 'Media', icon: ImageIcon },
  { id: 'budget', title: 'Compensacion', icon: DollarSign },
  { id: 'review', title: 'Revision', icon: ClipboardList },
];

const DRAFT_KEY = 'kreoon_campaign_draft';

interface WizardDraft {
  basicInfo: CampaignBasicInfo;
  visibilityData: CampaignVisibilityData;
  contentRequirements: CampaignContentRequirement[];
  mediaData: CampaignMediaData;
  budgetData: CampaignBudgetData;
  creatorRequirements: CampaignCreatorRequirements;
  isBrandActivation: boolean;
  activationConfig: BrandActivationConfig;
  campaignPurpose: CampaignPurpose;
  step: number;
}

const DEFAULT_MEDIA: CampaignMediaData = {
  coverImageUrl: '',
  coverMediaId: '',
  videoBriefUrl: '',
  videoBriefMediaId: '',
  videoBriefThumbnailUrl: '',
};

const DEFAULT_BASIC_INFO: CampaignBasicInfo = {
  title: '',
  description: '',
  category: '',
  deadline: '',
  tags: [],
};

const DEFAULT_VISIBILITY: CampaignVisibilityData = {
  visibility: 'public',
  organization_id: undefined,
  max_creators: 5,
  max_applications: undefined,
  auto_approve_applications: false,
  requires_portfolio: true,
  invited_profiles: [],
};

const DEFAULT_CONTENT: CampaignContentRequirement[] = [
  { content_type: '', quantity: 1, description: '' },
];

const DEFAULT_BUDGET: CampaignBudgetData = {
  campaign_type: 'paid',
  budget_mode: 'per_video',
  budget_per_video: 0,
  total_budget: 0,
  max_creators: 5,
  exchange_product_name: '',
  exchange_product_value: 0,
  exchange_product_description: '',
  pricing_mode: 'fixed',
  min_bid: 0,
  max_bid: 0,
  bid_deadline: '',
  bid_visibility: 'public',
};

const DEFAULT_CREATOR_REQS: CampaignCreatorRequirements = {
  min_rating: 4.0,
  min_completed_projects: 3,
  categories: [],
  countries: [],
  languages: ['Espanol'],
  content_types: [],
};

const DEFAULT_ACTIVATION_CONFIG: BrandActivationConfig = {
  required_platforms: [],
  min_followers: {},
  required_hashtags: [],
  required_mentions: [],
  min_post_duration_days: 30,
  content_approval_required: true,
  allow_reshare_brand: false,
  usage_rights_duration_days: 90,
  engagement_bonus: { enabled: false, max_bonus: 500000 },
  verification_method: 'manual',
  requires_insights_screenshot: false,
};

function loadDraft(): WizardDraft | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      return parsed.data;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveDraftToStorage(data: WizardDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { createCampaign, uploadCampaignMedia, sendCampaignNotifications } = useMarketplaceCampaigns();
  const { createBulkInvitations } = useCampaignInvitations();
  const { trackCampaignCreated, trackCampaignPublished } = useCampaignAnalytics();
  const draft = loadDraft();

  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [basicInfo, setBasicInfo] = useState<CampaignBasicInfo>(draft?.basicInfo ?? DEFAULT_BASIC_INFO);
  const [visibilityData, setVisibilityData] = useState<CampaignVisibilityData>(draft?.visibilityData ?? DEFAULT_VISIBILITY);
  const [contentRequirements, setContentRequirements] = useState<CampaignContentRequirement[]>(draft?.contentRequirements ?? DEFAULT_CONTENT);
  const [mediaData, setMediaData] = useState<CampaignMediaData>(draft?.mediaData ?? DEFAULT_MEDIA);
  const [budgetData, setBudgetData] = useState<CampaignBudgetData>(draft?.budgetData ?? DEFAULT_BUDGET);
  const [creatorRequirements, setCreatorRequirements] = useState<CampaignCreatorRequirements>(draft?.creatorRequirements ?? DEFAULT_CREATOR_REQS);
  const [campaignPurpose, setCampaignPurpose] = useState<CampaignPurpose>(draft?.campaignPurpose ?? 'content');
  const isBrandActivation = campaignPurpose === 'activation';
  const [activationConfig, setActivationConfig] = useState<BrandActivationConfig>(draft?.activationConfig ?? DEFAULT_ACTIVATION_CONFIG);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notificationsSent, setNotificationsSent] = useState(0);

  // File refs — raw File objects for upload after campaign creation (not serializable to draft)
  const coverFileRef = useRef<File | null>(null);
  const videoBriefFileRef = useRef<File | null>(null);

  // Auto-save draft (debounced 1s) — File refs are NOT serializable, only URLs/IDs persist
  useEffect(() => {
    if (isComplete) return;
    const timeout = setTimeout(() => {
      saveDraftToStorage({ basicInfo, visibilityData, contentRequirements, mediaData, budgetData, creatorRequirements, isBrandActivation, activationConfig, campaignPurpose, step: currentStep });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [basicInfo, visibilityData, contentRequirements, mediaData, budgetData, creatorRequirements, isBrandActivation, activationConfig, campaignPurpose, currentStep, isComplete]);

  const updateBasicInfo = useCallback(<K extends keyof CampaignBasicInfo>(field: K, value: CampaignBasicInfo[K]) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateVisibilityData = useCallback(<K extends keyof CampaignVisibilityData>(field: K, value: CampaignVisibilityData[K]) => {
    setVisibilityData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateBudgetData = useCallback(<K extends keyof CampaignBudgetData>(field: K, value: CampaignBudgetData[K]) => {
    setBudgetData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateCreatorReqs = useCallback(<K extends keyof CampaignCreatorRequirements>(field: K, value: CampaignCreatorRequirements[K]) => {
    setCreatorRequirements(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMediaData = useCallback(<K extends keyof CampaignMediaData>(field: K, value: CampaignMediaData[K]) => {
    setMediaData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMediaTempFile = useCallback((mediaType: 'cover_image' | 'video_brief', file: File) => {
    if (mediaType === 'cover_image') coverFileRef.current = file;
    else videoBriefFileRef.current = file;
  }, []);

  const totalVideos = contentRequirements.reduce((sum, r) => sum + r.quantity, 0);

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Basic info
        return !!(basicInfo.title.trim() && basicInfo.description.trim());
      case 1: // Visibility
        if (visibilityData.visibility === 'selective' && visibilityData.invited_profiles.length === 0) return false;
        return true;
      case 2: // Content
        return contentRequirements.length > 0 && contentRequirements.every(r => r.content_type);
      case 3: // Media (optional — always valid)
        return true;
      case 4: { // Budget
        const isExchange = budgetData.campaign_type === 'exchange';
        const isPaid = budgetData.campaign_type === 'paid';
        const isHybrid = budgetData.campaign_type === 'hybrid';
        const hasExchangeName = !!budgetData.exchange_product_name.trim();

        // Payment validation depends on pricing mode
        const hasPaidAmount = budgetData.pricing_mode === 'auction'
          ? true // auction mode doesn't require a fixed amount
          : budgetData.pricing_mode === 'range'
            ? budgetData.min_bid > 0 && budgetData.max_bid > 0 && budgetData.max_bid >= budgetData.min_bid
            : budgetData.budget_per_video > 0 || budgetData.total_budget > 0; // fixed

        if (isExchange) return hasExchangeName;
        if (isPaid) return hasPaidAmount;
        if (isHybrid) return hasPaidAmount && hasExchangeName;
        return false;
      }
      case 5: // Review
        return termsAccepted;
      default:
        return false;
    }
  };

  const buildCampaignPayload = (status: 'draft' | 'active') => {
    const payload: Record<string, any> = {
      // Basic info
      title: basicInfo.title.trim(),
      description: basicInfo.description.trim(),
      category: basicInfo.category || null,
      deadline: basicInfo.deadline || null,
      tags: basicInfo.tags,
      // Visibility
      visibility: visibilityData.visibility,
      organization_id: visibilityData.organization_id || null,
      max_creators: visibilityData.max_creators,
      max_applications: visibilityData.max_applications || null,
      auto_approve_applications: visibilityData.auto_approve_applications,
      requires_portfolio: visibilityData.requires_portfolio,
      // Content
      content_requirements: contentRequirements,
      // Budget
      campaign_type: budgetData.campaign_type,
      budget_mode: budgetData.budget_mode,
      budget_per_video: budgetData.budget_per_video || null,
      total_budget: budgetData.total_budget || null,
      currency: 'USD',
      pricing_mode: budgetData.pricing_mode,
      min_bid: budgetData.min_bid || null,
      max_bid: budgetData.max_bid || null,
      bid_deadline: budgetData.bid_deadline || null,
      bid_visibility: budgetData.bid_visibility,
      exchange_product_name: budgetData.exchange_product_name || null,
      exchange_product_value: budgetData.exchange_product_value || null,
      exchange_product_description: budgetData.exchange_product_description || null,
      // Creator requirements
      creator_requirements: creatorRequirements,
      desired_roles: creatorRequirements.desired_roles || [],
      // Media — only set if a real (non-temp) URL exists
      cover_image_url: (mediaData.coverMediaId && mediaData.coverMediaId !== 'temp') ? mediaData.coverImageUrl : null,
      // Campaign purpose & Brand Activation
      campaign_purpose: campaignPurpose,
      is_brand_activation: isBrandActivation,
      activation_config: isBrandActivation ? activationConfig : null,
      // Status
      status,
    };

    if (status === 'active') {
      payload.published_at = new Date().toISOString();
      payload.application_deadline = basicInfo.deadline || null;
    }

    return payload;
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildCampaignPayload('active');
      const campaignId = await createCampaign(payload);

      if (!campaignId) {
        throw new Error('No se pudo crear la campana');
      }

      // Upload temp media files now that we have a campaignId
      const mediaUploads: Promise<any>[] = [];

      if (coverFileRef.current) {
        mediaUploads.push(
          uploadCampaignMedia({
            campaign_id: campaignId,
            media_type: 'cover_image' as CampaignMediaType,
            file: coverFileRef.current,
          })
        );
      }

      if (videoBriefFileRef.current) {
        mediaUploads.push(
          uploadCampaignMedia({
            campaign_id: campaignId,
            media_type: 'video_brief' as CampaignMediaType,
            file: videoBriefFileRef.current,
          })
        );
      }

      // Upload media in parallel (non-blocking — campaign is already created)
      if (mediaUploads.length > 0) {
        const results = await Promise.allSettled(mediaUploads);
        results.forEach((r, i) => {
          if (r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)) {
            console.warn(`[CampaignWizard] Media upload ${i} failed (non-blocking)`);
          }
        });
      }

      // Create invitations for selective campaigns
      if (visibilityData.visibility === 'selective' && visibilityData.invited_profiles.length > 0) {
        await createBulkInvitations(campaignId, visibilityData.invited_profiles);
      }

      // Notify eligible creators (non-blocking — campaign is already live)
      const notifResult = await sendCampaignNotifications(campaignId).catch(() => null);
      if (notifResult?.notifications_sent) {
        setNotificationsSent(notifResult.notifications_sent);
      }

      trackCampaignCreated({
        campaign_type: basicInfo.campaign_type || 'standard',
        content_types_required: contentRequirements.map(r => r.content_type),
        platforms_targeted: [],
      });
      trackCampaignPublished({ campaign_id: campaignId });

      clearDraft();
      coverFileRef.current = null;
      videoBriefFileRef.current = null;
      setIsComplete(true);
    } catch (err) {
      console.error('[CampaignWizard] Publish error:', err);
      setSubmitError('Error al publicar la campana. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildCampaignPayload('draft');
      await createCampaign(payload);
      clearDraft();
      navigate('/marketplace/my-campaigns');
    } catch (err) {
      console.error('[CampaignWizard] Save draft error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onClose = () => navigate('/marketplace/dashboard');
  const progress = isComplete ? 100 : ((currentStep + 1) / STEPS.length) * 100;

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0f] overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Campana Publicada</h2>
          <p className="text-gray-400 text-sm">
            Tu campana ya esta visible{' '}
            {visibilityData.visibility === 'public' && 'para todos los creadores del marketplace.'}
            {visibilityData.visibility === 'internal' && 'para los miembros de tu organizacion.'}
            {visibilityData.visibility === 'selective' && `para los ${visibilityData.invited_profiles.length} creadores invitados.`}
            {notificationsSent > 0
              ? ` Se notifico a ${notificationsSent} creador${notificationsSent !== 1 ? 'es' : ''} elegible${notificationsSent !== 1 ? 's' : ''}.`
              : ' Recibiras notificaciones cuando los creadores apliquen.'}
          </p>
          <div className="bg-white/5 rounded-xl p-4 text-left space-y-3">
            <h3 className="text-gray-300 text-sm font-semibold">Proximos pasos</h3>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">1</div>
              <p className="text-gray-400 text-xs">Los creadores encontraran tu campana y aplicaran</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">2</div>
              <p className="text-gray-400 text-xs">Revisa las aplicaciones y selecciona a los mejores creadores</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">3</div>
              <p className="text-gray-400 text-xs">Los creadores aprobados comienzan a producir el contenido</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/marketplace/my-campaigns')}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ver mis campanas
            </button>
            <button
              onClick={() => navigate('/marketplace/campaigns')}
              className="w-full border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm"
            >
              Ir al feed de campanas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">Crear Campana</h1>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/5 rounded-full h-1.5 mb-4">
            <div
              className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step tabs */}
          <div className="flex gap-1">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-purple-500/20 text-purple-300'
                      : isDone
                        ? 'text-gray-400 hover:text-gray-300 cursor-pointer'
                        : 'text-gray-600 cursor-default',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {currentStep === 0 && (
          <div className="space-y-8">
            {/* Campaign Purpose Selector */}
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Tipo de Campaña</h2>
              <p className="text-gray-500 text-sm mb-4">Selecciona el tipo de campaña que deseas crear</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Content Campaign */}
                <button
                  onClick={() => setCampaignPurpose('content')}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden',
                    campaignPurpose === 'content'
                      ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  )}
                >
                  {campaignPurpose === 'content' && (
                    <div className="absolute top-2.5 right-2.5">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}
                  <Clapperboard className="h-7 w-7 text-purple-400 mb-2" />
                  <p className="text-white font-semibold text-sm">Contenido</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Contrata creadores para producir videos, fotos o reels para tus canales
                  </p>
                </button>

                {/* Brand Activation Campaign */}
                <button
                  onClick={() => setCampaignPurpose('activation')}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden',
                    campaignPurpose === 'activation'
                      ? 'border-green-500 bg-green-500/10 ring-1 ring-green-500/30'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  )}
                >
                  {campaignPurpose === 'activation' && (
                    <div className="absolute top-2.5 right-2.5">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}
                  <Radio className="h-7 w-7 text-green-400 mb-2" />
                  <p className="text-white font-semibold text-sm">Activación de Marca</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Creadores publican en sus redes con tus hashtags y menciones
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300">Verificación</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300">Engagement</span>
                  </div>
                </button>

                {/* Talent Search Campaign */}
                <button
                  onClick={() => setCampaignPurpose('talent')}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden',
                    campaignPurpose === 'talent'
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  )}
                >
                  {campaignPurpose === 'talent' && (
                    <div className="absolute top-2.5 right-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}
                  <UserSearch className="h-7 w-7 text-blue-400 mb-2" />
                  <p className="text-white font-semibold text-sm">Búsqueda de Talento</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    Busca editores, estrategas, traffickers u otros roles especializados
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300">Editores</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300">Estrategas</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300">+30 roles</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Role selector (shown when talent purpose is selected) */}
            {campaignPurpose === 'talent' && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                <MarketplaceRoleSelector
                  selectedRoles={creatorRequirements.desired_roles ?? []}
                  onChange={(roles: MarketplaceRoleId[]) => updateCreatorReqs('desired_roles', roles)}
                  maxRoles={10}
                  showCategories
                  excludeCategories={['client']}
                  label="¿Qué roles necesitas?"
                />
              </div>
            )}

            <div className="border-t border-white/10" />

            <CampaignStepBasicInfo data={basicInfo} onChange={updateBasicInfo} />
          </div>
        )}
        {currentStep === 1 && (
          <CampaignStepVisibility
            data={visibilityData}
            creatorRequirements={creatorRequirements}
            onChange={updateVisibilityData}
            onCreatorReqChange={updateCreatorReqs}
          />
        )}
        {currentStep === 2 && (
          <div className="space-y-8">
            <CampaignStepContent requirements={contentRequirements} onChange={setContentRequirements} />

            {/* Activation config (shown when brand activation was selected in Step 0) */}
            {isBrandActivation && (
              <>
                <div className="border-t border-white/10 pt-2" />
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="h-4 w-4 text-green-400" />
                    <p className="text-green-300 text-sm font-semibold">Configuración de Activación de Marca</p>
                  </div>
                  <p className="text-gray-500 text-xs mb-4">Define los requisitos de publicación para los creadores en sus redes sociales</p>
                  <ActivationCampaignConfig config={activationConfig} onChange={setActivationConfig} />
                </div>
              </>
            )}
          </div>
        )}
        {currentStep === 3 && (
          <CampaignStepMedia
            data={mediaData}
            onChange={updateMediaData}
            onTempFile={handleMediaTempFile}
          />
        )}
        {currentStep === 4 && (
          <CampaignStepBudget data={budgetData} onChange={updateBudgetData} contentCount={totalVideos} />
        )}
        {currentStep === 5 && (
          <CampaignStepReview
            basicInfo={basicInfo}
            visibilityData={visibilityData}
            contentRequirements={contentRequirements}
            budgetData={budgetData}
            creatorRequirements={creatorRequirements}
            onEditStep={setCurrentStep}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f] border-t border-white/10 z-10 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 0) onClose();
              else setCurrentStep(prev => prev - 1);
            }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </button>

          <div className="flex gap-2">
            {submitError && (
              <p className="text-red-400 text-xs self-center mr-2">{submitError}</p>
            )}
            {currentStep === 5 ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="border border-white/10 text-gray-400 px-4 py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  Guardar Borrador
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!isStepValid(5) || isSubmitting}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar Campana'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!isStepValid(currentStep)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
