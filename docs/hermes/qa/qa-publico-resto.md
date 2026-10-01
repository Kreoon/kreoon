# QA público v3 — marketplace, portafolios, academia, precios, 404 (Kreoon)

Sitio: https://kreoon-git-claude-focused-mendel-es4xcv-kreoon-s-projects.vercel.app/
Fecha: 2026-10-01. Navegador real (Chrome por CDP), 3 anchos: móvil 390, tablet 768, escritorio 1440 (también 1024/1280 donde se indica). Cookies: «Solo esenciales». No se creó cuenta, no se inició sesión, no se envió ningún formulario, no se compró nada.
Capturas: carpeta /opt/data/workspace/proyectos/kreoon-qa/ (se citan por nombre de archivo .png).
Referencia de marca (medida en `/`): fondo crema rgb(250,248,245), texto rgb(36,33,53), botones rgb(112,77,255) con radio 16–24 px, tarjetas blancas radio 24 px con borde rgb(229,224,235) y sombra suave, tipografías Outfit (títulos) + Manrope (texto). Capturas: home-ref-desktop.png, home-ref-tablet.png, home-ref-movil.png.

## Cómo leer la tabla
Columnas: ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura.
«[POR CONFIRMAR]» = indicio sin verificar del todo. Los contrastes marcados «píxel» se midieron sobre la captura real; los marcados «auto» salen de estilos calculados (texto vs. fondo sólido) y pueden fallar si hay una foto debajo.

## Mapa de rutas descubiertas
Fuentes: enlaces de las páginas, tabla de rutas del bundle JS (assets/index-*.js), robots.txt, sitemap.
- Públicas que cargan contenido: /marketplace, /marketplace/creator/:slug, /p/:slug, /portafolio, /blog (“Próximamente”), /pricing/creators, /calculadora-ugc, /academia, /academia/explorar, /a/:space, /academia/:space (gate), /cert/:code, /terms, /privacy, /legal/{terms,privacy,acceptable-use,dmca,cookies}, /mcp-docs, /subscription/success.
- Redirigen a /auth (login) sin avisar: /planes, /creators, /clientes, /clients, /talent, /demo, /marketing, /marketplace/content, /marketplace/videos, /academia/crear. /unete → /.
- Rotas: /casos-de-exito (404, enlazada en el pie de /portafolio y /blog), /#pricing (ancla inexistente, enlazada en el pie), /pricing y /precios (404), /@malejagiraldo (404 aunque existe la ruta /@:username).
- /robots.txt existe (permite todo, sin línea Sitemap). /sitemap.xml devuelve HTTP 200 con el HTML de la app (no es XML): no hay sitemap.
- Checkout de academia: NO se pudo alcanzar sin cuenta; «Empezar desde $15» y «Empezar ahora» llevan a un muro «Crear cuenta para entrar». Detalle de curso (/academia/:space/:curso) no es alcanzable desde enlaces públicos (no hay cursos listados).
- Selector de tema claro/oscuro: no se encontró en ninguna página pública (el perfil de creador es oscuro por defecto, ver más abajo).
- Consola/red: sin errores JS capturados en ninguna página. Peticiones fallidas: ver /registro (404) y /academia/:space (≈20 respuestas 401).

---

