/** Ensures value is always an array. Handles null, undefined, strings, objects. */
export function safeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === 'string') return (val as string).trim() ? [val] : [];
  return [];
}

/** Safely extract text from various data structures */
export function extractText(item: any, keys: string[]): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

/** Parse JSON safely */
export function parseJson(data: any): any {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

/** Safe string accessor — handles objects by extracting meaningful text */
export function safeStr(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val == null) return fallback;
  if (Array.isArray(val)) return val.map(v => safeStr(v)).filter(Boolean).join(', ') || fallback;
  if (typeof val === 'object') {
    const textKeys = ['text', 'description', 'name', 'title', 'message', 'value', 'label',
      'pain', 'desire', 'objection', 'insight', 'opportunity', 'threat', 'emotion',
      'factor', 'driver', 'action', 'win', 'risk', 'statement'];
    for (const k of textKeys) {
      if (typeof val[k] === 'string' && val[k].trim()) return val[k];
    }
    const parts = Object.values(val).filter(v => typeof v === 'string' && (v as string).trim()) as string[];
    if (parts.length > 0) return parts.join('. ');
    return fallback;
  }
  return fallback;
}
