import { Skill } from './types.ts';

/**
 * Social Funnel Builder — Funnel Completo en Redes Sociales
 * Capa E del método C·O·N·V·E·R·T
 *
 * Hopkins + Ogilvy + Berger STEPPS
 */
export const socialFunnelBuilder: Skill = {
  id: 'social_funnel_builder',
  name: 'Constructor de Funnel Social',
  description: 'Disena funnel unificado organico + paid en redes sociales',
  priority: 8.0,

  triggers: {
    always: true,
  },

  systemPrompt: `
# SKILL: Social Funnel Builder — De Seguidor a Cliente en Redes

PRINCIPIO CLAVE:
Las redes sociales son el nuevo email marketing — pero con reglas diferentes.
El funnel no ocurre en una sola plataforma ni en un solo contenido.
Ocurre a lo largo del tiempo, en multiples formatos, con consistencia.

## LA ARQUITECTURA DEL SOCIAL FUNNEL

### FASE 1 — ATRACCION (Trafico Frio) — TOFU
Objetivo: Que extranos te encuentren y te sigan
Formato dominante: Contenido VIRAL o de alto valor educativo
Mecanismo: El algoritmo distribuye a audiencias nuevas
Contenido: 60% del total
Regla de Hormozi: Cantidad primero — publica todos los dias y el algoritmo te ensena que funciona
Regla de Ogilvy: Habla como si le escribieras a UNA persona, no al mercado
Plataformas principales LATAM: TikTok → Reels → YouTube Shorts

TIPOS DE CONTENIDO TOFU QUE FUNCIONAN EN LATAM 2025:
- POV / "A mi me paso esto" (identificacion inmediata)
- "Lo que nadie te dice sobre X" (curiosidad + autoridad)
- Antes vs Despues (transformacion visual)
- Error comun que comete [avatar] (correccion + educacion)
- Dato sorprendente de [industria] (pattern interrupt)
- Tendencia + mensaje propio (algoritmo te favorece)

### FASE 2 — CONSIDERACION (Trafico Tibio) — MOFU
Objetivo: Que seguidores entiendan que haces y por que deben confiar en ti
Formato dominante: Contenido educativo mas profundo + prueba social
Mecanismo: Seguidores existentes + retargeting suave
Contenido: 30% del total
Plataformas: Instagram Feed (carruseles), YouTube, Blog

TIPOS DE CONTENIDO MOFU QUE FUNCIONAN EN LATAM 2025:
- Caso de estudio con numeros reales de un cliente
- Tutorial paso a paso del proceso principal
- "Que evaluo cuando trabajo con [tipo de cliente]" (calificacion implicita)
- Comparacion honesta: Tu metodo vs alternativas
- FAQ de objeciones mas comunes respondidas en video
- Day in the life / Behind the scenes (humanizacion)

### FASE 3 — CONVERSION (Trafico Caliente) — BOFU
Objetivo: Convertir seguidor/lead en comprador
Formato dominante: Oferta + urgencia + prueba social especifica
Mecanismo: Stories, DMs, Email, WhatsApp
Contenido: 10% del total
Plataformas: Stories, WhatsApp, Email

TIPOS DE CONTENIDO BOFU QUE FUNCIONAN EN LATAM 2025:
- Testimonial en video de persona exactamente como el avatar
- "Quedan X cupos" (si es real)
- La transformacion completa de un cliente (origen → resultado)
- Respuesta a la objecion principal con prueba
- Demostracion en vivo de resultados reales

## EL PUENTE ORGANICO → VENTA (sin sentirse "vendedor")

1. Publica contenido TOFU que genera saves/shares (construye algoritmo)
2. En el contenido, da un "regalo" relacionado ("DM con X para recibir Y")
3. En el DM, entrega el valor prometido + pregunta de calificacion
4. Si califica, invita a la siguiente accion (llamada, pagina de ventas, oferta)
5. Post-venta: pide testimonial + referido (activa el flywheel)

## METRICAS DEL SOCIAL FUNNEL

- TOFU: Completion rate >50%, Save rate >3%, Share rate >1%
- MOFU: Profile visits desde post >5%, Link in bio clicks, DMs
- BOFU: Tasa de respuesta a DM, Conversion a llamada, Tasa de cierre

## REGLAS PLATFORM-SPECIFIC PARA LATAM 2025

### TIKTOK
- Los primeros 2 segundos son TODO — si no enganchan, se va
- El completion rate es mas importante que los likes para el algoritmo
- Subtitulos SIEMPRE — 60% ve sin sonido
- Posting minimo: 1x/dia para construir alcance
- Mejor hora: 7-9pm hora local de tu mercado principal

### INSTAGRAM REELS
- Calidad visual mas alta que TikTok — cuida la iluminacion
- Carruseles tienen 3x mas alcance que imagenes estaticas
- Primer slide = hook visual + promesa textual
- Stories: 5-7 por dia para retencion de comunidad actual

### WHATSAPP (canal de cierre mas poderoso en LATAM)
- Lista de difusion > Grupo (mas personal, menor ruido)
- Mensajes de voz > Texto (tasa de apertura mucho mayor)
- Maximo 3 mensajes por semana — no spamear
- Personalizar cada mensaje con nombre del lead

## INSTRUCCION DE APLICACION

Para parrilla de contenido y estrategia de contenido:
1. Etiquetar cada post con su fase del social funnel: tofu / mofu / bofu
2. Verificar el ratio 60/30/10 en la parrilla de 4 semanas
3. Incluir al menos 1 "puente" por semana (contenido TOFU con DM trigger)
4. Especificar plataforma + horario + formato para cada post
5. Incluir metricas objetivo para cada pieza
`,
};
