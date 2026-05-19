import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import { useOnboardingGate, ProfileData, City, Country } from '@/hooks/useOnboardingGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { OnboardingShell, TALENT_STEPS, CLIENT_STEPS } from './OnboardingShell';

// ─── Schema ────────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  first_name: z.string().min(2, 'Ingresa tu nombre').max(60),
  last_name: z.string().min(2, 'Ingresa tu apellido').max(60),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-z0-9._-]+$/, 'Solo letras minúsculas, números, puntos y guiones'),
  phone: z.string().min(7, 'Teléfono inválido').max(20),
  email: z.string().email(),
  country: z.string().min(1, 'Selecciona un país'),
  city: z.string().min(2, 'Ciudad requerida'),
  address: z.string().min(5, 'Dirección muy corta'),
  nationality: z.string().min(1, 'Selecciona tu nacionalidad'),
  document_type: z.string().min(1, 'Selecciona tipo de documento'),
  document_number: z.string().min(3, 'Número de documento requerido'),
  date_of_birth: z.string().min(1, 'Fecha de nacimiento requerida'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Selecciona tu sexo' }),
  social_instagram: z.string().optional(),
  social_facebook: z.string().optional(),
  social_tiktok: z.string().optional(),
  social_x: z.string().optional(),
  social_youtube: z.string().optional(),
  social_linkedin: z.string().optional(),
}).refine((data) => {
  if (!data.date_of_birth) return false;
  const dob = new Date(data.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}, { message: 'Debes ser mayor de 18 años', path: ['date_of_birth'] })
.refine((data) => {
  return (
    (data.social_instagram && data.social_instagram.length > 0) ||
    (data.social_tiktok && data.social_tiktok.length > 0)
  );
}, { message: 'Agrega al menos Instagram o TikTok', path: ['social_network'] });

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Definición de pasos del quiz ──────────────────────────────────────────────
const QUIZ_STEPS = [
  {
    id: 'name',
    emoji: '👤',
    question: '¿Cómo te llamas?',
    hint: 'Tu nombre aparecerá en tu perfil público de KREOON',
    fields: ['first_name', 'last_name', 'username'] as const,
  },
  {
    id: 'contact',
    emoji: '📞',
    question: '¿Cuál es tu teléfono?',
    hint: 'Lo usamos para notificaciones importantes y soporte',
    fields: ['phone'] as const,
  },
  {
    id: 'age',
    emoji: '🎂',
    question: '¿Cuándo naciste?',
    hint: 'Debes ser mayor de 18 años para usar KREOON',
    fields: ['date_of_birth', 'gender'] as const,
  },
  {
    id: 'location',
    emoji: '📍',
    question: '¿Dónde vives?',
    hint: 'Tu ubicación nos ayuda a conectarte con oportunidades cercanas',
    fields: ['country', 'city', 'address', 'nationality'] as const,
  },
  {
    id: 'document',
    emoji: '🪪',
    question: '¿Cuál es tu documento de identidad?',
    hint: 'Esto verifica que eres una persona real',
    fields: ['document_type', 'document_number'] as const,
  },
  {
    id: 'social',
    emoji: '📱',
    question: '¿En qué redes sociales estás?',
    hint: 'Agrega al menos Instagram o TikTok para continuar',
    fields: [] as const,
  },
] as const;

type QuizStepId = typeof QUIZ_STEPS[number]['id'];

// ─── Props ─────────────────────────────────────────────────────────────────────
interface NovaProfileDataStepProps {
  onComplete: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  isTalentFlow?: boolean;
}

// ─── Input reutilizable ────────────────────────────────────────────────────────
const inputCls = cn(
  'w-full h-14 rounded-2xl px-4',
  'bg-background border-2 border-border',
  'text-foreground placeholder:text-muted-foreground/60 text-base',
  'transition-colors focus:outline-none focus:border-primary'
);

// ─── FlagImg — span con background-image para evitar clipping en botones Windows ──
function FlagImg({ code }: { code: string }) {
  if (!code) return null;
  return (
    <span
      role="img"
      aria-label={code}
      style={{
        display: 'inline-block',
        width: 20,
        height: 15,
        minWidth: 20,
        backgroundImage: `url(https://flagcdn.com/w20/${code.toLowerCase()}.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: 2,
        flexShrink: 0,
      }}
    />
  );
}

// ─── CountryPicker — evita el problema de emojis en select nativo de Windows ──
interface CountryPickerProps {
  value: string;
  onChange: (val: string, country?: Country) => void;
  options: Country[];
  placeholder: string;
  /** 'country' muestra bandera + nombre; 'dialcode' muestra bandera + indicativo */
  mode?: 'country' | 'dialcode';
  error?: boolean;
  /** compact=true para usar dentro del input de teléfono (sin altura fija propia) */
  compact?: boolean;
}

function CountryPicker({ value, onChange, options, placeholder, mode = 'country', error, compact = false }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = mode === 'dialcode'
    ? options.find(c => c.dial_code === value)
    : options.find(c => c.code === value);

  const filtered = search
    ? options.filter(c => c.name_es.toLowerCase().includes(search.toLowerCase()) || c.dial_code.includes(search))
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const trigger = compact ? (
    // Versión compacta para el split del teléfono
    <button
      type="button"
      onClick={() => { setOpen(!open); setSearch(''); }}
      className="h-full px-3 bg-muted/40 border-r border-border text-sm font-medium flex items-center gap-1.5 cursor-pointer focus:outline-none whitespace-nowrap"
      style={{ minWidth: '92px' }}
    >
      <FlagImg code={selected?.code ?? ''} />
      <span className="text-foreground">{selected?.dial_code ?? value}</span>
      <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
  ) : (
    // Versión full-width (reemplaza el select normal)
    <button
      type="button"
      onClick={() => { setOpen(!open); setSearch(''); }}
      className={cn(
        inputCls, 'text-left flex items-center gap-3 cursor-pointer',
        error && 'border-red-400'
      )}
    >
      {selected ? (
        <>
          <FlagImg code={selected.code} />
          <span className="flex-1 text-base text-foreground">
            {mode === 'dialcode' ? selected.dial_code : selected.name_es}
          </span>
        </>
      ) : (
        <span className="flex-1 text-muted-foreground/60">{placeholder}</span>
      )}
      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
    </button>
  );

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className={cn(
          'absolute z-50 mt-1 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden',
          compact ? 'left-0 w-64' : 'w-full'
        )}>
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full px-3 py-2 rounded-xl bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map(c => {
              const isSelected = mode === 'dialcode' ? c.dial_code === value : c.code === value;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(mode === 'dialcode' ? c.dial_code : c.code, c); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <FlagImg code={c.code} />
                  <span className={cn('text-sm flex-1', isSelected ? 'text-primary font-medium' : 'text-foreground')}>{c.name_es}</span>
                  {mode === 'dialcode' && <span className="text-xs text-muted-foreground">{c.dial_code}</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground text-center">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-500 mt-1.5">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </p>
  );
}

const STORAGE_KEY = 'kreoon_onboarding_quiz';

// ─── Componente principal ──────────────────────────────────────────────────────
export function NovaProfileDataStep({ onComplete, onBack, onLogout, isTalentFlow = true }: NovaProfileDataStepProps) {
  const steps = isTalentFlow ? TALENT_STEPS : CLIENT_STEPS;
  const currentStep = isTalentFlow ? 3 : 2;

  const {
    existingProfileData,
    countries,
    getCitiesByCountry,
    documentTypes,
    saveProfileData,
    checkUsernameAvailable,
    isSavingProfile,
  } = useOnboardingGate();

  // Restaurar paso del quiz desde localStorage si hay progreso guardado
  const [quizStep, setQuizStep] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).step ?? 0;
    } catch {}
    return 0;
  });
  const [direction, setDirection] = useState(1);
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  // Inicializar dialCode/localPhone desde el teléfono existente
  const [dialCode, setDialCode] = useState(() => {
    const existing = existingProfileData.phone || '';
    const match = countries.find(c => existing.startsWith(c.dial_code));
    return match ? match.dial_code : '+57';
  });
  const [localPhone, setLocalPhone] = useState(() => {
    const existing = existingProfileData.phone || '';
    const match = countries.find(c => existing.startsWith(c.dial_code));
    return match ? existing.slice(match.dial_code.length) : existing;
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      first_name: existingProfileData.full_name?.split(' ')[0] || '',
      last_name: existingProfileData.full_name?.split(' ').slice(1).join(' ') || '',
      username: existingProfileData.username || '',
      phone: existingProfileData.phone || '',
      email: existingProfileData.email || '',
      country: existingProfileData.country || '',
      city: existingProfileData.city || '',
      address: existingProfileData.address || '',
      nationality: existingProfileData.nationality || '',
      document_type: existingProfileData.document_type || '',
      document_number: existingProfileData.document_number || '',
      date_of_birth: existingProfileData.date_of_birth || '',
      gender: existingProfileData.gender || undefined,
      social_instagram: existingProfileData.social_instagram || '',
      social_facebook: existingProfileData.social_facebook || '',
      social_tiktok: existingProfileData.social_tiktok || '',
      social_x: existingProfileData.social_x || '',
      social_youtube: existingProfileData.social_youtube || '',
      social_linkedin: existingProfileData.social_linkedin || '',
    },
  });

  const countryValue = watch('country');
  const genderValue = watch('gender');
  const usernameValue = watch('username');

  const filteredDocTypes = documentTypes.filter(dt =>
    dt.countries.includes(countryValue) || dt.id === 'passport'
  );

  useEffect(() => {
    if (countryValue) setAvailableCities(getCitiesByCountry(countryValue));
  }, [countryValue, getCitiesByCountry]);

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) { setUsernameStatus('idle'); return; }
    if (usernameValue === existingProfileData.username) { setUsernameStatus('available'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      const ok = await checkUsernameAvailable(usernameValue);
      setUsernameStatus(ok ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(t);
  }, [usernameValue, existingProfileData.username, checkUsernameAvailable]);

  // Restaurar valores del formulario desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { step: number; values?: Partial<ProfileFormData> };
      if (!parsed.values) return;
      reset(parsed.values as ProfileFormData, { keepDefaultValues: false });
      // Restaurar estado del selector de teléfono
      if (parsed.values.phone) {
        const match = countries.find(c => parsed.values!.phone!.startsWith(c.dial_code));
        if (match) {
          setDialCode(match.dial_code);
          setLocalPhone(parsed.values.phone.slice(match.dial_code.length));
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar progreso en localStorage después de avanzar cada paso
  const saveProgress = useCallback((nextStep: number) => {
    try {
      const values = watch() as Partial<ProfileFormData>;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: nextStep, values }));
    } catch {}
  }, [watch]);

  // Avanzar al siguiente paso del quiz
  const handleNext = useCallback(async () => {
    const step = QUIZ_STEPS[quizStep];

    // Para el paso de contacto: asegurar que phone tenga el valor combinado
    if (step.id === 'contact') {
      setValue('phone', dialCode + localPhone);
    }

    // Para clientes: autogenerar username desde el primer nombre al salir del paso 'name'
    if (step.id === 'name' && !isTalentFlow) {
      const firstName = watch('first_name') || '';
      const base = firstName.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
        .replace(/[^a-z0-9._-]/g, '');
      setValue('username', base || 'usuario');
    }

    // Validar campos del paso actual — para clientes en 'name' solo first_name + last_name
    const fieldsToValidate = (
      step.id === 'name' && !isTalentFlow
        ? ['first_name', 'last_name']
        : [...step.fields]
    ) as (keyof ProfileFormData)[];

    // Para el último paso (redes), exigir al menos Instagram o TikTok
    if (step.id === 'social') {
      const hasOne = [watch('social_instagram'), watch('social_tiktok')].some(s => s && s.length > 0);
      if (!hasOne) {
        toast.error('Agrega al menos Instagram o TikTok para continuar');
        return;
      }
    }

    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }

    if (usernameStatus === 'taken') {
      toast.error('El username ya está en uso, elige otro');
      return;
    }

    if (quizStep < QUIZ_STEPS.length - 1) {
      const nextStep = quizStep + 1;
      setDirection(1);
      setQuizStep(nextStep);
      saveProgress(nextStep);
    } else {
      // Último paso — combinar nombre + apellido y guardar
      handleSubmit(async (data) => {
        try {
          const payload: ProfileData = {
            ...data as unknown as ProfileData,
            full_name: `${data.first_name} ${data.last_name}`.trim(),
          };
          await saveProfileData(payload);
          // Limpiar progreso guardado al completar exitosamente
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          toast.success('¡Perfil guardado!');
          onComplete();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          if (msg === 'username_taken') {
            toast.error('El username ya está en uso');
            setUsernameStatus('taken');
            setQuizStep(0);
          } else {
            toast.error(`Error al guardar: ${msg}`);
          }
        }
      })();
    }
  }, [quizStep, trigger, watch, setValue, usernameStatus, dialCode, localPhone, handleSubmit, saveProfileData, saveProgress, onComplete, isTalentFlow]);

  const handlePrev = useCallback(() => {
    if (quizStep === 0) {
      onBack?.();
    } else {
      setDirection(-1);
      setQuizStep(q => q - 1);
    }
  }, [quizStep, onBack]);

  const current = QUIZ_STEPS[quizStep];
  const isLastStep = quizStep === QUIZ_STEPS.length - 1;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  };

  return (
    <OnboardingShell currentStep={currentStep} steps={steps} onLogout={onLogout}>
      <div className="max-w-lg mx-auto flex flex-col min-h-[60vh]">

        {/* Mini barra de progreso del quiz */}
        <div className="flex items-center gap-2 mb-8">
          {QUIZ_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full transition-all duration-300',
                i < quizStep  ? 'h-2 flex-1 bg-green-500' :
                i === quizStep ? 'h-2 flex-[2] bg-primary' :
                                 'h-2 flex-1 bg-muted-foreground/20'
              )}
            />
          ))}
        </div>

        {/* Contenido del paso actual */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Pregunta */}
            <div className="mb-8">
              <p className="text-5xl mb-4">{current.emoji}</p>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {current.question}
              </h2>
              <p className="text-sm text-muted-foreground">
                {current.id === 'name' && !isTalentFlow
                  ? 'Tu nombre completo para identificarte en la plataforma'
                  : current.hint}
              </p>
            </div>

            {/* Campos del paso */}
            <div className="space-y-4 flex-1">

              {/* ── PASO 1: Nombre ── */}
              {current.id === 'name' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nombres <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register('first_name')}
                        placeholder="Ej: María"
                        className={cn(inputCls, errors.first_name && 'border-red-400')}
                        autoFocus
                      />
                      <FieldError message={errors.first_name?.message} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Apellidos <span className="text-red-400">*</span>
                      </label>
                      <input
                        {...register('last_name')}
                        placeholder="Ej: García"
                        className={cn(inputCls, errors.last_name && 'border-red-400')}
                      />
                      <FieldError message={errors.last_name?.message} />
                    </div>
                  </div>

                  {/* Username: solo para talento. Para clientes se autogenera del email */}
                  {isTalentFlow && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Username <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('username')}
                          placeholder="Ej: maria.garcia"
                          className={cn(inputCls, 'pr-12',
                            (errors.username || usernameStatus === 'taken') && 'border-red-400',
                            usernameStatus === 'available' && 'border-green-500'
                          )}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
                          {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {usernameStatus === 'taken' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      </div>
                      <FieldError message={errors.username?.message || (usernameStatus === 'taken' ? 'Este username ya está en uso' : undefined)} />
                      <p className="text-xs text-muted-foreground mt-1.5">Solo letras minúsculas, números, puntos y guiones</p>
                    </div>
                  )}
                </>
              )}

              {/* ── PASO 2: Teléfono ── */}
              {current.id === 'contact' && (
                <>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Tu correo electrónico</p>
                    <p className="font-medium text-foreground">{watch('email')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número de teléfono <span className="text-red-400">*</span>
                    </label>
                    <div className={cn(
                      'flex h-14 rounded-2xl border-2 bg-background overflow-hidden transition-colors',
                      errors.phone ? 'border-red-400' : 'border-border focus-within:border-primary'
                    )}>
                      {/* Selector de indicativo */}
                      <CountryPicker
                        value={dialCode}
                        onChange={(val) => {
                          setDialCode(val);
                          setValue('phone', val + localPhone);
                        }}
                        options={countries}
                        placeholder="+57"
                        mode="dialcode"
                        compact
                      />
                      {/* Input número local */}
                      <input
                        type="tel"
                        value={localPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9 \-()]/g, '');
                          setLocalPhone(val);
                          setValue('phone', dialCode + val);
                        }}
                        placeholder="300 123 4567"
                        className="flex-1 px-4 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <FieldError message={errors.phone?.message} />
                  </div>

                  {/* Aviso WhatsApp */}
                  <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card">
                    <span className="text-2xl shrink-0">💬</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Este número debe tener WhatsApp activo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Por ahí te enviamos notificaciones de proyectos, pagos y mensajes de tu equipo.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── PASO 3: Edad ── */}
              {current.id === 'age' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fecha de nacimiento <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register('date_of_birth')}
                      type="date"
                      className={cn(inputCls, errors.date_of_birth && 'border-red-400')}
                      autoFocus
                    />
                    <FieldError message={errors.date_of_birth?.message} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Sexo <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-col gap-3">
                      {[
                        { value: 'female', emoji: '👩', label: 'Femenino' },
                        { value: 'male',   emoji: '👨', label: 'Masculino' },
                        { value: 'other',  emoji: '🧑', label: 'Prefiero no decirlo' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue('gender', opt.value as 'male' | 'female' | 'other')}
                          className={cn(
                            'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all',
                            genderValue === opt.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 bg-card hover:border-primary/40'
                          )}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span className="font-medium text-foreground">{opt.label}</span>
                          {genderValue === opt.value && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                    <FieldError message={errors.gender?.message} />
                  </div>
                </>
              )}

              {/* ── PASO 4: Ubicación ── */}
              {current.id === 'location' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ¿En qué país vives? <span className="text-red-400">*</span>
                    </label>
                    <CountryPicker
                      value={countryValue}
                      onChange={(val) => { setValue('country', val); setValue('city', ''); }}
                      options={countries}
                      placeholder="Selecciona tu país"
                      error={!!errors.country}
                    />
                    <FieldError message={errors.country?.message} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ciudad <span className="text-red-400">*</span>
                    </label>
                    {availableCities.length > 0 ? (
                      <select
                        value={watch('city')}
                        onChange={(e) => setValue('city', e.target.value)}
                        className={cn(inputCls, 'cursor-pointer', errors.city && 'border-red-400')}
                      >
                        <option value="">Selecciona tu ciudad</option>
                        {availableCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input
                        {...register('city')}
                        placeholder="Ej: Bogotá"
                        className={cn(inputCls, errors.city && 'border-red-400')}
                      />
                    )}
                    <FieldError message={errors.city?.message} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Dirección <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register('address')}
                      placeholder="Ej: Calle 123 # 45-67"
                      className={cn(inputCls, errors.address && 'border-red-400')}
                    />
                    <FieldError message={errors.address?.message} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nacionalidad <span className="text-red-400">*</span>
                    </label>
                    <CountryPicker
                      value={watch('nationality')}
                      onChange={(val) => setValue('nationality', val)}
                      options={countries}
                      placeholder="Selecciona tu nacionalidad"
                      error={!!errors.nationality}
                    />
                    <FieldError message={errors.nationality?.message} />
                  </div>
                </>
              )}

              {/* ── PASO 5: Documento ── */}
              {current.id === 'document' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo de documento <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={watch('document_type')}
                      onChange={(e) => setValue('document_type', e.target.value)}
                      className={cn(inputCls, 'cursor-pointer', errors.document_type && 'border-red-400')}
                    >
                      <option value="">Selecciona tipo</option>
                      {filteredDocTypes.map(dt => (
                        <option key={dt.id} value={dt.id}>{dt.label_es}</option>
                      ))}
                    </select>
                    <FieldError message={errors.document_type?.message} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número de documento <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register('document_number')}
                      placeholder="Ej: 1234567890"
                      className={cn(inputCls, errors.document_number && 'border-red-400')}
                      autoFocus
                    />
                    <FieldError message={errors.document_number?.message} />
                  </div>
                </>
              )}

              {/* ── PASO 6: Redes sociales ── */}
              {current.id === 'social' && (
                <div className="space-y-4">
                  {[
                    { id: 'social_instagram', emoji: '📸', label: 'Instagram', placeholder: '@tu_usuario' },
                    { id: 'social_tiktok',    emoji: '🎵', label: 'TikTok',    placeholder: '@tu_usuario' },
                  ].map((net) => {
                    const val = watch(net.id as keyof ProfileFormData) as string;
                    const filled = val && val.length > 0;
                    return (
                      <div
                        key={net.id}
                        className={cn(
                          'flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all',
                          filled ? 'border-primary bg-primary/10' : 'border-border/50 bg-card'
                        )}
                      >
                        <span className="text-3xl shrink-0">{net.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground mb-1.5">{net.label}</p>
                          <input
                            {...register(net.id as keyof ProfileFormData)}
                            placeholder={net.placeholder}
                            className={cn(
                              'w-full bg-transparent text-sm text-foreground',
                              'placeholder:text-muted-foreground/60',
                              'focus:outline-none border-b border-border/50 pb-0.5',
                              'focus:border-primary transition-colors'
                            )}
                          />
                        </div>
                        {filled && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                    );
                  })}

                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Debes completar al menos uno para continuar
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navegación */}
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            className={cn(
              'flex items-center gap-2 px-5 py-4 rounded-2xl border-2 border-border font-medium text-sm',
              'text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            {quizStep === 0 ? 'Volver' : 'Anterior'}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSavingProfile}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSavingProfile ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
            ) : isLastStep ? (
              <>¡Listo! <CheckCircle2 className="w-5 h-5" /></>
            ) : (
              <>Siguiente <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

export default NovaProfileDataStep;
