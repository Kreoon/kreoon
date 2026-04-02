interface KreoonLogoProps {
  /** Altura del logo en clases Tailwind (ej: "h-8", "h-16") */
  heightClass?: string;
  className?: string;
  alt?: string;
}

export function KreoonLogo({
  heightClass = "h-8",
  className = "object-contain",
  alt = "KREOON",
}: KreoonLogoProps) {
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        src="/logo.png"
        alt={alt}
        className={`${heightClass} ${className}`}
        width="auto"
        height="auto"
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
