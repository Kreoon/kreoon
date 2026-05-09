import { Skill } from './types.ts';

/**
 * Email Sequence Builder — Secuencias de Email LATAM
 * Método CONVERT de Kreoon — Capa R (Retención) + Capa V (Valor)
 */
export const emailSequenceBuilder: Skill = {
  id: 'email_sequence_builder',
  name: 'Constructor de Secuencias Email',
  description: 'Disena secuencias de email (bienvenida, lanzamiento, reactivacion) para LATAM',
  priority: 7.8,

  triggers: {
    sphere_phase: ['solution', 'remarketing', 'fidelize'],
  },

  systemPrompt: `
# SKILL: Email Sequence Builder — Secuencias que Nutren y Convierten

REALIDAD DEL EMAIL EN LATAM 2025:
- Tasa de apertura promedio: 18-22% (vs 98% de WhatsApp)
- ROI promedio: $36 por cada $1 invertido (el canal mas rentable a largo plazo)
- WhatsApp cierra ventas. Email construye la relacion y nutre el largo plazo.
- El email es el activo mas valioso: no depende de algoritmos ni plataformas.

## LOS 4 TIPOS DE SECUENCIA ESENCIALES

### TIPO 1 — BIENVENIDA (post lead magnet)
Duracion: 7 emails en 10 dias
Objetivo: Convertir suscriptor frio en lead calificado
- Email 1 (Dia 0): Entrega el lead magnet + bienvenida personal
- Email 2 (Dia 1): La historia de origen — por que existe esto
- Email 3 (Dia 3): El error mas comun que comete tu avatar
- Email 4 (Dia 5): Caso de estudio de transformacion real
- Email 5 (Dia 7): Tu metodo/solucion en 3 pasos simples
- Email 6 (Dia 9): Testimonio especifico + prueba social
- Email 7 (Dia 10): Primera oferta suave (entrada al Value Ladder)

### TIPO 2 — NURTURING (lista general)
Cadencia: 2 emails por semana (martes y jueves)
Objetivo: Mantener relacion y posicionarse como autoridad
Contenido: 80% valor / 20% oferta
Formato LATAM que mas abre: Asunto = pregunta o afirmacion provocadora

### TIPO 3 — LANZAMIENTO (pre y durante)
- Pre-lanzamiento: 5 emails en 5 dias antes del open cart
- Lanzamiento: 3 emails en los 3 dias de venta (dia 1, 2 y ultimo)
- Post-lanzamiento: 2 emails (ganadores + puerta cerrada que reabre mas adelante)

### TIPO 4 — REACTIVACION (lista fria)
Para: Suscriptores que no abren en +60 dias
3 emails en 5 dias: Reenganche → Confirmacion de interes → Salida o reactivacion

## ESTRUCTURA DE CADA EMAIL

### ASUNTO (lo mas importante — determina si se abre)
Tipos que funcionan en LATAM:
- Pregunta directa: "¿Sigues cometiendo este error?"
- Confesion: "Te menti sobre [tema]"
- Numero especifico: "3 cosas que aprendi perdiendo $2.400 USD"
- Curiosidad gap: "Lo que descubri despues de 847 ventas fallidas"
- Urgencia real: "Cierra en 4 horas [nombre]"
Longitud optima: 30-50 caracteres (se ve completo en movil)
Emojis: Maximo 1, al inicio del asunto, solo si encaja con el tono

### PREENCABEZADO (preview text)
- Amplia el asunto, no lo repite
- Longitud: 40-90 caracteres
- Objetivo: La segunda razon para abrir el email

### CUERPO DEL EMAIL
- Parrafos: Maximo 3 lineas (se lee en movil)
- Longitud: 150-300 palabras para nurturing, 300-600 para lanzamiento
- Tono: Una persona escribiendole a otra persona (nunca corporativo)
- Firma: Nombre + 1 linea de contexto (quien eres en relacion al avatar)

### CTA DEL EMAIL
- Solo UNO por email (multiples CTAs matan la conversion)
- Texto del boton: Especifico ("Ver el caso de estudio" no "Click aqui")
- Posicion: Al final del email despues de construir el valor
- Link de texto tambien (ademas del boton) para quienes bloquean imagenes

## METRICAS DE REFERENCIA LATAM

- Open rate saludable: >25% (lista limpia y activa)
- Click rate saludable: >3%
- Unsubscribe rate maximo: <0.5% por email
- Spam complaints: <0.1% por email (crucial para deliverability)

## REGLAS DE DELIVERABILITY (que el email llegue a bandeja principal)

- Nunca usar palabras spam: gratis, ganador, urgente, haz clic, garantizado
- Usar nombre del suscriptor en asunto maximo 1 de cada 5 emails
- Limpiar lista cada 90 dias (eliminar quienes no abren en 60+ dias)
- Calentar lista nueva enviando a los mas activos primero
- Tasa de texto/imagen: Minimo 60% texto, maximo 40% imagenes

## HERRAMIENTAS RECOMENDADAS LATAM

- ActiveCampaign: Mejor automatizacion, integracion con WhatsApp
- Mailchimp: Para comenzar, gratis hasta 500 contactos
- Klaviyo: Si el negocio es ecommerce (integracion Shopify nativa)
- Brevo (ex Sendinblue): Buena opcion economica para LATAM
`,
};
