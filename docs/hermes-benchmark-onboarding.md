> **Revisión de Claude (2026-09-30): aprobada parcial.** Útiles: 2 (login social: Google ya existe; TikTok a evaluar), 5 (plantillas), 7 (contraste, ya en curso). **Reubicadas (decisión de Alexander, 2026-09-30):** 1 (video de presentación), 3 (ubicación) y 4 (gamificación) NO van en el registro —añadirían fricción—, sino en un flujo **opcional posterior** «Verifica tu perfil» que otorga la insignia de verificado (`is_verified`, ya existe y se muestra en `marketplace/explore/CreatorCard.tsx`). La ubicación debe ser declarada/confirmada con consentimiento explícito, nunca rastreo continuo. 6 y 8: fuera de alcance de esta auditoría. Las afirmaciones por plataforma no se verificaron una por una contra las fuentes.

## Benchmark de UX para registro y onboarding de creadores UGC

### 1. Billo
**Pasos**: 1) Descargar la app *Billo Creator* (iOS/Android). 2) Registrarse vinculando Apple / Facebook / Google. 3) Crear un *video pitch* y subirlo.
**Campos requeridos**: edad ≥18 años, país (US, UK, Canada, Australia), correo. Se solicita documento de identidad (pasaporte o ID) para verificación.
**Login social**: Apple, Facebook, Google.
**Guía de perfil**: el video pitch sirve como portafolio inicial. Inmediatamente se muestra a marcas que coinciden.
**Time‑to‑value**: desde la publicación del pitch, el creador puede ver las primeras ofertas de marca en minutos.
**Patrones visuales**: UI móvil limpia, modo claro/oscuro disponible, alto contraste en botones y textos. Sencillo y sin sobrecargar.
**Fuente**: https://help.billo.app/en/articles/5789820-for-creators-how-to-sign-up-on-billo

### 2. Insense
**Pasos**: registrarse en https://insense.pro, completar perfil en la sección *Creator Marketplace*. 4) Subir portfolio, enlaces sociales y métricas.
**Campos**: nombre, correo, redes sociales (Instagram, TikTok, YouTube), datos demográficos, edad.
**Login social**: email + contraseña; también permite login con Google.
**Guía de perfil**: el panel muestra portfolio, ratings y reviews; la plataforma aconseja completar métricas para ser visible.
**Time‑to‑value**: al completar el perfil, el creador puede postularse a campañas en tiempo real.
**Patrones visuales**: diseño claro, encabezado fijo, tarjetas de perfiles con foto/ratings. Soporte de modo oscuro.
**Fuente**: https://insense.pro/platform/creator-marketplace

### 3. Collabstr
**Pasos**: 1) Acceder a Collabstr.com/Claim y elegir un username. 2) Añadir rates, plataformas y servicios. 3) Publicar portfolio. 4) Revisar feedback.
**Campos**: username, Instagram/TikTok/YouTube handles, tarifas, tipo de contenido.
**Login social**: no se menciona; creación de cuenta con email.
**Guía de perfil**: la plataforma destaca tarifas y reviews; el creador puede ser encontrado por marcas en función de estos datos.
**Time‑to‑value**: las tarifas visibles generan pedidos directo; el creador suele recibir la primera oferta en 24 h.
**Patrones visuales**: estilo vibrante, navegación horizontal, tarjetas con avatar y ratings en primer plano.
**Fuente**: https://collabstr.com/creator

### 4. Trend.io (ahora parte de soona)
**Pasos**: rellenar formulario en *Book.soona* o en https://creators.trend.io/. 5) Completar con datos personales y redes.
**Campos**: nombre, email, Instagram/TikTok, bio, edad, país.
**Login social**: opcional con accounts de soona; en la página muestra *Sign In* con Google/TikTok.
**Guía de perfil**: después de aceptar la aplicación, el creador recibe notificaciones de oportunidades de brand.
**Time‑to‑value**: la primera oportunidad suele aparecer dentro de 48 h.
**Patrones visuales**: interfaz minimalista, color pastel; énfasis en CTA.
**Fuente**: https://creators.trend.io/

### 5. JoinBrands
**Pasos**: 1) Crear cuenta en https://creator.joinbrands.com/registerweb. 2) Completar perfil con nombre, email, redes sociales y biografía. 3) Revisar ofertas.
**Campos**: email, password; después username, Instagram, TikTok, YouTube.
**Login social**: Google, Apple, TikTok, passkey.
**Guía de perfil**: la plataforma muestra portfolio y historial de campañas.
**Time‑to‑value**: la primera oferta aparece tras 12–24 h.
**Patrones visuales**: diseño limpio, secciones separadas por tarjeta.
**Fuente**: https://creator.joinbrands.com/

### 6. Minisocial
**Pasos**: 1) Ingresar en https://app.minisocial.com/creator/join. 2) Completar credenciales y datos de dirección. 3) Crear perfil profesional (handle de Instagram/TikTok). 4) Aceptar términos.
**Campos**: nombre, correo, password, dirección, fecha de nacimiento, género, handles.
**Login social**: ninguno; login con email+password.
**Guía de perfil**: el creador sube su portfolio y métricas; la plataforma recomienda añadir fotos de alta calidad.
**Time‑to‑value**: la oportunidad de campaña generalmente llega 24 h después de la verificación.
**Patrones visuales**: esquema de color vivo, imágenes grandes, flujo de formularios claro.
**Fuente**: https://app.minisocial.com/creator/join

---

## 8 prácticas accionables para Kreoon (LatAm)
1. **Un solo video/pitch de bienvenida** – exige a los creadores subir un video de 30 s que explique su estilo; garantiza reconocimiento inmediato.
2. **Integrar login social con Google y TikTok** – simplifica la captura de datos y acelera el flujo de inscripción.
3. **Validación de identidad por GPS** – usar la geolocalización para limitar a usuarios de LATAM y reducir fraudes.
4. **Gamificación del onboarding** – otorgar puntos por completar cada sección (profile, portfolio, métricas). Redirige a ofertas específicas.
5. **Plantillas de publicación** – proveer ejemplos de reels, Stories y carruseles para acelerar el contenido.
6. **Panel de métricas claro y accesible** – mostrar impresiones, tasas de clic, conversiones para cada campaña.
7. **Modo oscuro/claro con accesibilidad WCAG 2.2** – cumplir contraste mínimo 4.5:1; facilita uso en dispositivos móviles.
8. **Soporte multilingüe (ES/EN/PT)** – permitir alternar idioma sin recargar la página y ofrecer guías de ayuda.

Estas prácticas combinan velocidad de valor, usabilidad y confianza, alineándose con la experiencia positiva observada en las plataformas analizadas.