/**
 * KREOON Unified Finance Constants — Single Source of Truth
 *
 * ALL financial values (commissions, plans, tokens, fees) are defined here.
 * Every other file must import from this module instead of hardcoding values.
 *
 * SYNC NOTE: supabase/functions/_shared/ai-token-guard.ts must be manually
 * kept in sync since Deno edge functions can't import from src/.
 * Current version: v2026.02.17
 */

// ═══════════════════════════════════════════════════════════════
// 1. COMMISSION RATES (platform fee % by transaction type)
// ═══════════════════════════════════════════════════════════════

export const COMMISSION_RATES = {
  /** Creador ↔ Marca directo */
  marketplace_direct: { base: 30, min: 25, max: 35 },
  /** Con escrow, gestión, soporte */
  campaigns_managed: { base: 40, min: 35, max: 45 },
  /** Sobre ventas generadas */
  live_shopping: { base: 20, min: 15, max: 25 },
  /** Editor, estratega, etc. */
  professional_services: { base: 30, min: 25, max: 35 },
  /** Full-service con PM */
  corporate_packages: { base: 30, min: 25, max: 35 },
  /** Live Hosting - Canal A/B (marketplace o invitación directa) */
  live_hosting_direct: { base: 20, min: 15, max: 25 },
  /** Live Hosting - Canal C (org gestiona, white-label) */
  live_hosting_whitelabel: { base: 12, min: 10, max: 15 },
} as const;

export type CommissionType = keyof typeof COMMISSION_RATES;

// ═══════════════════════════════════════════════════════════════
// 2. INTERNAL SPLIT (post platform-fee distribution)
// ═══════════════════════════════════════════════════════════════

/** After platform fee is taken, remaining is split among participants */
export const INTERNAL_SPLIT = {
  creator: 70,
  editor: 15,
  organization: 15,
} as const;

// ═══════════════════════════════════════════════════════════════
// 3. REFERRAL RATES (perpetual while both parties active)
// ═══════════════════════════════════════════════════════════════

export const REFERRAL_RATES = {
  /** % of subscription payment (monthly/annual), perpetual */
  subscription_commission: 20,
  /** % deducted from platform fee on transactions, perpetual */
  transaction_commission: 5,
} as const;

// ═══════════════════════════════════════════════════════════════
// 4. AI TOKEN COSTS (per action)
// ═══════════════════════════════════════════════════════════════

export const AI_TOKEN_COSTS = {
  "research.full": 600,
  "dna.full_analysis": 500,
  "dna.project_analysis": 400,
  "scripts.generate": 120,
  "content.generate_script": 120,
  "research.phase": 100,
  "board.analyze_board": 100,
  "board.research_context": 150,
  "talent.suggest_creator": 120,
  "live.generate": 150,
  "board.analyze_card": 80,
  "talent.match": 60,
  "scripts.block.script": 25,
  "scripts.block.editor": 20,
  "scripts.block.trafficker": 20,
  "scripts.block.strategist": 20,
  "scripts.block.designer": 20,
  "scripts.block.admin": 15,
  "scripts.improve": 60,
  "content.improve_script": 60,
  "portfolio.bio": 50,
  "content.analyze": 40,
  "board.suggestions": 40,
  "board.prioritize": 40,
  "social_ai.generate_captions": 60,
  "portfolio.caption": 25,
  "script_chat": 20,
  "transcription": 15,
  "ads.generate_banner": 200,
  "ads.generate_copy": 40,
} as const;

export type AIActionKey = keyof typeof AI_TOKEN_COSTS;

/** Default cost when action is not in the map */
export const AI_TOKEN_DEFAULT_COST = 40;

/** Approximate value: 1 Token IA ≈ $0.01 USD */
export const TOKEN_USD_VALUE = 0.01;

// ═══════════════════════════════════════════════════════════════
// 5. AI TOKEN PLAN ALLOCATIONS (monthly)
// ═══════════════════════════════════════════════════════════════

