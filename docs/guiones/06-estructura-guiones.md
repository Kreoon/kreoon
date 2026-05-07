# Estructura de Guiones Generados

## Visión General

Los guiones generados se organizan en 6 bloques, cada uno destinado a un rol específico del equipo de producción.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESTRUCTURA DE 6 BLOQUES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BLOQUE 1: CREADOR        │  BLOQUE 2: EDITOR         │  BLOQUE 3: TRAFFICKER │
│  (script)                 │  (editor_script)          │  (trafficker_script)  │
│                           │                           │                       │
├───────────────────────────┼───────────────────────────┼───────────────────────┤
│                           │                           │                       │
│  BLOQUE 4: ESTRATEGA      │  BLOQUE 5: DISEÑADOR      │  BLOQUE 6: ADMIN/PM   │
│  (strategist_script)      │  (designer_script)        │  (admin_script)       │
│                           │                           │                       │
└───────────────────────────┴───────────────────────────┴───────────────────────┘
```

---

## Bloque 1: Creador (script)

**Campo DB:** `content.script`
**Generado en:** Paso 1 de ScriptGenerator

### Estructura HTML

```html
<h2>HOOKS</h2>

<h3>Hook A: [Nombre del Hook]</h3>
<p>[ACCIÓN: Descripción de lo que hace el creador]</p>
<p>"[Texto exacto que dice el creador]"</p>

<h3>Hook B: [Nombre del Hook]</h3>
<p>[ACCIÓN: Descripción de lo que hace el creador]</p>
<p>"[Texto exacto que dice el creador]"</p>

<h3>Hook C: [Nombre del Hook]</h3>
<p>[ACCIÓN: Descripción de lo que hace el creador]</p>
<p>"[Texto exacto que dice el creador]"</p>

<h2>DESARROLLO</h2>

<h3>Problema (10 seg)</h3>
<p>[ACCIÓN: El creador muestra frustración]</p>
<p>"[Diálogo sobre el problema]"</p>

<h3>Transición (5 seg)</h3>
<p>[ACCIÓN: Cambio de expresión]</p>
<p>"[Diálogo de transición]"</p>

<h3>Solución (15 seg)</h3>
<p>[ACCIÓN: Mostrar el producto]</p>
<p>"[Diálogo presentando la solución]"</p>

<h3>Demostración (10 seg)</h3>
<p>[ACCIÓN: Usar el producto]</p>
<p>"[Diálogo explicando beneficios]"</p>

<h2>CTA</h2>

<p>[ACCIÓN: Mirar a cámara, señalar abajo]</p>
<p>"[Texto del call to action]"</p>
```

### Elementos Clave

| Elemento | Descripción |
|----------|-------------|
| **Hooks** | 2-5 opciones de inicio, probables hooks virales |
| **Problema** | Identificación con el dolor del avatar |
| **Transición** | Conexión problema → solución |
| **Solución** | Presentación del producto |
| **Demostración** | Uso/beneficios del producto |
| **CTA** | Llamado a la acción final |

---

## Bloque 2: Editor (editor_script)

**Campo DB:** `content.editor_script`
**Generado en:** Paso 2 de ScriptGenerator

### Estructura HTML

```html
<h2>PAUTAS DE EDICIÓN</h2>

<h3>Ritmo y Cortes</h3>
<ul>
  <li>Cortes rápidos cada 2-3 segundos en el hook</li>
  <li>Ritmo más pausado en la explicación</li>
  <li>Jump cuts sutiles para mantener dinamismo</li>
</ul>

<h3>Efectos Visuales</h3>
<ul>
  <li>Zoom in lento en momentos de énfasis</li>
  <li>Efecto de brillo al mostrar el producto</li>
  <li>Transición suave en el antes/después</li>
</ul>

<h3>Música y Audio</h3>
<ul>
  <li>Track: Upbeat, trending sounds</li>
  <li>Bajar volumen en diálogo importante</li>
  <li>Efecto de sonido en CTA</li>
</ul>

<h3>Textos en Pantalla</h3>
<ul>
  <li>Hook principal como texto grande</li>
  <li>Subtítulos para accesibilidad</li>
  <li>Precio/oferta destacado en CTA</li>
</ul>

