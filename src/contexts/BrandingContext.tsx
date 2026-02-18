import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseHostname, needsDomainResolution } from '@/lib/white-label/domain-resolver';
import { getWhiteLabelCapabilities } from '@/lib/white-label/feature-gates';

export interface BrandingSettings {
  platform_name: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  pwa_icon_192: string;
  pwa_icon_512: string;
  og_image_url: string;
  primary_color: string;
  secondary_color: string;
  theme_color: string;
  // White-label extensions
  studio_label: string;
  marketplace_label: string;
  support_email: string;
  /** The org slug resolved from domain (null on main domain) */
  resolved_org_slug: string | null;
  /** The org ID resolved from domain (null on main domain) */
  resolved_org_id: string | null;
  /** Plan tier of the resolved org */
  resolved_plan: string;
  /** Whether this branding comes from a white-label org (not global) */
  is_org_branded: boolean;
}

const DEFAULT_BRANDING: BrandingSettings = {
  platform_name: "KREOON",
  logo_url: "",
  logo_dark_url: "",
  favicon_url: "/favicon.ico",
  pwa_icon_192: "",
  pwa_icon_512: "",
  og_image_url: "",
  primary_color: "#7700b8",
  secondary_color: "",
  theme_color: "#7700b8",
  studio_label: "KREOON STUDIO",
  marketplace_label: "KREOON MARKETPLACE",
  support_email: "soporte@kreoon.com",
  resolved_org_slug: null,
  resolved_org_id: null,
  resolved_plan: "starter",
  is_org_branded: false,
};

interface BrandingContextValue {
  branding: BrandingSettings;
  loading: boolean;
  refetch: () => Promise<void>;
  /** Apply org-specific branding override (called from useWhiteLabel after auth) */
  applyOrgBranding: (orgOverrides: Partial<BrandingSettings>) => void;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const domainResolvedRef = useRef(false);

  // Step 1: Resolve domain-based branding (pre-auth, runs once on mount)
  const resolveDomainBranding = useCallback(async () => {
    try {
      if (!needsDomainResolution()) return null;

      const parsed = parseHostname(window.location.hostname);

      const { data, error } = await supabase.rpc('resolve_org_by_domain', {
        p_hostname: window.location.hostname.toLowerCase(),
      });

      if (error || !data) return null;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      const caps = getWhiteLabelCapabilities(row.org_selected_plan);

      const domainBranding: Partial<BrandingSettings> = {
        resolved_org_slug: row.org_slug || parsed.slug,
        resolved_org_id: row.org_id,
        resolved_plan: row.org_selected_plan || 'starter',
        is_org_branded: caps.replaceKreoonBranding,
      };

      // Apply visual branding based on plan capabilities
      if (caps.customLogo && row.org_logo_url) {
        domainBranding.logo_url = row.org_logo_url;
      }
      if (caps.customLogoDark && row.org_logo_dark_url) {
        domainBranding.logo_dark_url = row.org_logo_dark_url;
      }
      if (caps.customPrimaryColor && row.org_primary_color) {
        domainBranding.primary_color = row.org_primary_color;
        domainBranding.theme_color = row.org_primary_color;
      }
      if (caps.customSecondaryColor && row.org_secondary_color) {
        domainBranding.secondary_color = row.org_secondary_color;
      }
      if (caps.customFavicon && row.org_favicon_url) {
        domainBranding.favicon_url = row.org_favicon_url;
      }
      if (caps.customOgImage && row.org_og_image_url) {
        domainBranding.og_image_url = row.org_og_image_url;
      }
      if (caps.replaceKreoonBranding) {
        const name = row.org_platform_name || row.org_name || 'KREOON';
        domainBranding.platform_name = name;
        domainBranding.studio_label = `${name} STUDIO`;
        domainBranding.marketplace_label = `${name} MARKETPLACE`;
      }

      return domainBranding;
    } catch (err) {
      console.error('[BrandingContext] Domain resolution failed:', err);
      return null;
    }
  }, []);

  // Step 2: Fetch global platform branding from app_settings
  const fetchGlobalBranding = useCallback(async (): Promise<Partial<BrandingSettings>> => {
    try {
      const globalKeys = [
        'platform_name', 'logo_url', 'logo_dark_url', 'favicon_url',
        'pwa_icon_192', 'pwa_icon_512', 'og_image_url', 'primary_color', 'theme_color',
      ];

      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', globalKeys);

      if (error) throw error;

      const settings: Partial<BrandingSettings> = {};
      data?.forEach((row) => {
        if (row.key in DEFAULT_BRANDING) {
          (settings as any)[row.key] = row.value || (DEFAULT_BRANDING as any)[row.key];
        }
      });

      return settings;
    } catch (error) {
      console.error('Error fetching global branding:', error);
      return {};
    }
  }, []);

