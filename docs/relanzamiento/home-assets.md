# Home de Kreoon · assets visuales y procedencia

Documento de la portada pública (`src/components/landing/home/**`). No sustituye la auditoría ni los
planes de migración de `docs/relanzamiento/`.

## Estado

| Qué | Estado |
|---|---|
| Fotografías | **Generadas con Magnific** (modelo Seedream 5 Pro, vía `images_generate`), **descargadas, revisadas a ojo** y **exportadas** a `public/home/` (AVIF + WebP, 60 archivos, ~0,9 MB en total). |
| Implementación | Hero con tres personas distintas, franja de rostros junto al CTA, tira de retratos por actividad, escena de comunidad, detalle de espacio de trabajo y cierre con retratos. |
| Capturas antes/después | `docs/relanzamiento/home-capturas/` |
| Mediciones de campo (LCP/INP) | **Pendientes**: se miden en el preview de Vercel (ver «Mediciones»). |

Las fotografías son **ilustrativas** (generadas con IA). No son miembros de UGC Colombia, clientes, testimonios ni
casos de éxito, y la página lo rotula («Imagen ilustrativa», «Vista ilustrativa»). No hay nombres, seguidores,
ingresos ni marcas inventadas. Los textos de las imágenes se descartaron (la primera versión del detalle traía un
texto deformado en la tela y se regeneró).

## Manifiesto

Todas: Seedream 5 Pro (Magnific), resolución 2k, 100 créditos por imagen. **Créditos usados en total: 1.300
(13 generaciones)**. Prompts siempre con «no text, no logos, no watermark, no interface».

| Original | Quién / qué es | Proporción | Dónde se usa | Salidas | Enlace |
|---|---|---|---|---|---|
| `hero-main` | Creadora afrolatina (~30), curly, cárdigan mostaza, cámara en trípode al fondo | 3:4 | **Hero, retrato principal (LCP)** | `hero-{480,720,960}` | https://www.magnific.com/app/creation/9ZdgK8FNYZ |
| `ugc` | Joven con gafas riendo mientras graba UGC con teléfono | 3:4 | Hero, foto secundaria | `hero-ugc-{320,480}` | https://www.magnific.com/app/creation/eIKn6jedqL |
| `video` | Videógrafo con cámara y teléfono en soporte (variante 2 del hero) | 3:4 | Hero, foto secundaria | `hero-video-{320,480}` | https://www.magnific.com/app/creation/ks3C2Ny16B |
| `beauty` | Mujer negra (~late 20s), trenzas, grabando con teléfono | 3:4 | Franja de rostros · cierre | `cara-beauty-{80,160}`, `persona-beauty-{360,540}` | https://www.magnific.com/app/creation/1lREIAcr4r |
| `editor` | Hombre (~50s), canas, editando video en su escritorio | 3:4 | Franja de rostros | `cara-editor-{80,160}` | https://www.magnific.com/app/creation/rgZuIWgxtc |
| `gaming` | Persona joven de estilo alternativo (rapado decolorado, tatuajes), tecnología y gaming | 3:4 | Franja de rostros | `cara-gaming-{80,160}` | https://www.magnific.com/app/creation/u5O8VRhQLD |
| `viajes` | Mujer (~60s), cabello plateado, viajes y relatos | 3:4 | Franja de rostros · cierre | `cara-viajes-{80,160}`, `persona-viajes-{240,360}` | https://www.magnific.com/app/creation/bxNvXRI5Y2 |
| `bienestar` | Mujer (~40s), talla grande, bienestar y estilo de vida | 3:4 | Tira de retratos | `persona-bienestar-{320,480}` | https://www.magnific.com/app/creation/6ABU1aliJO |
| `gastro` | Mujer (~35) fotografiando comida, gastronomía y viajes | 3:4 | Tira de retratos | `persona-gastro-{320,480}` | https://www.magnific.com/app/creation/ks3Co0j16B |
| `foto` | Hombre con gorro lavanda, cámara y teléfono (variante 1 del hero) | 3:4 | Tira de retratos | `persona-foto-{320,480}` | https://www.magnific.com/app/creation/5j6aR4SKxe |
| `comunidad` | Tres adultos colaborando en una producción | 16:9 | Franja de comunidad | `comunidad-{640,1024,1600}` | https://www.magnific.com/app/creation/LwGHY2YswO |
| `detalle` | Naturaleza muerta de espacio de trabajo (tela coral lisa) | 4:3 | Tarjeta de beneficios | `detalle-{480,800}` | https://www.magnific.com/app/creation/nVfN78lYQD |