export const PLAN_AI_TOKENS = {
  // Marcas
  marcas_free: 300,
  starter: 4_000,
  pro: 12_000,
  business: 40_000,
  // Creadores
  creator_free: 800,
  creator_pro: 6_000,
  // Agencias
  agency_starter: 20_000,
  agency_pro: 60_000,
  agency_enterprise: 200_000,
} as const;

export type PlanTokenKey = keyof typeof PLAN_AI_TOKENS;

// ═══════════════════════════════════════════════════════════════
// 6. TOKEN PURCHASE PACKAGES
// ═══════════════════════════════════════════════════════════════

export const TOKEN_PACKAGES = [
  { id: "basic", tokens: 2_000, price: 15, popular: false },
  { id: "popular", tokens: 10_000, price: 59, popular: true },
  { id: "pro", tokens: 30_000, price: 149, popular: false },
  { id: "agency", tokens: 100_000, price: 399, popular: false },
] as const;

// ═══════════════════════════════════════════════════════════════
// 7. SUBSCRIPTION PLANS
// ═══════════════════════════════════════════════════════════════

export interface PlanDef {
  id: string;
  name: string;
  segment: "marcas" | "creadores" | "agencias";
  priceMonthly: number;
  priceAnnual: number;
  aiTokens: number;
  users: number | null;        // null = unlimited
  contentPerMonth: number | null;
  storage: string;
  clients?: number | null;     // agencies only
  teamMembers?: number | null; // agencies only (legacy, kept for compat)
  // Role-based limits (agencies only)
  adminUsers?: number | null;
  strategists?: number | null;
  editors?: number | null;     // post-production
  creators?: number | null;    // active creators
  badge?: string;
  highlighted?: boolean;
  adnRecargadosPerMonth?: number | null; // null = unlimited, 0 = disabled
  socialPostsPerMonth?: number | null;   // Social Hub posts/month, null = unlimited
}

