export type RegistrationIntent = 'talent' | 'brand' | 'organization' | 'join';

export interface UnifiedRegistrationData {
  // Intent
  intent: RegistrationIntent | null;

  // Credentials (shared)
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Talent flow
  talentType: 'creator' | 'editor' | 'both' | null;
  marketplaceRoles: string[];     // max 5 from MARKETPLACE_ROLES
  platforms: string[];
  categories: string[];

  // Brand flow
  brandName: string;
  brandIndustry: string;
  brandWebsite: string;

  // Organization flow
  orgSubType: 'agency' | 'community' | null;
  orgName: string;
  orgSlug: string;
  selectedPlan: 'starter' | 'growth' | 'scale' | null;

  // Join flow
  joinLink: string;
  inviteCode: string;
  foundOrg: { id: string; name: string; slug: string; logo_url: string | null } | null;

  // Referral
  referralCode: string;

  // Terms (shared)
  bio: string;
  locationCountry: string;
  acceptTerms: boolean;
}

export const INITIAL_DATA: UnifiedRegistrationData = {
  intent: null,
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  talentType: null,
  marketplaceRoles: [],
  platforms: [],
  categories: [],
  brandName: '',
  brandIndustry: '',
  brandWebsite: '',
  orgSubType: null,
  orgName: '',
  orgSlug: '',
  selectedPlan: null,
  joinLink: '',
  inviteCode: '',
  foundOrg: null,
  referralCode: '',
  bio: '',
  locationCountry: 'CO',
  acceptTerms: false,
};

export type RegistrationStep =
  | 'intent'
  | 'credentials'
  | 'talent-profile'
  | 'brand-profile'
  | 'org-details'
  | 'join-org'
  | 'terms'
  | 'success';

export type WizardMode = 'compact' | 'full';

export interface StepComponentProps {
  data: UnifiedRegistrationData;
  onChange: (updates: Partial<UnifiedRegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  mode: WizardMode;
}

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'Instagram' },
  { id: 'tiktok', label: 'TikTok', icon: 'Music2' },
  { id: 'youtube', label: 'YouTube', icon: 'Youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' },
  { id: 'twitter', label: 'X / Twitter', icon: 'Twitter' },
] as const;

export const TALENT_CATEGORIES = [
  'Belleza', 'Moda', 'Tech', 'Fitness', 'Food',
  'Viajes', 'Gaming', 'Hogar', 'Educación', 'Salud',
  'Mascotas', 'Bebés', 'Música', 'Finanzas', 'Lifestyle',
] as const;

export const BRAND_INDUSTRIES = [
  'Tecnología', 'E-commerce', 'Moda & Belleza', 'Alimentos & Bebidas',
  'Salud & Bienestar', 'Educación', 'Entretenimiento', 'Deportes',
  'Turismo & Viajes', 'Finanzas', 'Automotriz', 'Retail', 'Otro',
] as const;

export const PLAN_OPTIONS = [
  {
    id: 'starter' as const,
    label: 'Starter',
    description: 'Ideal para equipos pequeños',
    features: ['Hasta 5 miembros', 'Proyectos ilimitados', 'Soporte básico'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  {
    id: 'growth' as const,
    label: 'Growth',
    description: 'Para organizaciones en crecimiento',
    features: ['Hasta 25 miembros', 'Campañas del marketplace', 'Soporte prioritario'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
  {
    id: 'scale' as const,
    label: 'Scale',
    description: 'Para grandes operaciones',
    features: ['Miembros ilimitados', 'API & integraciones', 'Soporte dedicado'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
] as const;
