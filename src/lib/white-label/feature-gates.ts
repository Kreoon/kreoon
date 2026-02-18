/**
 * White-Label Feature Gating
 *
 * Maps organization subscription plan tiers to white-label capabilities.
 * Progressive unlock: starter → pro → enterprise.
 */

export interface WhiteLabelCapabilities {
  // Visual branding
  customLogo: boolean;
  customLogoDark: boolean;
  customPrimaryColor: boolean;
  customSecondaryColor: boolean;
  customFavicon: boolean;
  customPwaIcons: boolean;
  customPwaName: boolean;
  customOgImage: boolean;

  // Branding replacement
  replaceKreoonBranding: boolean; // Replace "KREOON" with org name in nav
  hidePoweredBy: boolean;         // Hide "Powered by KREOON" footer

  // Domain
  subdomain: boolean;             // orgslug.kreoon.com
  customDomain: boolean;          // app.clientdomain.com

  // Email
  customSenderName: boolean;      // "Org Name" <noreply@kreoon.com>
  customSenderDomain: boolean;    // noreply@clientdomain.com
  customAuthEmails: boolean;      // Bypass Supabase Auth emails
  customSupportEmail: boolean;    // Custom support email
}

const STARTER_CAPABILITIES: WhiteLabelCapabilities = {
  customLogo: true,
  customLogoDark: false,
  customPrimaryColor: true,
  customSecondaryColor: false,
  customFavicon: false,
  customPwaIcons: false,
  customPwaName: false,
  customOgImage: false,
  replaceKreoonBranding: false,
  hidePoweredBy: false,
  subdomain: false,
  customDomain: false,
  customSenderName: false,
  customSenderDomain: false,
  customAuthEmails: false,
  customSupportEmail: false,
};

const PRO_CAPABILITIES: WhiteLabelCapabilities = {
  customLogo: true,
  customLogoDark: true,
  customPrimaryColor: true,
  customSecondaryColor: true,
  customFavicon: true,
  customPwaIcons: true,
  customPwaName: true,
  customOgImage: true,
  replaceKreoonBranding: true,
  hidePoweredBy: false,
  subdomain: true,
  customDomain: false,
  customSenderName: true,
  customSenderDomain: false,
  customAuthEmails: false,
  customSupportEmail: false,
};

const ENTERPRISE_CAPABILITIES: WhiteLabelCapabilities = {
  customLogo: true,
  customLogoDark: true,
  customPrimaryColor: true,
  customSecondaryColor: true,
  customFavicon: true,
  customPwaIcons: true,
  customPwaName: true,
  customOgImage: true,
  replaceKreoonBranding: true,
  hidePoweredBy: true,
  subdomain: true,
  customDomain: true,
  customSenderName: true,
  customSenderDomain: true,
  customAuthEmails: true,
  customSupportEmail: true,
};

// Plan tier names as used in organizations.selected_plan
type PlanTier = 'starter' | 'growth' | 'scale' | 'enterprise';

const PLAN_MAP: Record<PlanTier, WhiteLabelCapabilities> = {
  starter: STARTER_CAPABILITIES,
  growth: PRO_CAPABILITIES,    // growth = pro tier
  scale: PRO_CAPABILITIES,     // scale = pro tier
  enterprise: ENTERPRISE_CAPABILITIES,
};

export function getWhiteLabelCapabilities(planTier: string | null | undefined): WhiteLabelCapabilities {
  const tier = (planTier || 'starter').toLowerCase() as PlanTier;
  return PLAN_MAP[tier] || STARTER_CAPABILITIES;
}

/**
 * Check if any white-label feature is active for this plan
 */
export function hasAnyWhiteLabel(planTier: string | null | undefined): boolean {
  const caps = getWhiteLabelCapabilities(planTier);
  return caps.customLogo || caps.customPrimaryColor;
}

/**
 * Check if org has visual branding capabilities beyond basic
 */
export function hasFullVisualBranding(planTier: string | null | undefined): boolean {
  const caps = getWhiteLabelCapabilities(planTier);
  return caps.replaceKreoonBranding;
}
