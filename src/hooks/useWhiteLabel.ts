/**
 * useWhiteLabel Hook
 *
 * Combines organization branding data with feature gating by plan tier.
 * Provides the effective branding for the current org context.
 */

import { useMemo } from 'react';
import { useOrgOwner } from './useOrgOwner';
import {
  getWhiteLabelCapabilities,
  type WhiteLabelCapabilities,
} from '@/lib/white-label/feature-gates';

export interface OrgBranding {
  name: string;
  slug: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  platformName: string | null;
  senderEmail: string | null;
  senderName: string | null;
  supportEmail: string | null;
  customDomain: string | null;
  resendDomainVerified: boolean;
  pwaIcon192Url: string | null;
  pwaIcon512Url: string | null;
  ogImageUrl: string | null;
  selectedPlan: string;
}

export interface WhiteLabelState {
  capabilities: WhiteLabelCapabilities;
  orgBranding: OrgBranding | null;
  isWhiteLabelActive: boolean;
  loading: boolean;
  /** Effective platform name (org's custom name or "KREOON") */
  effectivePlatformName: string;
  /** Effective studio label for nav */
  effectiveStudioLabel: string;
  /** Effective marketplace label for nav */
  effectiveMarketplaceLabel: string;
  /** Effective support email */
  effectiveSupportEmail: string;
  /** Effective logo URL (considers dark mode) */
  effectiveLogoUrl: string;
}

const DEFAULT_SUPPORT_EMAIL = 'soporte@kreoon.com';

export function useWhiteLabel(): WhiteLabelState {
  const {
    currentOrgName,
    orgBranding: rawBranding,
    loading,
  } = useOrgOwner();

  return useMemo(() => {
    if (!rawBranding) {
      const defaultCaps = getWhiteLabelCapabilities('starter');
      return {
        capabilities: defaultCaps,
        orgBranding: null,
        isWhiteLabelActive: false,
        loading,
        effectivePlatformName: 'KREOON',
        effectiveStudioLabel: 'KREOON STUDIO',
        effectiveMarketplaceLabel: 'KREOON MARKETPLACE',
        effectiveSupportEmail: DEFAULT_SUPPORT_EMAIL,
        effectiveLogoUrl: '/favicon.png',
      };
    }

    const capabilities = getWhiteLabelCapabilities(rawBranding.selectedPlan);

    const orgBranding: OrgBranding = {
      name: rawBranding.name || currentOrgName || 'KREOON',
      slug: rawBranding.slug,
      logoUrl: rawBranding.logoUrl,
      logoDarkUrl: rawBranding.logoDarkUrl,
      faviconUrl: rawBranding.faviconUrl,
      primaryColor: rawBranding.primaryColor || '#8B5CF6',
      secondaryColor: rawBranding.secondaryColor,
      platformName: rawBranding.platformName,
      senderEmail: rawBranding.senderEmail,
      senderName: rawBranding.senderName,
      supportEmail: rawBranding.supportEmail,
      customDomain: rawBranding.customDomain,
      resendDomainVerified: rawBranding.resendDomainVerified,
      pwaIcon192Url: rawBranding.pwaIcon192Url,
      pwaIcon512Url: rawBranding.pwaIcon512Url,
      ogImageUrl: rawBranding.ogImageUrl,
      selectedPlan: rawBranding.selectedPlan || 'starter',
    };

    const isWhiteLabelActive = capabilities.replaceKreoonBranding;

    // Effective values based on capabilities
    const effectivePlatformName = (capabilities.replaceKreoonBranding && orgBranding.platformName)
      ? orgBranding.platformName
      : (capabilities.replaceKreoonBranding && orgBranding.name)
        ? orgBranding.name
        : 'KREOON';

    const effectiveStudioLabel = capabilities.replaceKreoonBranding
      ? `${effectivePlatformName} STUDIO`
      : 'KREOON STUDIO';

    const effectiveMarketplaceLabel = capabilities.replaceKreoonBranding
      ? `${effectivePlatformName} MARKETPLACE`
      : 'KREOON MARKETPLACE';

    const effectiveSupportEmail = (capabilities.customSupportEmail && orgBranding.supportEmail)
      ? orgBranding.supportEmail
      : DEFAULT_SUPPORT_EMAIL;

    const isDark = typeof document !== 'undefined'
      && document.documentElement.classList.contains('dark');
    const effectiveLogoUrl = (capabilities.customLogo && orgBranding.logoUrl)
      ? (isDark && capabilities.customLogoDark && orgBranding.logoDarkUrl)
        ? orgBranding.logoDarkUrl
        : orgBranding.logoUrl
      : '/favicon.png';

    return {
      capabilities,
      orgBranding,
      isWhiteLabelActive,
      loading,
      effectivePlatformName,
      effectiveStudioLabel,
      effectiveMarketplaceLabel,
      effectiveSupportEmail,
      effectiveLogoUrl,
    };
  }, [rawBranding, currentOrgName, loading]);
}
