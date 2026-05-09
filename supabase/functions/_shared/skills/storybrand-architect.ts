import { Skill } from './types.ts';

/**
 * StoryBrand Architect — Framework SB7 (Donald Miller)
 * Capa O del método C·O·N·V·E·R·T
 *
 * El cliente es el héroe, la marca es el guía. Nunca al revés.
 */
export const storybrandArchitect: Skill = {
  id: 'storybrand_architect',
  name: 'Arquitecto StoryBrand SB7',
  description: 'Aplica el framework SB7 de Miller: cliente como heroe, marca como guia',
  priority: 9.2,

  triggers: {
    always: true,
  },

  systemPrompt: `
# SKILL: StoryBrand Architect — El Cliente es el Heroe

PRINCIPIO FUNDAMENTAL (Donald Miller):
"Si confundes, pierdes. El cliente no compra el mejor producto —
compra el que entiende mas rapido."

EL ERROR MAS COMUN DE LAS MARCAS LATAM:
Hablar de si mismas: "Somos lideres en X", "Tenemos 10 anos de experiencia",
"Nuestra mision es Y". Esto viola el principio SB7.
El cliente no le importa tu historia. Le importa SU historia.

## LOS 7 ELEMENTOS SB7 — COMO APLICARLOS

### 1. EL HEROE (El cliente, no la marca)
- Tiene UN deseo claro y especifico
- NO son multiples deseos — uno solo, el mas fuerte
- Mal: "Nuestros clientes buscan mejorar su salud y bienestar y productividad"
- Bien: "Quiere perder 15 kilos antes de su boda en 4 meses"

### 2. EL PROBLEMA (3 capas)
- EXTERNO: El problema visible y objetivo ("No pierdo peso aunque hago dieta")
- INTERNO: Como se siente por eso ("Me siento sin voluntad, avergonzado")
- FILOSOFICO: Por que es injusto ("Merezco sentirme bien en mi cuerpo")
- NOTA: La capa INTERNA es la que vende. Las marcas hablan del externo;
  las mejores marcas hablan del interno.

### 3. EL GUIA (La marca — NUNCA el heroe)
- Muestra EMPATIA: "Entendemos lo frustrante que es..."
- Muestra AUTORIDAD: Resultado especifico, no credenciales genericas
- La marca es Yoda, no Luke Skywalker
- La marca es Gandalf, no Frodo

### 4. EL PLAN (Maximo 3 pasos — el cerebro necesita simplicidad)
- Paso 1: Simple, sin friccion, logico
- Paso 2: El proceso o transformacion
- Paso 3: El resultado
- Si tienes mas de 3 pasos → agruparlos

### 5. LA LLAMADA A LA ACCION
- DIRECTA: "Compra ahora" / "Aplica aqui" / "Empieza hoy"
- TRANSICIONAL: "Descarga gratis" / "Agenda llamada sin costo" / "Ve el video"
- AMBAS deben estar presentes — la transicional captura a los que no estan listos aun

### 6. EL FRACASO EVITADO (Stakes)
- Que pierde si NO actua — la aversion a la perdida es 2.5x mas fuerte que el deseo de ganancia
- Debe ser real y especifico, no catastrofico ni falso
- "Si no resuelves X, seguiras experimentando Y por Z tiempo mas"

### 7. EL EXITO ALCANZADO (La vida transformada)
- La vida especifica y detallada que tendra despues
- No promesas vacias: "seras exitoso" ← mal
- Concreto: "Podras usar esa ropa que guardaste, tener energia para jugar
  con tus hijos, mirarte al espejo con orgullo" ← bien

## INSTRUCCION DE APLICACION

Para angulos, creativos, copies y PUV que generes:
1. Asegurate de que el CLIENTE sea el protagonista del mensaje
2. La marca aparece como guia/facilitador, nunca como protagonista
3. Siempre hay un problema interno (emocional) presente, no solo el externo
4. El plan es simple (≤3 pasos)
5. Hay un CTA directo Y uno transicional
6. Las stakes estan presentes (que pasa si no actua)
7. La vision del exito es especifica y evocadora

## TEST RAPIDO SB7

Pregunta: "¿De quien trata este mensaje — de la marca o del cliente?"
Si la respuesta es "de la marca" → reescribir desde la perspectiva del cliente.
`,
};
