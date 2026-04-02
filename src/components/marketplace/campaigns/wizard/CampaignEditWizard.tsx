import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Video,
  ImageIcon,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignMediaType } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignStatus } from '@/components/marketplace/types/marketplace';
import { CampaignStepBasicInfo } from './CampaignStepBasicInfo';
import { CampaignStepVisibility } from './CampaignStepVisibility';
import { CampaignStepContent } from './CampaignStepContent';
import { CampaignStepMedia } from './CampaignStepMedia';
import type { CampaignMediaData } from './CampaignStepMedia';
import { CampaignStepBudget } from './CampaignStepBudget';
import { CampaignStepReview } from './CampaignStepReview';
import type { CampaignBasicInfo } from './CampaignStepBasicInfo';
import type { CampaignBudgetData } from './CampaignStepBudget';
import type {
  CampaignContentRequirement,
  CampaignCreatorRequirements,
  CampaignVisibilityData,
} from '../../types/marketplace';
import { ActivationCampaignConfig } from './ActivationCampaignConfig';
import type { BrandActivationConfig } from '../../types/brandActivation';

// ── Types ────────────────────────────────────────────────────────────

type CampaignPurpose = 'content' | 'activation' | 'talent' | 'live_shopping';

interface EditableFields {
  basicInfo: boolean;
  visibility: boolean;
  content: boolean;
  media: boolean;
  budget: boolean;
}

