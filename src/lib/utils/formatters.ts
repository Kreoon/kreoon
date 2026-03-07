import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

// ─── Formateo de fechas ─────────────────────────────────────────────────────

/**
 * Formatea una fecha según el formato especificado.
 * - 'short': DD/MM/AAAA
 * - 'long': D de mes de AAAA
 * - 'relative': hace X minutos/horas/días
 *
 * @param timezone — IANA timezone (optional, defaults to browser TZ)
 */
export function formatDate(
  date: Date | string,
  format: "short" | "long" | "relative" = "short",
  timezone?: string
): string {
  const d = new Date(date);

  if (format === "relative") {
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
  }

  if (timezone) {
    if (format === "long") {
      return formatInTimeZone(d, timezone, "d 'de' MMMM 'de' yyyy", { locale: es });
    }
    return formatInTimeZone(d, timezone, "dd/MM/yyyy", { locale: es });
  }

  if (format === "long") {
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("es-ES");
}

/**
 * Formatea fecha y hora en formato español.
 * Ej: "15 ene 2026, 14:30"
 *
 * @param timezone — IANA timezone (optional, defaults to browser TZ)
 */
export function formatDateTime(date: Date | string, timezone?: string): string {
  const d = new Date(date);

  if (timezone) {
    return formatInTimeZone(d, timezone, "d MMM yyyy, HH:mm", { locale: es });
  }

  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea solo la hora en formato HH:mm.
 *
 * @param timezone — IANA timezone (optional, defaults to browser TZ)
 */
export function formatTime(date: Date | string, timezone?: string): string {
  const d = new Date(date);

  if (timezone) {
    return formatInTimeZone(d, timezone, "HH:mm", { locale: es });
  }

  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// ─── Formateo de números ────────────────────────────────────────────────────

/**
 * Formatea un número según opciones de Intl.NumberFormat.
 * Por defecto usa locale es-ES.
 */
export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("es-ES", options).format(num);
}

/**
 * Formatea una cantidad como moneda.
 * Por defecto USD; cambia a COP, EUR, etc. según necesites.
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un número grande en formato compacto: 1.2K, 3.5M, etc.
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Formatea un porcentaje con decimales opcionales.
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Formateo de texto ──────────────────────────────────────────────────────

/**
 * Trunca un texto a una longitud máxima, añadiendo '...' al final.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Capitaliza la primera letra de un texto (resto en minúsculas).
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convierte un texto en slug: "Hola Mundo" → "hola-mundo".
 * Elimina acentos y caracteres especiales.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Obtiene las iniciales de un nombre (máximo 2 caracteres).
 * Ej: "Juan Pérez" → "JP"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Formateo de archivos ───────────────────────────────────────────────────

/**
 * Formatea un tamaño de archivo en Bytes, KB, MB, GB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Obtiene la extensión de un archivo desde su nombre.
 * Ej: "documento.pdf" → "pdf"
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

// ─── Validadores ────────────────────────────────────────────────────────────

/**
 * Valida si un string es un email válido.
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida si un string es una URL válida.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
