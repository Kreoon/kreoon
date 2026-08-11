import { z } from 'zod';

/**
 * Esquemas de validación del wizard público de onboarding.
 *
 * Reglas de obligatoriedad (definidas con Alexander):
 *   - Pasos 1 (legal), 2 (equipo) y 4 (producto) son obligatorios completos.
 *   - Excepciones opcionales dentro de esos pasos: correo_facturacion,
 *     promociones y testimonios.
 *   - Pasos 3 (marca), 5 (contenido) y 6 (logística) son enteramente opcionales.
 *
 * El backend (`_shared/client-onboarding.ts`) valida un subconjunto más chico
 * en el envío final. Acá se pide más porque es la capa de UX; el backend sigue
 * siendo el límite de seguridad real.
 */

/** Texto obligatorio con mensaje en español, sin jerga. */
const requerido = (mensaje: string) => z.string().trim().min(1, mensaje);

/** Email obligatorio. */
const correoRequerido = (mensaje: string) =>
  z.string().trim().min(1, mensaje).email('Escribe un correo válido');

/** Email opcional: acepta vacío o un correo bien formado. */
const correoOpcional = z
  .string()
  .trim()
  .email('Escribe un correo válido')
  .optional()
  .or(z.literal(''));

/** Texto libre opcional. */
const textoOpcional = z.string().trim().optional().or(z.literal(''));

/** Tres casillas de texto donde al menos la primera debe venir llena. */
const tresConAlMenosUno = (mensaje: string) =>
  z
    .array(z.string().trim().optional().or(z.literal('')))
    .length(3)
    .refine((valores) => valores.some((v) => (v ?? '').trim().length > 0), {
      message: mensaje,
    });

/** Tres casillas de texto totalmente opcionales. */
const tresOpcionales = z
  .array(z.string().trim().optional().or(z.literal('')))
  .length(3);

// ---------------------------------------------------------------------------
// Paso 1 — Legal y facturación (obligatorio)
// ---------------------------------------------------------------------------
export const legalSchema = z.object({
  razon_social: requerido('Escribe la razón social de la empresa'),
  nit: requerido('Escribe el NIT o identificación fiscal'),
  representante: requerido('Escribe el nombre del representante legal'),
  correo_representante: correoRequerido('Escribe el correo del representante'),
  direccion_fiscal: requerido('Escribe la dirección fiscal'),
  ciudad: requerido('Escribe la ciudad'),
  pais: requerido('Escribe el país'),
  correo_facturacion: correoOpcional,
});

// ---------------------------------------------------------------------------
// Paso 2 — Equipo (obligatorio)
// ---------------------------------------------------------------------------
export const equipoSchema = z.object({
  aprobador: z.object({
    nombre: requerido('Escribe el nombre de quien aprueba'),
    cargo: requerido('Escribe el cargo'),
    correo: correoRequerido('Escribe el correo de quien aprueba'),
    celular: requerido('Escribe el celular'),
  }),
  correo_portal: correoRequerido('Escribe el correo para entrar al portal'),
  miembros_whatsapp: requerido(
    'Escribe quiénes van en el grupo de WhatsApp (nombre y celular)',
  ),
});

// ---------------------------------------------------------------------------
// Paso 3 — Marca (opcional)
// ---------------------------------------------------------------------------
export const marcaSchema = z.object({
  instagram: textoOpcional,
  tiktok: textoOpcional,
  website: textoOpcional,
  historia: textoOpcional,
  tono_deseado: textoOpcional,
  tono_evitar: textoOpcional,
  competidores: tresOpcionales,
  referentes: tresOpcionales,
  restricciones_legales: textoOpcional,
});

// ---------------------------------------------------------------------------
// Paso 4 — Producto o servicio (obligatorio, salvo promociones y testimonios)
// ---------------------------------------------------------------------------

/**
 * Qué vende el cliente. No es cosmético: cambia las etiquetas y los ejemplos de
 * todo el paso 4 y del paso 6. "Presentaciones o tamaños" no significa nada
 * para una consultoría, igual que "unidades para enviar a los creadores" no
 * significa nada para un curso online.
 */
export const TIPOS_OFERTA = [
  {
    value: 'producto',
    label: 'Un producto físico',
    emoji: '📦',
    ayuda: 'Algo que se empaca y se envía',
  },
  {
    value: 'servicio',
    label: 'Un servicio',
    emoji: '🤝',
    ayuda: 'Consultoría, agencia, atención, instalación',
  },
  {
    value: 'digital',
    label: 'Un producto digital',
    emoji: '💻',
    ayuda: 'Curso, membresía, software, plantilla',
  },
] as const;

export type TipoOferta = (typeof TIPOS_OFERTA)[number]['value'];

/** ¿Necesita envío físico? Decide si el paso de logística aplica. */
export function requiereEnvio(tipo: string | undefined): boolean {
  return tipo === 'producto';
}

