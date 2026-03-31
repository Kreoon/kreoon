import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Package, ClipboardList, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { HiringStepBrief } from './HiringStepBrief';
import { HiringStepPackage } from './HiringStepPackage';
import { HiringStepSummary } from './HiringStepSummary';
import { HiringStepPayment } from './HiringStepPayment';
import { HiringSuccess } from './HiringSuccess';
import type { HiringBrief, ProjectPaymentMethod, CreatorFullProfile, CreatorPackage, CreatorStats } from '../types/marketplace';

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

  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [brief, setBrief] = useState<HiringBrief>(draft?.brief ?? DEFAULT_BRIEF);
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

  const selectedPackage = creator.packages.find(p => p.id === selectedPackageId);

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
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

  const progress = isComplete ? 100 : ((currentStep + 1) / STEPS.length) * 100;

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
          <HiringStepBrief data={brief} onChange={updateBriefField} />
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