export const PLANS: PlanDef[] = [
  // ── Marcas ──
  {
    id: "marcas-free",
    name: "Explorar",
    segment: "marcas",
    priceMonthly: 0,
    priceAnnual: 0,
    aiTokens: 300,
    users: 1,
    contentPerMonth: 0,
    storage: "—",
    adnRecargadosPerMonth: 0,
    socialPostsPerMonth: 50,
  },
  {
    id: "marcas-starter",
    name: "Starter",
    segment: "marcas",
    priceMonthly: 39,
    priceAnnual: 390,
    aiTokens: 4_000,
    users: 3,
    contentPerMonth: 30,
    storage: "5GB",
    badge: "Para empezar",
    highlighted: true,
    adnRecargadosPerMonth: 2,
    socialPostsPerMonth: 300,
  },
  {
    id: "marcas-pro",
    name: "Pro",
    segment: "marcas",
    priceMonthly: 129,
    priceAnnual: 1_290,
    aiTokens: 12_000,
    users: 10,
    contentPerMonth: 150,
    storage: "50GB",
    badge: "Más popular",
    adnRecargadosPerMonth: 5,
    socialPostsPerMonth: null, // unlimited
  },
  {
    id: "marcas-business",
    name: "Business",
    segment: "marcas",
    priceMonthly: 349,
    priceAnnual: 3_490,
    aiTokens: 40_000,
    users: null,
    contentPerMonth: null,
    storage: "500GB",
    adnRecargadosPerMonth: null,
    socialPostsPerMonth: null, // unlimited
  },
  // ── Creadores ──
  {
    id: "creadores-basico",
    name: "Básico",
    segment: "creadores",
    priceMonthly: 0,
    priceAnnual: 0,
    aiTokens: 800,
    users: 1,
    contentPerMonth: null,
    storage: "—",
    adnRecargadosPerMonth: 0,
    socialPostsPerMonth: 50,
  },
  {
    id: "creadores-pro",
    name: "Creator Pro",
    segment: "creadores",
    priceMonthly: 24,
    priceAnnual: 240,
    aiTokens: 6_000,
    users: 1,
    contentPerMonth: null,
    storage: "—",
    badge: "Badge verificado",
    highlighted: true,
    adnRecargadosPerMonth: 3,
    socialPostsPerMonth: null, // unlimited
  },
  // ── Agencias ──
  {
    id: "agencias-starter",
    name: "Agency Starter",
    segment: "agencias",
    priceMonthly: 249,
    priceAnnual: 2_490,
    aiTokens: 20_000,
    users: null,
    contentPerMonth: null,
    storage: "50GB",
    clients: 10,
    teamMembers: 29, // total: 5 admin + 2 strat + 2 editors + 20 creators
    adminUsers: 5,
    strategists: 2,
    editors: 2,
    creators: 20,
    adnRecargadosPerMonth: null,
    socialPostsPerMonth: null, // unlimited
  },
  {
    id: "agencias-pro",
    name: "Agency Pro",
    segment: "agencias",
    priceMonthly: 599,
    priceAnnual: 5_990,
    aiTokens: 60_000,
    users: null,
    contentPerMonth: null,
    storage: "200GB",
    clients: 25,
    teamMembers: 70, // total: 10 admin + 5 strat + 5 editors + 50 creators
    adminUsers: 10,
    strategists: 5,
    editors: 5,
    creators: 50,
    badge: "Más popular para agencias",
    highlighted: true,
    adnRecargadosPerMonth: null,
    socialPostsPerMonth: null, // unlimited
  },
  {
    id: "agencias-enterprise",
    name: "Agency Enterprise",
    segment: "agencias",
    priceMonthly: 0, // custom
    priceAnnual: 0,
    aiTokens: 200_000,
    users: null,
    contentPerMonth: null,
    storage: "Ilimitado",
    clients: null,
    teamMembers: null,
    adminUsers: null,
    strategists: null,
    editors: null,
    creators: null,
    adnRecargadosPerMonth: null,
    socialPostsPerMonth: null, // unlimited
  },
];

/** Helper: get plans by segment */
export function getPlansBySegment(segment: PlanDef["segment"]): PlanDef[] {
  return PLANS.filter((p) => p.segment === segment);
}

/** Helper: find plan by ID */
export function getPlanById(planId: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === planId);
}

// ═══════════════════════════════════════════════════════════════
// 8. WITHDRAWAL FEES
// ═══════════════════════════════════════════════════════════════

export type WithdrawalMethod =
  | "bank_transfer_colombia"
  | "bank_transfer_international"
  | "paypal"
  | "payoneer"
  | "nequi"
  | "daviplata"
  | "crypto"
  | "zelle"
  | "wise";

export const WITHDRAWAL_FEES: Record<
  WithdrawalMethod,
  { fixed: number; percentage: number; minAmount: number; currency: string }
> = {
  bank_transfer_colombia: { fixed: 0, percentage: 0, minAmount: 50_000, currency: "COP" },
  bank_transfer_international: { fixed: 25, percentage: 0, minAmount: 100, currency: "USD" },
  paypal: { fixed: 0, percentage: 2.5, minAmount: 10, currency: "USD" },
  payoneer: { fixed: 3, percentage: 0, minAmount: 50, currency: "USD" },
  nequi: { fixed: 0, percentage: 0, minAmount: 10_000, currency: "COP" },
  daviplata: { fixed: 0, percentage: 0, minAmount: 10_000, currency: "COP" },
  crypto: { fixed: 5, percentage: 0, minAmount: 50, currency: "USD" },
  zelle: { fixed: 0, percentage: 0, minAmount: 10, currency: "USD" },
  wise: { fixed: 1, percentage: 0.5, minAmount: 20, currency: "USD" },
};

