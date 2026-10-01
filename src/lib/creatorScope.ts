/**
 * Alcance de creadores y editores (decisión 2026-10-01): solo lo esencial para producir.
 * Sin explorar el marketplace de otros creadores, planes, Social Hub, Guionizador, Generador de
 * anuncios ni Academia (volverán como complementos de pago). Se bloquea también por URL directa.
 */

const PRODUCTION_ROLES = new Set(['creator', 'content_creator', 'editor', 'ambassador']);

/** Rutas internas que un creador/editor no usa */
export const PRODUCTION_BLOCKED_ROUTES = [
  '/social-hub',
  '/academia',
  '/scripts',
  '/planes',
  '/ad-generator',
  '/marketplace/guardados',
  '/marketplace/favoritos',
  '/marketplace/talent-lists',
  '/marketplace/inquiries',
  '/marketplace/dashboard',
];

/**
 * Pantallas que para creador/editor se reemplazan por otra más simple.
 * El constructor de bloques no aplica: el portafolio público tiene diseño fijo (Estudio UGC) y se edita
 * en /mi-portafolio (decisión 2026-10-01).
 */
export const PRODUCTION_REDIRECTS: Record<string, string> = {
  '/profile-builder': '/mi-portafolio',
};

export function productionRedirectFor(pathname: string): string | null {
  const key = Object.keys(PRODUCTION_REDIRECTS).find((r) => pathname === r || pathname.startsWith(`${r}/`));
  return key ? PRODUCTION_REDIRECTS[key] : null;
}

/** Páginas del marketplace para explorar a otros creadores (públicas para visitantes y marcas) */
export const MARKETPLACE_BROWSE_ROUTES = ['/marketplace', '/marketplace/explore', '/marketplace/videos'];

/** Tiene solo roles de producción (ningún rol de gestión, cliente o admin) */
export function isProductionOnlyTalent(roles: readonly string[] | null | undefined): boolean {
  return !!roles && roles.length > 0 && roles.every((r) => PRODUCTION_ROLES.has(r));
}

export function isBlockedForProduction(pathname: string): boolean {
  return (
    PRODUCTION_BLOCKED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    MARKETPLACE_BROWSE_ROUTES.includes(pathname.replace(/\/+$/, '') || '/')
  );
}