export const productoSchema = z.object({
  tipo_oferta: z
    .enum(['producto', 'servicio', 'digital'])
    .refine((v) => !!v, { message: 'Elige qué vendes' }),
  nombre: requerido('Escribe el nombre'),
  presentaciones: requerido('Completa este campo'),
  componentes: requerido('Escribe qué incluye'),
  beneficios: requerido('Escribe los beneficios principales'),
  diferenciales: requerido('Escribe qué lo hace distinto de la competencia'),
  precio: requerido('Escribe el precio'),
  promociones: textoOpcional,
  garantias: requerido('Escribe las garantías que ofreces'),
  link_tienda: requerido('Escribe dónde se contrata o se compra'),
  audiencia: z.object({
    edad: requerido('Escribe el rango de edad'),
    genero: requerido('Escribe a qué género le vendes'),
    pais: requerido('Escribe el país de tu cliente'),
    dolor: requerido('Escribe qué problema le resuelves'),
  }),
  objeciones: tresConAlMenosUno('Escribe al menos una objeción'),
  testimonios: textoOpcional,
});

// ---------------------------------------------------------------------------
// Paso 5 — Contenido (opcional)
// ---------------------------------------------------------------------------
export const OBJETIVOS = [
  { value: 'organico', label: 'Contenido orgánico', emoji: '🌱' },
  { value: 'pauta', label: 'Para pauta / anuncios', emoji: '📢' },
  { value: 'ambos', label: 'Los dos', emoji: '🚀' },
] as const;

export const PLATAFORMAS = [
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'facebook', label: 'Facebook', emoji: '👥' },
  { value: 'youtube', label: 'YouTube', emoji: '▶️' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
] as const;

export const contenidoSchema = z.object({
  objetivo: z.enum(['organico', 'pauta', 'ambos']).optional().or(z.literal('')),
  plataformas: z.array(z.string()).default([]),
  historial_contenido: textoOpcional,
});

// ---------------------------------------------------------------------------
// Paso 6 — Logística (opcional)
// ---------------------------------------------------------------------------
export const logisticaSchema = z.object({
  unidades_disponibles: textoOpcional,
  direccion_despacho: textoOpcional,
  responsable_despacho: textoOpcional,
});

// ---------------------------------------------------------------------------
// Tipos inferidos
// ---------------------------------------------------------------------------
export type LegalData = z.infer<typeof legalSchema>;
export type EquipoData = z.infer<typeof equipoSchema>;
export type MarcaData = z.infer<typeof marcaSchema>;
export type ProductoData = z.infer<typeof productoSchema>;
export type ContenidoData = z.infer<typeof contenidoSchema>;
export type LogisticaData = z.infer<typeof logisticaSchema>;

export interface OnboardingFormData {
  legal?: Partial<LegalData>;
  equipo?: Partial<EquipoData>;
  marca?: Partial<MarcaData>;
  producto?: Partial<ProductoData>;
  contenido?: Partial<ContenidoData>;
  logistica?: Partial<LogisticaData>;
}

/** Nombre de sección tal como lo espera la edge function. */
export type SectionKey = keyof OnboardingFormData;

/**
 * Definición de los 6 pasos. El orden de este array ES el orden del wizard.
 * `obligatorio` solo afecta el texto de ayuda; la validación real la hace el
 * schema de cada paso.
 */
export const STEPS = [
  {
    key: 'legal' as const,
    titulo: 'Datos de tu empresa',
    ayuda: 'Para la factura y el contrato',
    emoji: '🏢',
    obligatorio: true,
  },
  {
    key: 'equipo' as const,
    titulo: 'Tu equipo',
    ayuda: 'Quién aprueba y quién recibe avisos',
    emoji: '👥',
    obligatorio: true,
  },
  {
    key: 'marca' as const,
    titulo: 'Tu marca',
    ayuda: 'Cómo hablas y a quién te pareces',
    emoji: '✨',
    obligatorio: false,
  },
  {
    key: 'producto' as const,
    titulo: 'Qué vendes',
    ayuda: 'Tu producto o servicio, y a quién le sirve',
    emoji: '🛍️',
    obligatorio: true,
  },
  {
    key: 'contenido' as const,
    titulo: 'Tu contenido',
    ayuda: 'Dónde publicas y qué buscas',
    emoji: '🎬',
    obligatorio: false,
  },
  {
    key: 'logistica' as const,
    titulo: 'Cierre y resumen',
    ayuda: 'Últimos detalles y revisión antes de enviar',
    emoji: '🚚',
    obligatorio: false,
  },
] as const;

export const SCHEMAS = {
  legal: legalSchema,
  equipo: equipoSchema,
  marca: marcaSchema,
  producto: productoSchema,
  contenido: contenidoSchema,
  logistica: logisticaSchema,
} as const;
