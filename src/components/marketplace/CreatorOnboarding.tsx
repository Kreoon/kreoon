import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Briefcase,
  Star,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Plus,
  X,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatorMarketplaceProfile } from '@/hooks/useCreatorMarketplaceProfile';
import { useIndustries } from '@/hooks/useCreatorMatching';
import type { IndustryId, ContentStyle, BudgetRange } from '@/types/ai-matching';
import {
  CONTENT_STYLE_LABELS,
  BUDGET_RANGE_LABELS,
} from '@/types/ai-matching';
import { SERVICE_TYPE_LABELS, SERVICE_TYPE_CATEGORIES } from '@/types/marketplace';
import { MarketplaceRoleSelector } from './roles/MarketplaceRoleSelector';
import type { MarketplaceRoleId } from './types/marketplace';

interface CreatorOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

type Step = 'basics' | 'expertise' | 'services' | 'availability' | 'complete';

const STEPS: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: 'basics', title: 'Perfil', icon: User },
  { id: 'expertise', title: 'Especialización', icon: Briefcase },
  { id: 'services', title: 'Servicios', icon: Star },
  { id: 'availability', title: 'Disponibilidad', icon: Calendar },
  { id: 'complete', title: 'Listo', icon: Check },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Principiante', desc: 'Menos de 1 año' },
  { value: 'intermediate', label: 'Intermedio', desc: '1-3 años' },
  { value: 'advanced', label: 'Avanzado', desc: '3-5 años' },
  { value: 'expert', label: 'Experto', desc: 'Más de 5 años' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog' },
];

interface ServiceDraft {
  title: string;
  type: string;
  price: string;
  description: string;
}