interface CampaignEditWizardProps {
  campaignId: string;
  onClose?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

const STEPS = [
  { id: 'basic', title: 'Basicos', icon: FileText },
  { id: 'visibility', title: 'Alcance', icon: Eye },
  { id: 'content', title: 'Contenido', icon: Video },
  { id: 'media', title: 'Media', icon: ImageIcon },
  { id: 'budget', title: 'Compensacion', icon: DollarSign },
  { id: 'review', title: 'Revision', icon: ClipboardList },
];

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
  requires_agency_support: false,
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

// ── Editability rules per status ─────────────────────────────────────

function getEditableFields(status: CampaignStatus): EditableFields {
  switch (status) {
    case 'draft':
    case 'paused':
      // Editable: todo
      return {
        basicInfo: true,
        visibility: true,
        content: true,
        media: true,
        budget: true,
      };
    case 'active':
    case 'in_progress':
      // Editable: solo titulo, descripcion, deadline, max_creators
      return {
        basicInfo: true, // title, description, deadline (category locked via component)
        visibility: true, // max_creators only
        content: false,
        media: true, // Can add/change media
        budget: false,
      };
    case 'completed':
    case 'cancelled':
      // Read-only
      return {
        basicInfo: false,
        visibility: false,
        content: false,
        media: false,
        budget: false,
      };
    default:
      return {
        basicInfo: false,
        visibility: false,
        content: false,
        media: false,
        budget: false,
      };
  }
}

function getStatusLabel(status: CampaignStatus): string {
  const labels: Record<CampaignStatus, string> = {
    draft: 'Borrador',
    active: 'Activa',
    paused: 'Pausada',
    in_progress: 'En Progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

function getStatusColor(status: CampaignStatus): string {
  const colors: Record<CampaignStatus, string> = {
    draft: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    completed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return colors[status] || 'bg-gray-500/15 text-gray-400';
}

// ── Component ────────────────────────────────────────────────────────

export default function CampaignEditWizard({ campaignId, onClose }: CampaignEditWizardProps) {
  const navigate = useNavigate();
  const { updateCampaign, uploadCampaignMedia } = useMarketplaceCampaigns();

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Campaign status (determines editability)
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>('draft');

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [basicInfo, setBasicInfo] = useState<CampaignBasicInfo>(DEFAULT_BASIC_INFO);
  const [visibilityData, setVisibilityData] = useState<CampaignVisibilityData>(DEFAULT_VISIBILITY);
  const [contentRequirements, setContentRequirements] = useState<CampaignContentRequirement[]>(DEFAULT_CONTENT);
  const [mediaData, setMediaData] = useState<CampaignMediaData>(DEFAULT_MEDIA);
  const [budgetData, setBudgetData] = useState<CampaignBudgetData>(DEFAULT_BUDGET);
  const [creatorRequirements, setCreatorRequirements] = useState<CampaignCreatorRequirements>(DEFAULT_CREATOR_REQS);
  const [campaignPurpose, setCampaignPurpose] = useState<CampaignPurpose>('content');
  const [activationConfig, setActivationConfig] = useState<BrandActivationConfig>(DEFAULT_ACTIVATION_CONFIG);
  const [termsAccepted, setTermsAccepted] = useState(true); // Already accepted when editing

  // File refs for media upload
  const coverFileRef = useRef<File | null>(null);
  const videoBriefFileRef = useRef<File | null>(null);

  // Derived state
  const editableFields = getEditableFields(campaignStatus);
  const isReadOnly = !Object.values(editableFields).some(v => v);
  const isBrandActivation = campaignPurpose === 'activation';

  // ── Load campaign data ─────────────────────────────────────────────

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await (supabase as any)
          .from('marketplace_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (error || !data) {
          throw new Error(error?.message || 'Campana no encontrada');
        }

        if (cancelled) return;

        // Set campaign status
        setCampaignStatus(data.status as CampaignStatus);

        // Populate form fields
        setBasicInfo({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          deadline: data.deadline ? data.deadline.slice(0, 10) : '',
          tags: data.tags || [],
        });

        setVisibilityData({
          visibility: data.visibility || 'public',
          organization_id: data.organization_id || undefined,
          max_creators: data.max_creators || 5,
          max_applications: data.max_applications || undefined,
          auto_approve_applications: data.auto_approve_applications || false,
          requires_portfolio: data.requires_portfolio ?? true,
          invited_profiles: [],
        });

        setContentRequirements(
          data.content_requirements?.length ? data.content_requirements : DEFAULT_CONTENT,
        );

        setMediaData({
          coverImageUrl: data.cover_image_url || '',
          coverMediaId: data.cover_image_url ? 'existing' : '',
          videoBriefUrl: '',
          videoBriefMediaId: '',
          videoBriefThumbnailUrl: '',
        });

        setBudgetData({
          campaign_type: data.campaign_type || 'paid',
          budget_mode: data.budget_mode || 'per_video',
          budget_per_video: data.budget_per_video || 0,
          total_budget: data.total_budget || 0,
          max_creators: data.max_creators || 5,
          exchange_product_name: data.exchange_product_name || '',
          exchange_product_value: data.exchange_product_value || 0,
          exchange_product_description: data.exchange_product_description || '',
          pricing_mode: data.pricing_mode || 'fixed',
          min_bid: data.min_bid || 0,
          max_bid: data.max_bid || 0,
          bid_deadline: data.bid_deadline ? data.bid_deadline.slice(0, 10) : '',
          bid_visibility: data.bid_visibility || 'public',
          requires_agency_support: data.requires_agency_support || false,
        });

        setCreatorRequirements(data.creator_requirements || DEFAULT_CREATOR_REQS);
        setCampaignPurpose(data.campaign_purpose || 'content');
        if (data.activation_config) setActivationConfig(data.activation_config);
      } catch (err: any) {
        console.error('[CampaignEditWizard] Error loading campaign:', err);
        if (!cancelled) setLoadError(err.message || 'Error al cargar la campana');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // ── Update callbacks ───────────────────────────────────────────────

  const updateBasicInfo = useCallback(
    <K extends keyof CampaignBasicInfo>(field: K, value: CampaignBasicInfo[K]) => {
      if (!editableFields.basicInfo) return;
      setBasicInfo(prev => ({ ...prev, [field]: value }));
    },
    [editableFields.basicInfo],
  );

  const updateVisibilityData = useCallback(
    <K extends keyof CampaignVisibilityData>(field: K, value: CampaignVisibilityData[K]) => {
      if (!editableFields.visibility) return;
      // For active campaigns, only allow max_creators update
      if (campaignStatus === 'active' || campaignStatus === 'in_progress') {
        if (field !== 'max_creators') return;
      }
      setVisibilityData(prev => ({ ...prev, [field]: value }));
    },
    [editableFields.visibility, campaignStatus],
  );

  const updateBudgetData = useCallback(
    <K extends keyof CampaignBudgetData>(field: K, value: CampaignBudgetData[K]) => {
      if (!editableFields.budget) return;
      setBudgetData(prev => ({ ...prev, [field]: value }));
    },
    [editableFields.budget],
  );

  const updateCreatorReqs = useCallback(
    <K extends keyof CampaignCreatorRequirements>(field: K, value: CampaignCreatorRequirements[K]) => {
      if (!editableFields.visibility) return;
      setCreatorRequirements(prev => ({ ...prev, [field]: value }));
    },
    [editableFields.visibility],
  );

  const updateMediaData = useCallback(
    <K extends keyof CampaignMediaData>(field: K, value: CampaignMediaData[K]) => {
      if (!editableFields.media) return;
      setMediaData(prev => ({ ...prev, [field]: value }));
    },
    [editableFields.media],
  );

  const handleMediaTempFile = useCallback(
    (mediaType: 'cover_image' | 'video_brief', file: File) => {
      if (!editableFields.media) return;
      if (mediaType === 'cover_image') coverFileRef.current = file;
      else videoBriefFileRef.current = file;
    },
    [editableFields.media],
  );

  const totalVideos = contentRequirements.reduce((sum, r) => sum + r.quantity, 0);

  // ── Validation ─────────────────────────────────────────────────────

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(basicInfo.title.trim() && basicInfo.description.trim());
      case 1:
        if (visibilityData.visibility === 'selective' && visibilityData.invited_profiles.length === 0) {
          return false;
        }
        return true;
      case 2:
        return contentRequirements.length > 0 && contentRequirements.every(r => r.content_type);
      case 3:
        return true;
      case 4: {
        const isExchange = budgetData.campaign_type === 'exchange';
        const isPaid = budgetData.campaign_type === 'paid';
        const isHybrid = budgetData.campaign_type === 'hybrid';
        const hasExchangeName = !!budgetData.exchange_product_name.trim();

        const hasPaidAmount =
          budgetData.pricing_mode === 'auction'
            ? budgetData.budget_per_video > 0
            : budgetData.pricing_mode === 'range'
              ? budgetData.min_bid > 0 && budgetData.max_bid > 0 && budgetData.max_bid >= budgetData.min_bid
              : budgetData.budget_per_video > 0 || budgetData.total_budget > 0;

        if (isExchange) return hasExchangeName;
        if (isPaid) return hasPaidAmount;
        if (isHybrid) return hasPaidAmount && hasExchangeName;
        return false;
      }
      case 5:
        return termsAccepted;
      default:
        return false;
    }
  };

  // ── Build payload ──────────────────────────────────────────────────

  const buildUpdatePayload = () => {
    const payload: Record<string, any> = {};

    // Only include fields that are editable based on status
    if (editableFields.basicInfo) {
      payload.title = basicInfo.title.trim();
      payload.description = basicInfo.description.trim();
      payload.deadline = basicInfo.deadline || null;
      // Category only editable for draft/paused
      if (campaignStatus === 'draft' || campaignStatus === 'paused') {
        payload.category = basicInfo.category || null;
        payload.tags = basicInfo.tags;
      }
    }

    if (editableFields.visibility) {
      payload.max_creators = visibilityData.max_creators;
      // Full visibility editable for draft/paused
      if (campaignStatus === 'draft' || campaignStatus === 'paused') {
        payload.visibility = visibilityData.visibility;
        payload.organization_id = visibilityData.organization_id || null;
        payload.max_applications = visibilityData.max_applications || null;
        payload.auto_approve_applications = visibilityData.auto_approve_applications;
        payload.requires_portfolio = visibilityData.requires_portfolio;
        payload.creator_requirements = creatorRequirements;
        payload.desired_roles = creatorRequirements.desired_roles || [];
      }
    }

    if (editableFields.content) {
      payload.content_requirements = contentRequirements;
      payload.campaign_purpose = campaignPurpose;
      payload.is_brand_activation = isBrandActivation;
      payload.activation_config = isBrandActivation ? activationConfig : null;
    }

    if (editableFields.budget) {
      payload.campaign_type = budgetData.campaign_type;
      payload.budget_mode = budgetData.budget_mode;
      payload.budget_per_video = budgetData.budget_per_video || null;
      payload.total_budget = budgetData.total_budget || null;
      payload.pricing_mode = budgetData.pricing_mode;
      payload.min_bid = budgetData.min_bid || null;
      payload.max_bid = budgetData.max_bid || null;
      payload.bid_deadline = budgetData.bid_deadline || null;
      payload.bid_visibility = budgetData.bid_visibility;
      payload.exchange_product_name = budgetData.exchange_product_name || null;
      payload.exchange_product_value = budgetData.exchange_product_value || null;
      payload.exchange_product_description = budgetData.exchange_product_description || null;
      payload.requires_agency_support = budgetData.requires_agency_support;
    }

    if (editableFields.media && mediaData.coverMediaId && mediaData.coverMediaId !== 'temp') {
      payload.cover_image_url = mediaData.coverImageUrl || null;
    }

    return payload;
  };

  // ── Upload media files ─────────────────────────────────────────────

  const uploadMediaFiles = async () => {
    if (!editableFields.media) return;

    const mediaUploads: Promise<any>[] = [];

    if (coverFileRef.current) {
      mediaUploads.push(
        uploadCampaignMedia({
          campaign_id: campaignId,
          media_type: 'cover_image' as CampaignMediaType,
          file: coverFileRef.current,
        }),
      );
    }

    if (videoBriefFileRef.current) {
      mediaUploads.push(
        uploadCampaignMedia({
          campaign_id: campaignId,
          media_type: 'video_brief' as CampaignMediaType,
          file: videoBriefFileRef.current,
        }),
      );
    }

    if (mediaUploads.length > 0) {
      const results = await Promise.allSettled(mediaUploads);
      results.forEach((r, i) => {
        if (r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)) {
          console.warn(`[CampaignEditWizard] Media upload ${i} failed (non-blocking)`);
        }
      });
    }
  };

  // ── Save changes ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (isReadOnly) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload media first
      await uploadMediaFiles();

      // Build and send update payload
      const payload = buildUpdatePayload();
      const success = await updateCampaign(campaignId, payload);

      if (!success) {
        throw new Error('No se pudo actualizar la campana');
      }

      // Clear file refs
      coverFileRef.current = null;
      videoBriefFileRef.current = null;

      setIsSaved(true);

      // Redirect after short delay
      setTimeout(() => {
        navigate('/marketplace/my-campaigns');
      }, 1500);
    } catch (err: any) {
      console.error('[CampaignEditWizard] Save error:', err);
      setSubmitError(err?.message || 'Error al guardar los cambios');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/marketplace/my-campaigns');
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Cargando campana...</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Error al cargar</h2>
          <p className="text-gray-400 text-sm">{loadError}</p>
          <button
            onClick={handleClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-sm text-sm transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────

  if (isSaved) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Cambios guardados</h2>
          <p className="text-gray-400 text-sm">Redirigiendo a tus campanas...</p>
        </div>
      </div>
    );
  }

