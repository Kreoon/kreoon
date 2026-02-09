import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, FileText, Eye, Video, DollarSign, ClipboardList, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { useCampaignInvitations } from '@/hooks/useCampaignInvitations';
import { CampaignStepBasicInfo } from './CampaignStepBasicInfo';
import { CampaignStepVisibility } from './CampaignStepVisibility';
import { CampaignStepContent } from './CampaignStepContent';
import { CampaignStepBudget } from './CampaignStepBudget';
import { CampaignStepReview } from './CampaignStepReview';
import type { CampaignBasicInfo } from './CampaignStepBasicInfo';
import type { CampaignBudgetData } from './CampaignStepBudget';
import type { CampaignContentRequirement, CampaignCreatorRequirements, CampaignVisibilityData } from '../../types/marketplace';

const STEPS = [
  { id: 'basic', title: 'Basicos', icon: FileText },
  { id: 'visibility', title: 'Alcance', icon: Eye },
  { id: 'content', title: 'Contenido', icon: Video },
  { id: 'budget', title: 'Compensacion', icon: DollarSign },
  { id: 'review', title: 'Revision', icon: ClipboardList },
];

const DRAFT_KEY = 'kreoon_campaign_draft';

interface WizardDraft {
  basicInfo: CampaignBasicInfo;
  visibilityData: CampaignVisibilityData;
  contentRequirements: CampaignContentRequirement[];
  budgetData: CampaignBudgetData;
  creatorRequirements: CampaignCreatorRequirements;
  step: number;
}

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
  const { createCampaign } = useMarketplaceCampaigns();
  const { createBulkInvitations } = useCampaignInvitations();
  const draft = loadDraft();

  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [basicInfo, setBasicInfo] = useState<CampaignBasicInfo>(draft?.basicInfo ?? DEFAULT_BASIC_INFO);
  const [visibilityData, setVisibilityData] = useState<CampaignVisibilityData>(draft?.visibilityData ?? DEFAULT_VISIBILITY);
  const [contentRequirements, setContentRequirements] = useState<CampaignContentRequirement[]>(draft?.contentRequirements ?? DEFAULT_CONTENT);
  const [budgetData, setBudgetData] = useState<CampaignBudgetData>(draft?.budgetData ?? DEFAULT_BUDGET);
  const [creatorRequirements, setCreatorRequirements] = useState<CampaignCreatorRequirements>(draft?.creatorRequirements ?? DEFAULT_CREATOR_REQS);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-save draft (debounced 1s)
  useEffect(() => {
    if (isComplete) return;
    const timeout = setTimeout(() => {
      saveDraftToStorage({ basicInfo, visibilityData, contentRequirements, budgetData, creatorRequirements, step: currentStep });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [basicInfo, visibilityData, contentRequirements, budgetData, creatorRequirements, currentStep, isComplete]);

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
      case 3: { // Budget
        if (budgetData.campaign_type === 'exchange') return !!budgetData.exchange_product_name.trim();
        if (budgetData.campaign_type === 'paid') return budgetData.budget_per_video > 0 || budgetData.total_budget > 0;
        return (budgetData.budget_per_video > 0 || budgetData.total_budget > 0) && !!budgetData.exchange_product_name.trim();
      }
      case 4: // Review
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

      // Create invitations for selective campaigns
      if (visibilityData.visibility === 'selective' && visibilityData.invited_profiles.length > 0) {
        await createBulkInvitations(campaignId, visibilityData.invited_profiles);
      }

      clearDraft();
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
            {' '}Recibiras notificaciones cuando los creadores apliquen.
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
          <CampaignStepBasicInfo data={basicInfo} onChange={updateBasicInfo} />
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
          <CampaignStepContent requirements={contentRequirements} onChange={setContentRequirements} />
        )}
        {currentStep === 3 && (
          <CampaignStepBudget data={budgetData} onChange={updateBudgetData} contentCount={totalVideos} />
        )}
        {currentStep === 4 && (
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
            {currentStep === 4 ? (
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
                  disabled={!isStepValid(4) || isSubmitting}
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