## 1. /marketplace (listado público)

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /marketplace | escritorio 1440 y ≥1024 | alta | bug | Los filtros avanzados (ordenar, disponibilidad, nivel, precio, canje, calificación) no existen en pantallas ≥1024 px: los 3 botones «Filtros» tienen `display:none` (clase `lg:hidden`) y no hay barra lateral. Solo se ven los chips de categoría. En 768 y 390 sí aparece el panel. | Abrir /marketplace en 1440 → buscar «Filtros»: no hay. Repetir en 1024 y 1280: igual. Repetir en 768: aparece. | Mostrar un botón «Filtros» (o una barra lateral fija) también en ≥1024 px; si la intención es sidebar, implementarla. | marketplace-desktop-chequeo-filtros.png, marketplace-filtros-768.png |
| /marketplace | todos | alta | bug | El chip «Moda» devuelve 4 resultados y los 3 primeros no son creadores de «Moda & Estilo» (p. ej. salen «Yuli Andrea tabares», «Laura katherine…»), mientras que Alejandra Giraldo, Valentina Giraldo y David Ortiz (todos «Moda & Estilo», visibles sin filtro) no aparecen. El mismo creador (Yuli Andrea tabares, categoría «ugc») sale en Tech, Educación, Finanzas, Belleza y Moda: el filtro parece coincidir por texto suelto, no por categoría. | Clic en «Moda»; comparar con la lista sin filtro. Repetir con Tech/Educación/Finanzas. | Filtrar por el campo de categoría normalizado (mapear «Moda & Estilo» → Moda) y no por coincidencia de texto libre. | marketplace-filtro-moda.png |
| /marketplace | todos | media | UX | El mismo creador se repite hasta 3 veces en la misma página (Alejandra Giraldo y Valentina Giraldo salen en «Top Performers», «Talento Destacado» y «Explora Talento»). «Top Performers» no está ordenado por puntaje (83, 84.5, 74.5, 80, 81…). | Ver /marketplace sin filtros y leer los puntajes. | Deduplicar entre carruseles; ordenar «Top» por puntaje descendente o quitar el título «Top». | marketplace-desktop.png |
| /marketplace | todos | alta | contraste | Los chips de precio («$50», «$80») son texto blanco sobre fondo lila rgb(242,238,246): 1,15:1 (píxel). «Canje» verde claro rgb(74,222,128): 1,64:1 sobre crema (auto) [POR CONFIRMAR si va sobre foto]. | Scroll a la primera fila de tarjetas y mirar el precio. | Chip de precio con fondo morado #6D4AFF y texto blanco (≥4,5:1), o texto #242135 sobre el lila. | marketplace-tarjetas-contraste.png |
| /marketplace | todos | media | copy / dato | Precios con formatos incoherentes: «$50USD», «$200,000COP», «$200COP», «$0COP», «$50» (sin moneda en el listado filtrado). Un precio de 200 COP y otro de 0 COP no son plausibles. Ciudad «Wheelwright» para Daniela Ceballos (Beauty). | Leer las tarjetas. | Formato único «USD 50» / «COP 200.000»; ocultar el precio si es 0; validar ciudades. | marketplace-desktop.png |
| /marketplace | escritorio | media | UX | Botón «Favorito» (corazón) sin sesión no hace nada visible: no abre login, no muestra aviso, no cambia de estado. | Clic en el corazón de cualquier tarjeta. | Abrir el modal de login o un aviso «Inicia sesión para guardar». | marketplace-favorito-anon.png |
| /marketplace | todos | media | UX | Estado vacío («No hay resultados para "zzzzqqq". Intenta con otros terminos.») sin botón de acción ni «Limpiar búsqueda»; la palabra «terminos» sin tilde. | Escribir «zzzzqqq» en «¿Qué buscas?». | Añadir botón «Limpiar filtros» y sugerir categorías; corregir «términos». | marketplace-busqueda-vacia.png |
| /marketplace | tablet 768 | alta | UI | La cabecera mide 870 px dentro de 760: el botón «Crear cuenta de creador» queda cortado (borde derecho a 870 px) y el menú hamburguesa aún no aparece (tiene ancho 0). | Abrir a 768 px y mirar la esquina superior derecha. | Pasar al menú hamburguesa hasta 1023 px o reducir los enlaces. | marketplace-header-tablet-768.png |
| /marketplace | todos | media | branding | Cabecera oscura rgba(10,10,15,.95) sobre página crema; en /portafolio y /blog la misma cabecera es clara. Botón de búsqueda de 40×40 px con radio 2 px; botones «Filtros» con radio 14 px, chips con radio 2 px: no siguen los radios 16–24 px de la home. | Comparar con home-ref-desktop.png. | Un solo componente de cabecera (clara, como `/`) y radios 16–24 px. | marketplace-desktop.png vs home-ref-desktop.png |
| /marketplace | móvil 390 / tablet | media | UX (táctil) | 57–76 elementos con altura <44 px: «Favorito» 32×32, flechas de carrusel 32×32, enlaces de navegación de 20 px de alto, buscador 40×40, botones de cookies 36–40 px. | Medir con la auditoría de tamaños. | Mínimo 44×44 px en móvil (padding o `min-h-11`). | marketplace-movil.png |
| /marketplace | todos | baja | UX/SEO | La página no tiene `<h1>`. Chips de categoría (Educación 59 px de ancho): textos largos casi sin margen. | Revisar el DOM. | Añadir h1 visible u oculto «Marketplace de creadores UGC». | — |
| /marketplace | móvil | baja | OK | Menú móvil abre y lista Inicio/Para Creadores/Portafolio/Blog/Marketplace/Iniciar sesión/Crear cuenta. Sin scroll horizontal en 390 y 768; los carruseles se desplazan a propósito. | Menú «Abrir menú». | — | marketplace-menu-movil.png |