  // ── Render blocked field indicator ─────────────────────────────────

  const BlockedFieldOverlay = ({ children, isBlocked }: { children: React.ReactNode; isBlocked: boolean }) => {
    if (!isBlocked) return <>{children}</>;

    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 bg-background/60-[1px] rounded-sm flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-sm border border-white/10">
            <Lock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">
              No editable en campana {getStatusLabel(campaignStatus).toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 border-b border-white/10 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white">Editar Campana</h1>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', getStatusColor(campaignStatus))}>
                {getStatusLabel(campaignStatus)}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Read-only banner */}
          {isReadOnly && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm px-4 py-2 mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300 text-sm">
                Esta campana esta en modo solo lectura. Las campanas {getStatusLabel(campaignStatus).toLowerCase()}s no
                pueden ser editadas.
              </span>
            </div>
          )}

          {/* Limited edit banner */}
          {!isReadOnly && (campaignStatus === 'active' || campaignStatus === 'in_progress') && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-sm px-4 py-2 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-sm">
                Solo puedes editar titulo, descripcion, fecha limite y maximo de creadores en campanas activas.
              </span>
            </div>
          )}

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
              const stepEditable =
                i === 0
                  ? editableFields.basicInfo
                  : i === 1
                    ? editableFields.visibility
                    : i === 2
                      ? editableFields.content
                      : i === 3
                        ? editableFields.media
                        : i === 4
                          ? editableFields.budget
                          : true;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-sm text-xs font-medium transition-all cursor-pointer',
                    isActive
                      ? 'bg-purple-500/20 text-purple-300'
                      : isDone
                        ? 'text-gray-400 hover:text-foreground'
                        : 'text-gray-600 hover:text-gray-400',
                    !stepEditable && 'opacity-50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.title}</span>
                  {!stepEditable && <Lock className="h-2.5 w-2.5 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {currentStep === 0 && (
          <BlockedFieldOverlay isBlocked={!editableFields.basicInfo}>
            <CampaignStepBasicInfo data={basicInfo} onChange={updateBasicInfo} />
          </BlockedFieldOverlay>
        )}

        {currentStep === 1 && (
          <BlockedFieldOverlay isBlocked={!editableFields.visibility}>
            <CampaignStepVisibility
              data={visibilityData}
              creatorRequirements={creatorRequirements}
              onChange={updateVisibilityData}
              onCreatorReqChange={updateCreatorReqs}
            />
          </BlockedFieldOverlay>
        )}

        {currentStep === 2 && (
          <BlockedFieldOverlay isBlocked={!editableFields.content}>
            <div className="space-y-8">
              <CampaignStepContent
                requirements={contentRequirements}
                onChange={editableFields.content ? setContentRequirements : () => {}}
              />

              {isBrandActivation && (
                <>
                  <div className="border-t border-white/10 pt-2" />
                  <div className="bg-green-500/5 border border-green-500/20 rounded-sm p-4">
                    <ActivationCampaignConfig
                      config={activationConfig}
                      onChange={editableFields.content ? setActivationConfig : () => {}}
                    />
                  </div>
                </>
              )}
            </div>
          </BlockedFieldOverlay>
        )}

        {currentStep === 3 && (
          <BlockedFieldOverlay isBlocked={!editableFields.media}>
            <CampaignStepMedia
              data={mediaData}
              campaignId={campaignId}
              onChange={updateMediaData}
              onTempFile={handleMediaTempFile}
            />
          </BlockedFieldOverlay>
        )}

        {currentStep === 4 && (
          <BlockedFieldOverlay isBlocked={!editableFields.budget}>
            <CampaignStepBudget
              data={budgetData}
              onChange={updateBudgetData}
              contentCount={totalVideos}
              desiredRoles={creatorRequirements.desired_roles}
            />
          </BlockedFieldOverlay>
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
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-white/10 z-10 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep === 0) handleClose();
              else setCurrentStep(prev => prev - 1);
            }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </button>

          <div className="flex gap-2">
            {submitError && <p className="text-red-400 text-xs self-center mr-2">{submitError}</p>}

            {currentStep === 5 ? (
              <button
                onClick={handleSave}
                disabled={isReadOnly || isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 px-6 py-2.5 rounded-sm text-sm font-semibold transition-all',
                  isReadOnly
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white',
                  isSubmitting && 'opacity-50 cursor-wait',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!isStepValid(currentStep)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-sm text-sm transition-all"
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
