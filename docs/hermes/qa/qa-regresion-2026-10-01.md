# QA de regresión Kreoon — correcciones del 1 de octubre de 2026

Sitio: https://kreoon-git-claude-focused-mendel-es4xcv-kreoon-s-projects.vercel.app/
Método: navegador real (Chrome por CDP) en 390 px (móvil), 768 px (tablet) y 1440 px (escritorio). Cookies: «Solo esenciales» / «Guardar preferencias» sin activar nada. No se creó cuenta, no se inició sesión, no se envió ningún formulario (solo se escribió `prueba@ejemplo.com` ficticio, sin pulsar enviar).
La preview ya servía la versión nueva a la primera (`/reset-password` respondió con el mensaje nuevo, no 404), así que no hizo falta esperar.
Capturas: carpeta `capturas-regresion/` (junto a este archivo). Se citan por nombre.
Limitación: no pude revisar capturas «a ojo» (el servicio de visión no tuvo crédito); la evidencia es DOM + estilos calculados + muestreo de píxeles de capturas. Las medidas de contraste de la cabecera son por píxeles (texto vs fondo real).

## Resumen de regresión (11 puntos)

| # | Punto | Resultado |
|---|-------|-----------|
| 1 | Login modal (título, correo, Google, enlaces) | OK (con 2 observaciones menores) |
| 2 | /registro y /registro/ugc-colombia | OK |
| 3 | /reset-password (con error y sin nada) | OK (con 1 observación) |
| 4 | Legales: /legal/privacy_policy, /legal/terms_of_service, /terms, /privacy, /data-deletion | OK en legibilidad y sin scroll horizontal; observaciones de coherencia |
| 5 | /legal/privacy-request | OK con reservas (ya no queda en blanco, pero tarda ~8 s y el título confunde) |
| 6 | /no-existe | OK |
| 7 | /pricing/creators | OK (botón visible y morado); faltan tildes |
| 8 | /portafolio | OK (miniaturas + play, sin autoplay, sin congelarse) |
| 9 | Cabecera pública en /portafolio, /blog, /marketplace | FALLA en /portafolio y /blog (contraste); OK en /marketplace; sin desborde en ninguna |
| 10 | /marketplace chip «Moda» | FALLA (sigue 4 resultados, los equivocados) |
| 11 | Cookies: analítica y marketing desmarcadas en «Personalizar» | OK (Personalización sí viene marcada) |

---

## 1. Login — modal «Iniciar sesión» en `/` — OK

