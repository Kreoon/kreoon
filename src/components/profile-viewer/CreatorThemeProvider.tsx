import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { BuilderConfig } from '@/components/profile-builder/types/profile-builder';

// Mapeo de nombres de fuente a valores CSS
const FONT_FAMILY_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  outfit: "'Outfit', sans-serif",
  raleway: "'Raleway', sans-serif",
  playfair: "'Playfair Display', serif",
  merriweather: "'Merriweather', serif",
  montserrat: "'Montserrat', sans-serif",
  roboto: "'Roboto', sans-serif",
};

// Mapeo de spacing a valor de gap/padding CSS
const SPACING_MAP: Record<BuilderConfig['spacing'], string> = {
  compact: '0.75rem',
  normal: '1.25rem',
  relaxed: '2rem',
};

// Mapeo de border-radius global
const BORDER_RADIUS_MAP: Record<BuilderConfig['borderRadius'], string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
};

interface CreatorThemeProviderProps {
  config: BuilderConfig;
  children: React.ReactNode;
  className?: string;
}

export function CreatorThemeProvider({
  config,
  children,
  className,
}: CreatorThemeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Aplicar variables CSS al contenedor del perfil
    el.style.setProperty('--creator-accent', config.accentColor);
    el.style.setProperty('--creator-accent-10', `${config.accentColor}1a`);
    el.style.setProperty('--creator-accent-20', `${config.accentColor}33`);
    el.style.setProperty(
      '--creator-font-heading',
      FONT_FAMILY_MAP[config.fontHeading] ?? FONT_FAMILY_MAP['inter'],
    );
    el.style.setProperty(
      '--creator-font-body',
      FONT_FAMILY_MAP[config.fontBody] ?? FONT_FAMILY_MAP['inter'],
    );
    el.style.setProperty('--creator-spacing', SPACING_MAP[config.spacing]);
    el.style.setProperty('--creator-radius', BORDER_RADIUS_MAP[config.borderRadius]);

    // Aplicar accent color como primary para los bloques
    el.style.setProperty('--primary', config.accentColor);
    el.style.setProperty('--ring', config.accentColor);
  }, [
    config.accentColor,
    config.fontHeading,
    config.fontBody,
    config.spacing,
    config.borderRadius,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'creator-theme',
        config.theme === 'dark' ? 'dark' : 'light',
        'min-h-screen w-full',
        // Fondo Nova para tema dark
        config.theme === 'dark' && 'bg-[#0a0a0f] text-zinc-100',
        config.theme === 'light' && 'bg-white text-zinc-900',
        className,
      )}
      style={{
        fontFamily: FONT_FAMILY_MAP[config.fontBody] ?? FONT_FAMILY_MAP['inter'],
      }}
      data-theme={config.theme}
    >
      {children}
    </div>
  );
}
