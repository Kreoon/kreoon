import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  platform_name: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  pwa_icon_192: string;
  pwa_icon_512: string;
  og_image_url: string;
  primary_color: string;
  theme_color: string;
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
  theme_color: "#7700b8"
};

interface BrandingContextValue {
  branding: BrandingSettings;
  loading: boolean;
  refetch: () => Promise<void>;
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

  const fetchBranding = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', Object.keys(DEFAULT_BRANDING));

      if (error) throw error;

      const settings: Partial<BrandingSettings> = {};
      data?.forEach((row) => {
        if (row.key in DEFAULT_BRANDING) {
          (settings as any)[row.key] = row.value || (DEFAULT_BRANDING as any)[row.key];
        }
      });

      setBranding({ ...DEFAULT_BRANDING, ...settings });
    } catch (error) {
      console.error('Error fetching branding settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply branding to the DOM
  const applyBranding = useCallback((settings: BrandingSettings) => {
    // 1. Update document title
    if (settings.platform_name) {
      // Only set if we're on a page without specific title
      const currentTitle = document.title;
      if (!currentTitle || currentTitle === 'Creartor Studio' || currentTitle.includes('KREOON')) {
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
        // Set the primary color in HSL format (without hsl() wrapper since Tailwind adds it)
        root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        
        // Also set a foreground color (white or black depending on luminance)
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
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

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

  const contextValue = useMemo(() => ({
    branding,
    loading,
    refetch: fetchBranding
  }), [branding, loading, fetchBranding]);

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
