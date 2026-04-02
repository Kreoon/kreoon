import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Target,
  Users,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useIndustries } from '@/hooks/useCreatorMatching';
import type { CompanyProfileInput, IndustryId, BudgetRange, ContentStyle } from '@/types/ai-matching';
import {
  INDUSTRY_DATA,
  CONTENT_STYLE_LABELS,
  BUDGET_RANGE_LABELS,
} from '@/types/ai-matching';
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_CATEGORIES } from '@/types/marketplace';

interface CompanyOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

type Step = 'company' | 'industry' | 'audience' | 'preferences' | 'complete';

const STEPS: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: 'company', title: 'Tu empresa', icon: Building2 },
  { id: 'industry', title: 'Industria', icon: Target },
  { id: 'audience', title: 'Audiencia', icon: Users },
  { id: 'preferences', title: 'Preferencias', icon: Sparkles },
  { id: 'complete', title: 'Listo', icon: Check },
];

const BRAND_VOICE_OPTIONS = [
  { value: 'professional', label: 'Profesional', desc: 'Formal y corporativo' },
  { value: 'friendly', label: 'Amigable', desc: 'Cercano y accesible' },
  { value: 'casual', label: 'Casual', desc: 'Relajado e informal' },
  { value: 'inspirational', label: 'Inspiracional', desc: 'Motivador y aspiracional' },
  { value: 'humorous', label: 'Humorístico', desc: 'Divertido y entretenido' },
  { value: 'educational', label: 'Educativo', desc: 'Informativo y didáctico' },
];

