import { useOrgOwner } from './useOrgOwner';

const FALLBACK_TIMEZONE = 'America/Bogota';

/** Detect the browser's IANA timezone */
function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/**
 * Non-hook utility: resolve the effective timezone.
 * Priority: org setting > browser detection > fallback.
 */
export function getEffectiveTimezone(orgTimezone?: string | null): string {
  if (orgTimezone) return orgTimezone;
  return getBrowserTimezone();
}

/**
 * Hook that returns the timezone to use across the app.
 * Priority: org setting > browser > 'America/Bogota'
 */
export function useTimezone() {
  const { orgTimezone } = useOrgOwner();
  const browserTimezone = getBrowserTimezone();

  const timezone = orgTimezone || browserTimezone;
  const isOrgTimezoneSet = !!orgTimezone;

  return { timezone, browserTimezone, isOrgTimezoneSet };
}
