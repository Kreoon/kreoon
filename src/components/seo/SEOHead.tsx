import * as React from "react";
import { Helmet } from "react-helmet-async";

const DEFAULT_TITLE = "Kreoon | Plataforma de Contenido Colaborativo";
const DEFAULT_DESCRIPTION =
  "Conecta marcas con creadores. UGC, IA y Live Shopping en un solo ecosistema para LATAM.";
const DEFAULT_IMAGE = "/og-image.png";
const DEFAULT_TYPE = "website" as const;
const SITE_NAME = "Kreoon";

export type SEOType = "website" | "article" | "profile";

export interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: SEOType;
  noIndex?: boolean;
  structuredData?: object;
}

/**
 * Resuelve URL absoluta para OG/Twitter image si es relativa.
 */
function resolveImageUrl(image: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (typeof window !== "undefined") {
    const base = window.location.origin;
    return image.startsWith("/") ? `${base}${image}` : `${base}/${image}`;
  }
  return image;
}

/**
 * Resuelve URL absoluta para canonical/og:url.
 */
function resolvePageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window !== "undefined") {
    const base = window.location.origin;
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  }
  return url;
}

/**
 * Meta tags dinámicos para SEO: título, descripción, Open Graph, Twitter Cards, robots y JSON-LD.
 */
export function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = DEFAULT_TYPE,
  noIndex = false,
  structuredData,
}: SEOHeadProps) {
  const resolvedImage = resolveImageUrl(image);
  const resolvedUrl = resolvePageUrl(url ?? (typeof window !== "undefined" ? window.location.href : undefined));
  const keywordsContent = keywords?.length ? keywords.join(", ") : undefined;

  return (
    <Helmet>
      {/* Básicos */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywordsContent && <meta name="keywords" content={keywordsContent} />}
      {resolvedUrl && <link rel="canonical" href={resolvedUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Structured Data (JSON-LD) */}
      {structuredData != null && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

SEOHead.displayName = "SEOHead";

// ─── Configs predefinidas ─────────────────────────────────────────────────

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: SEOType;
  noIndex?: boolean;
  structuredData?: object;
}

export const SEO_CONFIGS: Record<string, SEOConfig> = {
  home: {
    title: "Kreoon | Plataforma de Contenido Colaborativo para LATAM",
    description:
      "Conecta marcas con creadores auténticos. UGC, IA y Live Shopping.",
    keywords: [
      "UGC",
      "contenido",
      "creadores",
      "marcas",
      "LATAM",
      "live shopping",
    ],
  },
  auth: {
    title: "Iniciar sesión | Kreoon",
    description: "Accede a tu cuenta de Kreoon",
    noIndex: true,
  },
  pricing: {
    title: "Precios y Planes | Kreoon",
    description:
      "Planes flexibles para marcas y creadores. Comienza gratis.",
    keywords: ["precios", "planes", "marcas", "creadores", "Kreoon"],
  },
  register: {
    title: "Registro | Kreoon",
    description: "Crea tu cuenta en Kreoon y conecta con marcas o creadores.",
    noIndex: true,
  },
  resetPassword: {
    title: "Restablecer contraseña | Kreoon",
    description: "Restablece tu contraseña de Kreoon",
    noIndex: true,
  },
  dashboard: {
    title: "Dashboard | Kreoon",
    description: "Panel de control de tu cuenta Kreoon",
  },
  content: {
    title: "Contenido | Kreoon",
    description: "Gestiona tu contenido y campañas en Kreoon",
  },
  creators: {
    title: "Creadores | Kreoon",
    description: "Descubre y gestiona creadores en la plataforma Kreoon",
  },
  explore: {
    title: "Explorar | Kreoon",
    description: "Explora contenido y creadores en Kreoon",
  },
  settings: {
    title: "Configuración | Kreoon",
    description: "Configura tu cuenta y preferencias en Kreoon",
  },
  notFound: {
    title: "Página no encontrada | Kreoon",
    description: "La página que buscas no existe.",
    noIndex: true,
  },
};
