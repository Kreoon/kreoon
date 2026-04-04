import type { BlockStyles } from '../types/profile-builder';

// Mapeo de presets de padding/margin a valores CSS
const SPACING_MAP: Record<string, string> = {
  none: '0px',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

// Mapeo de presets de border-radius a valores CSS
const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

// Mapeo de presets de sombra a valores CSS
const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
};

/**
 * getBlockStyleObject
 *
 * Convierte BlockStyles en un objeto React.CSSProperties listo para usar
 * en el prop `style` del contenedor raíz de cada bloque.
 *
 * Cubre:
 * - Fondo: color sólido, gradiente (stops avanzados o string legado), imagen
 * - Color de texto, alineación, transformación
 * - Tipografía: familia, tamaño, peso, interlineado, tracking
 * - Espaciado: padding y margin (presets + valores custom pixel-perfect)
 * - Bordes: estilo, grosor (preset y custom por lado), color, radio (preset y custom por esquina)
 * - Sombras: box-shadow múltiple (array) o preset semántico
 * - Ancho: presets y custom
 */
export function getBlockStyleObject(styles: BlockStyles): React.CSSProperties {
  const css: React.CSSProperties = {};

  // ── Fondo ─────────────────────────────────────────────────────────────────
  const bgType = styles.backgroundType;

  if (bgType === 'gradient' || (!bgType && (styles.gradientType || styles.backgroundGradient))) {
    // Gradiente con stops avanzados
    if (styles.gradientType && styles.gradientStops?.length) {
      const angle = styles.gradientAngle ?? 135;
      const stops = [...styles.gradientStops]
        .sort((a, b) => a.position - b.position)
        .map((s) => `${s.color} ${s.position}%`)
        .join(', ');
      switch (styles.gradientType) {
        case 'radial':
          css.background = `radial-gradient(circle, ${stops})`;
          break;
        case 'conic':
          css.background = `conic-gradient(from ${angle}deg, ${stops})`;
          break;
        default:
          css.background = `linear-gradient(${angle}deg, ${stops})`;
      }
    } else if (styles.backgroundGradient) {
      // Soporte legado: backgroundGradient como string CSS directo
      css.background = styles.backgroundGradient;
    }
  } else if (bgType === 'image' && styles.backgroundImage) {
    css.backgroundImage = `url(${styles.backgroundImage})`;
    css.backgroundSize = styles.backgroundSize ?? 'cover';
    css.backgroundPosition = styles.backgroundPosition ?? 'center';
    css.backgroundRepeat = 'no-repeat';
  } else if (styles.backgroundColor) {
    css.backgroundColor = styles.backgroundColor;
  }

  // ── Texto ─────────────────────────────────────────────────────────────────
  if (styles.textColor) {
    css.color = styles.textColor;
  }
  if (styles.textAlign) {
    css.textAlign = styles.textAlign;
  }
  if (styles.textTransform) {
    css.textTransform = styles.textTransform;
  }

  // ── Tipografía ────────────────────────────────────────────────────────────
  if (styles.fontFamily) {
    css.fontFamily = `"${styles.fontFamily}", sans-serif`;
  }
  if (styles.fontSize) {
    css.fontSize = styles.fontSize;
  }
  if (styles.fontWeight) {
    css.fontWeight = styles.fontWeight;
  }
  if (styles.lineHeight) {
    css.lineHeight = styles.lineHeight;
  }
  if (styles.letterSpacing) {
    css.letterSpacing = styles.letterSpacing;
  }

  // ── Espaciado ─────────────────────────────────────────────────────────────
  // Padding: custom tiene precedencia sobre preset
  if (styles.paddingCustom) {
    const { top, right, bottom, left } = styles.paddingCustom;
    css.padding = `${top} ${right} ${bottom} ${left}`;
  } else if (styles.padding && styles.padding !== 'none') {
    css.padding = SPACING_MAP[styles.padding] ?? styles.padding;
  }

  // Margin: custom tiene precedencia sobre preset
  if (styles.marginCustom) {
    const { top, right, bottom, left } = styles.marginCustom;
    css.margin = `${top} ${right} ${bottom} ${left}`;
  } else if (styles.margin && styles.margin !== 'none') {
    css.margin = SPACING_MAP[styles.margin] ?? styles.margin;
  }

  // ── Bordes ────────────────────────────────────────────────────────────────
  // Radio: custom por esquina tiene precedencia sobre preset
  if (styles.borderRadiusCustom) {
    const { tl, tr, br, bl } = styles.borderRadiusCustom;
    css.borderRadius = `${tl} ${tr} ${br} ${bl}`;
  } else if (styles.borderRadius && styles.borderRadius !== 'none') {
    css.borderRadius = RADIUS_MAP[styles.borderRadius] ?? styles.borderRadius;
  }

  // Estilo, grosor y color del borde
  if (styles.borderStyle && styles.borderStyle !== 'none') {
    css.borderStyle = styles.borderStyle;
    css.borderColor = styles.borderColor || 'currentColor';

    if (styles.borderWidthCustom) {
      const { top, right, bottom, left } = styles.borderWidthCustom;
      css.borderWidth = `${top} ${right} ${bottom} ${left}`;
    } else if (styles.borderWidth) {
      css.borderWidth = styles.borderWidth;
    } else {
      css.borderWidth = '1px';
    }
  } else if (styles.borderWidth && !styles.borderStyle) {
    // Soporte legado: borderWidth sin borderStyle explícito
    css.borderWidth = styles.borderWidth;
    css.borderStyle = 'solid';
    if (styles.borderColor) {
      css.borderColor = styles.borderColor;
    }
  }

  // ── Sombras ───────────────────────────────────────────────────────────────
  if (styles.boxShadows?.length) {
    css.boxShadow = styles.boxShadows
      .map((s) => {
        const inset = s.inset ? 'inset ' : '';
        return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
      })
      .join(', ');
  } else if (styles.shadow && styles.shadow !== 'none') {
    css.boxShadow = SHADOW_MAP[styles.shadow] ?? undefined;
  }

  // ── Ancho ─────────────────────────────────────────────────────────────────
  const WIDTH_MAP: Record<string, string> = {
    full: '100%',
    wide: '90%',
    normal: '80%',
    narrow: '60%',
  };

  if (styles.width === 'custom' && styles.customWidth) {
    css.width = styles.customWidth;
  } else if (styles.width && styles.width !== 'full') {
    css.width = WIDTH_MAP[styles.width] ?? undefined;
  }

  if (styles.maxWidth) {
    css.maxWidth = styles.maxWidth;
  }

  return css;
}
