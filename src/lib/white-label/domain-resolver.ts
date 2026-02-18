/**
 * Domain Resolver
 *
 * Parses the current hostname to determine if the user is accessing
 * KREOON via the main domain, a subdomain, or a custom domain.
 */

export type DomainType = 'main' | 'subdomain' | 'custom';

export interface ParsedDomain {
  type: DomainType;
  slug: string | null;
  hostname: string;
}

const MAIN_HOSTS = [
  'kreoon.com',
  'www.kreoon.com',
  'localhost',
  '127.0.0.1',
];

/**
 * Parse the current hostname to determine domain type.
 *
 * - kreoon.com / www.kreoon.com / localhost → main
 * - orgslug.kreoon.com → subdomain (slug = orgslug)
 * - app.clientdomain.com → custom
 */
export function parseHostname(hostname: string): ParsedDomain {
  const h = hostname.toLowerCase().replace(/:\d+$/, ''); // strip port

  // Main domain
  if (MAIN_HOSTS.includes(h)) {
    return { type: 'main', slug: null, hostname: h };
  }

  // Subdomain of kreoon.com (e.g., orgslug.kreoon.com)
  if (h.endsWith('.kreoon.com')) {
    const slug = h.replace('.kreoon.com', '');
    // Ignore common subdomains that aren't org slugs
    if (slug && slug !== 'app' && slug !== 'api' && slug !== 'mail') {
      return { type: 'subdomain', slug, hostname: h };
    }
    return { type: 'main', slug: null, hostname: h };
  }

  // Localhost subdomains for development (e.g., orgslug.localhost)
  if (h.endsWith('.localhost')) {
    const slug = h.replace('.localhost', '');
    if (slug) {
      return { type: 'subdomain', slug, hostname: h };
    }
    return { type: 'main', slug: null, hostname: h };
  }

  // Custom domain (anything else)
  return { type: 'custom', slug: null, hostname: h };
}

/**
 * Check if the current hostname requires domain-based org resolution.
 */
export function needsDomainResolution(hostname?: string): boolean {
  const h = hostname || window.location.hostname;
  const parsed = parseHostname(h);
  return parsed.type !== 'main';
}

/**
 * Get the current parsed domain info.
 */
export function getCurrentDomain(): ParsedDomain {
  return parseHostname(window.location.hostname);
}
