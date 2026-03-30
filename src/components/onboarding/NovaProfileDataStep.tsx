/**
 * NovaProfileDataStep - Formulario "Completa tu perfil" con Design System Nova
 *
 * Features:
 * - Responsive: Mobile, Tablet, Desktop
 * - Dark/Light mode support
 * - Bordes sutilmente redondeados
 * - Aurora background effect
 * - Glassmorphism cards
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, FileText, Calendar,
  AtSign, ChevronDown, AlertCircle, CheckCircle2, Loader2,
  AlertTriangle, ArrowRight, LogOut
} from 'lucide-react';
import { useOnboardingGate, ProfileData, City } from '@/hooks/useOnboardingGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Schema ─────────────────────────────────────────────────────
const profileSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo'),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-z0-9._-]+$/, 'Solo letras minúsculas, números, puntos y guiones'),
  phone: z.string().min(7, 'Teléfono inválido').max(20),
  email: z.string().email('Email inválido'),
  country: z.string().min(1, 'Selecciona un país'),
  city: z.string().min(2, 'Ciudad requerida'),
  address: z.string().min(5, 'Dirección muy corta'),
  nationality: z.string().min(1, 'Selecciona tu nacionalidad'),
  document_type: z.string().min(1, 'Selecciona tipo de documento'),
  document_number: z.string().min(3, 'Número de documento requerido'),
  date_of_birth: z.string().min(1, 'Fecha de nacimiento requerida'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Selecciona tu sexo' }),
}).refine((data) => {
  if (!data.date_of_birth) return false;
  const dob = new Date(data.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}, {
  message: 'Debes ser mayor de 18 años para usar KREOON',
  path: ['date_of_birth'],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface NovaProfileDataStepProps {
  onComplete: () => void;
  onLogout?: () => void;
}

// ─── Nova Input Component ───────────────────────────────────────
interface NovaFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  errorId?: string;
}

function NovaField({ label, required, error, icon, children, className, htmlFor, errorId }: NovaFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-nova-text-primary dark:text-zinc-100 text-zinc-700"
      >
        {label}
        {required && <span className="ml-1 text-pink-500 dark:text-pink-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500" aria-hidden="true">
            {icon}
          </div>
        )}
        {children}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Nova Select Component ──────────────────────────────────────
interface NovaSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hasIcon?: boolean;
  error?: boolean;
}

function NovaSelect({ value, onChange, options, placeholder, hasIcon, error }: NovaSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-12 rounded-sm cursor-pointer",
        "bg-white text-zinc-900",
        "dark:bg-zinc-900 dark:text-white",
        "border border-zinc-200 dark:border-zinc-700",
        "focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20",
        hasIcon ? "pl-11 pr-4" : "pl-4 pr-4",
        error && "border-red-500"
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export function NovaProfileDataStep({ onComplete, onLogout }: NovaProfileDataStepProps) {
  const {
    existingProfileData,
    countries,
    getCitiesByCountry,
    documentTypes,
    saveProfileData,
    checkUsernameAvailable,
    isSavingProfile,
  } = useOnboardingGate();

  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: existingProfileData.full_name || '',
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
    },
  });

  const usernameValue = watch('username');
  const countryValue = watch('country');
  const genderValue = watch('gender');

  // Filter document types by country
  const filteredDocTypes = documentTypes.filter(dt =>
    dt.countries.includes(countryValue) || dt.id === 'passport' || dt.id === 'other'
  );

  // Load cities when country changes
  useEffect(() => {
    if (countryValue) {
      const cities = getCitiesByCountry(countryValue);
      setAvailableCities(cities);
    }
  }, [countryValue, getCitiesByCountry]);

  // Check username availability
  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const normalized = usernameValue.toLowerCase();
    if (normalized === existingProfileData.username?.toLowerCase()) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      const available = await checkUsernameAvailable(normalized);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timeout);
  }, [usernameValue, existingProfileData.username, checkUsernameAvailable]);

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    if (usernameStatus === 'taken') {
      toast.error('El username ya está en uso');
      return;
    }

    try {
      await saveProfileData(data as ProfileData);
      toast.success('Datos guardados correctamente');
      onComplete();
    } catch (error: any) {
      if (error.message === 'username_taken') {
        toast.error('El username ya está en uso');
        setUsernameStatus('taken');
      } else {
        toast.error(`Error al guardar: ${error?.message || 'Error desconocido'}`);
      }
    }
  }, [saveProfileData, usernameStatus, onComplete]);

  // Input base classes - optimized hierarchy
  const inputClasses = cn(
    "w-full h-12 rounded",
    "bg-white dark:bg-[#1a1a24]",
    "border border-zinc-200 dark:border-zinc-700/50",
    "text-zinc-900 dark:text-zinc-100",
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
    "transition-colors duration-150",
    "focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
  );

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0a0a0f]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f14] border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-zinc-900 dark:text-white">KREOON</span>
            <span className="px-2.5 py-1 text-xs font-medium bg-purple-600 text-white rounded-full">
              Verificación
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4">
          {/* Step 1 - Active */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              1
            </div>
            <span className="text-sm font-medium text-zinc-900 dark:text-white hidden sm:inline">Datos personales</span>
          </div>
          {/* Line */}
          <div className="w-12 sm:w-16 h-px bg-zinc-300 dark:bg-zinc-700" />
          {/* Step 2 - Pending */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-500 text-sm font-medium">
              2
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-500 hidden sm:inline">Términos legales</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-sm p-6 sm:p-8 md:p-10",
            "bg-white dark:bg-[#14141f]",
            "border border-zinc-200 dark:border-zinc-800",
            "shadow-sm dark:shadow-none"
          )}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              Completa tu perfil
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
              Para usar KREOON necesitas completar tu información. Esto nos ayuda a protegerte y garantizar la seguridad de la comunidad.
            </p>
          </div>

          {/* Error Banner */}
          {submitAttempted && Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-red-700 dark:text-red-400 font-medium">Faltan campos obligatorios</p>
                <p className="text-red-600 dark:text-red-400/70 text-sm mt-1">
                  Por favor completa los siguientes campos: {Object.keys(errors).map(field => {
                    const fieldLabels: Record<string, string> = {
                      full_name: 'Nombre completo',
                      username: 'Username',
                      phone: 'Teléfono',
                      email: 'Correo electrónico',
                      country: 'País',
                      city: 'Ciudad',
                      address: 'Dirección',
                      nationality: 'Nacionalidad',
                      document_type: 'Tipo de documento',
                      document_number: 'Número de documento',
                      date_of_birth: 'Fecha de nacimiento',
                      gender: 'Sexo',
                    };
                    return fieldLabels[field] || field;
                  }).join(', ')}.
                </p>
              </div>
            </motion.div>
          )}

          <form ref={formRef} onSubmit={handleSubmit(onSubmit, () => setSubmitAttempted(true))} className="space-y-8">
            {/* Section: Información Personal */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-500/10">
                  <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                Información Personal
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre completo */}
                <NovaField label="Nombre completo" required error={errors.full_name?.message} icon={<User className="w-5 h-5" />} htmlFor="full_name" errorId="full_name-error">
                  <input
                    {...register('full_name')}
                    id="full_name"
                    placeholder="Tu nombre completo"
                    aria-required="true"
                    aria-invalid={!!errors.full_name}
                    aria-describedby={errors.full_name ? "full_name-error" : undefined}
                    className={cn(inputClasses, "pl-11", errors.full_name && submitAttempted && "border-red-300 dark:border-red-500")}
                  />
                </NovaField>

                {/* Username */}
                <NovaField label="Username" required error={errors.username?.message || (usernameStatus === 'taken' ? 'Username no disponible' : undefined)} icon={<AtSign className="w-5 h-5" />} htmlFor="username" errorId="username-error">
                  <div className="relative">
                    <input
                      {...register('username')}
                      id="username"
                      placeholder="tu_username"
                      aria-required="true"
                      aria-invalid={!!errors.username || usernameStatus === 'taken'}
                      aria-describedby={errors.username || usernameStatus === 'taken' ? "username-error" : undefined}
                      className={cn(inputClasses, "pl-11 pr-10", errors.username && submitAttempted && "border-red-300 dark:border-red-500")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                      {usernameStatus === 'checking' && <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />}
                      {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {usernameStatus === 'taken' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>
                </NovaField>

                {/* Email */}
                <NovaField label="Correo electrónico" required icon={<Mail className="w-5 h-5" />} htmlFor="email">
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    disabled
                    aria-required="true"
                    aria-disabled="true"
                    className={cn(inputClasses, "pl-11 opacity-60 cursor-not-allowed")}
                  />
                </NovaField>

                {/* Teléfono */}
                <NovaField label="Teléfono" required error={errors.phone?.message} icon={<Phone className="w-5 h-5" />} htmlFor="phone" errorId="phone-error">
                  <input
                    {...register('phone')}
                    id="phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    className={cn(inputClasses, "pl-11", errors.phone && submitAttempted && "border-red-300 dark:border-red-500")}
                  />
                </NovaField>

                {/* Fecha de nacimiento */}
                <NovaField label="Fecha de nacimiento" required error={errors.date_of_birth?.message} icon={<Calendar className="w-5 h-5" />} htmlFor="date_of_birth" errorId="date_of_birth-error">
                  <input
                    {...register('date_of_birth')}
                    id="date_of_birth"
                    type="date"
                    aria-required="true"
                    aria-invalid={!!errors.date_of_birth}
                    aria-describedby={errors.date_of_birth ? "date_of_birth-error" : undefined}
                    className={cn(inputClasses, "pl-11", errors.date_of_birth && submitAttempted && "border-red-300 dark:border-red-500")}
                  />
                </NovaField>

                {/* Sexo */}
                <NovaField label="Sexo" required error={errors.gender?.message} icon={<User className="w-5 h-5" />} htmlFor="gender" errorId="gender-error">
                  <NovaSelect
                    value={genderValue || ''}
                    onChange={(v) => setValue('gender', v as 'male' | 'female' | 'other')}
                    placeholder="Selecciona tu sexo"
                    hasIcon
                    error={!!errors.gender && submitAttempted}
                    options={[
                      { value: 'male', label: 'Masculino' },
                      { value: 'female', label: 'Femenino' },
                      { value: 'other', label: 'Otro' },
                    ]}
                  />
                </NovaField>
              </div>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                Debes ser mayor de 18 años para usar KREOON
              </p>
            </section>

            {/* Section: Ubicación */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-100 dark:bg-cyan-500/10">
                  <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                Ubicación
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* País */}
                <NovaField label="País" required error={errors.country?.message} icon={<MapPin className="w-5 h-5" />} htmlFor="country" errorId="country-error">
                  <NovaSelect
                    value={countryValue}
                    onChange={(v) => setValue('country', v)}
                    placeholder="Selecciona tu país"
                    hasIcon
                    error={!!errors.country && submitAttempted}
                    options={countries.map(c => ({ value: c.code, label: c.name_es }))}
                  />
                </NovaField>

                {/* Ciudad */}
                <NovaField label="Ciudad" required error={errors.city?.message} icon={<MapPin className="w-5 h-5" />} htmlFor="city" errorId="city-error">
                  {availableCities.length > 0 ? (
                    <NovaSelect
                      value={watch('city')}
                      onChange={(v) => setValue('city', v)}
                      placeholder="Selecciona tu ciudad"
                      hasIcon
                      error={!!errors.city && submitAttempted}
                      options={availableCities.map(c => ({ value: c.name, label: c.name }))}
                    />
                  ) : (
                    <input
                      {...register('city')}
                      id="city"
                      placeholder="Tu ciudad"
                      aria-required="true"
                      aria-invalid={!!errors.city}
                      aria-describedby={errors.city ? "city-error" : undefined}
                      className={cn(inputClasses, "pl-11", errors.city && submitAttempted && "border-red-300 dark:border-red-500")}
                    />
                  )}
                </NovaField>

                {/* Dirección */}
                <NovaField label="Dirección" required error={errors.address?.message} icon={<MapPin className="w-5 h-5" />} className="sm:col-span-2" htmlFor="address" errorId="address-error">
                  <input
                    {...register('address')}
                    id="address"
                    placeholder="Tu dirección completa"
                    aria-required="true"
                    aria-invalid={!!errors.address}
                    aria-describedby={errors.address ? "address-error" : undefined}
                    className={cn(inputClasses, "pl-11", errors.address && submitAttempted && "border-red-300 dark:border-red-500")}
                  />
                </NovaField>

                {/* Nacionalidad */}
                <NovaField label="Nacionalidad" required error={errors.nationality?.message} icon={<MapPin className="w-5 h-5" />} htmlFor="nationality" errorId="nationality-error">
                  <NovaSelect
                    value={watch('nationality')}
                    onChange={(v) => setValue('nationality', v)}
                    placeholder="Selecciona tu nacionalidad"
                    hasIcon
                    error={!!errors.nationality && submitAttempted}
                    options={countries.map(c => ({ value: c.code, label: c.name_es }))}
                  />
                </NovaField>
              </div>
            </section>

            {/* Section: Documento de Identidad */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-500/10">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Documento de Identidad
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de documento */}
                <NovaField label="Tipo de documento" required error={errors.document_type?.message} icon={<FileText className="w-5 h-5" />} htmlFor="document_type" errorId="document_type-error">
                  <NovaSelect
                    value={watch('document_type')}
                    onChange={(v) => setValue('document_type', v)}
                    placeholder="Selecciona tipo"
                    hasIcon
                    error={!!errors.document_type && submitAttempted}
                    options={filteredDocTypes.map(dt => ({ value: dt.id, label: dt.label_es }))}
                  />
                </NovaField>

                {/* Número de documento */}
                <NovaField label="Número de documento" required error={errors.document_number?.message} icon={<FileText className="w-5 h-5" />} htmlFor="document_number" errorId="document_number-error">
                  <input
                    {...register('document_number')}
                    id="document_number"
                    placeholder="Tu número de documento"
                    aria-required="true"
                    aria-invalid={!!errors.document_number}
                    aria-describedby={errors.document_number ? "document_number-error" : undefined}
                    className={cn(inputClasses, "pl-11", errors.document_number && submitAttempted && "border-red-300 dark:border-red-500")}
                  />
                </NovaField>
              </div>
            </section>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSavingProfile}
              aria-label={isSavingProfile ? 'Guardando datos del perfil' : 'Continuar al siguiente paso'}
              className={cn(
                "w-full h-12 sm:h-14 rounded font-semibold text-white",
                "bg-gradient-to-r from-purple-600 to-purple-500",
                "hover:from-purple-500 hover:to-purple-400",
                "shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#0a0a0f]"
              )}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            © 2026 KREOON TECH LLC. Todos los derechos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default NovaProfileDataStep;
