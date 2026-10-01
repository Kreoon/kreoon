# QA de plantillas de portafolio · 2026-10-01

Plantillas: `estudio-ugc.html`, `cine.html`, `editorial.html` (carpeta `docs/hermes/enlace-profesional/`), con el motor compartido `portafolio-muestra.js` y `portafolio-muestra.css`.

**Alcance:** son **pruebas del prototipo**. Usan pósters SVG generados y un clip de video sintético de 2,4 s grabado en el navegador. No demuestran rendimiento multimedia real (Bunny, HLS, peso de los archivos, CDN), ni permisos del backend, ni la regla de contacto aplicada en servidor. Eso queda en «Pruebas de la plataforma integrada», más abajo.

Entorno: Chromium del panel de navegador de Claude con emulación de 390×844, 768×1024 y 1440×900, y Chrome headless para las capturas. **No se usaron dispositivos reales.** Servidor estático local (`python -m http.server`, configuración `prototipos-hermes` en `.claude/launch.json`). No se tocó producción ni ningún perfil real.

## Cómo reproducir

- Arranca el servidor estático y abre `estudio-ugc.html?n=20`, `cine.html?n=100&tema=oscuro&acento=ambar` o `editorial.html?n=4`.
- La barra oscura superior es del prototipo, no del portafolio. Permite elegir:
  - cantidad de piezas: 1, 4, 6, 20, 30 o 100;
  - vista de visitante o de editor;
  - en Cine, tema y acento.
- Las rutas internas son `#/c/<colección>`, `#/archivo` y `#/colecciones`.

## Resultados (prototipo)

| # | Comprobación | Resultado | Cómo se midió |
|---|---|---|---|
| 1 | Sin redes, contacto ni enlaces externos visibles o accesibles | ✅ | Script en las 3 plantillas × 1/4/20/100 piezas × 390/768/1440 px. Resultado: 0 enlaces externos y 0 `href="#"` muertos (todas las anclas internas existen). La búsqueda de instagram/tiktok/youtube/whatsapp/correo/teléfono/contacto en el texto público da 0. Hubo un falso positivo («verse en el teléfono», en Cine) y se reescribió. |
| 2 | Compartir el enlace interno del portafolio | ✅ | Usa Web Share si existe. Si no, copia al portapapeles. Si tampoco se puede, muestra un campo seleccionable con la URL. El enlace es de muestra (`kreoon.com/p/…-muestra`). |
| 3 | Todos los botones tienen acción real | ✅ | 0 botones sin nombre accesible. Se eliminó el ▶ decorativo de Cine: «Reproducir» abre el visor. Las flechas del carrusel se ocultan si no hay desplazamiento. «Ver más» se oculta al llegar al final. |
| 4 | Videos verticales con su proporción | ✅ | El `<video>` del visor lleva `aspect-ratio` = ancho/alto de la pieza (`1080 / 1920`). El clip sintético mide 360×640. Los horizontales usan 640×360. |
| 5 | Fotos sin deformar y visibles completas | ✅ | En las tarjetas, `object-fit:contain` sobre fondo neutro. `cover` solo cuando el creador eligió un punto de enfoque (0 casos de `cover` sin foco). En el visor, la proporción natural coincide con la mostrada. El botón «Ampliar» muestra la imagen a tamaño natural y con scroll. |
| 6 | Funciona con 1, 4, 6, 20, 30 y 100 piezas | ✅ | **1 y 4:** una fila estática «Mis trabajos», sin flechas. **5 a 8:** un solo carrusel (sin repetir piezas por colección). **20 y 100:** destacados, 3 colecciones, «Ver todas las colecciones (5)» y «Ver todo el archivo». Con 100 piezas la portada monta 32–38 imágenes, no 100. |
| 7 | Filtros y «Ver más» | ✅ | Archivo de 100: Todo (100) / Videos (68) / Fotos (32). Los contadores salen del contenido real. Los filtros solo aparecen si aportan valor: la colección UGC, que solo tiene videos, no los muestra. «Ver más» carga tandas de 12 y lleva el foco a la primera pieza nueva. |
| 8 | El visor conserva la posición, admite teclado y pausa videos | ✅ | ← → navegan, Esc y ✕ cierran, el foco entra en «Cerrar visor». Al cerrar, `scrollY` no cambia (Δ=0) y el carrusel conserva su `scrollLeft`. El foco vuelve a la tarjeta de origen, o a la última vista si está en pantalla. El video se pausa y se descarga (`src` vacío) al cambiar de pieza y al cerrar. Nunca hay más de un `<video>`. Sin autoplay. Al volver de «Ver todo», el foco regresa a su botón de origen. Al reentrar en una colección, se recuperan su filtro y su posición. |
| 9 | Sin desbordamiento horizontal a 390, 768 y 1440 px | ✅ | `scrollWidth − clientWidth = 0` en las 3 plantillas y anchos. También se revisó a 320 px con 4 piezas (captura). |
| 10 | Dimensiones reservadas, carga diferida y video bajo demanda | ✅ con matiz | 0 imágenes sin `width`/`height`. Las tarjetas usan `loading="lazy"`. El retrato de portada usa `fetchpriority="high"`. Hay 0 `<video>` en el DOM hasta abrir una pieza de video. **Matiz:** los pósters son data-URI, así que la carga diferida no ahorra red en el prototipo. |
| 11 | Contraste medido (WCAG, luminancia relativa) | ✅ texto · ⚠ bordes | Ver la tabla siguiente. |
| 12 | Sin controles del editor en la vista pública | ✅ | 0 elementos `.ed-*` dentro de `#publico`. Las flechas de orden y el selector de foco viven en un panel separado que solo existe en la vista «Editor» (`hidden`, vaciado al salir). |