const CONTENT_GOALS = [
  { value: 'brand_awareness', label: 'Reconocimiento de marca' },
  { value: 'lead_generation', label: 'Generación de leads' },
  { value: 'sales', label: 'Ventas directas' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'education', label: 'Educar audiencia' },
  { value: 'community', label: 'Construir comunidad' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
];

export function CompanyOnboarding({
  onComplete,
  onSkip,
  className,
}: CompanyOnboardingProps) {
  const { upsertProfile, isUpdating } = useCompanyProfile();
  const { data: industries = [] } = useIndustries();

  const [currentStep, setCurrentStep] = useState<Step>('company');
  const [formData, setFormData] = useState<Partial<CompanyProfileInput>>({
    company_name: '',
    company_description: '',
    company_logo_url: '',
    industry: undefined,
    sub_industry: '',
    niche_tags: [],
    target_audience: '',
    brand_voice: '',
    content_goals: [],
    preferred_content_types: [],
    preferred_platforms: [],
    preferred_creator_styles: [],
    typical_budget_range: undefined,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState('');

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const updateField = <K extends keyof CompanyProfileInput>(
    key: K,
    value: CompanyProfileInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayField = <K extends keyof CompanyProfileInput>(
    key: K,
    value: string
  ) => {
    setFormData((prev) => {
      const current = (prev[key] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const addCustomTag = () => {
    if (customTag.trim() && !formData.niche_tags?.includes(customTag.trim())) {
      updateField('niche_tags', [...(formData.niche_tags || []), customTag.trim()]);
      setCustomTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateField('niche_tags', (formData.niche_tags || []).filter((t) => t !== tag));
  };

  const nextStep = () => {
    const idx = STEPS.findIndex((s) => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = STEPS.findIndex((s) => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id);
    }
  };

  const handleComplete = async () => {
    try {
      await upsertProfile(formData as CompanyProfileInput);
      setCurrentStep('complete');
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'company':
        return !!formData.company_name?.trim();
      case 'industry':
        return !!formData.industry;
      case 'audience':
        return !!formData.target_audience?.trim();
      case 'preferences':
        return true;
      default:
        return true;
    }
  };

  const selectedIndustry = formData.industry
    ? industries.find((i) => i.id === formData.industry)
    : null;

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            Configura tu perfil de empresa
          </h1>
          {onSkip && currentStep !== 'complete' && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Saltar por ahora
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.slice(0, -1).map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-1 text-xs",
                idx <= stepIndex
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <step.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Step 1: Company Info */}
          {currentStep === 'company' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Cuéntanos sobre tu empresa
                </h2>
                <p className="text-muted-foreground mt-2">
                  Esta información nos ayudará a encontrar los creadores perfectos para ti
                </p>
              </div>

              {/* Logo upload */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} />
                  ) : (
                    <AvatarFallback className="bg-background">
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Subir logo
                </Button>
              </div>

              {/* Company name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nombre de la empresa *
                </label>
                <Input
                  placeholder="Ej: Mi Empresa S.A."
                  value={formData.company_name || ''}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Descripción breve
                </label>
                <Textarea
                  placeholder="¿A qué se dedica tu empresa? ¿Cuál es su propuesta de valor?"
                  value={formData.company_description || ''}
                  onChange={(e) => updateField('company_description', e.target.value)}
                  className="bg-background border-border min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Industry */}
          {currentStep === 'industry' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  ¿En qué industria operas?
                </h2>
                <p className="text-muted-foreground mt-2">
                  Esto nos ayuda a recomendar creadores especializados en tu sector
                </p>
              </div>

              {/* Industry grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {industries.map((industry) => (
                  <button
                    key={industry.id}
                    onClick={() => updateField('industry', industry.id as IndustryId)}
                    className={cn(
                      "p-4 rounded-sm border-2 text-left transition-all",
                      formData.industry === industry.id
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl mb-2 block">{industry.icon}</span>
                    <p className="font-medium text-foreground text-sm">
                      {industry.name_es}
                    </p>
                  </button>
                ))}
              </div>

              {/* Niche tags */}
              {selectedIndustry && (
                <div className="space-y-3 pt-4">
                  <label className="text-sm font-medium text-foreground">
                    Etiquetas de nicho (opcional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndustry.common_keywords?.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant={formData.niche_tags?.includes(keyword) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayField('niche_tags', keyword)}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar etiqueta personalizada"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                      className="bg-background border-border"
                    />
                    <Button variant="outline" onClick={addCustomTag}>
                      Agregar
                    </Button>
                  </div>

                  {/* Selected tags */}
                  {(formData.niche_tags?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.niche_tags?.map((tag) => (
                        <Badge key={tag} className="gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Target Audience */}
          {currentStep === 'audience' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  ¿Quién es tu audiencia?
                </h2>
                <p className="text-muted-foreground mt-2">
                  Conocer a tu público nos ayuda a encontrar creadores que conecten con ellos
                </p>
              </div>

              {/* Target audience */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Describe tu audiencia objetivo *
                </label>
                <Textarea
                  placeholder="Ej: Mujeres de 25-45 años interesadas en bienestar, salud y lifestyle premium..."
                  value={formData.target_audience || ''}
                  onChange={(e) => updateField('target_audience', e.target.value)}
                  className="bg-background border-border min-h-[120px]"
                />
              </div>

              {/* Brand voice */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Tono de tu marca
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BRAND_VOICE_OPTIONS.map((voice) => (
                    <button
                      key={voice.value}
                      onClick={() => updateField('brand_voice', voice.value)}
                      className={cn(
                        "p-3 rounded-sm border text-left transition-all",
                        formData.brand_voice === voice.value
                          ? "border-primary bg-secondary"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <p className="font-medium text-foreground text-sm">
                        {voice.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {voice.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content goals */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Objetivos de contenido
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_GOALS.map((goal) => (
                    <Badge
                      key={goal.value}
                      variant={formData.content_goals?.includes(goal.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('content_goals', goal.value)}
                    >
                      {goal.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 'preferences' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Preferencias de contenido
                </h2>
                <p className="text-muted-foreground mt-2">
                  Casi terminamos. Cuéntanos qué tipo de contenido buscas
                </p>
              </div>

              {/* Content types */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Tipos de contenido que te interesan
                </label>
                <div className="space-y-3">
                  {Object.entries(SERVICE_TYPE_CATEGORIES).map(([catKey, category]) => (
                    <div key={catKey}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{category.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.types.map(type => (
                          <Badge
                            key={type}
                            variant={formData.preferred_content_types?.includes(type) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayField('preferred_content_types', type)}
                          >
                            {SERVICE_TYPE_LABELS[type]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Plataformas de interés
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <Badge
                      key={platform.value}
                      variant={formData.preferred_platforms?.includes(platform.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('preferred_platforms', platform.value)}
                    >
                      {platform.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Creator styles */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Estilos de creador preferidos
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CONTENT_STYLE_LABELS).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant={formData.preferred_creator_styles?.includes(key as ContentStyle) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('preferred_creator_styles', key)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Presupuesto típico por proyecto
                </label>
                <Select
                  value={formData.typical_budget_range}
                  onValueChange={(v) => updateField('typical_budget_range', v as BudgetRange)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecciona un rango" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_RANGE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6"
              >
                <Check className="h-10 w-10 text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                ¡Perfil completado!
              </h2>
              <p className="text-muted-foreground">
                Ya puedes empezar a descubrir creadores perfectos para tu marca
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'complete' && (
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {currentStep === 'preferences' ? (
            <Button
              onClick={handleComplete}
              disabled={isUpdating}
              className="gap-2 bg-gradient-to-r from-primary to-purple-600"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Completar perfil
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