export function CreatorOnboarding({
  onComplete,
  onSkip,
  className,
}: CreatorOnboardingProps) {
  const { updateCreatorProfile, isUpdating } = useCreatorMarketplaceProfile();
  const { data: industries = [] } = useIndustries();

  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [formData, setFormData] = useState({
    tagline: '',
    bio_extended: '',
    primary_category: '' as IndustryId | '',
    secondary_categories: [] as IndustryId[],
    expertise_tags: [] as string[],
    years_experience: 0,
    content_styles: [] as ContentStyle[],
    marketplace_roles: [] as MarketplaceRoleId[],
    platforms: [] as string[],
    min_budget: '' as BudgetRange | '',
    preferred_project_duration: '',
    available_for_hire: true,
    response_time_hours: 24,
    portfolio_highlights: [] as string[],
  });

  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [newService, setNewService] = useState<ServiceDraft>({
    title: '',
    type: '',
    price: '',
    description: '',
  });

  const [customTag, setCustomTag] = useState('');

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const updateField = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayField = <K extends keyof typeof formData>(
    key: K,
    value: string
  ) => {
    setFormData((prev) => {
      const current = prev[key] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const addCustomTag = () => {
    if (customTag.trim() && !formData.expertise_tags.includes(customTag.trim())) {
      updateField('expertise_tags', [...formData.expertise_tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateField(
      'expertise_tags',
      formData.expertise_tags.filter((t) => t !== tag)
    );
  };

  const addService = () => {
    if (newService.title && newService.type && newService.price) {
      setServices((prev) => [...prev, newService]);
      setNewService({ title: '', type: '', price: '', description: '' });
    }
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
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
      await updateCreatorProfile({
        tagline: formData.tagline,
        bio_extended: formData.bio_extended,
        primary_category: formData.primary_category as IndustryId,
        secondary_categories: formData.secondary_categories,
        expertise_tags: formData.expertise_tags,
        years_experience: formData.years_experience,
        content_styles: formData.content_styles,
        platforms: formData.platforms,
        min_budget: formData.min_budget as BudgetRange,
        preferred_project_duration: formData.preferred_project_duration,
        portfolio_highlights: formData.portfolio_highlights,
      });

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
      case 'basics':
        return !!formData.tagline.trim();
      case 'expertise':
        return !!formData.primary_category;
      case 'services':
        return true; // Optional
      case 'availability':
        return true; // Optional
      default:
        return true;
    }
  };

  const selectedIndustry = formData.primary_category
    ? industries.find((i) => i.id === formData.primary_category)
    : null;

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-social-foreground">
            Configura tu perfil de creador
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
                  ? "text-social-accent"
                  : "text-social-muted-foreground"
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
          {/* Step 1: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-accent/20 mb-4">
                  <User className="h-8 w-8 text-social-accent" />
                </div>
                <h2 className="text-xl font-semibold text-social-foreground">
                  Tu perfil profesional
                </h2>
                <p className="text-social-muted-foreground mt-2">
                  Preséntate ante las marcas que buscan talento
                </p>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">
                  Tu tagline profesional *
                </label>
                <Input
                  placeholder="Ej: Creador de contenido lifestyle | Especialista en reels"
                  value={formData.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  className="bg-social-muted border-social-border"
                  maxLength={100}
                />
                <p className="text-xs text-social-muted-foreground text-right">
                  {formData.tagline.length}/100
                </p>
              </div>

              {/* Extended bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">
                  Biografía extendida
                </label>
                <Textarea
                  placeholder="Cuéntanos tu historia, experiencia y qué te hace único como creador..."
                  value={formData.bio_extended}
                  onChange={(e) => updateField('bio_extended', e.target.value)}
                  className="bg-social-muted border-social-border min-h-[150px]"
                  maxLength={1000}
                />
                <p className="text-xs text-social-muted-foreground text-right">
                  {formData.bio_extended.length}/1000
                </p>
              </div>

              {/* Experience level */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-social-foreground">
                  Nivel de experiencia
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => {
                        const years = level.value === 'beginner' ? 1 :
                          level.value === 'intermediate' ? 2 :
                          level.value === 'advanced' ? 4 : 6;
                        updateField('years_experience', years);
                      }}
                      className={cn(
                        "p-3 rounded-sm border text-left transition-all",
                        (formData.years_experience >= 1 && formData.years_experience < 2 && level.value === 'beginner') ||
                        (formData.years_experience >= 2 && formData.years_experience < 4 && level.value === 'intermediate') ||
                        (formData.years_experience >= 4 && formData.years_experience < 6 && level.value === 'advanced') ||
                        (formData.years_experience >= 6 && level.value === 'expert')
                          ? "border-social-accent bg-social-accent/10"
                          : "border-social-border bg-social-card hover:border-social-accent/50"
                      )}
                    >
                      <p className="font-medium text-social-foreground text-sm">
                        {level.label}
                      </p>
                      <p className="text-xs text-social-muted-foreground">
                        {level.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Expertise */}
          {currentStep === 'expertise' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-accent/20 mb-4">
                  <Briefcase className="h-8 w-8 text-social-accent" />
                </div>
                <h2 className="text-xl font-semibold text-social-foreground">
                  Tu área de especialización
                </h2>
                <p className="text-social-muted-foreground mt-2">
                  Define en qué industrias y estilos te especializas
                </p>
              </div>

              {/* Primary category */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-social-foreground">
                  Categoría principal *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {industries.map((industry) => (
                    <button
                      key={industry.id}
                      onClick={() => updateField('primary_category', industry.id as IndustryId)}
                      className={cn(
                        "p-3 rounded-sm border-2 text-left transition-all",
                        formData.primary_category === industry.id
                          ? "border-social-accent bg-social-accent/10"
                          : "border-social-border bg-social-card hover:border-social-accent/50"
                      )}
                    >
                      <span className="text-xl mb-1 block">{industry.icon}</span>
                      <p className="font-medium text-social-foreground text-xs">
                        {industry.name_es}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expertise tags */}
              {selectedIndustry && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-social-foreground">
                    Etiquetas de especialización
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedIndustry.common_keywords?.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant={formData.expertise_tags.includes(keyword) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayField('expertise_tags', keyword)}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  {/* Custom tag */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar etiqueta personalizada"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                      className="bg-social-muted border-social-border"
                    />
                    <Button variant="outline" onClick={addCustomTag}>
                      Agregar
                    </Button>
                  </div>

                  {/* Selected tags */}
                  {formData.expertise_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.expertise_tags.map((tag) => (
                        <Badge key={tag} className="gap-1">
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Marketplace roles */}
              <MarketplaceRoleSelector
                selectedRoles={formData.marketplace_roles}
                onChange={(roles: MarketplaceRoleId[]) => updateField('marketplace_roles', roles)}
                maxRoles={5}
                showCategories
                label="Tus Roles en el Marketplace"
              />

              {/* Content styles */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-social-foreground">
                  Tu estilo de contenido
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CONTENT_STYLE_LABELS).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant={formData.content_styles.includes(key as ContentStyle) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('content_styles', key)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-social-foreground">
                  Plataformas donde creas
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <Badge
                      key={platform.value}
                      variant={formData.platforms.includes(platform.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayField('platforms', platform.value)}
                    >
                      {platform.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {currentStep === 'services' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-accent/20 mb-4">
                  <Star className="h-8 w-8 text-social-accent" />
                </div>
                <h2 className="text-xl font-semibold text-social-foreground">
                  Tus servicios
                </h2>
                <p className="text-social-muted-foreground mt-2">
                  Define qué servicios ofreces y sus precios
                </p>
              </div>

              {/* Min budget */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">
                  Presupuesto mínimo por proyecto
                </label>
                <Select
                  value={formData.min_budget}
                  onValueChange={(v) => updateField('min_budget', v as BudgetRange)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
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

              {/* Services list */}
              {services.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-social-foreground">
                    Servicios agregados
                  </label>
                  <div className="space-y-2">
                    {services.map((service, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-sm bg-social-muted"
                      >
                        <div>
                          <p className="font-medium text-social-foreground">
                            {service.title}
                          </p>
                          <p className="text-sm text-social-muted-foreground">
                            {SERVICE_TYPE_LABELS[service.type as keyof typeof SERVICE_TYPE_LABELS] || service.type} · ${service.price}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeService(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add service form */}
              <div className="space-y-3 p-4 rounded-sm border border-dashed border-social-border">
                <p className="text-sm font-medium text-social-foreground">
                  Agregar servicio
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Título del servicio"
                    value={newService.title}
                    onChange={(e) => setNewService((p) => ({ ...p, title: e.target.value }))}
                    className="bg-social-muted border-social-border"
                  />
                  <Select
                    value={newService.type}
                    onValueChange={(v) => setNewService((p) => ({ ...p, type: v }))}
                  >
                    <SelectTrigger className="bg-social-muted border-social-border">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_CATEGORIES).map(([catKey, category]) => (
                        <SelectGroup key={catKey}>
                          <SelectLabel>{category.label}</SelectLabel>
                          {category.types.map(type => (
                            <SelectItem key={type} value={type}>
                              {SERVICE_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Precio"
                      value={newService.price}
                      onChange={(e) => setNewService((p) => ({ ...p, price: e.target.value }))}
                      className="bg-social-muted border-social-border pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={addService}
                    disabled={!newService.title || !newService.type || !newService.price}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Availability */}
          {currentStep === 'availability' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-accent/20 mb-4">
                  <Calendar className="h-8 w-8 text-social-accent" />
                </div>
                <h2 className="text-xl font-semibold text-social-foreground">
                  Tu disponibilidad
                </h2>
                <p className="text-social-muted-foreground mt-2">
                  Indica cuándo estás disponible para nuevos proyectos
                </p>
              </div>

              {/* Available for hire */}
              <div className="flex items-center justify-between p-4 rounded-sm bg-social-card border border-social-border">
                <div>
                  <p className="font-medium text-social-foreground">
                    Disponible para contratación
                  </p>
                  <p className="text-sm text-social-muted-foreground">
                    Aparecerás en las búsquedas de marcas
                  </p>
                </div>
                <Switch
                  checked={formData.available_for_hire}
                  onCheckedChange={(v) => updateField('available_for_hire', v)}
                />
              </div>

              {/* Response time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">
                  Tiempo de respuesta típico
                </label>
                <Select
                  value={formData.response_time_hours.toString()}
                  onValueChange={(v) => updateField('response_time_hours', parseInt(v))}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Menos de 1 hora</SelectItem>
                    <SelectItem value="4">Unas horas</SelectItem>
                    <SelectItem value="24">En el día</SelectItem>
                    <SelectItem value="48">1-2 días</SelectItem>
                    <SelectItem value="72">2-3 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred project duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">
                  Duración preferida de proyectos
                </label>
                <Select
                  value={formData.preferred_project_duration}
                  onValueChange={(v) => updateField('preferred_project_duration', v)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Proyectos únicos</SelectItem>
                    <SelectItem value="short_term">Corto plazo (1-3 meses)</SelectItem>
                    <SelectItem value="long_term">Largo plazo (3+ meses)</SelectItem>
                    <SelectItem value="ongoing">Colaboraciones continuas</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Info box */}
              <div className="p-4 rounded-sm bg-social-accent/10 border border-social-accent/20">
                <p className="text-sm text-social-foreground">
                  💡 <strong>Tip:</strong> Los creadores con tiempos de respuesta más rápidos
                  tienen un 40% más de probabilidades de ser contactados por marcas.
                </p>
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
              <h2 className="text-2xl font-bold text-social-foreground mb-2">
                ¡Perfil de creador listo!
              </h2>
              <p className="text-social-muted-foreground">
                Las marcas ya pueden encontrarte y contactarte para colaboraciones
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'complete' && (
        <div className="flex justify-between mt-8 pt-6 border-t border-social-border">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {currentStep === 'availability' ? (
            <Button
              onClick={handleComplete}
              disabled={isUpdating}
              className="gap-2 bg-gradient-to-r from-social-accent to-purple-600"
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
