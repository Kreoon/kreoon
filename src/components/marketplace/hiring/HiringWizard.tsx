import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Package, ClipboardList, CreditCard, Dna, ArrowRight, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { HiringStepBrief } from './HiringStepBrief';
import { HiringStepPackage } from './HiringStepPackage';
import { HiringStepSummary } from './HiringStepSummary';
import { HiringStepPayment } from './HiringStepPayment';
import { HiringSuccess } from './HiringSuccess';
import type { HiringBrief, ProjectPaymentMethod, CreatorFullProfile, CreatorPackage, CreatorStats } from '../types/marketplace';
import type { CreationMode } from '@/types/unifiedProject.types';

interface HiringWizardProps {
  creatorId: string;
  onClose: () => void;
}

const STEPS = [
  { id: 'brief', title: 'Brief', icon: FileText },
  { id: 'package', title: 'Paquete', icon: Package },
  { id: 'summary', title: 'Resumen', icon: ClipboardList },
  { id: 'payment', title: 'Pago', icon: CreditCard },
];

const DRAFT_KEY = 'kreoon_hiring_draft';

const DEFAULT_BRIEF: HiringBrief = {
  product_name: '',
  product_url: '',
  objective: '',
  target_audience: '',
  key_messages: [],
  references: [],
  tone: '',
  dos: [],
  donts: [],
  deadline: '',
  notes: '',
};