<h3>Transiciones</h3>
<ul>
  <li>Whip transitions entre escenas</li>
  <li>Fade out suave al final</li>
  <li>Sin transiciones complicadas que distraigan</li>
</ul>
```

---

## Bloque 3: Trafficker (trafficker_script)

**Campo DB:** `content.trafficker_script`
**Generado en:** Paso 4 de ScriptGenerator

### Estructura HTML

```html
<h2>PAUTAS DE PAUTA</h2>

<h3>Objetivo de Campaña</h3>
<p>Conversiones - Compras en sitio web</p>
<p><strong>KPI principal:</strong> ROAS mínimo 3x</p>

<h3>Audiencias Sugeridas</h3>
<ul>
  <li><strong>Core:</strong> Mujeres 25-45, intereses en skincare</li>
  <li><strong>Lookalike:</strong> 1% compradores últimos 90 días</li>
  <li><strong>Retargeting:</strong> Visitantes +3 páginas, no compraron</li>
</ul>

<h3>Copy para Anuncios</h3>
<p><strong>Headline:</strong> "Tu piel va a cambiar en 2 semanas"</p>
<p><strong>Primary text:</strong> "Descubre por qué +10,000 mujeres ya lo probaron..."</p>
<p><strong>CTA button:</strong> Comprar ahora</p>

<h3>Creativos Recomendados</h3>
<ul>
  <li>Video principal (este guión)</li>
  <li>Carrusel antes/después</li>
  <li>Imagen estática con testimonial</li>
</ul>

<h3>Presupuesto y Duración</h3>
<ul>
  <li><strong>Presupuesto sugerido:</strong> $50-100/día inicial</li>
  <li><strong>Duración test:</strong> 7 días mínimo</li>
  <li><strong>Escalamiento:</strong> Si ROAS >3x, aumentar 20% diario</li>
</ul>
```

---

## Bloque 4: Estratega (strategist_script)

**Campo DB:** `content.strategist_script`
**Generado en:** Paso 3 de ScriptGenerator

### Estructura HTML

```html
<h2>ANÁLISIS ESTRATÉGICO</h2>

<h3>Alineación con Fase ESFERA</h3>
<p>Este guión está optimizado para la fase <strong>SOLUCIÓN</strong>:</p>
<ul>
  <li>Audiencia tibia que conoce el problema</li>
  <li>Enfoque en demostración de valor</li>
  <li>CTA directo hacia la compra</li>
</ul>

<h3>Puntos Fuertes</h3>
<ul>
  <li>Hooks con alta probabilidad de retención</li>
  <li>Estructura problema-solución clara</li>
  <li>CTA alineado con el nivel de consciencia</li>
</ul>

<h3>Áreas de Mejora</h3>
<ul>
  <li>Considerar agregar más prueba social</li>
  <li>El hook B podría ser más disruptivo</li>
  <li>Incluir mención de garantía</li>
</ul>

<h3>Recomendaciones</h3>
<ul>
  <li>Probar los 3 hooks en A/B testing</li>
  <li>Crear versión más corta (15 seg) para Stories</li>
  <li>Agregar versión con subtítulos quemados</li>
</ul>

<h3>Variantes Sugeridas</h3>
<ul>
  <li><strong>Variante A:</strong> Mismo guión con diferente creador</li>
  <li><strong>Variante B:</strong> Enfoque en testimonial</li>
  <li><strong>Variante C:</strong> Formato unboxing</li>
</ul>
```

---

## Bloque 5: Diseñador (designer_script)

**Campo DB:** `content.designer_script`
**Generado en:** Generación adicional opcional

### Estructura HTML

```html
<h2>PAUTAS DE DISEÑO</h2>

<h3>Paleta de Colores</h3>
<ul>
  <li><strong>Primario:</strong> #FF6B6B (coral energético)</li>
  <li><strong>Secundario:</strong> #4ECDC4 (turquesa fresco)</li>
  <li><strong>Neutro:</strong> #F7F7F7 (blanco cálido)</li>
  <li><strong>Acento:</strong> #2C3E50 (azul profundo)</li>
</ul>

