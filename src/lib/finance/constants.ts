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
  marketplace_direct: { base: 25, min: 20, max: 35 },
  /** Con escrow, gestión, soporte */
  campaigns_managed: { base: 30, min: 25, max: 40 },
  /** Sobre ventas generadas */
  live_shopping: { base: 20, min: 15, max: 25 },
  /** Editor, estratega, etc. */
  professional_services: { base: 25, min: 20, max: 30 },
  /** Full-service con PM */
  corporate_packages: { base: 35, min: 30, max: 40 },
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
  "scripts.improve": 60,
  "content.improve_script": 60,
  "portfolio.bio": 50,
  "content.analyze": 40,
  "board.suggestions": 40,
  "board.prioritize": 40,
  "portfolio.caption": 25,
  "script_chat": 20,
  "transcription": 15,
} as const;

export type AIActionKey = keyof typeof AI_TOKEN_COSTS;

/** Default cost when action is not in the map */
export const AI_TOKEN_DEFAULT_COST = 40;

/** Approximate value: 1 Kreoon Token ≈ $0.01 USD */
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