function loadDraft(creatorId: string): { brief: HiringBrief; step: number; packageId: string; paymentMethod: ProjectPaymentMethod } | null {
  try {
    const stored = localStorage.getItem(`${DRAFT_KEY}_${creatorId}`);
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

function saveDraft(
  creatorId: string,
  data: { brief: HiringBrief; step: number; packageId: string; paymentMethod: ProjectPaymentMethod },
) {
  localStorage.setItem(
    `${DRAFT_KEY}_${creatorId}`,
    JSON.stringify({ data, timestamp: Date.now() }),
  );
}

function clearDraft(creatorId: string) {
  localStorage.removeItem(`${DRAFT_KEY}_${creatorId}`);
}

/**
 * Converts useCreatorPublicProfile data into a minimal shape for the wizard.
 */
function dbToWizardCreator(
  data: NonNullable<ReturnType<typeof useCreatorPublicProfile>['data']>
): { display_name: string; packages: CreatorPackage[]; accepts_product_exchange: boolean; exchange_conditions?: string } {
  const { profile, services } = data;

  const packages: CreatorPackage[] = services
    .filter(svc => svc.price_amount != null && svc.price_amount > 0)
    .map(svc => {
      const includes: string[] = [];
      if (svc.deliverables && svc.deliverables.length > 0) {
        for (const del of svc.deliverables) {
          includes.push(del.quantity > 1 ? `${del.quantity}x ${del.item}` : del.item);
        }
      }
      if (svc.revisions_included > 0) {
        includes.push(`${svc.revisions_included} revision(es)`);
      }
      return {
        id: svc.id,
        name: svc.title,
        description: svc.description || '',
        price: svc.price_amount || 0,
        currency: svc.price_currency || profile.currency,
        delivery_days: svc.delivery_days ? `${svc.delivery_days} dias` : '5-7 dias',
        includes,
        is_popular: svc.is_featured,
      };
    });

  if (packages.length > 1) {
    const mid = Math.floor(packages.length / 2);
    packages[mid].is_popular = true;
  }

  return {
    display_name: profile.display_name,
    packages,
    accepts_product_exchange: profile.accepts_product_exchange,
    exchange_conditions: profile.exchange_conditions || undefined,
  };
}

export default function HiringWizard({ creatorId, onClose }: HiringWizardProps) {
  const { user } = useAuth();
  const { data: dbData, loading: creatorLoading } = useCreatorPublicProfile(creatorId);
  const creator = useMemo(() => (dbData ? dbToWizardCreator(dbData) : null), [dbData]);

  const draft = useMemo(() => loadDraft(creatorId), [creatorId]);

  const [creationMode, setCreationMode] = useState<CreationMode | null>(null);
  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [brief, setBrief] = useState<HiringBrief>(draft?.brief ?? DEFAULT_BRIEF);
  const [manualScript, setManualScript] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(
    draft?.packageId ?? creator?.packages.find(p => p.is_popular)?.id ?? creator?.packages[0]?.id ?? '',
  );
  const [paymentMethod, setPaymentMethod] = useState<ProjectPaymentMethod>(draft?.paymentMethod ?? 'payment');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (isComplete) return;
    const timeout = setTimeout(() => {
      saveDraft(creatorId, { brief, step: currentStep, packageId: selectedPackageId, paymentMethod });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [brief, currentStep, selectedPackageId, paymentMethod, creatorId, isComplete]);

  const updateBriefField = useCallback(<K extends keyof HiringBrief>(field: K, value: HiringBrief[K]) => {
    setBrief(prev => ({ ...prev, [field]: value }));
  }, []);

  if (creatorLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <p className="text-gray-400">Cargando creador...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <p className="text-gray-400">Creador no encontrado</p>
      </div>
    );
  }

  // Show creation mode selector first
  if (creationMode === null) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-white">Contratar a {creator.display_name}</h1>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-lg font-semibold text-white">Como deseas crear este proyecto?</h2>
            <p className="text-sm text-gray-400">Elige la forma de enviar el brief al creador</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Mode */}
            <button
              onClick={() => setCreationMode('standard')}
              className={cn(
                'group relative p-6 rounded-lg border-2 border-transparent',
                'bg-purple-500/10',
                'hover:border-purple-500 hover:bg-purple-500/20',
                'transition-all duration-200 text-left'
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Dna className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    Brief Completo
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-sm text-gray-400">
                    Completa el formulario con toda la informacion del producto, objetivo, audiencia y referencias.
                  </p>
                </div>
              </div>
            </button>

            {/* Manual Mode */}
            <button
              onClick={() => setCreationMode('manual')}
              className={cn(
                'group relative p-6 rounded-lg border-2 border-transparent',
                'bg-green-500/10',
                'hover:border-green-500 hover:bg-green-500/20',
                'transition-all duration-200 text-left'
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    Guion Directo
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-sm text-gray-400">
                    Ya tienes el guion listo. Pega directamente las instrucciones para el creador.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedPackage = creator.packages.find(p => p.id === selectedPackageId);

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        // Manual mode: no required fields, can proceed immediately
        if (creationMode === 'manual') {
          return true;
        }
        return !!(brief.product_name.trim() && brief.objective);
      case 1:
        return !!selectedPackageId;
      case 2:
        return termsAccepted;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    clearDraft(creatorId);
    setIsComplete(true);
    setIsSubmitting(false);
  };

  // Manual mode: create project with just title
  const handleManualCreate = async () => {
    if (!manualTitle.trim()) return;
    setIsSubmitting(true);
    // Simulate API call - TODO: replace with actual marketplace project creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    clearDraft(creatorId);
    setIsComplete(true);
    setIsSubmitting(false);
  };

  const progress = isComplete ? 100 : ((currentStep + 1) / STEPS.length) * 100;

  // Manual mode: show simple title + create form
  if (creationMode === 'manual' && !isComplete) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCreationMode(null)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Card */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Creacion Rapida</h2>
                <p className="text-sm text-gray-400">Proyecto con {creator.display_name}</p>
              </div>
            </div>

            {/* Title input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">
                Nombre del proyecto <span className="text-green-400">*</span>
              </label>
              <input
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder="Ej: Video testimonial producto X"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-base placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
              />
              <p className="text-xs text-gray-500">Podras agregar mas detalles despues de crear el proyecto</p>
            </div>

            {/* Create button */}
            <button
              onClick={handleManualCreate}
              disabled={!manualTitle.trim() || isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg text-base transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Crear Proyecto
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <p className="text-center text-xs text-gray-500 mt-6">
            El proyecto se creara en estado borrador. Podras editarlo y agregar brief, paquete y forma de pago despues.
          </p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          <HiringSuccess
            creatorName={creator.display_name}
            packageName={selectedPackage?.name ?? ''}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 border-b border-white/10 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">Contratar a {creator.display_name}</h1>
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
                  onClick={() => {
                    if (i < currentStep) setCurrentStep(i);
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-sm text-xs font-medium transition-all',
                    isActive
                      ? 'bg-purple-500/20 text-purple-300'
                      : isDone
                        ? 'text-gray-400 hover:text-foreground cursor-pointer'
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
          <HiringStepBrief
            data={brief}
            onChange={updateBriefField}
            creationMode={creationMode}
            manualScript={manualScript}
            onManualScriptChange={setManualScript}
          />
        )}
        {currentStep === 1 && (
          <HiringStepPackage
            packages={creator.packages}
            selectedPackageId={selectedPackageId}
            onSelectPackage={setSelectedPackageId}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            acceptsExchange={creator.accepts_product_exchange}
            exchangeConditions={creator.exchange_conditions}
            hasPaidPlan={false}
          />
        )}
        {currentStep === 2 && selectedPackage && (
          <HiringStepSummary
            brief={brief}
            creator={creator}
            selectedPackage={selectedPackage}
            paymentMethod={paymentMethod}
            onEditStep={setCurrentStep}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
          />
        )}
        {currentStep === 3 && selectedPackage && (
          <HiringStepPayment
            selectedPackage={selectedPackage}
            paymentMethod={paymentMethod}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Bottom navigation */}
      {currentStep < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-white/10 z-10 safe-area-bottom">
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
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!isStepValid(currentStep)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-sm text-sm transition-all"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
