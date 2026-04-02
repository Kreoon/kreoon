import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RegistrationFormData,
  registrationFormSchema,
  registrationFormSchemaWithCompany,
  UserType,
  requiresCompanyName,
} from '../types';
import { PhoneInput } from '../shared/PhoneInput';
import { PasswordField } from '../shared/PasswordField';
import { LegalCheckboxes } from '../shared/LegalCheckboxes';

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
  const needsCompany = requiresCompanyName(userType);
  const schema = needsCompany ? registrationFormSchemaWithCompany : registrationFormSchema;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialData.fullName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      phoneCountryCode: initialData.phoneCountryCode || '+57',
      password: '',
      confirmPassword: '',
      companyName: initialData.companyName || '',
      acceptAge18Plus: false,
      acceptTerms: false,
      acceptPrivacy: false,
      acceptDataTreatment: false,
    },
  });

  const password = watch('password');
  const phone = watch('phone');
  const phoneCountryCode = watch('phoneCountryCode');
  const acceptAge18Plus = watch('acceptAge18Plus');
  const acceptTerms = watch('acceptTerms');
  const acceptPrivacy = watch('acceptPrivacy');
  const acceptDataTreatment = watch('acceptDataTreatment');

  const getCompanyLabel = () => {
    switch (userType) {
      case 'client':
      case 'brand':
        return 'Nombre de empresa';
      case 'organization':
        return 'Nombre de organización';
      default:
        return 'Empresa';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold text-white">
          Completa tu registro
        </h1>
        <p className="text-white/60 text-sm">
          Ingresa tus datos para crear tu cuenta
        </p>
      </div>

      {/* Nombre completo */}
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-white/90">
          Nombre completo <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            id="fullName"
            type="text"
            {...register('fullName')}
            disabled={isSubmitting}
            placeholder="Tu nombre completo"
            className={cn(
              "w-full h-11 pl-10 pr-4 rounded-sm border transition-all text-white",
              "bg-white/5 placeholder:text-white/40",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              errors.fullName
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/10 focus:border-primary",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        {errors.fullName && (
          <p className="text-xs text-red-400">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-white/90">
          Email <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            id="email"
            type="email"
            {...register('email')}
            disabled={isSubmitting}
            placeholder="tu@email.com"
            className={cn(
              "w-full h-11 pl-10 pr-4 rounded-sm border transition-all text-white",
              "bg-white/5 placeholder:text-white/40",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              errors.email
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/10 focus:border-primary",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Nombre de empresa (condicional) */}
      {needsCompany && (
        <div className="space-y-1.5">
          <label htmlFor="companyName" className="text-sm font-medium text-white/90">
            {getCompanyLabel()} <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              id="companyName"
              type="text"
              {...register('companyName')}
              disabled={isSubmitting}
              placeholder={`Nombre de tu ${userType === 'organization' ? 'organización' : 'empresa'}`}
              className={cn(
                "w-full h-11 pl-10 pr-4 rounded-sm border transition-all text-white",
                "bg-white/5 placeholder:text-white/40",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                errors.companyName
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-primary",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
          {errors.companyName && (
            <p className="text-xs text-red-400">{errors.companyName.message}</p>
          )}
        </div>
      )}

      {/* Teléfono */}
      <PhoneInput
        value={phone}
        countryCode={phoneCountryCode}
        onChange={(v) => setValue('phone', v)}
        onCountryChange={(c) => setValue('phoneCountryCode', c)}
        error={errors.phone?.message}
        disabled={isSubmitting}
      />

      {/* Contraseña */}
      <PasswordField
        id="password"
        label="Contraseña"
        value={password}
        onChange={(v) => setValue('password', v)}
        error={errors.password?.message}
        showStrength
        disabled={isSubmitting}
      />

      {/* Confirmar contraseña */}
      <PasswordField
        id="confirmPassword"
        label="Confirmar contraseña"
        value={watch('confirmPassword')}
        onChange={(v) => setValue('confirmPassword', v)}
        error={errors.confirmPassword?.message}
        placeholder="Repite tu contraseña"
        disabled={isSubmitting}
      />

      {/* Checkboxes legales */}
      <LegalCheckboxes
        acceptAge18Plus={acceptAge18Plus}
        acceptTerms={acceptTerms}
        acceptPrivacy={acceptPrivacy}
        acceptDataTreatment={acceptDataTreatment}
        onAge18PlusChange={(v) => setValue('acceptAge18Plus', v as true)}
        onTermsChange={(v) => setValue('acceptTerms', v as true)}
        onPrivacyChange={(v) => setValue('acceptPrivacy', v as true)}
        onDataTreatmentChange={(v) => setValue('acceptDataTreatment', v as true)}
        errors={{
          acceptAge18Plus: errors.acceptAge18Plus?.message,
          acceptTerms: errors.acceptTerms?.message,
          acceptPrivacy: errors.acceptPrivacy?.message,
          acceptDataTreatment: errors.acceptDataTreatment?.message,
        }}
        disabled={isSubmitting}
      />

      {/* Error de submit */}
      {submitError && (
        <div className="p-3 rounded-sm bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{submitError}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full h-12 rounded-sm font-semibold transition-all",
          "flex items-center justify-center gap-2",
          isSubmitting
            ? "bg-primary/50 cursor-not-allowed"
            : "bg-primary hover:bg-primary/90 text-white"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creando cuenta...
          </>
        ) : (
          'Crear cuenta'
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-xs text-white/40">
        ¿Ya tienes una cuenta?{' '}
        <a href="/auth" className="text-primary hover:underline">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}