Descartada: la primera versión del detalle (https://www.magnific.com/app/creation/tCsMSLnmZJ) por traer texto
deformado en la tela.

Diversidad repartida entre imágenes (no concentrada en una): distintos tonos de piel, rasgos, géneros y expresiones de
género, cuerpos, edades adultas (de ~25 a ~60), estilos personales y actividades (UGC, video, edición, gaming/tecnología,
bienestar, gastronomía/viajes, fotografía, belleza/moda). Los colores de marca aparecen en ropa, objetos y fondos, sin
filtros violetas sobre la piel.

### Prompts

Base A (hero) y B (comunidad) y C (detalle) del encargo original, más los retratos nuevos. Cada retrato fija una persona
distinta (edad, rasgos, peinado, vestuario, entorno y actividad), expresión espontánea, textura de piel natural, manos y
equipo creíbles, rostro completo visible, y excluye texto, logos, marcas de agua, interfaz y retoque exagerado.

- **hero-main:** retrato editorial cálido de una creadora afrolatina de unos treinta años con cabello rizado natural, en un
  estudio luminoso y creíble, mirando a cámara con una sonrisa sutil y segura; cárdigan mostaza, aros dorados; cámara sin
  enfoque sobre trípode al fondo; marfil, luz de ventana, acentos lavanda y coral; sujeto a la derecha con espacio negativo.
- **ugc:** fotografía espontánea de una joven latinoamericana con lentes redondos riendo mientras graba con un teléfono en
  trípode, en un rincón cálido con plantas; camiseta coral, cojín lavanda, frasco cerámico sin etiqueta.
- **editor:** retrato de un hombre de unos cincuenta años con barba canosa en su escritorio de edición, dos monitores con
  líneas de tiempo abstractas, audífonos al cuello, mirada cálida; camisa verde salvia.
- **bienestar:** mujer de unos cuarenta años, talla grande, de pie en una sala luminosa con una taza de cerámica, suéter
  lavanda; teléfono en soporte al fondo.
- **gaming:** persona joven de estilo andrógino con corte rapado decolorado, piercing en el tabique y tatuajes, riendo en su
  escritorio con teclado y micrófono; camiseta negra, luz de lámpara menta.
- **gastro:** mujer de unos treinta y cinco años con trenza, pecas, fotografiando un plato con cámara compacta en una
  cocina rústica; camisa de lino y delantal coral.
- **beauty:** mujer negra de unos veintiocho años con trenzas, creadora de belleza y moda, grabándose con un teléfono en un
  dormitorio luminoso; blusa crema, cojín menta.
- **viajes:** mujer de unos sesenta años con cabello plateado rizado, arrugas de expresión, en una mesa de café con cámara
  compacta y libreta; camisa de mezclilla y pañuelo lavanda.
- **detalle (v2):** espacio de trabajo con cámara compacta sobre tela coral lisa, auriculares claros, libreta en blanco y
  jarrones lavanda; sin ningún texto.

### Revisión visual (hecha sobre las imágenes descargadas)

Aprobadas todas las usadas: rostros naturales y distintos entre sí, ojos y dientes correctos, manos y equipos plausibles,
sin textos ni logos extraños, iluminación y color coherentes. Notas: el hero A1 (`foto`) tiene vestuario muy lavanda; las
manos de `bienestar` son aceptables pero la parte menos pulida del conjunto; la imagen `comunidad` tiene un rango de pieles
más acotado que el resto del set (se compensa con las demás). Recortes de avatar (`cara-*`): manuales, centrados en el
rostro (coordenadas en `scripts/optimize-home-images.mjs`).

## Cómo regenerar las exportaciones

Los originales pesan varios MB y **no se versionan**. Para recrearlos: descargarlos desde los enlaces de Magnific, dejarlos
con los nombres de la columna «Original» (`.png`) en una carpeta local y correr:

```bash
node scripts/optimize-home-images.mjs <carpeta-origen>
```

El script exporta a `public/home/` y baja la calidad por pasos hasta entrar en el presupuesto de cada variante.

## Presupuesto y resultado de peso

| Variante | Tope | Resultado (AVIF / WebP) |
|---|---|---|
| Hero 480 / 720 / 960 px | 150 / 220 / 250 KB | 17 / 29 / 42 KB · 22 / 40 / 59 KB |
| Comunidad 640 / 1024 / 1600 px | 110 / 180 / 260 KB | 18 / 33 / 57 KB · 22 / 42 / 79 KB |
| Secundarias, retratos, rostros, detalle | 8–140 KB según tamaño | todas dentro de tope |

Medido en el navegador (build de desarrollo local, red local): una carga completa de la página con scroll descarga **~101 KB
(móvil) a ~143 KB (escritorio)** de imágenes, todas en `image/avif`.

- La imagen LCP (hero principal) lleva `fetchpriority="high"` y **no** lleva lazy loading; el resto, `loading="lazy"` y
  `decoding="async"`. No se precarga ninguna otra.
- `srcset`/`sizes` y `width`/`height` explícitos en todas las imágenes (CLS medido: **0** en 360, 390, 768, 1280 y 1440 px).
- La flotación de tarjetas es solo CSS y se desactiva con `prefers-reduced-motion`; no se añadió ninguna librería.
- Las imágenes ocultas en móvil (foto secundaria del hero y retratos del cierre) no se descargan allí.
- Si falta un archivo, `HomePicture` no pinta nada y el contenedor (fondo de marca) mantiene el espacio.
- El splash de 2 s se excluyó de `/`, `/registro` y `/bienvenida`: retrasaba el CTA y el LCP.

## Mediciones

Medido (laboratorio, build de desarrollo local, no representativo de producción): CLS 0; sin desborde horizontal en 360,
390, 768, 1280 y 1440 px; axe-core (WCAG A/AA) sin violaciones en 390 y 1280 px; navegación por teclado con orden correcto,
saltar al contenido, anclas bajo el header sticky y movimiento reducido respetado.

**No medido todavía:** LCP, INP y rendimiento móvil en condiciones reales. Las metas (LCP ≤ 2,5 s, CLS ≤ 0,1,
INP ≤ 200 ms) son **objetivos, no resultados**: se verifican con Lighthouse y datos de campo en el preview de Vercel (el
laboratorio no certifica INP).