### Contraste medido

| Par | Valor |
|---|---|
| Texto / fondo, claro | 14,74 |
| Texto / fondo, oscuro | 17,0 |
| Texto secundario / fondo, claro | 8,48 |
| Texto secundario / fondo, oscuro | 10,59 |
| Texto secundario / superficie, oscuro | 9,52 |
| Texto secundario / superficie secundaria, oscuro | 8,38 |
| Botón principal, ámbar oscuro | 10,75 |
| Botón principal, ámbar claro | 6,33 |
| Botón principal, Kreoon claro | 5,15 |
| Botón principal, Kreoon oscuro | 7,36 |
| Botón principal, terracota UGC | 5,18 |
| Botón principal, verde Editorial | 7,85 |
| Firma morada en claro | 4,86 |
| Foco morado en claro | 4,86 |
| Insignia sobre póster claro | 11,8 |

**Pendiente (no es texto):**
- Las líneas separadoras miden 1,22–1,32 en claro y 2,65 en oscuro, tras subir `--ln` a #5A5280.
- La diferencia superficie / fondo en oscuro es de 1,11.
- Sirven para separar, pero no llegan a 3:1. Los controles se identifican por su texto o icono, así que no dependen solo del borde.
- Si se quiere cumplir 1.4.11 en los contornos de `btn-s`, `gf-flecha` y `gf-seg`, hay que oscurecer esos bordes.

**No se declara cumplimiento AA completo:** falta auditar con lector de pantalla y en dispositivos reales.

## Capturas

Están en `docs/hermes/qa/capturas-portafolios/`.

**Escritorio, 1440 px:**
- `ugc-escritorio-20.png`
- `ugc-escritorio-verTodo-100.png`
- `ugc-editor-escritorio.png` (vista del editor, separada)
- `cine-escritorio-oscuro-100.png`
- `cine-escritorio-claro-20.png`
- `editorial-escritorio-20.png`

**Tablet, 768 px:**
- `editorial-tablet-100.png`

**Móvil, 390 px:**
- `ugc-movil-20.png`
- `ugc-movil-1.png`
- `ugc-movil-colecciones-100.png`
- `cine-movil-oscuro-100.png`
- `cine-movil-claro-verTodo.png`
- `editorial-movil-100.png`

**Móvil, 320 px:**
- `ugc-movil-320-4.png`

Las capturas de escritorio de Cine se repitieron después del último ajuste de la portada.

## Hallazgos pendientes

1. **Contraste de bordes por debajo de 3:1** (ver arriba). Es una decisión de diseño: subirlo endurece la estética.
2. **Clip sintético.** Si el navegador no puede grabar el `<canvas>`, el visor lo dice y no finge reproducción. En el panel oculto sí funcionó (requestFrame).
3. **Miniatura dañada a propósito.** p12 y el proyecto 5 de Cine muestran «Miniatura no disponible. La pieza se puede abrir igualmente.» En el visor, la foto rota muestra «No se pudo cargar esta pieza».
4. **Gesto horizontal.** Se usa el desplazamiento nativo con `overscroll-behavior-x: contain` y `scroll-snap`, sin JS de arrastre. Hay que validarlo en iOS Safari y Android real para confirmar que no interfiere con el scroll vertical.
5. **Flechas en móvil.** Se quedaron visibles como alternativa al gesto. Si se ven pesadas, pueden ocultarse en `pointer:coarse`, pero el tablero de navegación dejaría de ser solo táctil.
6. **Sobre el póster del reel de Cine**, la píldora «Reproducir» tapa la marca «MUESTRA» del SVG. Es solo estético y no pasa con portadas reales.

## Pruebas de la plataforma integrada (pendientes, no cubiertas aquí)

- **Respuesta pública sin redes ni contacto, filtrada en servidor.** Hoy `PUBLIC_CREATOR_PROFILE_COLUMNS` incluye `social_links` y existe el bloque `social_links`. Ver `enlace-profesional/restriccion-contacto.md`.
- **Validación en servidor de biografías y títulos:** URLs, correos, teléfonos y @usuario.
- **Medios reales:**
  - pósters de Bunny con `srcset`;
  - HLS bajo demanda;
  - peso por tarjeta;
  - LCP/CLS en 4G real.
- **Paginación del archivo en servidor.** No conviene traer 100 ítems para mostrar 12.
- **Permisos (RLS):** que solo lo publicado aparezca en la vista pública y que los borradores no se filtren.
- **Dispositivos reales:** iOS Safari y Android Chrome.

## Archivos modificados en esta tarea

- `docs/hermes/enlace-profesional/estudio-ugc.html`: reescrito.
- `docs/hermes/enlace-profesional/cine.html`: reescrito.
- `docs/hermes/enlace-profesional/editorial.html`: reescrito con la galería compartida y sin contacto.
- `docs/hermes/enlace-profesional/portafolio-muestra.js` (nuevo): datos de muestra, galería, visor, compartir y panel del editor.
- `docs/hermes/enlace-profesional/portafolio-muestra.css` (nuevo).
- `docs/hermes/enlace-profesional/restriccion-contacto.md` (nuevo).
- `docs/hermes/enlace-profesional/propuesta.md`: nota de actualización al inicio.
- `docs/hermes/qa/qa-portafolios-2026-10-01.md` y `docs/hermes/qa/capturas-portafolios/` (nuevos).
- `.claude/launch.json`: servidor estático `prototipos-hermes`.
- `ARCHITECTURE_LEDGER.md`: una línea en UPDATES.