## 2. Perfil público de creador: /marketplace/creator/:slug y /p/:slug

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /marketplace/creator/malejagiraldo | todos | alta | branding | La página es OSCURA (fondo rgb(23,21,35), tarjetas moradas oscuras, título rgb(242,240,250)) mientras la home es crema; la cabecera, en cambio, es crema → mezcla de dos temas en una misma pantalla. Aparece una tercera tipografía (Inter). | Abrir un perfil desde cualquier tarjeta. | Aplicar la paleta crema/morado de `/` y quitar Inter. | perfil-creador-desktop.png vs home-ref-desktop.png |
| /marketplace/creator/malejagiraldo | escritorio/tablet | alta | contraste | El botón «Contratar» del paquete Básico es invisible: fondo blanco, texto blanco (≈1,04:1, píxel). El del paquete Estándar sí se lee (7,1:1). «Compartir» e «Iniciar sesion» gris rgb(161,161,170) sobre crema 2,42:1 (auto). «Creado con Kreoon» gris 3,7:1 sobre fondo oscuro. | Bajar a «Paquetes». | Botón primario #6D4AFF con texto blanco; texto de cabecera #242135. Causa probable: clases de color no generadas en el CSS (mismo patrón que en /pricing/creators). | perfil-contratar-boton.png |
| /marketplace/creator/malejagiraldo | todos | media | bug | Datos distintos según cómo se llega: entrando desde el listado mostró «0 Proyectos / Rating – / Nuevo en plataforma»; con recarga directa mostró «6 Proyectos / 7 meses en plataforma». | Clic en la primera tarjeta del listado y leer las cifras; recargar con F5 y comparar. | Esperar los datos antes de pintar y no mostrar ceros por defecto. | perfil-creador-desktop.png |
| /marketplace/creator/malejagiraldo | todos | media | UX | Las secciones «Portfolio» y «Servicios» aparecen vacías, sin mensaje ni acción, aunque la cabecera dice «6 Proyectos». En /p/malejagiraldo solo dice «Este perfil no tiene contenido publicado aun» con botones «Contratar/Compartir». Estadísticas «0 Clientes», «0 (sin conectar) Seguidores» ensucian el perfil. | Bajar por el perfil; abrir /p/malejagiraldo. | Ocultar secciones vacías o mostrar estado vacío con acción; ocultar métricas en 0. | perfil-portfolio-item.png |
| /marketplace/creator/malejagiraldo | todos | media | copy | Faltan tildes y signos: «Basico», «Estandar», «dias», «revision», «Resenas», «Sin resenas aun», «Iniciar sesion», «Cual es tu tiempo de entrega?», «Aceptas intercambio…?», «Como es tu proceso…?» (sin ¿). Texto «Las reseñas son dejadas por clientes… que han trabajado contigo» habla al creador, no al visitante. | Leer la página. | Corregir ortografía y reescribir en tercera persona («…que han trabajado con este creador»). | perfil-faq.png |
| /marketplace/creator/malejagiraldo | escritorio | baja | UX | «Compartir» no muestra aviso ni menú visible tras el clic [POR CONFIRMAR: puede copiar al portapapeles en silencio]. «Volver» 36×36 px. | Clic en «Compartir». | Toast «Enlace copiado». | perfil-compartir.png |
| /marketplace/creator/malejagiraldo | móvil 390 | media | UX (táctil) | Botones de 28×28 y 54×36 px en la cabecera/tarjetas; carrusel «Talento similar» sin scroll de página horizontal (bien). | Auditar a 390 px. | ≥44 px. | perfil-creador-movil.png |
| /marketplace/creator/no-existe-xyz | escritorio | baja | OK | Muestra «Perfil no disponible» (estado correcto). Con /marketplace/org/no-existe → «Organización no encontrada», /company/no-existe → «Empresa no encontrada». | Abrir esas rutas. | — | — |
| /org/no-existe | escritorio | media | UX | Redirige a /registro/no-existe y muestra «No pudimos cargar la inscripción… problema de conexión» en vez de «Organización no encontrada». | Abrir /org/no-existe. | Mensaje de organización inexistente. | registro-error.png |

