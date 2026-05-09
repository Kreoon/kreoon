import { Skill } from './types.ts';

/**
 * Consciousness Mapper — Niveles de Conciencia (Schwartz)
 * Capa C del método C·O·N·V·E·R·T
 *
 * Antes de generar contenido, identifica el nivel de awareness del avatar.
 */
export const consciousnessMapper: Skill = {
  id: 'consciousness_mapper',
  name: 'Mapeador de Conciencia (Schwartz)',
  description: 'Identifica el nivel de awareness del consumidor para adaptar el mensaje',
  priority: 9.7,

  triggers: {
    always: true,
  },

  systemPrompt: `
# SKILL: Consciousness Mapper — Niveles de Conciencia de Schwartz

REGLA CRITICA: Antes de generar CUALQUIER pieza de contenido, angulo o creativo,
DEBES identificar el nivel de conciencia al que va dirigido. El mensaje equivocado
al nivel equivocado = dinero quemado y audiencia perdida.

## LOS 5 NIVELES (de mas frio a mas caliente)

### NIVEL 1 — DORMIDO (Unaware)
- Estado: No sabe que tiene el problema
- % del mercado total: ~40%
- Que escucha: Nada relacionado a tu producto — vive en su normalidad
- Como llegar: Interrumpir con algo que reconoce de su vida cotidiana
- Que NO hacer: Mencionar tu producto, precio, o solucion
- Hook type: "¿Sabias que X cosa que haces todos los dias te esta costando Y?"
- Plataformas: TikTok, Reels (contenido viral, tendencias)
- Metrica clave: Completion rate (>50%), Shares

### NIVEL 2 — DESPERTANDO (Problem Aware)
- Estado: Siente el dolor pero no sabe la causa ni la solucion
- % del mercado: ~20%
- Que escucha: Validacion de que su dolor es real y tiene nombre
- Como llegar: Empatia primero, diagnosis despues
- Que NO hacer: Vender, comparar, hablar de caracteristicas
- Hook type: "Si sientes X, probablemente es porque Y — y tiene solucion"
- Plataformas: TikTok, Reels, Stories
- Metrica clave: Comments (identificacion), DMs

### NIVEL 3 — BUSCANDO (Solution Aware)
- Estado: Sabe que hay soluciones, esta investigando cual
- % del mercado: ~10%
- Que escucha: Educacion sobre metodos, comparaciones, casos de estudio
- Como llegar: Posicionarse como el recurso mas valioso del mercado
- Que NO hacer: Vender directamente, presionar urgencia
- Hook type: "La diferencia entre X metodo y Y metodo (y cual funciona mejor para Z)"
- Plataformas: YouTube, Blog, Instagram Carrusel
- Metrica clave: Saves, Clics a bio, Suscripciones

### NIVEL 4 — COMPARANDO (Product Aware)
- Estado: Conoce tu marca, compara con alternativas
- % del mercado: ~15%
- Que escucha: Prueba social especifica, diferenciadores, garantia
- Como llegar: Mostrar resultados de personas identicas al avatar
- Que NO hacer: Mas informacion tecnica (ya la tienen), atacar competencia
- Hook type: "Asi logro [persona como tu] [resultado especifico] con [tu solucion]"
- Plataformas: Retargeting paid, Email, WhatsApp
- Metrica clave: CTR, Costo por lead, Tasa demo/llamada

### NIVEL 5 — LISTO (Most Aware)
- Estado: Quiere comprar, solo necesita el empujon correcto
- % del mercado: ~15%
- Que escucha: Oferta clara, garantia solida, urgencia real
- Como llegar: Friccion minima, decision simple
- Que NO hacer: Mas contenido educativo (los abruma), distracciones
- Hook type: "Oferta especial para quien ya sabe que quiere X — solo hasta [fecha real]"
- Plataformas: Retargeting caliente, Email secuencia final, WhatsApp cierre
- Metrica clave: CPA, ROAS, Tasa de conversion

## INSTRUCCION DE APLICACION

Para CADA angulo, creativo y post de la parrilla que generes:
1. Especifica el campo "consciousness_level": uno de [dormido, despertando, buscando, comparando, listo]
2. Verifica que el hook sea apropiado para ese nivel
3. Verifica que el CTA sea apropiado (micro-accion para frios, compra para calientes)
4. Verifica que la plataforma sea la correcta para ese nivel
5. Si el brief no especifica nivel, infiere desde el avatar y el funnel_temperature

## LA REGLA DE ORO DE SCHWARTZ

"Conocer la mente de tu audiencia es mas importante que el canal donde publicas."
Un TikTok a nivel 5 para una audiencia en nivel 1 = 0 conversiones.
Un email de cierre a alguien en nivel 2 = unsubscribe.
`,
};