Evidencia: r1-login-modal-desktop.png, r1-login-modal-tablet.png, r1-login-modal-movil.png, r1-login-modal-correo-ficticio-desktop.png.
- Título «Bienvenido de nuevo»: 15,63:1 (texto #242135 sobre blanco).
- Campo correo: se puede escribir (`prueba@ejemplo.com` se conserva, `type=email`, `autocomplete=email`).
- Botón Google: texto 14,81:1, borde morado; 332×48 px.
- Enlaces «¿Olvidaste tu contraseña?» y «Regístrate»: #704DFF sobre blanco = 5,01:1 (≥ 4,5).
- Subtítulos y etiquetas (#625E78): 6,19:1. Sin scroll horizontal en los 3 tamaños.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| / (modal login) | todos | baja | contraste | Pestaña activa «Iniciar sesión» (texto blanco) va sobre un degradado `#6D4AFF → #9A82FF`; en el extremo claro el contraste del blanco baja a 3,0:1 (en el centro ≈ 3,96:1). El botón principal de enviar usa el mismo degradado. | Abrir «Iniciar sesión», mirar la pestaña activa y el botón morado. | Usar morado sólido #6D4AFF (blanco = 5,15:1) como en la home, o acortar el degradado a `#6D4AFF → #7C5CFF`. |
| / (modal login) | todos | baja | UI / branding | Los botones del modal usan degradado y radio 12 px; en la home los botones son morado sólido y radio 20–24 px. | Comparar r1-login-modal-desktop.png con r0-home-referencia-desktop.png. | Mismo morado sólido y mismo radio que la home. |
| / (modal login) | todos | baja | UX / táctil | «Mostrar contraseña» 16×16 px, «Close» 16×16 px, enlaces de texto 20 px de alto. El cierre dice «Close» (inglés). | Abrir modal; inspeccionar. | Área táctil ≥ 44 px (padding) y aria-label «Cerrar». |

---

## 2. /registro y /registro/ugc-colombia — OK

Evidencia: r-registro-{movil,tablet,desktop}.png, r-registro_ugc-colombia-{movil,tablet,desktop}.png.
- Ambas rutas muestran el título «Únete a UGC Colombia como creador» (h1) y el formulario: Nombre, Correo, Contraseña («Mínimo 8 caracteres»), casilla de aceptación (mayor de edad + 5 documentos), «Continuar con Google», «Crear mi cuenta». No se pulsó enviar.
- Título de pestaña correcto: «Únete a UGC Colombia como creador | Kreoon». Sin scroll horizontal (390/768/1440).

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /registro, /registro/ugc-colombia | todos | media | UX / táctil | Casilla de aceptación 20×20 px y 5 enlaces legales de 17–19 px de alto, pegados entre sí; difícil de tocar en móvil. «Mostrar contraseña» 40×40. | Abrir en 390 px; intentar tocar «Declaración de Edad». | Casilla 24 px con etiqueta tocable de ≥ 44 px; enlaces en lista con separación vertical de 12 px. |
| /registro, /registro/ugc-colombia | todos | baja | UX (meta «hasta un niño») | La casilla obliga a leer 5 documentos con versión («v1.0», «(1.0)») con formato inconsistente. | Leer la casilla. | Un solo enlace «Documentos legales» o dos líneas; unificar «(v1.0)». |

---

## 3. /reset-password — OK

Evidencia: r-reset-password_error-access_denied_error_code-otp_expired-{movil,tablet,desktop}.png, r-reset-password-{movil,tablet,desktop}.png, r3-reset-password-desktop.png, r3-reset-password-correo-ficticio-movil.png.
- Con `#error=access_denied&error_code=otp_expired`: «Este enlace ya no es válido» + «El enlace venció o ya se usó. Los enlaces de recuperación duran poco por seguridad.» + campo «Tu correo» + «Enviarme un enlace nuevo» + «Volver a iniciar sesión».
- Sin nada: mismo título; texto «No pudimos verificar el enlace. Puede que esté incompleto, vencido o que ya se haya usado.»
- Se escribió correo ficticio y el botón se habilita (blanco sobre morado 4,65:1). No se pulsó.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /reset-password | todos | media | UI / contraste | Con el campo vacío el botón «Enviarme un enlace nuevo» está deshabilitado con opacidad 0,5: el texto blanco sobre degradado claro queda a 1,09:1, prácticamente invisible (parece un botón vacío). | Abrir /reset-password sin escribir nada; ver r3-reset-password-desktop.png. | Estado deshabilitado con fondo gris `#E5E0EB` y texto `#625E78` (≥ 4,5:1), o dejar el botón activo y validar al pulsar. |
| /reset-password | todos | baja | branding | Botón con degradado y radio 12 px (la home: sólido, radio 20–24 px). Campo de correo sin etiqueta visible (solo placeholder `tu@correo.com`). | Comparar con home. | Botón sólido de marca; añadir etiqueta «Correo» sobre el campo. |
| /reset-password | todos | baja | copy / SEO | El título de la pestaña es el de la home («🐴 Kreoon · Tu talento merece ser visto»). Lo mismo pasa en /terms, /privacy, /data-deletion, /legal/*, /no-existe. | Ver pestaña. | Título por página: «Recuperar acceso | Kreoon», etc. |

---

## 4. Legales — OK en legibilidad

Evidencia: r4-{legal_privacy_policy,legal_terms_of_service,terms,privacy,data-deletion}-{movil,tablet,desktop}.png.
- Las 5 rutas cargan en ~0,6 s, texto en Manrope sobre crema `#FAF8F5`, sin ningún texto bajo 4,5:1 (medición DOM en 390 px), sin peticiones 4xx/5xx, y **sin scroll horizontal en 390 px** (scrollWidth = 390).
- En 1440 px `scrollWidth` es 1432 (por la barra de scroll), sin desborde real.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /terms vs /legal/terms_of_service | todos | media | UX / coherencia | Hay dos versiones distintas de los términos: /terms es «Última actualización: 19 de febrero de 2026» (4.763 caracteres, tipo plantilla, «Kreoon … plataforma de gestión de operaciones creativas»); /legal/terms_of_service es v1.0 del 4–5 de marzo de 2026 con SICOMMER INT LLC (19.507 caracteres). Lo mismo con /privacy vs /legal/privacy_policy (4.763 vs 11.091 caracteres). El pie de la home enlaza a /legal/terms y /legal/privacy (otra variante más). | Abrir /terms y /legal/terms_of_service y comparar. | Una sola fuente de verdad: redirigir /terms → /legal/terms_of_service y /privacy → /legal/privacy_policy (301). |
| /legal/privacy_policy, /legal/terms_of_service | todos | baja | UI / branding | Estas páginas usan títulos en MAYÚSCULAS y cabecera «Volver / Versión 1.0 • 4 de marzo de 2026» con estilo distinto a /terms y /privacy («Volver al inicio»). | Comparar r4-legal_terms_of_service-desktop.png con r4-terms-desktop.png. | Misma plantilla para las 5 páginas. |
| legales (todas) | móvil | baja | UX / táctil | Enlaces de correo (`dpo@kreoon.com`, `soporte@kreoon.com`) de 22 px de alto; «Volver» 36 px; en /data-deletion el campo mide 38 px. | Medir en 390 px. | Altura mínima 44 px en enlaces y campos. |
| /data-deletion | todos | baja | UX | Formulario con campo y «Solicitar eliminación de datos» (no se pulsó). Se debe confirmar que muestra un estado de éxito/error claro. | — | Verificar en la próxima ronda con backend de pruebas. |

---

## 5. /legal/privacy-request — OK con reservas

Evidencia: r5-privacy-request-{movil,tablet,desktop}.png.
Ya no queda en blanco: muestra «Documento no encontrado — El documento legal solicitado no existe o no está disponible. Para ejercer tus derechos sobre tus datos personales escríbenos a dpo@kreoon.com.» + «Volver al inicio». Sin scroll horizontal.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /legal/privacy-request | todos | media | rendimiento / bug | La página queda **en blanco ~8 s** antes de mostrar el aviso. La petición `GET /v1/legal_documents?select=*&document_type=eq.privacy-request&is_current=eq.true` responde **406** y se reintenta 4 veces. | Abrir la ruta con la red limpia; medir hasta que aparece texto. | No consultar la base para este slug: pintar el aviso de inmediato. Si hay consulta, usar `.maybeSingle()` y sin reintentos en 406. |
| /legal/privacy-request | todos | media | copy | El título dice «Documento no encontrado», pero la Política de Privacidad envía a los usuarios justo a `kreoon.com/legal/privacy-request` para ejercer sus derechos. Un usuario ve un error en vez de una página de solicitud. | Abrir /legal/privacy_policy, clic en el enlace de solicitud. | Título «Solicitud de derechos sobre tus datos» y el correo como botón «Escribir a dpo@kreoon.com» (`mailto:`), 44 px. |

---

## 6. /no-existe (404) — OK

Evidencia: r-no-existe-{movil,tablet,desktop}.png.
Muestra «404 · Página no encontrada · La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.», botón «Volver al inicio» (morado #704DFF, 320×48 px en móvil, `href="/"`), «Volver atrás» y accesos «Inicio / Marketplace / Portafolio / Precios / Iniciar sesión». Texto sin problemas de contraste; sin desborde.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /no-existe | todos | baja | UX | La 404 no tiene la cabecera pública ni el pie (el fondo es crema como la home, pero sin menú). | Abrir /no-existe. | Opcional; los 5 accesos ya cubren la salida. |

---

## 7. /pricing/creators — OK

Evidencia: r7-pricing-creators-{movil,tablet,desktop}.png, r7-pricing-botones-desktop.png, r7-pricing-creators-anual-desktop.png.
- Botón «Upgrade a Pro» visible en la tarjeta CREATOR PRO (fondo #704DFF, texto blanco 5,01:1, 302×40 px en escritorio, 308×40 en móvil). «Ir Premium» igual en morado. «Empezar gratis» (plan Free) es secundario con borde, correcto.
- Cifras coherentes: Mensual Pro $24, Premium $49; Anual (−20 %): Pro $19/mes = $228/año (24×0,8 = 19,2 ✓), Premium $39/mes = $468/año (49×0,8 = 39,2 ✓).
- Sin errores de red, sin scroll horizontal.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /pricing/creators | todos | baja | copy | Faltan tildes: «Comparacion detallada», «Mas popular», «cerrar mas proyectos». | Leer el título de la tabla y la insignia de Pro. | «Comparación detallada», «Más popular», «cerrar más proyectos». |
| /pricing/creators | todos | baja | contraste | Etiqueta «-20%» del toggle: 4,13:1 (12 px); «Premium» 4,42:1 (14 px). | Ver toggle Anual y cabecera de la tabla. | Texto un tono más oscuro (≈ #5B3BDB) para llegar a ≥ 4,5:1. |
| /pricing/creators | móvil/tablet | baja | UX / táctil | Toggle mensual/anual 44×24 px; en la cabecera «Iniciar sesión» y «Empezar gratis» 36 px de alto; logo 28 px. | Medir en 390 px. | Altura ≥ 44 px. |
| /pricing/creators | todos | baja | branding | Botones con radio 16 px (la home: 20–24 px). El morado es #704DFF, coherente con la home (también #704DFF; difiere del #6D4AFF del manual por 3 puntos, sin efecto visible). | Comparar con home. | Unificar radio de botón. |

---

## 8. /portafolio — OK

Evidencia: r8-portafolio-{desktop,tablet,movil}.png, r8-portafolio-antes-play-desktop.png, r8-portafolio-tras-play-desktop.png.
- Carga: contenido en 1,4–2,5 s. 0 elementos `<video>` en la carga inicial (no hay reproducción automática); cada tarjeta tiene una miniatura WebP 400×711 (9–62 KB) y un botón «Reproducir video de …» de tarjeta completa (215×382 px; 48–50 botones en móvil/tablet).
- Al pulsar uno se inserta un `<iframe>` de reproducción (mediadelivery) solo para esa tarjeta; los demás siguen sin cargar.
- No se congela: latencia de JS 5–7 ms, scroll de 6.000 px fluido; sin errores de red 4xx/5xx.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /portafolio | todos | baja | rendimiento | Los avatares de 24×24 px cargan imágenes originales enormes (p. ej. 1600×2401, 2160×3840 desde el CDN de Bunny). Las miniaturas de video sí están optimizadas. | Inspeccionar `img` de avatar; `naturalWidth` vs 24 px. | Pasar los avatares por el optimizador (`w=48`) como las miniaturas. |
| /portafolio | todos | baja | UX | Se repite el mismo creador varias veces seguidas («David Andres Arias Sepulveda» ×3) y una tarjeta dice solo «Creador» sin nombre. | Mirar la rejilla. | Mezclar el orden o limitar a 1–2 por creador; mostrar nombre de fallback. |
| /portafolio | todos | media | contraste | Ver punto 9 (cabecera) y el texto de la hero: «PROYECTOS REALES» 1,8:1 (morado claro sobre fondo gris), «Explora proyectos reales…» 2,36:1. | Ver r8-portafolio-desktop.png. | Ver punto 9. |

---

## 9. Cabecera pública (/portafolio, /blog, /marketplace) — FALLA en /portafolio y /blog

Evidencia: r9-cabecera-{portafolio,blog,marketplace}-{movil,tablet,desktop}.png, r9-menu-*-{movil,tablet}.png, r9-portafolio-cabecera-desktop-1440.png, r9-portafolio-tablet-scroll400.png.
Desborde en 768 px: **ninguno** en las 3 rutas (cabecera de 65 px, logo + botón «Abrir menú» 40×40 dentro del viewport, sin scroll horizontal). El menú desplegable abre y cierra bien en tablet y móvil (enlaces 351×50 px, #625E78 sobre crema = 5,84:1).

Legibilidad (medida por píxeles sobre la captura, texto vs fondo real):

| Ruta | Dispositivo | Medición |
|---|---|---|
| /marketplace | 1440 | logo 17,6:1; Inicio 4,37; Creadores 4,85; Portafolio 4,84; Blog 5,21; Marketplace 13,2; Iniciar sesión 8,66 → legible |
| /marketplace | 768 / 390 | logo 17,5:1; «Abrir menú» 5,2:1 → legible |
| /portafolio y /blog | 1440 | Inicio/Para Creadores/Blog 1,5:1; Portafolio (activo) 2,6:1; Iniciar sesión 2,65:1; logo 3,9:1 → **ilegible** |
| /portafolio y /blog | 768 / 390 | logo 3,9–4,1:1; icono «Abrir menú» 2,0:1 → **ilegible** |

Causa probable: la cabecera es transparente (`background: rgba(250,248,245,0)`) con texto de tema claro (#625E78 y #242135) y, detrás, hay un `<canvas>` de fondo oscuro (animación «COSMOS / GALAXY / GRID / NETWORK») que en el borde superior mide ≈ rgb(40–130, 40–130, 45–135). Al bajar 400 px la cabecera sigue sobre fondo oscuro (r9-portafolio-tablet-scroll400.png).

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /portafolio, /blog | escritorio | **alta** | contraste | Enlaces del menú (#625E78) sobre el fondo oscuro del canvas: 1,5:1; «Iniciar sesión» 2,65:1; el logo 3,9:1. La cabecera no se puede leer. | Abrir /portafolio y /blog en 1440 px, mirar la barra superior (r9-portafolio-cabecera-desktop-1440.png). | Fondo de cabecera sólido crema `bg-[#FAF8F5]/90 backdrop-blur` + borde inferior suave en estas rutas (como /marketplace), o recolorear el canvas a crema/morado muy claro. |
| /portafolio, /blog | tablet y móvil | **alta** | contraste | Icono de «Abrir menú» 2,0:1 y logo ≈ 4:1 sobre el fondo oscuro. El botón de menú casi no se ve. | Abrir en 768 y 390 px (r9-cabecera-portafolio-tablet.png). | Mismo arreglo; además `aria-label` ya existe («Abrir menú»), mantenerlo. |
| /portafolio, /blog | todos | media | contraste / branding | Hero con texto de tema claro sobre el fondo oscuro: «PROYECTOS REALES»/«PRÓXIMAMENTE» 1,8–2,3:1; «Explora proyectos reales…»/«Estamos preparando…» 2,4:1; el título «Contenido Aprobado» sí se lee (5,4:1). El estilo oscuro «cósmico» no existe en la home (crema). | Ver r8-portafolio-desktop.png vs r0-home-referencia-desktop.png. | Fondo crema de la home en toda la zona pública; si se conserva el fondo oscuro, usar texto blanco (#FFFFFF / #E8E3F5) en hero. |
| /portafolio, /blog | escritorio | media | branding | Botón «Crear cuenta de creador» con degradado y radio 12 px (home: sólido, 20–24 px). | Comparar. | Unificar. |
| /marketplace | escritorio | baja | contraste | «Inicio» 4,37:1 (14 px) — por debajo de 4,5. | Medir. | Usar #5B5775 para enlaces no activos. |
| /marketplace | todos | baja | UX / táctil | Enlaces de la cabecera de escritorio 20 px de alto (área táctil pequeña en tablet apaisado). | Medir. | `py-3` en enlaces. |

---

## 10. /marketplace chip «Moda» — FALLA

Evidencia: r10-marketplace-moda-desktop.png, r10-marketplace-moda-movil.png, marketplace-filtro-moda.png (versión anterior, del reporte previo).
- Con «Moda» activo aparecen **4 resultados** (escritorio y móvil), el mismo número que en el reporte anterior (qa-publico-resto.md): Estefania Ciro Duque («moda»), Yuli Andrea tabares («ugc»), Laura katherine Hernandez landines («belleza capilar»), Laura Sofia Pulido Martinez («moda»).
- No aparecen los creadores cuya categoría es «Moda & Estilo»: Alejandra Giraldo Alzate, Valentina Giraldo, ni Mateo Yepes Hernández («modelaje, moda, belleza…»), todos visibles sin filtro en la misma página.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| /marketplace | todos | **alta** | bug | El filtro «Moda» no devuelve «muchos más» resultados: sigue en 4, incluye 2 que no son de moda (Yuli Andrea «ugc», Laura katherine «belleza capilar») y deja fuera a los de «Moda & Estilo». Mismo síntoma en otros chips: «Tech» y «Fitness» devuelven solo Yuli Andrea tabares («ugc») aunque existe «Juan José Giraldo — Fitness & Deporte». | Clic en «Moda»; comparar con la lista sin filtro («Explora Talento»). | Filtrar por un campo de categoría normalizado (mapear «Moda & Estilo», «moda», «modelaje, moda…» → Moda), y no por coincidencia de texto libre; probar con los 15 chips. |
| /marketplace | todos | media | bug (a confirmar) | Al cambiar de chip tras «Limpiar todo», «Belleza» devolvió 2 creadores de «moda» y 1 de «ugc» (Estefania Ciro Duque, Laura Sofia Pulido Martinez, Yuli Andrea tabares) junto a Estefaia Giraldo («belleza»). Puede ser filtro acumulado o coincidencia por texto; no lo pude aislar. | Limpiar todo → Belleza. | Revisar que «Limpiar todo» reinicie el estado y que el filtro sea exclusivo. |
| /marketplace | todos | media | fórmula / copy | Precios sin formato coherente: «$200COP», «$200,000COP», «$50USD», «$100,000COP» (sin espacio ni separador consistente; 200 COP no es un precio realista). Todos los «Nuevos Talentos» muestran la misma puntuación «60». Nombres con minúsculas («sara ospina», «Yuli Andrea tabares»). | Ver «Top Performers» y «Nuevos Talentos». | Formato «$200.000 COP» / «USD 50», validar mínimos al guardar; capitalizar nombres al mostrar. |
| /marketplace | móvil | baja | contraste (sin confirmar) | En la medición por píxeles de 390 px, los chips «Fitness» y «Moda» dieron 1,6–1,7:1 (en tablet 5,8:1). Los chips de la fila que quedan fuera de pantalla dan lecturas inválidas (negro), así que esta cifra puede ser un artefacto de la medición. | Abrir /marketplace en 390 px y revisar a mano los chips. | Verificar visualmente; si es real, fondo crema fijo tras la fila de chips. |

---

## 11. Banner de cookies — OK

Evidencia: r11-cookies-banner-desktop.png, r11-cookies-personalizar-desktop.png.
En «Personalizar»: Esenciales (marcado, bloqueado, «Requerida»), **Analíticas desmarcado**, **Marketing desmarcado**, Personalización marcada. El botón «Solo esenciales» y «Guardar preferencias» funcionan; el banner desaparece y no vuelve.

| ruta | dispositivo | severidad | tipo | qué pasa | pasos | propuesta |
|---|---|---|---|---|---|---|
| / (banner) | todos | baja | UX / privacidad | «Personalización» viene marcada por defecto (no estaba en el alcance, pero es consentimiento previo). | Clic en «Personalizar». | Dejar «Personalización» también desmarcada, o explicar que es de preferencias de interfaz. |
| / (banner) | todos | baja | UX | Al pulsar «Personalizar», el botón sigue llamándose «Personalizar» y al lado aparece «Guardar preferencias»; falta un botón «Cancelar/Volver». | Clic en «Personalizar». | Cambiar a «Volver» o ocultarlo mientras el panel está abierto. |

---

## Nuevas regresiones / hallazgos fuera del alcance

- Cabecera ilegible en /portafolio y /blog (punto 9): es lo único claramente nuevo que rompe el uso. Alta.
- Tiempo en blanco de ~8 s en /legal/privacy-request por reintentos de una consulta que responde 406 (punto 5).
- Títulos de pestaña genéricos (heredados de la home) en /reset-password, legales y 404.
- Dos versiones de los términos y de la privacidad (/terms vs /legal/terms_of_service) con fechas distintas (19-feb vs 4-mar-2026).
- Contraste del botón deshabilitado de /reset-password (1,09:1).
- Sin errores de consola/red 4xx-5xx en las demás rutas probadas (solo el 406 de privacy-request).

## Top 10 priorizado

1. **Cabecera ilegible en /portafolio y /blog** (alta · contraste): menú 1,5:1 en escritorio e icono de menú 2:1 en móvil/tablet. Fondo sólido crema con blur, o recolorear el canvas.
2. **Chip «Moda» sigue mal en /marketplace** (alta · bug): 4 resultados, 2 equivocados, faltan los de «Moda & Estilo». Filtrar por categoría normalizada; revisar también Tech/Fitness/Belleza.
3. **/legal/privacy-request en blanco ~8 s y título «Documento no encontrado»** (media · bug/copy): pintar el aviso al instante, título «Solicitud de derechos» y `mailto:` al DPO.
4. **Hero de /portafolio y /blog con texto de bajo contraste sobre fondo oscuro** (media · contraste/branding): 1,8–2,4:1; pasar a crema de la home o texto blanco.
5. **Botón deshabilitado invisible en /reset-password** (media · contraste): 1,09:1; estilo de deshabilitado legible.
6. **Términos y privacidad duplicados con versiones distintas** (media · coherencia): redirigir /terms y /privacy a /legal/*.
7. **Estilos de botón inconsistentes con la home** (media · branding): home sólido #704DFF radio 20–24 px; modal login y /reset-password con degradado y radio 12; pricing 16; cabecera pública con degradado. Un solo componente.
8. **Datos del marketplace incoherentes** (media · fórmula/copy): precios «$200COP»/«$200,000COP»/«$50USD», puntuación 60 repetida, nombres en minúscula.
9. **Áreas táctiles < 44 px** (media · UX): casilla y enlaces legales de /registro, «Mostrar contraseña» y «Close» del modal, enlaces de legales, toggle de precios.
10. **Faltan tildes y títulos de pestaña** (baja · copy): «Comparacion», «Mas popular», «mas proyectos»; título propio por página.

## Lo que sí quedó bien (para no volver a probarlo)

Login modal legible; /registro y /registro/ugc-colombia con título y formulario correctos; /reset-password en ambos casos; 5 legales legibles y sin scroll horizontal en 390 px; 404 con «Volver al inicio»; /pricing/creators con «Upgrade a Pro» morado y cifras correctas (mensual/anual); /portafolio con miniaturas, play, sin autoplay y fluido; cabecera de /marketplace legible y sin desborde en 768 px; cookies con analítica y marketing desmarcadas.