// ═══════════════════════════════════════════════════════════════
// 9. PAYMENT PROVIDER FEES (for deposits)
// ═══════════════════════════════════════════════════════════════

export const PAYMENT_PROVIDER_FEES = {
  stripe: { fixed: 0.30, percentage: 2.9 },
  payu: { fixed: 0, percentage: 3.5 },
  mercadopago: { fixed: 0, percentage: 3.99 },
} as const;

// ═══════════════════════════════════════════════════════════════
// 10. SUPPORTED CURRENCIES
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_CURRENCIES = [
  "USD", "COP", "MXN", "PEN", "CLP", "ARS", "BRL", "EUR",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Default exchange rate spread */
export const EXCHANGE_RATE_SPREAD = 2; // %

// ═══════════════════════════════════════════════════════════════
// 11. ESCROW CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Hours before auto-approval if no client response */
export const ESCROW_AUTO_APPROVAL_HOURS = 72;

/** Minimum payment amount for escrow (USD) */
export const ESCROW_MIN_PAYMENT_USD = 50;

// ═══════════════════════════════════════════════════════════════
// 12. REFERRAL TIERS (progressive commission bonus)
// ═══════════════════════════════════════════════════════════════

export const REFERRAL_TIERS = {
  starter: {
    label: "Starter",
    minReferrals: 0,
    bonusPercent: 0,
    effectiveRate: 20,
    badgeEmoji: "\uD83C\uDF31",
    badgeColor: "#888888",
  },
  ambassador: {
    label: "Ambassador",
    minReferrals: 3,
    bonusPercent: 2,
    effectiveRate: 22,
    badgeEmoji: "\uD83C\uDF96\uFE0F",
    badgeColor: "#9333ea",
  },
  champion: {
    label: "Champion",
    minReferrals: 10,
    bonusPercent: 3,
    effectiveRate: 23,
    badgeEmoji: "\uD83C\uDFC6",
    badgeColor: "#f59e0b",
  },
  elite: {
    label: "Elite",
    minReferrals: 25,
    bonusPercent: 5,
    effectiveRate: 25,
    badgeEmoji: "\uD83D\uDC8E",
    badgeColor: "#3b82f6",
  },
  legend: {
    label: "Legend",
    minReferrals: 50,
    bonusPercent: 7,
    effectiveRate: 27,
    badgeEmoji: "\uD83D\uDC51",
    badgeColor: "#ef4444",
  },
} as const;

export type ReferralTierKey = keyof typeof REFERRAL_TIERS;

/** Ordered list of tier keys for progression logic */
export const REFERRAL_TIER_ORDER: ReferralTierKey[] = [
  "starter", "ambassador", "champion", "elite", "legend",
];

// ═══════════════════════════════════════════════════════════════
// 13. REFERRAL BILATERAL REWARDS
// ═══════════════════════════════════════════════════════════════

export const REFERRAL_BILATERAL = {
  /** Tokens IA awarded to the referred user on signup */
  referred_welcome_coins: 25,
  /** Tokens IA awarded to referrer when referral qualifies */
  referrer_qualification_coins: 50,
  /** Default discount % for the referred user's first subscription */
  referred_discount_percent: 30,
} as const;

// ═══════════════════════════════════════════════════════════════
// 14. REFERRAL SHARE MESSAGES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 15. UGC PRICE MATRIX & CAMPAIGN OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/** Per-creator price estimates by content type and creator tier (USD) */
export const UGC_PRICE_MATRIX = {
  ugc:      { emergente: 50, establecido: 150, premium: 400 },
  resena:   { emergente: 30, establecido: 100, premium: 250 },
  tutorial: { emergente: 80, establecido: 200, premium: 500 },
  unboxing: { emergente: 60, establecido: 180, premium: 450 },
  evento:   { emergente: 100, establecido: 300, premium: 800 },
} as const;

export type UGCContentType = keyof typeof UGC_PRICE_MATRIX;
export type CreatorTier = keyof (typeof UGC_PRICE_MATRIX)['ugc'];

/** First-campaign promotion: 0% commission for new brands */
export const FIRST_CAMPAIGN_PROMO = {
  commission_rate: 0,
  badge_text: 'Primera Campaña Gratis',
} as const;

/** B2B brand referral credit reward */
export const BRAND_REFERRAL_CREDIT = {
  amount: 50,
  currency: 'USD',
} as const;

// ═══════════════════════════════════════════════════════════════
// 16. REFERRAL SHARE MESSAGES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 14. LICENSE RENEWAL RATES (percentage of original project value)
// ═══════════════════════════════════════════════════════════════

/**
 * License renewal rates by deliverable category
 * Applied as percentage of original project value for 1-year extension
 */
export const LICENSE_RENEWAL_RATES = {
  video_with_creator: 0.30,     // 30% of original price
  photo_with_creator: 0.25,     // 25% of original price
  ugc_content: 0.30,            // 30% of original price
  live_recording: 0.20,         // 20% of original price
  product_photo: 0.20,          // 20% of original price
  broll_video: 0.20,            // 20% of original price
  copywriting: 0.20,            // 20% of original price
  /** Multiplier for full buyout (perpetual license) vs 1-year license price */
  buyout_multiplier: 3.0,       // 3x the annual license price
  /** Default renewal rate for unspecified categories */
  default: 0.25,                // 25% of original price
} as const;

export type RenewalCategory = keyof typeof LICENSE_RENEWAL_RATES;

/**
 * Calculate renewal price for a license
 */
export function calculateRenewalPrice(
  originalValue: number,
  category: RenewalCategory
): number {
  const rate = LICENSE_RENEWAL_RATES[category] ?? LICENSE_RENEWAL_RATES.default;
  return Math.round(originalValue * rate * 100) / 100;
}

/**
 * Calculate buyout price (perpetual license)
 */
export function calculateBuyoutPrice(annualLicensePrice: number): number {
  return Math.round(annualLicensePrice * LICENSE_RENEWAL_RATES.buyout_multiplier * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// 15. REFERRAL SHARE MESSAGES
// ═══════════════════════════════════════════════════════════════

export const SHARE_MESSAGES = {
  talent: {
    whatsapp:
      "Quiero invitarte a KREOON, la plataforma para creadores de contenido. Usa mi link y recibe 30% OFF + 25 Tokens IA: {URL}",
    twitter:
      "Si eres creador de contenido, tienes que conocer @kreoon_co. Registrate con mi link y recibe beneficios: {URL}",
    linkedin:
      "Si trabajas en creacion de contenido, te recomiendo KREOON. Registrate con mi link para recibir 30% de descuento: {URL}",
    email_subject: "Te invito a KREOON - beneficios exclusivos",
    email_body:
      "Hola,\n\nQuiero invitarte a KREOON, la plataforma todo-en-uno para creadores. Al registrarte con mi link recibiras 30% de descuento en tu primera suscripcion + 25 Tokens IA.\n\nRegistrate aqui: {URL}\n\nNos vemos dentro!",
  },
  brand: {
    whatsapp:
      "Te recomiendo KREOON para gestionar tu contenido y conectar con creadores. Usa mi link y recibe 30% OFF: {URL}",
    twitter:
      "Si tu marca necesita creadores de contenido, @kreoon_co es la solucion. 30% OFF con mi link: {URL}",
    linkedin:
      "Recomiendo KREOON para marcas que buscan escalar su produccion de contenido. Registrate con descuento: {URL}",
    email_subject: "KREOON - Plataforma de contenido con descuento",
    email_body:
      "Hola,\n\nQuiero recomendarte KREOON para gestionar la creacion de contenido de tu marca. Al registrarte con mi link obtienes 30% de descuento.\n\nRegistrate: {URL}\n\nSaludos!",
  },
} as const;
