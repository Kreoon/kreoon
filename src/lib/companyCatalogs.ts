/**
 * Catálogos únicos de empresa (`clients.category` y `clients.document_type`).
 *
 * Fuente de verdad: se copian tal cual de `CompanyProfileEditor.tsx`, que era
 * la definición original. `client-onboarding/schemas.ts` (CATEGORIAS_EMPRESA /
 * TIPOS_DOCUMENTO) usa exactamente los mismos `value`, así que ambos lados del
 * onboarding (wizard público y editor admin) guardan valores compatibles en
 * la misma columna sin tabla de traducción.
 */

export const COMPANY_CATEGORIES = [
  { value: 'productos_digitales', label: 'Productos Digitales' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'perfume', label: 'Perfume' },
  { value: 'vehicular', label: 'Vehicular' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'juguetes', label: 'Juguetes' },
  { value: 'suplementos', label: 'Suplementos' },
  { value: 'belleza', label: 'Belleza' },
  { value: 'cosmeticos', label: 'Cosméticos' },
  { value: 'educacion', label: 'Educación' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'saas', label: 'SaaS' },
  { value: 'otro', label: 'Otro' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'nit', label: 'NIT (Colombia)' },
  { value: 'ein', label: 'EIN (USA)' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'rut', label: 'RUT' },
  { value: 'rfc', label: 'RFC (México)' },
  { value: 'otro', label: 'Otro' },
] as const;
