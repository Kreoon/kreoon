import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMarketplaceCampaigns, useCampaignTemplates } from '@/hooks/useMarketplaceCampaigns';
import { SuggestedCreators } from '../SuggestedCreators';
import { FIRST_CAMPAIGN_PROMO } from '@/lib/finance/constants';
import type { CampaignTemplate } from '../../types/marketplace';

interface QuickCampaignWizardProps {
  onClose?: () => void;
  isFirstCampaign?: boolean;
  brandId?: string;
}

export function QuickCampaignWizard({ onClose, isFirstCampaign = false, brandId }: QuickCampaignWizardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createCampaign, publishCampaign } = useMarketplaceCampaigns();
  const { templates, loading: templatesLoading } = useCampaignTemplates();

  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [briefDescription, setBriefDescription] = useState('');
  const [budgetOverride, setBudgetOverride] = useState<number | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-select template from URL param
  const preSelectedSlug = searchParams.get('template');
  const preSelected = useMemo(() => {
    if (preSelectedSlug && templates.length > 0 && !selectedTemplate) {
      return templates.find(t => t.slug === preSelectedSlug) || null;
    }
    return null;
  }, [preSelectedSlug, templates, selectedTemplate]);

  if (preSelected && !selectedTemplate) {
    setSelectedTemplate(preSelected);
    setBudgetOverride(preSelected.default_budget_min);
  }

  const effectiveBudget = budgetOverride ?? selectedTemplate?.default_budget_min ?? 200;

  const canProceed = step === 0
    ? selectedTemplate !== null && campaignName.trim().length > 0 && briefDescription.trim().length > 0
    : true;

  const handleSaveDraft = async () => {
    if (!selectedTemplate || !user) return;
    setSubmitting(true);
    try {
      const payload = buildPayload('draft');
      const id = await createCampaign(payload);
      if (id) {
        toast({ title: 'Borrador guardado' });
        navigate('/marketplace/my-campaigns');
      } else {
        toast({ title: 'Error al guardar', variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedTemplate || !user) return;
    setSubmitting(true);
    try {
      const payload = buildPayload('active');
      const id = await createCampaign(payload);
      if (id) {
        setCreatedCampaignId(id);
        await publishCampaign(id);
        toast({ title: 'Campana publicada exitosamente' });
        navigate('/marketplace/my-campaigns');
      } else {
        toast({ title: 'Error al publicar', variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const buildPayload = (status: 'draft' | 'active') => {
    const t = selectedTemplate!;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + t.default_timeline_days);

    const payload: Record<string, any> = {
      title: campaignName.trim(),
      description: briefDescription.trim(),
      category: t.category,
      deadline: deadline.toISOString(),
      campaign_type: 'paid',
      budget_mode: 'total_budget',
      total_budget: effectiveBudget,
      currency: t.default_currency,
      content_requirements: t.default_deliverables,
      max_creators: t.suggested_creator_count,
      visibility: 'public',
      pricing_mode: 'fixed',
      template_id: t.id,
      is_quick_campaign: true,
      campaign_purpose: 'content',
      tags: [t.category],
      status,
      ...(isFirstCampaign ? { commission_rate: FIRST_CAMPAIGN_PROMO.commission_rate } : {}),
    };

    if (status === 'active') {
      payload.published_at = new Date().toISOString();
      payload.application_deadline = deadline.toISOString();
    }

    return payload;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose || (() => navigate(-1))}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-bold text-white">Campana Express</h1>
          </div>
          <p className="text-gray-500 text-xs">Crea tu campana en 2 pasos</p>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', step >= 0 ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-500')}>1</div>
          <div className="w-6 h-px bg-white/20" />
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', step >= 1 ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-500')}>2</div>
        </div>
      </div>

      {isFirstCampaign && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-4 mb-6 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-300 font-semibold text-sm">{FIRST_CAMPAIGN_PROMO.badge_text}</p>
            <p className="text-green-400/70 text-xs">Tu primera campana no tiene comision de plataforma (0%)</p>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-6">
          {/* Template selection */}
          <div>
            <h2 className="text-white font-semibold mb-3">Elige un tipo de campana</h2>
            {templatesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-purple-400 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t);
                      setBudgetOverride(t.default_budget_min);
                    }}
                    className={cn(
                      'p-4 rounded-sm border text-left transition-all',
                      selectedTemplate?.id === t.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-card/60 hover:border-white/20',
                    )}
                  >
                    <div className="text-2xl mb-2">{t.icon_emoji}</div>
                    <h3 className="text-white font-semibold text-sm">{t.name}</h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>${t.default_budget_min}-${t.default_budget_max}</span>
                      <span>|</span>
                      <span>{t.default_timeline_days}d</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campaign name & brief */}
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 font-medium mb-1.5 block">Nombre de la campana</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="ej: Lanzamiento Verano 2026"
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 font-medium mb-1.5 block">Brief de la campana</label>
                <textarea
                  value={briefDescription}
                  onChange={e => setBriefDescription(e.target.value)}
                  placeholder="Describe brevemente que buscas con esta campana..."
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 min-h-[100px] resize-none"
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 font-medium mb-1.5 block">
                  Presupuesto: ${effectiveBudget.toLocaleString()} {selectedTemplate.default_currency}
                </label>
                <input
                  type="range"
                  min={selectedTemplate.default_budget_min}
                  max={selectedTemplate.default_budget_max}
                  step={50}
                  value={effectiveBudget}
                  onChange={e => setBudgetOverride(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>${selectedTemplate.default_budget_min}</span>
                  <span>${selectedTemplate.default_budget_max}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next button */}
          <div className="flex justify-end">
            <button
              onClick={() => setStep(1)}
              disabled={!canProceed}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-sm font-semibold text-sm transition-all',
                canProceed ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed',
              )}
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          {/* Review summary */}
          <div className="bg-card/80 border border-white/10 rounded-sm p-5 space-y-3">
            <h2 className="text-white font-semibold">Resumen de tu campana</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Tipo:</span>
                <p className="text-white">{selectedTemplate?.icon_emoji} {selectedTemplate?.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Presupuesto:</span>
                <p className="text-white">${effectiveBudget.toLocaleString()} {selectedTemplate?.default_currency}</p>
              </div>
              <div>
                <span className="text-gray-500">Timeline:</span>
                <p className="text-white">{selectedTemplate?.default_timeline_days} dias</p>
              </div>
              <div>
                <span className="text-gray-500">Creadores:</span>
                <p className="text-white">Hasta {selectedTemplate?.suggested_creator_count}</p>
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Nombre:</span>
              <p className="text-white text-sm">{campaignName}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Brief:</span>
              <p className="text-white text-sm">{briefDescription}</p>
            </div>
          </div>

          {/* Smart match preview (only after campaign is created) */}
          {createdCampaignId && (
            <SuggestedCreators campaignId={createdCampaignId} limit={5} />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Atras
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={submitting}
                className="px-5 py-2.5 rounded-sm text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Guardar Borrador
              </button>
              <button
                onClick={handlePublish}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Publicar Campana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
