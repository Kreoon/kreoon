# Home de Kreoon · assets visuales y procedencia

Documento de la portada pública (`src/components/landing/home/**`). No sustituye la auditoría ni los
planes de migración de `docs/relanzamiento/`.

## Estado honesto de los assets

| Qué | Estado |
|---|---|
| Imágenes maestras (3 + 1 variante del hero) | **Generadas** con Magnific (Seedream 5 Pro) y guardadas en la cuenta de Magnific de Alexander. |
| Descarga al repo | **Pendiente.** El contenedor de la sesión bloquea por política de red el host del CDN de Magnific (`pikaso.cdnpk.net`, respuesta 403 al CONNECT); los demás hosts de Magnific no resuelven. Las imágenes **no se vieron** desde la sesión. |
| Revisión visual (manos, cámaras, anatomía, recortes) | **Pendiente**, depende de la descarga. Regenerar solo si un defecto afecta al uso final. |
| Exportación AVIF/WebP en `public/home/` | **Pendiente**: el script está listo (`scripts/optimize-home-images.mjs`). Mientras no existan los archivos, cada slot muestra su fondo degradado de marca (sin saltos de layout, sin imagen rota). |

Las fotografías son **ilustrativas** (generadas con IA): no son miembros, testimonios ni casos de éxito, y la
página lo rotula («Imagen ilustrativa», «Vista ilustrativa»). No hay nombres de personas ficticias.

## Cómo cerrar el pendiente (una de dos vías)

1. **Permitir el host** `pikaso.cdnpk.net` en *Network access* del entorno de la sesión y pedir que se descarguen y
   optimicen; o
2. **Descargar a mano** las 3 imágenes elegidas desde los enlaces de Magnific de abajo, dejarlas con estos nombres en una
   carpeta local (fuera del repo; pesan varios MB) y correr:

```bash
node scripts/optimize-home-images.mjs <carpeta-origen>   # hero.png, comunidad.png, detalle.png
```

El script exporta a `public/home/` y baja la calidad por pasos hasta entrar en el presupuesto de cada variante;
avisa de las que no caben. Después se versiona solo `public/home/*.{avif,webp}`.

## Manifiesto

Modelo: Seedream 5 Pro (Magnific), resolución 2k, 100 créditos por imagen (400 créditos en total, 4 generaciones).
Paleta común: marfil `#FAF8F5`, lavanda `#EEE8FF`, coral `#FF8F7A`. Todos los prompts excluyen texto, logos,
marcas de agua, interfaces y métricas falsas.

| Asset | Objetivo | Proporción | Espacio negativo | Ubicación | Archivo de salida | Enlace |
|---|---|---|---|---|---|---|
| **A · Hero** (variante 1, semilla 420014) | Identidad cálida: creador adulto en su estudio | 3:4 (1728×2304) | Izquierda y arriba | Hero, columna derecha (LCP, sin lazy) | `hero-{480,720,960}.{avif,webp}` | https://www.magnific.com/app/creation/5j6aR4SKxe |
| **A · Hero** (variante 2, semilla 114710) | Alternativa del hero | 3:4 | Igual | — (descartar la que no se use) | — | https://www.magnific.com/app/creation/ks3C2Ny16B |
| **B · Comunidad** (semilla 588375) | Colaboración entre adultos, sin pose corporativa | 16:9 (2560×1440) | Aire alrededor del grupo | Franja de comunidad | `comunidad-{640,1024,1600}.{avif,webp}` | https://www.magnific.com/app/creation/LwGHY2YswO |
| **C · Detalle** (semilla 828125) | Naturaleza muerta de espacio de trabajo | 4:3 (2304×1728) | Generoso | Tarjeta de beneficios y cierre (recortes del mismo archivo) | `detalle-{480,800}.{avif,webp}` | https://www.magnific.com/app/creation/tCsMSLnmZJ |

### Prompts usados

Los tres son los prompts base A, B y C del encargo, sin cambios de contenido; solo se fijó la proporción
(3:4, 16:9 y 4:3) para encajar en los espacios reales.

- **A — Hero:** fotografía editorial cálida de una persona creadora adulta latinoamericana filmando un proyecto en un
  estudio luminoso en casa; expresión relajada, vestuario casual con acentos lavanda, entorno marfil, detalle coral,
  luz de ventana, equipo real, sujeto hacia la derecha con espacio limpio a izquierda y arriba. Sin texto, logos,
  marcas de agua, interfaz ni métricas falsas.
- **B — Comunidad:** fotografía editorial espontánea de tres creadores adultos colaborando alrededor de una cámara y un
  guion gráfico; apariencias naturales y variadas, luz de día cálida, marfil y madera clara, acentos lavanda y coral
  contenidos; composición amplia con aire. Sin texto, logos, marcas de agua ni interfaz.
- **C — Detalle:** naturaleza muerta editorial de un espacio de trabajo: cámara compacta, auriculares, cuaderno en
  blanco y un pequeño objeto cerámico lavanda sobre escritorio marfil; luz suave, acento coral, espacio negativo
  generoso. Sin escritura legible, logos ni marcas de agua.

Herramienta real usada: `images_generate` de la integración de Magnific (modelo `seedream-5-pro`). No se usó
ninguna otra herramienta para generar imágenes y no hay claves API en el frontend: son assets preparados en
desarrollo.

## Presupuesto de peso y carga

| Variante | Tope por archivo |
|---|---|
| Hero 480 / 720–960 px | 150 KB / 250 KB |
| Comunidad 640 / 1024 / 1600 px | 110 / 180 / 260 KB |
| Detalle 480 / 800 px | 80 / 140 KB |

- La imagen LCP (hero) lleva `fetchpriority="high"` y **no** lleva lazy loading; el resto, `loading="lazy"` y
  `decoding="async"`. No se precarga ninguna otra imagen.
- Todas llevan `srcset`/`sizes` y `width`/`height` explícitos (sin saltos de layout).
- La flotación de tarjetas es solo CSS y se desactiva con `prefers-reduced-motion`; no hay Three.js, librerías de
  animación nuevas, `will-change` global ni blur grande.
- Se excluyó la pantalla de carga («splash» de 2 s) de la ruta `/`: retrasaba el CTA y el LCP.

## Mediciones

Las metas (LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms) son **objetivos, no resultados**: se miden en el preview de
Vercel con las fotos ya publicadas (Lighthouse es laboratorio; no certifica INP ni métricas de campo). Ver
`docs/relanzamiento/05-PENDIENTES-Y-RIESGOS.md` para lo demás.