  // Combined fetch: global first, then domain override on top
  const fetchBranding = useCallback(async () => {
    try {
      const globalSettings = await fetchGlobalBranding();

      // If domain was already resolved on mount, keep those overrides
      if (domainResolvedRef.current) {
        setBranding(prev => ({
          ...DEFAULT_BRANDING,
          ...globalSettings,
          // Preserve domain-resolved fields
          resolved_org_slug: prev.resolved_org_slug,
          resolved_org_id: prev.resolved_org_id,
          resolved_plan: prev.resolved_plan,
          is_org_branded: prev.is_org_branded,
          // If org-branded, keep org overrides over global
          ...(prev.is_org_branded ? {
            platform_name: prev.platform_name,
            logo_url: prev.logo_url || globalSettings.logo_url,
            logo_dark_url: prev.logo_dark_url || globalSettings.logo_dark_url,
            favicon_url: prev.favicon_url !== DEFAULT_BRANDING.favicon_url ? prev.favicon_url : (globalSettings.favicon_url || DEFAULT_BRANDING.favicon_url),
            primary_color: prev.primary_color,
            theme_color: prev.theme_color,
            studio_label: prev.studio_label,
            marketplace_label: prev.marketplace_label,
          } : {}),
        }));
      } else {
        setBranding({ ...DEFAULT_BRANDING, ...globalSettings });
      }
    } catch (error) {
      console.error('Error fetching branding settings:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchGlobalBranding]);

  // Apply branding to the DOM
  const applyBranding = useCallback((settings: BrandingSettings) => {
    // 1. Update document title
    if (settings.platform_name) {
      const currentTitle = document.title;
      if (!currentTitle || currentTitle === 'Creartor Studio' || currentTitle.includes('KREOON') || settings.is_org_branded) {
        document.title = settings.platform_name;
      }
    }

    // 2. Update favicon
    if (settings.favicon_url) {
      let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = settings.favicon_url;
    }

    // 3. Update primary color CSS variable
    if (settings.primary_color) {
      const hsl = hexToHSL(settings.primary_color);
      if (hsl) {
        const root = document.documentElement;
        root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        const foregroundL = hsl.l > 50 ? 10 : 98;
        root.style.setProperty('--primary-foreground', `${hsl.h} ${Math.max(hsl.s - 20, 0)}% ${foregroundL}%`);
      }
    }

    // 4. Update theme color meta tag
    if (settings.theme_color) {
      let themeColorMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.content = settings.theme_color;
    }

    // 5. Update OG image meta tag
    if (settings.og_image_url) {
      let ogImageMeta = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
      if (!ogImageMeta) {
        ogImageMeta = document.createElement('meta');
        ogImageMeta.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageMeta);
      }
      ogImageMeta.content = settings.og_image_url;
    }

    // 6. Dynamic PWA manifest (for white-label orgs)
    if (settings.is_org_branded) {
      const manifest = {
        name: settings.platform_name || 'KREOON',
        short_name: settings.platform_name || 'KREOON',
        description: `${settings.platform_name || 'KREOON'} - Content Platform`,
        theme_color: settings.primary_color || '#7700b8',
        background_color: '#09090B',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: settings.pwa_icon_192 || '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: settings.pwa_icon_512 || '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      };

      let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }

      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const oldUrl = manifestLink.getAttribute('data-blob-url');
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      const newUrl = URL.createObjectURL(blob);
      manifestLink.href = newUrl;
      manifestLink.setAttribute('data-blob-url', newUrl);
    }
  }, []);

  // Initial load: resolve domain + fetch global
  useEffect(() => {
    (async () => {
      const domainOverrides = await resolveDomainBranding();

      if (domainOverrides) {
        domainResolvedRef.current = true;
        // Apply domain branding immediately (before global fetch)
        setBranding(prev => ({ ...prev, ...domainOverrides }));
      }

      await fetchBranding();
    })();
  }, [resolveDomainBranding, fetchBranding]);

  useEffect(() => {
    if (!loading) {
      applyBranding(branding);
    }
  }, [branding, loading, applyBranding]);

  // Listen for realtime changes to app_settings
  useEffect(() => {
    const channel = supabase
      .channel('branding-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings'
        },
        () => {
          fetchBranding();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBranding]);

  // Apply org branding override (called post-auth from components that have org context)
  const applyOrgBranding = useCallback((orgOverrides: Partial<BrandingSettings>) => {
    setBranding(prev => {
      const merged = { ...prev, ...orgOverrides };
      return merged;
    });
  }, []);

  const contextValue = useMemo(() => ({
    branding,
    loading,
    refetch: fetchBranding,
    applyOrgBranding,
  }), [branding, loading, fetchBranding, applyOrgBranding]);

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

// Hook to get the platform logo based on current theme
export function usePlatformLogo() {
  const { branding } = useBranding();

  // Check if dark mode is active
  const isDarkMode = document.documentElement.classList.contains('dark');

  if (isDarkMode && branding.logo_dark_url) {
    return branding.logo_dark_url;
  }

  return branding.logo_url || '/placeholder.svg';
}
