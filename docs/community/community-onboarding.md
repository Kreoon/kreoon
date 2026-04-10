# Secuencia de Onboarding — Los Reyes del Contenido
## 30 días para convertir un nuevo miembro en participante activo

---

## Filosofía del Onboarding

El objetivo no es informar. Es provocar una victoria rápida en las primeras 48h.
Un miembro que gana algo (puntos, reconocimiento, un recurso útil) en las primeras 48h tiene 3x más probabilidad de quedarse al mes.

**Regla de oro:** cada mensaje de onboarding debe tener exactamente 1 acción clara.

---

## DÍA 0 — Bienvenida inmediata (automatizado con n8n)

**Trigger:** registro en Skool completado

**DM automático en Skool (de parte de Alexander):**
```
Bienvenido/a a Los Reyes del Contenido.

Soy Alexander, fundador de Kreoon.

Acabas de entrar a la comunidad de creadores más ambiciosa de LATAM.

Tu primera misión:
1. Presenta tu perfil en el canal #presentaciones (1 párrafo: quién eres, qué creas, qué quieres lograr)
2. Crea tu perfil gratuito en Kreoon: kreoon.com/signup

Esas 2 acciones te dan 400 puntos de entrada y activan tu badge "Bienvenido, Rey".

Nos vemos adentro.
— Alexander
```

**Acción del sistema:** otorgar 100 puntos base al registrarse + enviar email de bienvenida

---

## DÍA 1 — El perfil es tu reputación

**DM automático:**
```
Hola [nombre].

Un perfil completo en Kreoon es la diferencia entre conseguir un cliente y ser ignorado.

Hoy te comparto el checklist de un perfil que convierte:
✓ Foto de perfil profesional (no de selfie informal)
✓ Bio de 3 líneas: qué haces, para quién, cuál es tu estilo
✓ Al menos 3 trabajos en tu portfolio
✓ Tus redes sociales vinculadas

Complétalo hoy y ganas 300 puntos extra.

Comparte tu perfil en #mi-portfolio-kreoon cuando esté listo.
```

**Recurso entregado:** Guía PDF "El Portfolio que Consigue Clientes" (disponible en módulo del curso)

---

## DÍA 2 — Primera victoria en la comunidad

**DM automático:**
```
[Nombre], esta semana hay un reto activo en la comunidad.

El reto de esta semana: [descripción del reto activo]

Solo participar te da 150 puntos. Ganar te da 300 más.

Ve al canal #reto-semanal y publica tu participación antes del domingo.

Los mejores 3 trabajos se publican en Instagram de Kreoon (más de 15,000 seguidores ven tu trabajo).
```

---

## DÍA 3 — Conectar con la comunidad

**DM automático:**
```
¿Ya te presentaste?

Los miembros que se presentan en los primeros 3 días tienen 5x más conexiones en su primer mes.

Ve al canal #presentaciones y cuéntanos:
- ¿Qué tipo de contenido creas?
- ¿En qué ciudad estás?
- ¿Cuál es tu meta de ingresos como creador en 2026?

Después de presentarte, busca 2 personas con metas parecidas a las tuyas y salúdalas.

Así se construye una red real.
```

**Si no se ha presentado:** trigger en n8n para DM adicional a las 24h

---

## DÍA 5 — El recurso más valioso de tu rol

**DM automático (personalizado según rol declarado):**

Para content_creator:
```
Como creador de contenido, el recurso que más me han pedido es este:

"Script pack: 10 guiones de UGC que convirtieron en LATAM"

Lo encuentras en la Biblioteca del curso, módulo 2.

Después de revisarlo, comparte en #general cuál fue tu gancho favorito y por qué.
Eso te da 50 puntos y arranca una conversación que beneficia a todos.
```

Para editor:
```
Como editor, este recurso cambia cómo cotizas tu trabajo:

"Calculadora de tarifas para editores LATAM 2026"

La encuentras en la Biblioteca, módulo 3.

Comparte en #editores cuánto cobrabas antes vs. cuánto deberías cobrar según la calculadora.
```

Para client/brand:
```
Bienvenido a la comunidad.

Para encontrar talento rápido, empieza por el canal #oportunidades.
Ahí puedes publicar un brief y recibir propuestas de creadores verificados en menos de 24h.

Si necesitas orientación sobre cómo estructurar un brief efectivo, escríbeme directamente.
```

---

## DÍA 7 — Check-in de primera semana

