import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RegistrationFormData,
  registrationFormSchema,
  UserType,
} from '../types';
import { PhoneInput } from '../shared/PhoneInput';
import { PasswordField } from '../shared/PasswordField';

const TYPE_BADGE: Record<UserType, { emoji: string; label: string }> = {
  client: { emoji: '🏢', label: 'Empresa / Marca' },
  freelancer: { emoji: '✨', label: 'Creador / Talento' },
  brand: { emoji: '🏢', label: 'Marca' },
  organization: { emoji: '🏛️', label: 'Organización' },
};

interface RegistrationFormStepProps {
  userType: UserType;
  initialData: Partial<RegistrationFormData>;
  onSubmit: (data: RegistrationFormData) => void;
  isSubmitting: boolean;
  submitError?: string;
}

export function RegistrationFormStep({
  userType,
  initialData,
  onSubmit,
  isSubmitting,
  submitError,
}: RegistrationFormStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      fullName: initialData.fullName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      phoneCountryCode: initialData.phoneCountryCode || '+57',
      password: '',
      confirmPassword: '',
      companyName: '',
      acceptAge18Plus: true,
      acceptTerms: false as unknown as true,
      acceptPrivacy: true,
      acceptDataTreatment: true,
    },
  });

  const password = watch('password');
  const phone = watch('phone');
  const phoneCountryCode = watch('phoneCountryCode');
  const acceptTerms = watch('acceptTerms');

  const badge = TYPE_BADGE[userType];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header con badge de tipo */}
      <div className="text-center space-y-3 mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-4xl">{badge.emoji}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Crea tu cuenta
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
          <span className="text-sm font-medium text-primary">{badge.label}</span>
        </div>
        <p className="text-white/50 text-sm">
          ¡Último paso! Solo tarda 1 minuto 🎉
        </p>
      </div>

      {/* Sección: Tus datos */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tu información</p>

        {/* Nombre completo */}
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-semibold text-white/90">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              disabled={isSubmitting}
              placeholder="Ej: Carlos Gómez"
              className={cn(
                "w-full h-12 pl-10 pr-4 rounded-xl border transition-all text-white text-base",
                "bg-white/5 placeholder:text-white/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                errors.fullName
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-white/10 focus:border-primary/60",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <span>⚠️</span> {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-white/90">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              id="email"
              type="email"
              {...register('email')}
              disabled={isSubmitting}
              placeholder="tu@email.com"
              className={cn(
                "w-full h-12 pl-10 pr-4 rounded-xl border transition-all text-white text-base",
                "bg-white/5 placeholder:text-white/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                errors.email
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-white/10 focus:border-primary/60",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <span>⚠️</span> {errors.email.message}
            </p>
          )}
        </div>

        {/* Teléfono */}
        <PhoneInput
          value={phone}
          countryCode={phoneCountryCode}
          onChange={(v) => setValue('phone', v)}
          onCountryChange={(c) => setValue('phoneCountryCode', c)}
          error={errors.phone?.message}
          disabled={isSubmitting}
        />
      </div>

      {/* Sección: Contraseña */}
      <div className="space-y-4 pt-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Tu contraseña</p>

        <PasswordField
          id="password"
          label="Contraseña"
          value={password}
          onChange={(v) => setValue('password', v)}
          error={errors.password?.message}
          showStrength
          disabled={isSubmitting}
        />

        <PasswordField
          id="confirmPassword"
          label="Repite la contraseña"
          value={watch('confirmPassword')}
          onChange={(v) => setValue('confirmPassword', v)}
          error={errors.confirmPassword?.message}
          placeholder="Escribe la misma contraseña"
          disabled={isSubmitting}
        />
      </div>

      {/* Error de submit */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <span>❌</span> {submitError}
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full h-14 rounded-xl font-bold text-base transition-all",
          "flex items-center justify-center gap-2",
          isSubmitting
            ? "bg-primary/40 cursor-not-allowed text-white/60"
            : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creando tu cuenta...
          </>
        ) : (
          <>
            <span>🚀</span> Crear mi cuenta
          </>
        )}
      </button>

      {/* Checkbox legal consolidado */}
      <label className={cn(
        "flex items-start gap-3 cursor-pointer group",
        isSubmitting && "opacity-50 cursor-not-allowed"
      )}>
        {/* Custom checkbox */}
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={!!acceptTerms}
            onChange={(e) => !isSubmitting && setValue('acceptTerms', e.target.checked as true)}
            disabled={isSubmitting}
            className="sr-only peer"
          />
          <div className={cn(
            "w-5 h-5 rounded border-2 transition-all",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50",
            acceptTerms
              ? "bg-primary border-primary"
              : errors.acceptTerms
                ? "border-red-500/50 bg-red-500/10"
                : "border-white/30 bg-white/5 group-hover:border-white/50"
          )}>
            {acceptTerms && (
              <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Texto con links */}
        <span className="text-sm text-white/70 leading-relaxed">
          Soy mayor de 18 años y acepto los{' '}
          <a href="/legal/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2 hover:text-primary/80">
            Términos y Condiciones
          </a>
          {', '}la{' '}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2 hover:text-primary/80">
            Política de Privacidad
          </a>
          {' '}y el{' '}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary underline underline-offset-2 hover:text-primary/80">
            Tratamiento de Datos (Ley 1581)
          </a>
          . <span className="text-red-400">*</span>
        </span>
      </label>
      {errors.acceptTerms && (
        <p className="text-xs text-red-400 flex items-center gap-1 -mt-3">
          <span>⚠️</span> Debes aceptar para continuar
        </p>
      )}

      {/* Login link */}
      <p className="text-center text-sm text-white/40">
        ¿Ya tienes cuenta?{' '}
        <a href="/auth" className="text-primary hover:underline font-semibold">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}
