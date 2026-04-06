/**
 * Apply Block Styles - Profile Builder Pro
 *
 * Convierte BlockStyles en estilos CSS inline y clases de Tailwind.
 * Soporta todos los controles avanzados: gradientes, sombras, tipografía, etc.
 */

import type { BlockStyles } from '../types/profile-builder';

// Mapeo de presets a valores CSS
const PADDING_MAP: Record<string, string> = {
  none: '0',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

const MARGIN_MAP: Record<string, string> = {
  none: '0',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const RADIUS_MAP: Record<string, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
};

const WIDTH_MAP: Record<string, string> = {
  full: '100%',
  wide: '90%',
  normal: '80%',
  narrow: '60%',
};

export interface ComputedBlockStyles {
  style: React.CSSProperties;
  className: string;
}

/**
 * Genera el string CSS de un gradiente
 */
function buildGradientCSS(styles: BlockStyles): string | undefined {
  if (!styles.gradientType || !styles.gradientStops?.length) return undefined;

  const sortedStops = [...styles.gradientStops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops.map((s) => `${s.color} ${s.position}%`).join(', ');
  const angle = styles.gradientAngle || 135;

  switch (styles.gradientType) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${stopsStr})`;
    case 'radial':
      return `radial-gradient(circle, ${stopsStr})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg, ${stopsStr})`;
    default:
      return undefined;
  }
}

/**
 * Genera el string CSS de box-shadow múltiples
 */
function buildBoxShadowCSS(styles: BlockStyles): string | undefined {
  // Primero verificar sombras custom
  if (styles.boxShadows?.length) {
    return styles.boxShadows
      .map((s) => {
        const inset = s.inset ? 'inset ' : '';
        return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
      })
      .join(', ');
  }

  // Fallback a preset
  if (styles.shadow && styles.shadow !== 'none') {
    return SHADOW_MAP[styles.shadow];
  }

  return undefined;
}

/**
 * Construye padding custom o preset
 */
function buildPadding(styles: BlockStyles): string | undefined {
  if (styles.paddingCustom) {
    const { top, right, bottom, left } = styles.paddingCustom;
    return `${top} ${right} ${bottom} ${left}`;
  }
  if (styles.padding && styles.padding !== 'none') {
    return PADDING_MAP[styles.padding];
  }
  return undefined;
}

/**
 * Construye margin custom o preset
 */
function buildMargin(styles: BlockStyles): string | undefined {
  if (styles.marginCustom) {
    const { top, right, bottom, left } = styles.marginCustom;
    return `${top} ${right} ${bottom} ${left}`;
  }
  if (styles.margin && styles.margin !== 'none') {
    return MARGIN_MAP[styles.margin];
  }
  return undefined;
}

/**
 * Construye border-radius custom o preset
 */
function buildBorderRadius(styles: BlockStyles): string | undefined {
  if (styles.borderRadiusCustom) {
    const { tl, tr, br, bl } = styles.borderRadiusCustom;
    return `${tl} ${tr} ${br} ${bl}`;
  }
  if (styles.borderRadius && styles.borderRadius !== 'none') {
    return RADIUS_MAP[styles.borderRadius];
  }
  return undefined;
}

/**
 * getBlockStyleObject
 *
 * Función simplificada que convierte BlockStyles en React.CSSProperties puro.
 * Diseñada para ser usada directamente en el prop `style` del contenedor
 * raíz de cada bloque, sin necesitar clases Tailwind adicionales.
 *
 * Incluye: fondo (color / gradiente / imagen), texto, tipografía, espaciado,
 * bordes (estilo, ancho, color, radio), y sombras.
 *
 * Uso:
 *   const blockStyle = getBlockStyleObject(block.styles);
 *   <div style={blockStyle}>...</div>
 */
export function getBlockStyleObject(styles: BlockStyles): React.CSSProperties {
  const css: React.CSSProperties = {};

  // === Fondo ===
  const gradient = buildGradientCSS(styles);
  if (gradient) {
    css.background = gradient;
  } else if (styles.backgroundType === 'image' && styles.backgroundImage) {
    css.backgroundImage = `url(${styles.backgroundImage})`;
    css.backgroundSize = styles.backgroundSize || 'cover';
    css.backgroundPosition = styles.backgroundPosition || 'center';
    css.backgroundRepeat = 'no-repeat';
  } else if (styles.backgroundColor) {
    css.backgroundColor = styles.backgroundColor;
  }

  // Opacidad del fondo (se aplica como opacity general si no hay otro mecanismo)
  if (styles.backgroundOpacity !== undefined && styles.backgroundOpacity < 100) {
    css.opacity = styles.backgroundOpacity / 100;
  }

  // === Color de texto ===
  if (styles.textColor) {
    css.color = styles.textColor;
  }

  // === Alineación y transformación de texto ===
  if (styles.textAlign) {
    css.textAlign = styles.textAlign;
  }
  if (styles.textTransform) {
    css.textTransform = styles.textTransform;
  }

  // === Tipografía ===
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

  // === Espaciado ===
  const padding = buildPadding(styles);
  if (padding) {
    css.padding = padding;
  }

  const margin = buildMargin(styles);
  if (margin) {
    css.margin = margin;
  }

  // === Bordes ===
  const borderRadius = buildBorderRadius(styles);
  if (borderRadius) {
    css.borderRadius = borderRadius;
  }

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
  }

  // === Sombras ===
  const boxShadow = buildBoxShadowCSS(styles);
  if (boxShadow) {
    css.boxShadow = boxShadow;
  }

  // === Ancho ===
  if (styles.width === 'custom' && styles.customWidth) {
    css.width = styles.customWidth;
  } else if (styles.width && styles.width !== 'full') {
    css.width = WIDTH_MAP[styles.width] || '100%';
  }

  if (styles.maxWidth) {
    css.maxWidth = styles.maxWidth;
  }

  return css;
}

/**
 * Convierte BlockStyles en estilos CSS computados (con className para Tailwind)
 * Usado por BlockWrapper para aplicar estilos al contenedor de arrastre.
 */
export function applyBlockStyles(styles: BlockStyles): ComputedBlockStyles {
  const cssProperties: React.CSSProperties = {};
  const classNames: string[] = [];

  // === Fondo ===
  const gradient = buildGradientCSS(styles);
  if (gradient) {
    cssProperties.background = gradient;
  } else if (styles.backgroundColor) {
    cssProperties.backgroundColor = styles.backgroundColor;
  }

  // NOTA: backgroundImage NO se aplica aquí
  // Cada bloque maneja su propia imagen de fondo junto con el overlay
  // Esto evita duplicación entre BlockWrapper y el contenido del bloque

  // === Texto ===
  if (styles.textColor) {
    cssProperties.color = styles.textColor;
  }
  if (styles.textAlign) {
    cssProperties.textAlign = styles.textAlign;
  }
  if (styles.textTransform) {
    cssProperties.textTransform = styles.textTransform;
  }

  // === Tipografía ===
  if (styles.fontFamily) {
    cssProperties.fontFamily = `"${styles.fontFamily}", sans-serif`;
  }
  if (styles.fontSize) {
    cssProperties.fontSize = styles.fontSize;
  }
  if (styles.fontWeight) {
    cssProperties.fontWeight = styles.fontWeight;
  }
  if (styles.lineHeight) {
    cssProperties.lineHeight = styles.lineHeight;
  }
  if (styles.letterSpacing) {
    cssProperties.letterSpacing = styles.letterSpacing;
  }

  // === Espaciado ===
  const padding = buildPadding(styles);
  if (padding) {
    cssProperties.padding = padding;
  }

  const margin = buildMargin(styles);
  if (margin) {
    cssProperties.margin = margin;
  }

  // === Bordes ===
  const borderRadius = buildBorderRadius(styles);
  if (borderRadius) {
    cssProperties.borderRadius = borderRadius;
  }

  if (styles.borderStyle && styles.borderStyle !== 'none') {
    cssProperties.borderStyle = styles.borderStyle;
    cssProperties.borderColor = styles.borderColor || 'currentColor';

    if (styles.borderWidthCustom) {
      const { top, right, bottom, left } = styles.borderWidthCustom;
      cssProperties.borderWidth = `${top} ${right} ${bottom} ${left}`;
    } else if (styles.borderWidth) {
      cssProperties.borderWidth = styles.borderWidth;
    }
  }

  // === Sombras ===
  const boxShadow = buildBoxShadowCSS(styles);
  if (boxShadow) {
    cssProperties.boxShadow = boxShadow;
  }

  // === Ancho ===
  if (styles.width === 'custom' && styles.customWidth) {
    cssProperties.width = styles.customWidth;
  } else if (styles.width) {
    cssProperties.width = WIDTH_MAP[styles.width] || '100%';
  }

  if (styles.maxWidth) {
    cssProperties.maxWidth = styles.maxWidth;
  }

  // === Responsive clases ===
  if (styles.hideOnMobile) {
    classNames.push('hidden md:block');
  }
  if (styles.hideOnDesktop) {
    classNames.push('block md:hidden');
  }

  // === Animación ===
  if (styles.animation && styles.animation !== 'none') {
    // Las animaciones se manejan con framer-motion en tiempo de render
    // Aquí solo guardamos la duración y easing como CSS variables
    if (styles.animationDuration) {
      cssProperties.setProperty?.('--animation-duration', `${styles.animationDuration}ms`);
    }
  }

  return {
    style: cssProperties,
    className: classNames.join(' '),
  };
}

/**
 * Obtiene las variantes de framer-motion para la animación configurada
 */
export function getAnimationVariants(styles: BlockStyles) {
  const animationType = styles.animation || 'none';
  const duration = (styles.animationDuration || 500) / 1000;
  const delay = (styles.animationDelay || 0) / 1000;

  const baseTransition = {
    duration,
    delay,
    ease: styles.animationEasing || 'easeOut',
  };

  const animations: Record<string, { initial: object; animate: object; transition?: object }> = {
    none: { initial: {}, animate: {} },
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    fadeInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
    },
    fadeInLeft: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
    },
    fadeInRight: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
    },
    scaleInBounce: {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: 'spring', stiffness: 300, damping: 15 },
    },
    slideInUp: {
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
    },
    slideInDown: {
      initial: { opacity: 0, y: -40 },
      animate: { opacity: 1, y: 0 },
    },
    rotateIn: {
      initial: { opacity: 0, rotate: -10 },
      animate: { opacity: 1, rotate: 0 },
    },
    flipIn: {
      initial: { opacity: 0, rotateX: 90 },
      animate: { opacity: 1, rotateX: 0 },
    },
    blurIn: {
      initial: { opacity: 0, filter: 'blur(10px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
    },
    bounceIn: {
      initial: { opacity: 0, scale: 0.3 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: 'spring', stiffness: 500, damping: 10 },
    },
  };

  const animation = animations[animationType] || animations.none;

  return {
    initial: animation.initial,
    animate: animation.animate,
    transition: animation.transition || baseTransition,
  };
}

export default applyBlockStyles;