<h3>Tipografía</h3>
<ul>
  <li><strong>Headlines:</strong> Montserrat Bold</li>
  <li><strong>Body:</strong> Open Sans Regular</li>
  <li><strong>Tamaño mínimo:</strong> 24px para Stories</li>
</ul>

<h3>Recursos Gráficos</h3>
<ul>
  <li>Logo en esquina superior derecha</li>
  <li>Iconos de beneficios (✓ checkmarks)</li>
  <li>Frame de "antes/después"</li>
  <li>Badge de oferta animado</li>
</ul>

<h3>Motion Graphics</h3>
<ul>
  <li>Entrada de texto con fade + slide</li>
  <li>Contador regresivo en oferta</li>
  <li>Partículas sutiles en transición</li>
  <li>Pulse effect en CTA</li>
</ul>

<h3>Thumbnails</h3>
<ul>
  <li><strong>Opción A:</strong> Cara del creador + texto de hook</li>
  <li><strong>Opción B:</strong> Antes/después dramático</li>
  <li><strong>Opción C:</strong> Producto con resultados</li>
</ul>
```

---

## Bloque 6: Admin/PM (admin_script)

**Campo DB:** `content.admin_script`
**Generado en:** Generación adicional opcional

### Estructura HTML

```html
<h2>NOTAS DEL PROJECT MANAGER</h2>

<h3>Timeline de Producción</h3>
<ul>
  <li><strong>Día 1:</strong> Aprobación de guión</li>
  <li><strong>Día 2-3:</strong> Grabación con creador</li>
  <li><strong>Día 4-5:</strong> Edición y revisión</li>
  <li><strong>Día 6:</strong> Aprobación final cliente</li>
  <li><strong>Día 7:</strong> Entrega y publicación</li>
</ul>

<h3>Recursos Necesarios</h3>
<ul>
  <li>Creador: @[nombre_creador]</li>
  <li>Producto físico para demo</li>
  <li>Ring light + micrófono</li>
  <li>Locación: Casa/estudio del creador</li>
</ul>

<h3>Dependencias</h3>
<ul>
  <li>Aprobación del cliente antes de grabar</li>
  <li>Envío de producto al creador (tracking: XXX)</li>
  <li>Assets de marca del cliente</li>
</ul>

<h3>Checklist de Entrega</h3>
<ul>
  <li>☐ Video vertical 9:16 (1080x1920)</li>
  <li>☐ Video cuadrado 1:1 (1080x1080)</li>
  <li>☐ Versión con subtítulos</li>
  <li>☐ Versión sin subtítulos</li>
  <li>☐ Thumbnail (3 opciones)</li>
  <li>☐ Copy para publicación</li>
</ul>

<h3>Notas para Cliente</h3>
<ul>
  <li>Este contenido está optimizado para Instagram Reels</li>
  <li>Recomendamos publicar entre 6-9 PM hora local</li>
  <li>Hashtags sugeridos en documento adjunto</li>
</ul>
```

---

## Formato HTML Requerido

### Tags Permitidos

| Tag | Uso |
|-----|-----|
| `<h2>` | Títulos de sección |
| `<h3>` | Subsecciones |
| `<h4>` | Sub-subsecciones (opcional) |
| `<p>` | Párrafos y diálogos |
| `<ul>` | Listas |
| `<li>` | Items de lista |
| `<strong>` | Énfasis importante |
| `<em>` | Énfasis secundario |

### Reglas de Formato

1. **Emojis:** Máximo 1-2 por sección principal
2. **Acciones:** [ENTRE CORCHETES Y MAYÚSCULAS]
3. **Diálogos:** Entre comillas ""
4. **Markdown:** NO usar (`**`, `##`, `-`)
5. **Duración:** 30-60 segundos de lectura
6. **Estructura:** Jerárquica y clara

### Ejemplo de Formato Correcto

```html
<h2>HOOKS</h2>

<h3>Hook A: Pattern Interrupt</h3>
<p>[ACCIÓN: Aparece de repente en cámara con expresión de sorpresa]</p>
<p>"Nadie te dice esto sobre el cuidado de la piel..."</p>
```

### Ejemplo de Formato Incorrecto

```markdown
## HOOKS

### Hook A: Pattern Interrupt

**Acción:** Aparece de repente en cámara

- Nadie te dice esto sobre el cuidado de la piel...
```
