import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCreatorProfile, type CreatorProfileData, type ProfileCustomization } from '@/hooks/useCreatorProfile';
import { usePortfolioItems } from '@/hooks/usePortfolioItems';
import { useCreatorServices } from '@/hooks/useCreatorServices';
import { WizardStepRoles } from './steps/WizardStepRoles';
import { WizardStepBasicInfo } from './steps/WizardStepBasicInfo';
import { WizardStepExpertise } from './steps/WizardStepExpertise';
import { WizardStepSpecializations } from './steps/WizardStepSpecializations';
import { WizardStepPortfolio } from './steps/WizardStepPortfolio';
import { WizardStepServices } from './steps/WizardStepServices';
import { WizardStepCustomize } from './steps/WizardStepCustomize';
import { WizardStepPublish } from './steps/WizardStepPublish';
import { useUserSpecializations } from '@/hooks/useUserSpecializations';
import type { MarketplaceRoleId } from '../types/marketplace';
import type { Specialization } from '@/types/database';

interface CreatorProfileWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const STEPS = [
  { id: 'roles', label: 'Tipo', shortLabel: 'Tipo' },
  { id: 'basic', label: 'Perfil', shortLabel: 'Perfil' },
  { id: 'expertise', label: 'Expertise', shortLabel: 'Expert' },
  { id: 'specializations', label: 'Especialidades', shortLabel: 'Espec' },
  { id: 'portfolio', label: 'Portafolio', shortLabel: 'Port' },
  { id: 'services', label: 'Servicios', shortLabel: 'Serv' },
  { id: 'customize', label: 'Estilo', shortLabel: 'Estilo' },
  { id: 'publish', label: 'Publicar', shortLabel: 'Pub' },
];

const DRAFT_KEY = 'kreoon_creator_wizard_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Draft state structure
export interface WizardDraftState {
  step: number;
  roles: MarketplaceRoleId[];
  basic: {
    display_name: string;
    tagline: string;
    bio_full: string;
    location_city: string;
    location_country: string;
  };
  expertise: {
    categories: string[];
    content_types: string[];
    platforms: string[];
    languages: string[];
    experience_level: string;
    custom_tags: string[];
  };
  specializations: Specialization[];
  customization: ProfileCustomization;
  services: {
    accepts_exchange: boolean;
    exchange_conditions: string;
    base_price: number | null;
    currency: string;
  };
}

const DEFAULT_DRAFT: WizardDraftState = {
  step: 0,
  roles: [],
  basic: {
    display_name: '',
    tagline: '',
    bio_full: '',
    location_city: '',
    location_country: 'CO',
  },
  expertise: {
    categories: [],
    content_types: [],
    platforms: [],
    languages: ['es'],
    experience_level: '',
    custom_tags: [],
  },
  specializations: [],
  customization: {
    theme: 'dark_purple',
    card_style: 'glass',
    cover_style: 'image',
    sections_order: ['about', 'services', 'portfolio', 'stats', 'reviews'],
    sections_visible: { about: true, services: true, portfolio: true, stats: true, reviews: true },
  },
  services: {
    accepts_exchange: false,
    exchange_conditions: '',
    base_price: null,
    currency: 'USD',
  },
};

function loadDraft(): WizardDraftState | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.timestamp && Date.now() - parsed.timestamp < DRAFT_TTL) {
      return parsed.data;
    }
  } catch { /* ignore */ }
  return null;
}

