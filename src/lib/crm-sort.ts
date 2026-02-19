// ── CRM Sort Utility ───────────────────────────────────────────────────
// Generic, null-safe sorting for all CRM pages.

export type SortDirection = 'asc' | 'desc';
export type SortFieldType = 'string' | 'number' | 'date';

export interface SortFieldConfig {
  key: string;
  label: string;
  type: SortFieldType;
}

/** Resolve a dot-path key from an object. Arrays resolve to .length. */
function resolveKey(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (Array.isArray(current)) return current.length;
  return current;
}

/**
 * Sort a shallow-copied array by the given field.
 * - Nulls/undefined always sort LAST regardless of direction.
 * - Strings compared case-insensitively via localeCompare.
 * - Dates parsed via new Date().getTime().
 * - Numbers compared directly.
 */
export function sortByField<T>(
  list: T[],
  fieldKey: string,
  fieldType: SortFieldType,
  direction: SortDirection,
): T[] {
  const copy = [...list];
  const dir = direction === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    const aVal = resolveKey(a, fieldKey);
    const bVal = resolveKey(b, fieldKey);

    // Nulls last
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let result = 0;

    switch (fieldType) {
      case 'string':
        result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase(), 'es');
        break;
      case 'number':
        result = Number(aVal) - Number(bVal);
        break;
      case 'date': {
        const da = new Date(aVal as string).getTime();
        const db = new Date(bVal as string).getTime();
        result = (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
        break;
      }
    }

    return result * dir;
  });

  return copy;
}
