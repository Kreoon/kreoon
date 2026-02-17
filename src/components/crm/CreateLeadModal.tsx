import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Camera,
  Scissors,
  BarChart3,
  Code2,
  GraduationCap,
  Building2,
  User,
  Briefcase,
  Users,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  ChevronDown,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateLead } from '@/hooks/useCrm';
import type {
  LeadType,
  TalentCategory,
  SpecificRole,
  TalentSubtype,
  RegistrationIntent,
  ExperienceLevel,
  LeadSource,
} from '@/types/crm.types';
import {
  LEAD_TYPE_LABELS,
  TALENT_CATEGORY_LABELS,
  TALENT_CATEGORY_COLORS,
  SPECIFIC_ROLE_LABELS,
  TALENT_SUBTYPE_LABELS,
  REGISTRATION_INTENT_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  LEAD_SOURCE_LABELS,
  CATEGORY_ROLES,
} from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const LEAD_TYPES: { value: LeadType; icon: typeof User; color: string }[] = [
  { value: 'talent', icon: User, color: 'text-pink-400' },
  { value: 'brand', icon: Briefcase, color: 'text-blue-400' },
  { value: 'organization', icon: Users, color: 'text-purple-400' },
  { value: 'other', icon: HelpCircle, color: 'text-white/50' },
];

const CATEGORY_ICONS: Record<TalentCategory, typeof Camera> = {
  content_creation: Camera,
  post_production: Scissors,
  strategy_marketing: BarChart3,
  technology: Code2,
  education: GraduationCap,
  client: Building2,
};

const TALENT_CATEGORIES: TalentCategory[] = [
  'content_creation', 'post_production', 'strategy_marketing',
  'technology', 'education', 'client',
];

const TALENT_SUBTYPES: TalentSubtype[] = ['creator', 'editor', 'both'];

const REGISTRATION_INTENTS: RegistrationIntent[] = ['talent', 'brand', 'organization', 'join'];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const LEAD_SOURCES: LeadSource[] = ['tiktok', 'instagram', 'referral', 'website', 'event', 'whatsapp'];

const LATAM_COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
];

// =====================================================
// Schemas per step
// =====================================================

const step1Schema = z.object({
  lead_type: z.enum(['talent', 'brand', 'organization', 'other'], {
    required_error: 'Selecciona un tipo de lead',
  }),
  registration_intent: z.string().optional(),
  talent_subtype: z.string().optional(),
});

const step2Schema = z.object({
  talent_category: z.string().optional(),
  specific_role: z.string().optional(),
  experience_level: z.string().optional(),
});

const step3Schema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  portfolio_url: z.string().url('URL inválida').or(z.literal('')).optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  linkedin: z.string().optional(),
  lead_source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  notes: z.string().optional(),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormData = z.infer<typeof fullSchema>;