## 3. /portafolio (portafolio público de contenido aprobado)

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /portafolio | todos | alta | rendimiento | La página monta 12 iframes de vídeo (Bunny Stream) con `autoplay=true&loop=true&muted=true&preload=true` y carga eager; cada recurso tarda 2,5–3,2 s. En 3 ocasiones el navegador de pruebas dejó de responder (timeout >5 s) al cargar o interactuar con esta página (a 768/390 px y al pulsar los modos de vista); en 1440 cargó. | Abrir /portafolio y esperar 4 s; intentar interactuar. | `loading="lazy"`, carátula (poster) estática y reproducir solo al entrar en pantalla/al tocar; máximo 2 vídeos activos. | portafolio-desktop.png, portafolio-tablet.png (no hay captura móvil: la página se colgó) |
| /portafolio | todos | alta | contraste / bug | En la cabecera, «KREOON» y el ítem activo «Portafolio» e «Iniciar sesión» son blancos sobre crema (1,06:1, píxel); «Inicio/Para Creadores/Blog/Marketplace» gris rgb(161,161,170) 2,42:1. El logo es prácticamente invisible. Igual en /blog. | Abrir /portafolio o /blog y mirar la cabecera. | Cabecera clara con texto #242135 y activo en #6D4AFF. | portafolio-viewport-header.png |
| /portafolio | todos | media | UX | Arriba de la cabecera hay texto suelto «COSMOS / GALAXY / GRID / NETWORK» (modos de vista) que no se pudo probar porque la página se colgó [POR CONFIRMAR si son botones o texto olvidado]. Las tarjetas muestran solo nombres, sin título de proyecto ni marca; «C / Creador» como placeholder. | Mirar la parte superior. | Si son modos de vista, etiquetarlos «Cuadrícula/Galaxia…» y que tengan estado activo; si no, quitarlos. | portafolio-viewport-header.png |
| /portafolio (pie) | todos | media | bug | El pie enlaza «Casos de éxito» → /casos-de-exito (404) y «Precios» → /#pricing (la ancla no existe en la home). | Clic en esos enlaces del pie (también en /blog). | Crear la página o quitar el enlace; apuntar «Precios» a /pricing/creators. | 404-desktop.png |
| /portafolio | todos | baja | branding | Botones con degradado y violeta rgb(90,56,224) distinto del #6D4AFF/#704DFF de la home; tarjetas con radio 20 px (home 24 px). | Comparar. | Unificar tokens de color y radio. | portafolio-desktop.png |

## 4. /blog

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /blog | todos | media | UX | Página «Próximamente / Muy pronto» sin contenido; el botón «Únete y sé el primero en saber» lleva a /registro (que falla) en vez de capturar un correo; no hay campo de suscripción. | Clic en el botón. | O ocultar «Blog» del menú hasta tener artículos, o añadir un campo de correo. | blog-login-modal.png (modal de login de la cabecera: abre bien) |
| /blog | todos | alta | contraste | Misma cabecera invisible que /portafolio (16 elementos <4,5:1 según auditoría). | Ver /portafolio. | Ver arriba. | — |

