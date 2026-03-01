import { z } from 'zod';

// ============================================
// TIPOS DE REGISTRO
// ============================================

/**
 * Tipo de flujo de registro
 * - org: Registro desde una organización específica (/auth/org/:slug)
 * - general: Registro general (/register, /r/:code, /comunidad/:slug, /unete/*)
 */
export type RegistrationFlow = 'org' | 'general';

/**
 * Tipo de usuario seleccionado
 * - Flujo org: client | freelancer
 * - Flujo general: brand | organization | freelancer
 */
export type UserType = 'client' | 'freelancer' | 'brand' | 'organization';

/**
 * Paso actual del wizard
 */
export type WizardStep = 'invite-code' | 'type-selector' | 'form' | 'success';

// ============================================
// PAÍSES LATAM PARA TELÉFONO
// ============================================

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const LATAM_COUNTRIES: CountryOption[] = [
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
  { code: 'DO', name: 'Rep. Dominicana', dialCode: '+1', flag: '🇩🇴' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
  { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '+1', flag: '🇵🇷' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸' },
];

// ============================================
// SCHEMA ZOD
// ============================================

export const registrationFormSchema = z.object({
  // Datos personales
  fullName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  email: z.string()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres'),

  phone: z.string()
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(20, 'El teléfono no puede exceder 20 dígitos')
    .regex(/^[0-9\s]+$/, 'Solo se permiten números'),

  phoneCountryCode: z.string().min(1, 'Selecciona un país'),

  // Contraseña
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres'),

  confirmPassword: z.string(),

  // Empresa (condicional)
  companyName: z.string().optional(),

  // Checkboxes legales
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' })
  }),

  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad' })
  }),

  acceptDataTreatment: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos' })
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Schema con companyName requerido (para client, brand, organization)
export const registrationFormSchemaWithCompany = registrationFormSchema.refine(
  data => data.companyName && data.companyName.length >= 2,
  {
    message: 'El nombre de empresa es requerido',
    path: ['companyName'],
  }
);

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

// ============================================
// ESTADO DEL WIZARD
// ============================================

export interface RegistrationV2State {
  // Flujo
  flow: RegistrationFlow;
  currentStep: WizardStep;

  // Contexto de organización (solo flujo org)
  orgSlug?: string;
  orgId?: string;
  orgName?: string;
  orgLogo?: string | null;
  requiresInviteCode?: boolean;
  inviteCode?: string;
  isValidInviteCode?: boolean;

  // Tipo de usuario seleccionado
  userType?: UserType;

  // Datos del formulario
  formData: Partial<RegistrationFormData>;

  // Referral
  referralCode?: string;

  // Partner community
  partnerCommunity?: string;

  // Estado de submit
  isSubmitting: boolean;
  submitError?: string;

  // Post-registro
  userId?: string;
  requiresEmailConfirmation: boolean;
}

export const initialRegistrationState: RegistrationV2State = {
  flow: 'general',
  currentStep: 'type-selector',
  formData: {
    phoneCountryCode: '+57', // Colombia por defecto
    acceptTerms: false,
    acceptPrivacy: false,
    acceptDataTreatment: false,
  } as Partial<RegistrationFormData>,
  isSubmitting: false,
  requiresEmailConfirmation: true,
};

// ============================================
// OPCIONES DE TIPO DE USUARIO
// ============================================

export interface UserTypeOption {
  type: UserType;
  title: string;
  description: string;
  icon: string;
}

export const ORG_USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    type: 'client',
    title: 'Cliente',
    description: 'Solicita contenido y gestiona proyectos',
    icon: 'Building2',
  },
  {
    type: 'freelancer',
    title: 'Freelancer',
    description: 'Crea contenido y ofrece servicios',
    icon: 'User',
  },
];

export const GENERAL_USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    type: 'brand',
    title: 'Marca / Empresa',
    description: 'Busco talento para crear contenido',
    icon: 'Building2',
  },
  {
    type: 'organization',
    title: 'Organización / Agencia',
    description: 'Gestiono equipos de creadores',
    icon: 'Users',
  },
  {
    type: 'freelancer',
    title: 'Freelancer',
    description: 'Soy creador de contenido independiente',
    icon: 'Sparkles',
  },
];

// ============================================
// HELPERS
// ============================================

/**
 * Determina si el tipo de usuario requiere nombre de empresa
 */
export function requiresCompanyName(userType: UserType | undefined): boolean {
  return userType === 'client' || userType === 'brand' || userType === 'organization';
}

/**
 * Obtiene los pasos del wizard según el flujo
 */
export function getWizardSteps(flow: RegistrationFlow, requiresInviteCode: boolean): WizardStep[] {
  if (flow === 'org') {
    return requiresInviteCode
      ? ['invite-code', 'type-selector', 'form', 'success']
      : ['type-selector', 'form', 'success'];
  }
  return ['type-selector', 'form', 'success'];
}

/**
 * Obtiene el índice del paso actual
 */
export function getStepIndex(steps: WizardStep[], currentStep: WizardStep): number {
  return steps.indexOf(currentStep);
}

/**
 * Obtiene el label del paso para el indicador de progreso
 */
export function getStepLabel(step: WizardStep): string {
  const labels: Record<WizardStep, string> = {
    'invite-code': 'Código',
    'type-selector': 'Tipo',
    'form': 'Datos',
    'success': 'Listo',
  };
  return labels[step];
}
