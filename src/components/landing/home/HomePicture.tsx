import * as React from "react";

/**
 * Imágenes de la home: AVIF + WebP con `srcset`, proporción explícita (sin saltos de layout) y
 * degradación limpia. Los archivos los genera `scripts/optimize-home-images.mjs` en `public/home/`;
 * si un archivo no existe, el componente no pinta nada y el contenedor (con su fondo de marca)
 * queda estable. Las fotografías son ilustrativas (generadas con IA), nunca testimonios.
 */
export interface HomePictureProps {
  /** Prefijo de los archivos en /home: `${name}-${ancho}.avif|webp`. */
  name: string;
  /** Anchos exportados (px), de menor a mayor. */
  widths: number[];
  /** Proporción ancho/alto de la fotografía. */
  ratio: number;
  sizes: string;
  alt: string;
  /** Solo para la imagen LCP: prioridad alta y sin lazy loading. */
  priority?: boolean;
  className?: string;
  /** `object-position` CSS para recortar según el contenedor. */
  objectPosition?: string;
}

export function HomePicture({
  name,
  widths,
  ratio,
  sizes,
  alt,
  priority = false,
  className,
  objectPosition,
}: HomePictureProps) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;

  const srcSet = (ext: "avif" | "webp") => widths.map((w) => `/home/${name}-${w}.${ext} ${w}w`).join(", ");
  const largest = widths[widths.length - 1];
  const fallback = widths[Math.min(1, widths.length - 1)];

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={`/home/${name}-${fallback}.webp`}
        alt={alt}
        width={largest}
        height={Math.round(largest / ratio)}
        sizes={sizes}
        className={className}
        style={objectPosition ? { objectPosition } : undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchpriority: "high" } : {})}
        onError={() => setFailed(true)}
      />
    </picture>
  );
}