// =====================================================
// Component
// =====================================================

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadModal({ open, onOpenChange }: CreateLeadModalProps) {
  const [step, setStep] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const createLead = useCreateLead();

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      lead_type: undefined,
      registration_intent: '',
      talent_subtype: '',
      talent_category: '',
      specific_role: '',
      experience_level: '',
      full_name: '',
      email: '',
      phone: '',
      city: '',
      country: 'CO',
      portfolio_url: '',
      instagram: '',
      tiktok: '',
      linkedin: '',
      lead_source: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      notes: '',
    },
  });

  const leadType = form.watch('lead_type');
  const talentCategory = form.watch('talent_category');
  const isTalent = leadType === 'talent';

  // Total steps: 3 if talent, 2 if not (skip step 2)
  const totalSteps = isTalent ? 3 : 2;
  const displayStep = !isTalent && step >= 2 ? step + 1 : step;

  // Dynamic roles based on selected category
  const availableRoles = useMemo(() => {
    if (talentCategory && talentCategory !== '') {
      return CATEGORY_ROLES[talentCategory as TalentCategory] || [];
    }
    return Object.values(CATEGORY_ROLES).flat();
  }, [talentCategory]);

  // Reset role when category changes
  const handleCategoryChange = (cat: string) => {
    form.setValue('talent_category', cat, { shouldValidate: true });
    const currentRole = form.getValues('specific_role');
    if (currentRole) {
      const roles = CATEGORY_ROLES[cat as TalentCategory] || [];
      if (!roles.includes(currentRole as SpecificRole)) {
        form.setValue('specific_role', '');
      }
    }
  };

  // Tag management
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Step validation
  const canAdvance = (): boolean => {
    if (step === 1) {
      return !!leadType;
    }
    if (step === 2 && isTalent) {
      return true; // category & role are optional
    }
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    if (step === 1 && !isTalent) {
      setStep(3); // skip step 2 for non-talent
    } else {
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step === 3 && !isTalent) {
      setStep(1); // skip step 2 for non-talent
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = (data: FormData) => {
    const socialProfiles: Record<string, string> = {};
    if (data.instagram) socialProfiles.instagram = data.instagram;
    if (data.tiktok) socialProfiles.tiktok = data.tiktok;
    if (data.linkedin) socialProfiles.linkedin = data.linkedin;

    createLead.mutate(
      {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        lead_type: data.lead_type as LeadType,
        registration_intent: data.registration_intent as RegistrationIntent || undefined,
        talent_subtype: data.talent_subtype as TalentSubtype || undefined,
        talent_category: data.talent_category as TalentCategory || undefined,
        specific_role: data.specific_role as SpecificRole || undefined,
        experience_level: data.experience_level as ExperienceLevel || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        portfolio_url: data.portfolio_url || undefined,
        social_profiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : undefined,
        lead_source: data.lead_source || undefined,
        utm_source: data.utm_source || undefined,
        utm_medium: data.utm_medium || undefined,
        utm_campaign: data.utm_campaign || undefined,
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setTags([]);
          setTagInput('');
          setStep(1);
          setShowAdvanced(false);
          onOpenChange(false);
        },
      },
    );
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      form.reset();
      setTags([]);
      setTagInput('');
      setStep(1);
      setShowAdvanced(false);
    }
    onOpenChange(val);
  };

  // Current step for progress display
  const currentStepDisplay = !isTalent && step === 3 ? 2 : step;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Nuevo Lead</DialogTitle>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    currentStepDisplay >= s
                      ? 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white'
                      : 'bg-white/10 text-white/30',
                  )}
                >
                  {currentStepDisplay > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                {s < totalSteps && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 rounded-full transition-all',
                      currentStepDisplay > s ? 'bg-[#8b5cf6]' : 'bg-white/10',
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* ======================== STEP 1 ======================== */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Lead Type */}
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs">Tipo de Lead *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {LEAD_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = leadType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => form.setValue('lead_type', t.value, { shouldValidate: true })}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                            isSelected
                              ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                              : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20',
                          )}
                        >
                          <Icon className={cn('h-5 w-5', isSelected ? t.color : 'text-white/40')} />
                          <span className={cn('text-[11px] font-medium', isSelected ? 'text-white' : 'text-white/40')}>
                            {LEAD_TYPE_LABELS[t.value]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.lead_type && (
                    <p className="text-xs text-red-400">{form.formState.errors.lead_type.message}</p>
                  )}
                </div>

                {/* Registration Intent */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Intencion de registro</Label>
                  <Select
                    value={form.watch('registration_intent')}
                    onValueChange={(v) => form.setValue('registration_intent', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Seleccionar intencion" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                      {REGISTRATION_INTENTS.map((i) => (
                        <SelectItem key={i} value={i} className="text-white focus:bg-white/10">
                          {REGISTRATION_INTENT_LABELS[i]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Talent Subtype (only for talent) */}
                {isTalent && (
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Subtipo de talento</Label>
                    <Select
                      value={form.watch('talent_subtype')}
                      onValueChange={(v) => form.setValue('talent_subtype', v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar subtipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                        {TALENT_SUBTYPES.map((s) => (
                          <SelectItem key={s} value={s} className="text-white focus:bg-white/10">
                            {TALENT_SUBTYPE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* ======================== STEP 2 (talent only) ======================== */}
            {step === 2 && isTalent && (
              <div className="space-y-5">
                {/* Talent Category */}
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs">Categoria</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TALENT_CATEGORIES.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat];
                      const isSelected = talentCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                            isSelected
                              ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                              : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20',
                          )}
                        >
                          <Icon className={cn('h-5 w-5', isSelected ? 'text-[#a855f7]' : 'text-white/40')} />
                          <span className={cn(
                            'text-[10px] font-medium text-center leading-tight',
                            isSelected ? 'text-white' : 'text-white/40',
                          )}>
                            {TALENT_CATEGORY_LABELS[cat]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Role */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Rol especifico</Label>
                  <Select
                    value={form.watch('specific_role')}
                    onValueChange={(v) => form.setValue('specific_role', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30 max-h-[240px]">
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r} className="text-white focus:bg-white/10">
                          {SPECIFIC_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience Level */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Nivel de experiencia</Label>
                  <Select
                    value={form.watch('experience_level')}
                    onValueChange={(v) => form.setValue('experience_level', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l} value={l} className="text-white focus:bg-white/10">
                          {EXPERIENCE_LEVEL_LABELS[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ======================== STEP 3 ======================== */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Name & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Nombre completo *</Label>
                    <Input
                      {...form.register('full_name')}
                      placeholder="Juan Pérez"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-xs text-red-400">{form.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Email *</Label>
                    <Input
                      {...form.register('email')}
                      type="email"
                      placeholder="juan@email.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Phone & Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Telefono</Label>
                    <Input
                      {...form.register('phone')}
                      placeholder="+57 300 123 4567"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Fuente</Label>
                    <Select
                      value={form.watch('lead_source')}
                      onValueChange={(v) => form.setValue('lead_source', v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar fuente" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                        {LEAD_SOURCES.map((s) => (
                          <SelectItem key={s} value={s} className="text-white focus:bg-white/10">
                            {LEAD_SOURCE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* City & Country */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Ciudad</Label>
                    <Input
                      {...form.register('city')}
                      placeholder="Bogotá"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-xs">Pais</Label>
                    <Select
                      value={form.watch('country')}
                      onValueChange={(v) => form.setValue('country', v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <Globe className="h-3.5 w-3.5 mr-1.5 text-white/40" />
                        <SelectValue placeholder="Pais" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30 max-h-[240px]">
                        {LATAM_COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code} className="text-white focus:bg-white/10">
                            {c.flag} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Portfolio URL */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Portfolio URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                    <Input
                      {...form.register('portfolio_url')}
                      placeholder="https://miportfolio.com"
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  {form.formState.errors.portfolio_url && (
                    <p className="text-xs text-red-400">{form.formState.errors.portfolio_url.message}</p>
                  )}
                </div>

                {/* Social Profiles */}
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs">Redes sociales</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      {...form.register('instagram')}
                      placeholder="@instagram"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs"
                    />
                    <Input
                      {...form.register('tiktok')}
                      placeholder="@tiktok"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs"
                    />
                    <Input
                      {...form.register('linkedin')}
                      placeholder="linkedin.com/in/..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Etiquetas</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Agregar etiqueta..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={addTag}
                      className="h-9 w-9 bg-white/5 hover:bg-white/10 text-white/50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30"
                        >
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Notas</Label>
                  <Textarea
                    {...form.register('notes')}
                    placeholder="Notas adicionales sobre este lead..."
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                </div>

                {/* Advanced (UTM) - Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-180')} />
                    Avanzado (UTM)
                  </button>
                  {showAdvanced && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="space-y-1">
                        <Label className="text-white/50 text-[10px]">utm_source</Label>
                        <Input
                          {...form.register('utm_source')}
                          placeholder="google"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-white/50 text-[10px]">utm_medium</Label>
                        <Input
                          {...form.register('utm_medium')}
                          placeholder="cpc"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-white/50 text-[10px]">utm_campaign</Label>
                        <Input
                          {...form.register('utm_campaign')}
                          placeholder="spring_2026"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================== FOOTER ======================== */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="text-xs text-white/30">
                Paso {currentStepDisplay} de {totalSteps}
              </div>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goPrev}
                    className="text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
                {((isTalent && step < 3) || (!isTalent && step < 3 && step === 1)) ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!canAdvance()}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createLead.isPending}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
                  >
                    {createLead.isPending && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    )}
                    Crear Lead
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