## 5. /pricing/creators (planes y precios)

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /pricing/creators | todos | crítica | bug / contraste | El botón «Upgrade a Pro» (plan intermedio, «Más popular») es invisible: texto blanco sobre fondo transparente en tarjeta blanca (píxel: toda el área es rgb(255,255,255), 1,0:1). La clase `bg-violet-600` no existe en el CSS compilado. | Bajar a las tarjetas de plan en cualquier ancho. | Usar el estilo de botón primario de marca (#6D4AFF, texto blanco) en los 3 planes. | precios-botones-evidencia.png, precios-tarjetas-boton-invisible.png |
| /pricing/creators | todos | alta | fórmula / copy | El interruptor dice «Anual −20%», pero la pregunta frecuente «¿El descuento anual aplica desde el primer mes?» dice «pagas 12 meses por adelantado con un 30% de descuento». Cuentas: Pro 24→19 /mes ($228/año): 228 vs 24×12=288 → −20,8% (con 20% exacto sería 230,40; se redondea a 19×12). Premium 49→39 ($468/año): 468 vs 588 → −20,4%. El 30% del FAQ no coincide con nada. | Activar el interruptor «Anual» y abrir la 3.ª pregunta del FAQ. | Dejar un solo porcentaje (20%) y mostrar el ahorro en $ («Ahorras $60/año» Pro, $120/año Premium). | precios-anual-desktop.png |
| /pricing/creators | todos | alta | fórmula / copy | Las tarjetas contradicen la tabla comparativa. Free: la tarjeta dice «Sin branding Kreoon», «Contacto visible» y «Redes sociales visibles», pero la tabla marca «Powered by Kreoon» ✔ en Free, «Contacto visible: Oculto» y «Redes sociales visibles» ✗. Pro: la tarjeta lista «Badge Premium», la tabla dice que el «Badge Premium verificado» es solo de Premium (Pro ✗). Premium y Pro muestran ambos «Preview 24h». | Comparar la tarjeta Free/Pro con la tabla «Comparación detallada». | Generar tarjetas y tabla desde la misma fuente de datos; corregir el texto de Free y Pro. | precios-desktop-1.png |
| /pricing/creators | todos | media | copy | «$» sin moneda (en LATAM puede entenderse COP); falta «USD». Faltan tildes: «Mas popular», «Comparacion detallada», «Terminos», «mas comunes», «credito». Textos en inglés: «Feature», «Free», «Preview», «Badge», «templates». | Leer la página. | Escribir «USD 24 / mes»; traducir y acentuar. | precios-desktop-1.png |
| /pricing/creators | todos | media | contraste | Texto ámbar rgb(251,191,36) sobre blanco/crema: «Planes para Creadores» 1,57:1, «CREATOR PREMIUM» 1,67:1, «Premium» 1,57:1; «−20%» verde rgb(52,211,153) 1,81:1 (auto). «Ir Premium» negro sobre naranja (7,7:1, legible). | Medir con la auditoría. | Ámbar oscuro #B45309 o morado de marca. | precios-anual-desktop.png |
| /pricing/creators | todos | media | branding | Tres estilos de botón distintos: «Empezar gratis» ámbar con texto negro (cabecera), «Ir Premium» y «Crear cuenta gratis» degradado ámbar→naranja con texto negro, «Upgrade a Pro» (invisible). Ninguno es el morado #6D4AFF de la home. | Comparar con home-ref-desktop.png. | Un solo botón primario morado; secundario con borde. | precios-desktop-1.png |
| /pricing/creators | móvil 390 | media | UX | La tabla comparativa tiene `min-width:600px`: en 390 hay que desplazarla de lado sin pista visual (la página no tiene scroll horizontal, la tabla sí por dentro). El interruptor mensual/anual mide 44×24 px. Botones CTA de 36 px de alto. | Bajar a «Comparación detallada» en 390 px. | Mostrar la comparación como tarjetas apiladas en móvil; interruptor ≥44 px. | precios-mensual-movil.png |
| /pricing/creators | todos | media | copy | Testimonios con métricas llamativas («+340% más contactos de marcas», «3 proyectos cerrados / mes») y personas (Valentina Torres @vale.ugc, Mateo Gómez, Daniela Ruiz) que no aparecen en el marketplace [POR CONFIRMAR si son reales]. | Bajar a «Creadores que ya escalaron». | Usar casos reales con permiso o quitar las cifras. | precios-desktop-1.png |
| /pricing/creators | todos | baja | OK | Interruptor mensual/anual funciona: Pro 24→19 («Facturado anualmente ($228 / año)»), Premium 49→39 ($468 / año), Free $0 igual. FAQ abre/cierra bien (6 preguntas). Sin errores de consola, sin scroll horizontal. | Clic en el interruptor y en cada pregunta. | — | precios-anual-tablet.png |
| /planes | todos | media | UX | /planes (nombre natural) redirige al login (/auth). /pricing y /precios → 404. | Abrir esas rutas. | Redirigir /planes, /pricing y /precios a /pricing/creators. | 404-desktop.png |

## 6. /calculadora-ugc

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /calculadora-ugc | todos | alta | fórmula | Las cuentas base cuadran (5 creadores × $150 = $750; comisión 40% = $300; total $1,050; Emergente 5×$50 → $350; Premium 5×$400 → $2,800; Evento 5×$800 → $5,600). Pero «Plataformas» (Instagram/TikTok/YouTube/X) y «Duración» (7/14/21/30 días) no cambian el precio: Premium con 30 días y TikTok sigue en $2,800. Solo cambian el tipo de contenido (Unboxing +$50 sobre $400) y el nivel. | Elegir Premium → 30 días → añadir TikTok y mirar el total. | Hacer que afecten el cálculo o quitarlos. Explicar la comisión del 40%. | calculadora-desktop.png |
| /calculadora-ugc | todos | media | copy | «¿Cuanto cuesta una campana UGC?» — «campana» significa «bell»; debe ser «campaña». Sin tildes: «Resena», «Duracion», «Comision», «dias», «cotizacion». Falta «¿». | Leer el título. | Corregir. | calculadora-desktop.png |
| /calculadora-ugc | todos | media | contraste | Lila claro rgb(216,180,254) sobre crema: «Calculadora de Precios», «Instagram», «14 dias» 1,67:1; total «$1,050» rgb(192,132,252) 2,49:1 (auto). | Medir. | Morado #6D4AFF o #242135. | calculadora-movil.png |
| /calculadora-ugc | móvil | baja | UX (táctil) | Selector de creadores (range) 16 px de alto; botones de plataforma 38 px. Campo de correo + «Enviar» (no enviado en la prueba). Botón «Buscar Creadores» morado rgb(147,51,234), no #6D4AFF. | Auditar a 390. | ≥44 px; unificar morado. | calculadora-movil.png |

## 7. Academia: /academia, /academia/explorar, /a/:space, /academia/:space

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /a/los-reyes-del-contenido | todos | alta | bug | La tarjeta «CLASES EN VIVO» muestra HTML sin interpretar: `<p><strong>🎙️ Lives de los Jueves .</strong><br>Cada Jueves…`. | Abrir la ruta y leer «Clases en vivo». | Renderizar el HTML sanitizado o guardar texto plano. | academia-a-reyes-desktop.png |
| /a/los-reyes-del-contenido, /academia/explorar, /academia/los-reyes-del-contenido | todos | alta | fórmula / copy | Tres mensajes de precio para la misma academia: «Empezar desde $15» (/a), «Desde $14.9» (explorar) y, en el muro, «PREMIUM» + «Es gratis. Solo te pediremos email y contraseña.» Además $14.9 sin segundo decimal. | Comparar las tres pantallas. | Una sola fuente de precio («USD 14,90»); aclarar que crear cuenta es gratis y la membresía cuesta. | academia-explorar-desktop.png, academia-gate-desktop.png |
| /academia/explorar | todos | media | bug | Los filtros de precio «Gratis», «Hasta $10» y «Hasta $25» siguen mostrando «Los Reyes del Contenido» («Desde $14.9»). Si es gratuita para entrar es contradictorio con el precio; si no, el filtro falla [POR CONFIRMAR cuál]. «Fitness» e «English» sí vacían la lista. | Clic en «Gratis». | Definir si hay plan gratuito y filtrar por precio mínimo real. | academia-explorar-vacio.png |
| /academia/explorar | todos | media | UX | Con una sola academia, hay 4 grupos de filtros (categoría ×10, idioma ×4, precio ×6, búsqueda): demasiado para un niño. Estado vacío («No encontramos academias con esos filtros») sin «Limpiar filtros». Chips de 26 px de alto. «¿Sos creador?» (voseo) mientras el resto de la web tutea. | Entrar y filtrar. | Ocultar filtros hasta tener >5 academias; botón «Limpiar filtros»; mismo tono (tú). | academia-explorar-movil.png |
| /academia/los-reyes-del-contenido | todos | alta | bug / contraste | El botón «Crear cuenta para entrar» es invisible (relleno crema = fondo, 1,0:1, píxel). El muro no ofrece «Ya tengo cuenta / Iniciar sesión». «PREMIUM» ámbar 1,6:1. | Abrir la ruta. | Botón morado de marca + enlace «Ya tengo cuenta». | academia-gate-boton.png |
| /academia/los-reyes-del-contenido | todos | alta | rendimiento / bug | ≈21 peticiones REST a Supabase responden 401 (academy_posts, academy_memberships, academy_space_points, academy_member_presence, academy_space_plugins, academy_space_profiles), cada una repetida 2–3 veces, solo por abrir el muro como visitante. | Abrir la ruta y revisar red. | No consultar tablas privadas si no hay sesión; deduplicar. | academia-gate-desktop.png |
| /academia/los-reyes-del-contenido | móvil 390 | media | UX | A un visitante sin sesión se le muestra la barra inferior de la app («Inicio», «Feed», «Más»), «Abrir KIRO» y un avatar «U» (32×32 px). | Abrir a 390 px. | Ocultar controles de usuario hasta iniciar sesión. | academia-gate-movil.png |
| /a/los-reyes-del-contenido | todos | media | contraste / branding | Botón degradado ámbar→morado con texto blanco (mejor caso ≈3,5:1, tramo ámbar ≈1,6:1). Párrafo de descripción rgb(212,212,216) sobre crema 1,39:1 (auto). «Empezar desde $15» y «Empezar ahora» llevan al mismo muro. Sin cabecera de marca. | Medir. | Botón #6D4AFF; texto #242135; cabecera como la home. | academia-a-reyes-boton.png |
| /academia | todos | media | UX | «Crea tu Academia» (visitante) manda al login sin explicación; el catálogo muestra una sola academia con cifras sueltas «2 / Hobby» sin etiqueta. No hay cabecera ni menú. | Clic en «Crea tu Academia». | Mensaje «Inicia sesión para crear tu academia»; etiquetas en cifras. | academia-desktop.png |
| /cert/ABC123, /a/no-existe | todos | baja | OK | «Certificado no encontrado… Volver a Academia» y «Academia no disponible… Explorar academias →»: estados vacíos correctos. | Abrir. | — | — |

## 8. 404, errores y páginas de servicio

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta | captura |
|---|---|---|---|---|---|---|---|
| /no-existe | todos | alta | contraste / bug | El título «Páginas que podrían interesarte», los chips «Inicio / Iniciar sesión / Dashboard / Explorar / Configuración» y el botón «Volver atrás» tienen texto blanco sobre fondo casi blanco (≈1,03–1,27:1, píxel): no se leen. «Ir al inicio»: blanco sobre morado claro ≈3,4:1. «Dashboard» y «Configuración» llevan a un login para el visitante. | Abrir /no-existe en 1440 o 390. | Texto #242135 en chips; botón primario #6D4AFF; solo enlaces públicos (Inicio, Marketplace, Planes). | 404-desktop.png, 404-movil.png |
| /no-existe (todas las rutas desconocidas) | — | media | bug / SEO | El servidor responde HTTP 200 con el index.html (soft 404). /sitemap.xml también responde 200 con HTML, no hay sitemap real. | `curl -s -o /dev/null -w "%{http_code}" URL/no-existe` → 200. | Configurar 404 real en Vercel o `noindex` en la página 404; generar sitemap.xml y añadir `Sitemap:` en robots.txt. | — |
| /templates | todos | alta | bug | Pantalla «Algo salio mal» que enseña el error técnico en inglés: «Cannot read properties of undefined (reading 'length')». Botones «Recargar pagina», «Reintentar», «Reportar problema» (sin tilde); textos secundarios gris 2,6:1. | Abrir /templates sin sesión. | Proteger la ruta o corregir el acceso a `.length`; no mostrar el mensaje técnico al usuario. | templates-error-desktop.png |
| /subscription/success | todos | media | bug / seguridad UX | Cualquiera puede abrir «Suscripción activada» sin haber pagado. Dice «Redirigiendo en 2 segundos…» pero tras 3 s sigue en la misma página. | Abrir la ruta sin sesión. | Validar sesión/pago; redirigir de verdad o quitar el contador. | subs-success-desktop.png |
| /registro (y todos los botones «Crear cuenta» de pricing, blog, marketplace, perfil, academia) | todos | crítica | bug | El registro público no carga: muestra «No pudimos cargar la inscripción — Hubo un problema de conexión» con «Reintentar». La petición `rpc/get_default_registration_org` de Supabase responde 404 (se hizo dos veces). Es el destino de toda la captación. | Clic en cualquier «Crear cuenta» o abrir /registro. | Crear/exponer la función `get_default_registration_org` (o fallback a la organización por defecto) y mostrar el formulario aunque falle. | registro-error.png |
| /mcp-docs | todos | baja | copy / UX | Página técnica en inglés y voseo («Hablale… como hablás»), v3.2.0 «Production Ready», 12 elementos de bajo contraste, accesible desde fuera de la app. | Abrir /mcp-docs. | Mantenerla fuera del menú público o traducirla y revisar contraste. | — |
| /legal/terms_of_service y /legal/cookies | todos | baja | contraste / copy | /legal/terms_of_service tiene 45 elementos <4,5:1 (auditoría automática, no revisados uno a uno). /legal/cookies solo trae 3 líneas genéricas (315 caracteres). Existen dos versiones de términos (/terms y /legal/terms). | Abrir ambas rutas. | Unificar legales y completar la política de cookies. | legal-cookies.png |

---

## Verificado y correcto (sin hallazgo)
- Sin scroll horizontal de página en ninguna ruta probada, a 390/768/1440.
- Fuentes Manrope/Outfit correctas en marketplace, pricing, academia, 404.
- Cookies: «Solo esenciales» guarda {essential:true, analytics:false, marketing:false, personalization:false} y el banner no vuelve.
- Menú móvil del marketplace, FAQ de precios y FAQ de perfil abren/cierran.
- Tiempos de carga (loadEvent) 130–360 ms en todas las páginas, salvo /portafolio por los vídeos.

## No se pudo probar
- Checkout/detalle de curso de la academia (no hay curso público alcanzable sin cuenta).
- Tema oscuro/claro conmutable (no hay selector público).
- Modos «COSMOS/GALAXY/GRID/NETWORK» de /portafolio (la página se colgó).
- Captura móvil final de /portafolio y envío del formulario de correo de la calculadora (por límites de la tarea).

---

## Top 10 priorizado
1. /registro no carga (RPC `get_default_registration_org` 404): bloquea todos los «Crear cuenta». Crítica.
2. «Upgrade a Pro» invisible en /pricing/creators (y mismo patrón: «Contratar» Básico en perfiles y «Crear cuenta para entrar» en el muro de academia). Revisar las clases de color que no llegan al CSS. Crítica/alta.
3. /portafolio: 12 vídeos en autoplay eager congelan la página; pasar a carga diferida con póster. Alta.
4. Cabecera ilegible en /portafolio y /blog (logo blanco sobre crema) y desbordada en tablet 768 (botón «Crear cuenta» cortado en /marketplace). Alta.
5. /marketplace: sin filtros avanzados en ≥1024 px y el filtro «Moda» devuelve creadores equivocados. Alta.
6. Precios incoherentes: «−20%» vs «30%» en el FAQ; tarjetas Free/Pro contradicen la tabla (branding, contacto, badge). Alta.
7. Academia: precio $15 / $14.9 / «Es gratis»; HTML crudo en «Clases en vivo»; ≈21 respuestas 401 al abrir el muro. Alta.
8. 404 con textos y botones invisibles + soft-404 (HTTP 200) + sin sitemap; /templates muestra un error técnico; /subscription/success abierto a cualquiera. Alta/media.
9. Branding: perfil de creador oscuro con tipografía extra, botones ámbar/naranja en pricing, morados distintos en calculadora/portafolio/academia; unificar con los tokens de `/` (#6D4AFF, crema, radios 16–24 px).
10. Copy: faltan tildes y «¿» en perfil, precios y calculadora («campana» en vez de «campaña»), mezcla de voseo y tuteo, chips de precio sin contraste y precios sin moneda («$», «$200COP»).