**DM automático:**
```
[Nombre], llevas 7 días en Los Reyes del Contenido.

Aquí está tu resumen:
- Puntos acumulados: [X] puntos
- Posición en el leaderboard: #[X]
- Nivel actual: [Nombre del nivel]

¿Cómo fue tu primera semana? Cuéntame con 1 palabra en este DM.

Esta semana empieza un nuevo reto. Si participas y terminas en el top 3, saltas [X] posiciones en el ranking.

PD: ¿Viste el live del miércoles? El resumen está en #recursos-lives.
```

**Si lleva menos de 200 puntos:** agregar mensaje motivacional sobre las acciones más fáciles para subir

---

## DÍA 10 — Presentar el Nivel 2 (sin vender)

**DM automático:**
```
Algo que quiero que sepas:

Hay un grupo dentro de la comunidad que accede a cosas que el resto no ve.

Se llama "La Sala del Trono". Es el Nivel 2.

Esta semana se hizo una Masterclass de 90 minutos sobre pricing para creadores LATAM.
Solo los del Nivel 2 asistieron en vivo y tienen la grabación.

No te lo digo para venderte nada.
Te lo digo porque si estás leyendo esto en el día 10, claramente estás comprometido con crecer.

Cuando sientas que quieres más, aquí está la puerta: [link al upgrade]
```

---

## DÍA 14 — Celebración de 2 semanas + reconocimiento

**Post público en el feed de la comunidad (del community manager):**
```
Esta semana damos la bienvenida a nuestros nuevos miembros de 2 semanas:
[lista de nombres con @]

[Nombre 1] ya tiene su portfolio en Kreoon con 3 trabajos publicados.
[Nombre 2] ganó el reto de la semana pasada.
[Nombre 3] hizo la pregunta más útil del canal #pide-ayuda.

Si estás en esta lista, tienes 250 puntos de bonus esperándote hoy.
```

**DM personalizado según comportamiento:**
- Si completó reto: "Eres de los que hacen, no solo miran. Eso es exactamente lo que hace a un Rey."
- Si no ha publicado nada: "¿Qué necesitas para dar tu primer paso esta semana? Respóndeme aquí."

---

## DÍA 21 — El accountability pod

**DM automático:**
```
[Nombre], te quiero proponer algo.

Los creadores que más crecen en esta comunidad no lo hacen solos.
Tienen un pequeño grupo de 4-5 personas con las que se chequean cada semana.

Se llaman accountability pods.

Cada semana el grupo responde 3 preguntas:
1. ¿Qué publiqué esta semana?
2. ¿Qué aprendí?
3. ¿Cuál es mi meta de la próxima semana?

Si quieres entrar a un pod, escribe "ME APUNTO" aquí y te asignamos uno en 48h.

Entrar a un pod te da 200 puntos y activa un badge especial.
```

---

## DÍA 30 — Encuesta de retención + oferta de upgrade

**Email + DM en Skool:**
```
[Nombre], llevas 30 días con nosotros.

Antes de contarte lo que viene, quiero escucharte.

¿Qué nota le das a tu primer mes? (1-10)
¿Qué fue lo más valioso que encontraste?
¿Qué te faltó?

Responde aquí: [link a formulario de 3 preguntas]

Como gracias por responder, tienes esta semana acceso gratuito a "La Sala del Trono" (Nivel 2) por 7 días.

Sin tarjeta de crédito. Sin compromisos.
Solo para que veas qué te estás perdiendo.
```

---

## Mapa Visual del Onboarding

```
Día 0    → Bienvenida + Misión 1 (perfil Kreoon)
Día 1    → Checklist de perfil
Día 2    → Primer reto semanal
Día 3    → Presentación en comunidad
Día 5    → Recurso personalizado por rol
Día 7    → Check-in + puntos acumulados
Día 10   → Introducción suave al Nivel 2
Día 14   → Celebración pública + reconocimiento
Día 21   → Invitación a accountability pod
Día 30   → Encuesta + prueba gratuita Nivel 2
```

---

## Métricas de Onboarding a Monitorear

| Métrica | Objetivo |
|---------|----------|
| % que se presentan en primeros 3 días | >60% |
| % que crean perfil en Kreoon en primeros 7 días | >40% |
| % que participan en al menos 1 reto en primeros 14 días | >35% |
| % que llegan a 500 puntos en primeros 30 días | >25% |
| % que hacen upgrade en primeros 30 días | >5% |
| % que siguen activos al día 30 | >50% |

---

*Onboarding v1.0 — Los Reyes del Contenido — Abril 2026*
