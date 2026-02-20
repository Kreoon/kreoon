import { useOrgOwner } from './useOrgOwner';

/**
 * Returns the current organization's IANA timezone string.
 * Lightweight wrapper over useOrgOwner — no extra network requests.
 */
export function useOrgTimezone(): string {
  const { orgTimezone } = useOrgOwner();
  return orgTimezone;
}

/**
 * Detect the browser's IANA timezone via Intl API.
 * Falls back to 'America/Bogota' if unavailable.
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Bogota';
  }
}