function saveDraftToStorage(data: WizardDraftState) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function CreatorProfileWizard({ isOpen, onClose, onComplete }: CreatorProfileWizardProps) {
  const { user } = useAuth();
  const { profile: userProfile } = useProfile({ autoFetch: true });
  const creatorProfile = useCreatorProfile({ autoCreate: false });
  const creatorServices = useCreatorServices();
  const { specializations: existingSpecializations, replaceAll: replaceSpecializations } = useUserSpecializations();

  // State to track newly created profile ID (for portfolio step)
  // MUST be declared before effectiveProfileId calculation
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);

  // portfolioItems hook - will be re-initialized when createdProfileId changes
  const effectiveProfileId = creatorProfile.profile?.id || createdProfileId;
  const portfolioItems = usePortfolioItems({ creatorProfileId: effectiveProfileId || undefined });

  const initialDraft = useMemo(() => loadDraft(), []);

  const [currentStep, setCurrentStep] = useState(initialDraft?.step ?? 0);
  const [direction, setDirection] = useState(0); // -1 = back, 1 = forward
  const [draft, setDraft] = useState<WizardDraftState>(() => {
    if (initialDraft) return initialDraft;
    // Pre-populate from existing profile
    if (userProfile) {
      return {
        ...DEFAULT_DRAFT,
        basic: {
          display_name: userProfile.full_name || '',
          tagline: userProfile.tagline || '',
          bio_full: '',
          location_city: userProfile.city || '',
          location_country: userProfile.country || 'CO',
        },
        expertise: {
          ...DEFAULT_DRAFT.expertise,
          categories: userProfile.content_categories || [],
          languages: userProfile.languages || ['es'],
          custom_tags: userProfile.specialties_tags || [],
        },
      };
    }
    return DEFAULT_DRAFT;
  });

  // Pre-populate when userProfile loads
  useEffect(() => {
    if (userProfile && !initialDraft && draft.basic.display_name === '') {
      setDraft(prev => ({
        ...prev,
        basic: {
          display_name: userProfile.full_name || '',
          tagline: userProfile.tagline || '',
          bio_full: '',
          location_city: userProfile.city || '',
          location_country: userProfile.country || 'CO',
        },
        expertise: {
          ...prev.expertise,
          categories: userProfile.content_categories || [],
          languages: userProfile.languages || ['es'],
          custom_tags: userProfile.specialties_tags || [],
        },
      }));
    }
  }, [userProfile, initialDraft]);

  // Pre-populate from existing creator profile
  useEffect(() => {
    if (creatorProfile.profile && !initialDraft) {
      const cp = creatorProfile.profile;
      setDraft(prev => ({
        ...prev,
        roles: (cp.marketplace_roles || []) as MarketplaceRoleId[],
        basic: {
          display_name: cp.display_name || prev.basic.display_name,
          tagline: cp.bio || prev.basic.tagline,
          bio_full: cp.bio_full || prev.basic.bio_full,
          location_city: cp.location_city || prev.basic.location_city,
          location_country: cp.location_country || prev.basic.location_country,
        },
        expertise: {
          categories: cp.categories || prev.expertise.categories,
          content_types: cp.content_types || prev.expertise.content_types,
          platforms: cp.platforms || prev.expertise.platforms,
          languages: cp.languages || prev.expertise.languages,
          experience_level: prev.expertise.experience_level,
          custom_tags: prev.expertise.custom_tags,
        },
        customization: cp.profile_customization || prev.customization,
        services: {
          accepts_exchange: cp.accepts_product_exchange,
          exchange_conditions: cp.exchange_conditions || '',
          base_price: cp.base_price,
          currency: cp.currency || 'USD',
        },
      }));
    }
  }, [creatorProfile.profile, initialDraft]);

  // Pre-populate specializations from existing user specializations
  useEffect(() => {
    if (existingSpecializations.length > 0 && !initialDraft && draft.specializations.length === 0) {
      setDraft(prev => ({
        ...prev,
        specializations: existingSpecializations,
      }));
    }
  }, [existingSpecializations, initialDraft]);

  // Auto-save draft with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftToStorage({ ...draft, step: currentStep });
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft, currentStep]);

  const updateDraft = useCallback((updates: Partial<WizardDraftState>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-create profile before portfolio step if needed
  const ensureProfileExists = useCallback(async (): Promise<string | null> => {
    if (creatorProfile.profile?.id) return creatorProfile.profile.id;
    if (!user?.id) return null;

    try {
      const newProfile = await creatorProfile.createProfile({
        display_name: draft.basic.display_name || userProfile?.full_name || 'Creador',
        bio: draft.basic.tagline,
        bio_full: draft.basic.bio_full,
        location_city: draft.basic.location_city,
        location_country: draft.basic.location_country,
        categories: draft.expertise.categories,
        content_types: draft.expertise.content_types,
        platforms: draft.expertise.platforms,
        languages: draft.expertise.languages,
        marketplace_roles: draft.roles,
        is_active: false, // Not published yet
      });
      if (newProfile?.id) {
        setCreatedProfileId(newProfile.id);
        return newProfile.id;
      }
      return null;
    } catch (err) {
      console.error('[CreatorProfileWizard] Error creating profile:', err);
      return null;
    }
  }, [creatorProfile, user?.id, draft, userProfile?.full_name]);

  const goNext = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      // If moving TO portfolio step (step 4), ensure profile exists first
      if (currentStep === 3 && !creatorProfile.profile?.id && !createdProfileId) {
        const newId = await ensureProfileExists();
        if (!newId) {
          return; // Don't proceed if profile creation failed
        }
      }
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, creatorProfile.profile?.id, createdProfileId, ensureProfileExists]);


  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  // Save all data to DB
  const handlePublish = useCallback(async (publishActive: boolean) => {
    if (!user?.id) return;

    try {
      let profileId = creatorProfile.profile?.id;

      if (!profileId) {
        // Create new creator profile
        const newProfile = await creatorProfile.createProfile({
          display_name: draft.basic.display_name,
          bio: draft.basic.tagline,
          bio_full: draft.basic.bio_full,
          location_city: draft.basic.location_city,
          location_country: draft.basic.location_country,
          categories: draft.expertise.categories,
          content_types: draft.expertise.content_types,
          platforms: draft.expertise.platforms,
          languages: draft.expertise.languages,
          marketplace_roles: draft.roles,
          accepts_product_exchange: draft.services.accepts_exchange,
          exchange_conditions: draft.services.exchange_conditions || null,
          base_price: draft.services.base_price,
          currency: draft.services.currency,
          profile_customization: draft.customization,
          is_active: publishActive,
        });

        profileId = newProfile?.id;
      } else {
        // Update existing
        creatorProfile.updateFields({
          display_name: draft.basic.display_name,
          bio: draft.basic.tagline,
          bio_full: draft.basic.bio_full,
          location_city: draft.basic.location_city,
          location_country: draft.basic.location_country,
          categories: draft.expertise.categories,
          content_types: draft.expertise.content_types,
          platforms: draft.expertise.platforms,
          languages: draft.expertise.languages,
          marketplace_roles: draft.roles,
          accepts_product_exchange: draft.services.accepts_exchange,
          exchange_conditions: draft.services.exchange_conditions || null,
          base_price: draft.services.base_price,
          currency: draft.services.currency,
          profile_customization: draft.customization,
          is_active: publishActive,
        });
        await creatorProfile.save();
      }

      // Save specializations
      if (draft.specializations.length > 0) {
        await replaceSpecializations(draft.specializations);
      }

      clearDraft();
      onComplete?.();
      onClose();
    } catch (err) {
      console.error('[CreatorProfileWizard] Error publishing:', err);
    }
  }, [user?.id, creatorProfile, draft, onClose, onComplete, replaceSpecializations]);

  const handleSaveAndExit = useCallback(() => {
    saveDraftToStorage({ ...draft, step: currentStep });
    onClose();
  }, [draft, currentStep, onClose]);

  if (!isOpen) return null;

  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-background/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveAndExit}
              aria-label="Guardar borrador y cerrar wizard"
              className="p-2 rounded-sm hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-white font-semibold text-lg">
                {creatorProfile.exists ? 'Editar Perfil' : 'Crear Perfil del Marketplace'}
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].label}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAndExit}
            aria-label="Guardar borrador y salir del wizard"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-sm text-foreground/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Guardar y salir</span>
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="relative h-1 bg-white/5"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso del wizard: paso ${currentStep + 1} de ${STEPS.length}`}
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-r-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Step indicators — desktop only */}
        <nav className="hidden md:flex max-w-5xl mx-auto px-8 py-3 gap-1" aria-label="Pasos del wizard">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => index <= currentStep && goToStep(index)}
                disabled={index > currentStep}
                aria-label={`${step.label}${isCompleted ? ' (completado)' : isCurrent ? ' (paso actual)' : ' (pendiente)'}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-sm text-xs font-medium transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isCompleted && 'bg-purple-500/20 text-purple-300 cursor-pointer hover:bg-purple-500/30',
                  isCurrent && 'bg-white/10 text-white',
                  !isCompleted && !isCurrent && 'text-gray-600 cursor-not-allowed'
                )}
              >
                {step.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {currentStep === 0 && (
                <WizardStepRoles
                  selectedRoles={draft.roles}
                  onChange={(roles) => updateDraft({ roles })}
                />
              )}
              {currentStep === 1 && (
                <WizardStepBasicInfo
                  data={draft.basic}
                  avatarUrl={creatorProfile.profile?.avatar_url || userProfile?.avatar_url || null}
                  bannerUrl={creatorProfile.profile?.banner_url || userProfile?.cover_url || null}
                  onChange={(basic) => updateDraft({ basic })}
                />
              )}
              {currentStep === 2 && (
                <WizardStepExpertise
                  data={draft.expertise}
                  onChange={(expertise) => updateDraft({ expertise })}
                />
              )}
              {currentStep === 3 && (
                <WizardStepSpecializations
                  selectedMarketplaceRoles={draft.roles}
                  selectedSpecializations={draft.specializations}
                  onChange={(specializations) => updateDraft({ specializations })}
                />
              )}
              {currentStep === 4 && (
                <WizardStepPortfolio
                  creatorProfileId={effectiveProfileId || null}
                  userId={user?.id || ''}
                  items={portfolioItems.items}
                  adding={portfolioItems.adding}
                  onUploadVideo={portfolioItems.uploadVideo}
                  onUploadImage={portfolioItems.uploadImage}
                  onDeleteItem={portfolioItems.deleteItem}
                  onTogglePin={portfolioItems.togglePin}
                  onReorder={portfolioItems.reorderItems}
                />
              )}
              {currentStep === 5 && (
                <WizardStepServices
                  services={creatorServices.services}
                  servicesData={draft.services}
                  onCreateService={creatorServices.createService}
                  onUpdateService={creatorServices.updateService}
                  onDeleteService={creatorServices.deleteService}
                  onChange={(services) => updateDraft({ services })}
                  userId={user?.id || ''}
                />
              )}
              {currentStep === 6 && (
                <WizardStepCustomize
                  customization={draft.customization}
                  onChange={(customization) => updateDraft({ customization })}
                />
              )}
              {currentStep === 7 && (
                <WizardStepPublish
                  draft={draft}
                  portfolioCount={portfolioItems.items.length}
                  servicesCount={creatorServices.services.length}
                  avatarUrl={creatorProfile.profile?.avatar_url || userProfile?.avatar_url || null}
                  onPublish={() => handlePublish(true)}
                  onSaveDraft={() => handlePublish(false)}
                  saving={creatorProfile.saving}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex-shrink-0 border-t border-white/10 bg-background/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            aria-label="Ir al paso anterior"
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              currentStep === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-foreground/80 hover:bg-white/10'
            )}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Atras
          </button>

          <div className="flex items-center gap-1.5 md:hidden" role="group" aria-label={`Paso ${currentStep + 1} de ${STEPS.length}`}>
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep ? 'bg-purple-500' :
                  index < currentStep ? 'bg-purple-500/40' : 'bg-white/10'
                )}
                aria-hidden="true"
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              aria-label="Ir al siguiente paso"
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-sm text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <div /> // Publish button is inside the step
          )}
        </div>
      </div>
    </div>
  );
}
