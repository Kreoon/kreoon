# PWA y uso sin conexión — estado actual y propuesta

> Fase de diagnóstico (2026-10-01). No se modificó código. Rama `claude/focused-mendel-es4xcv`.
> Verificado en el preview de la rama con emulación móvil (375×812, 320×640, 812×375); no hubo dispositivo real.

## 1. Estado actual (hechos verificados)

| Tema | Hecho | Fuente |
|---|---|---|
| Registro del service worker | **Nadie lo registra.** `injectRegister: false` y ningún archivo importa `virtual:pwa-register` ni llama a `serviceWorker.register`. En el preview, `navigator.serviceWorker.getRegistration()` devuelve `null` aunque `/sw.js` existe (200). | `vite.config.ts:296`; grep sin resultados en `src/` |
| Consecuencia | Visitantes nuevos: sin SW, sin caché offline y sin push (`usePushNotifications.ts:52,68` espera `serviceWorker.ready`, que nunca se resuelve). Usuarios antiguos que tenían un SW de versiones previas lo **conservan** y el navegador lo sigue actualizando con el `/sw.js` nuevo, que incluye las reglas de caché de abajo. Hay dos poblaciones con comportamiento distinto. | — |
| `UpdatePrompt` | Solo aparece si ya hay un registro. Texto con emoji («🚀 Actualizando KREOON») y spinner girando aunque no esté actualizando nada. | `src/components/pwa/UpdatePrompt.tsx:96-103` |
| Manifest | Lo generan dos fuentes: `public/manifest.webmanifest` y el que inyecta `vite-plugin-pwa`. En el HTML servido aparecen **dos `<link rel="manifest">`**. El que se sirve tiene `lang: "en"`, `orientation: "portrait-primary"` (bloquea la horizontal instalada), no tiene `id` y declara iconos `"any maskable"` combinados (Chrome recomienda separarlos). | `index.html:65`, `vite.config.ts:115-139`, `public/manifest.webmanifest` |
| Iconos | Solo 192 y 512 PNG (11 KB y 61 KB). No hay icono maskable con zona segura propia, ni `apple-touch-icon` de 180, ni splash de iOS por tamaño (usa el de 512 para todo). | `public/`, `index.html:66-70` |
| Meta móvil | `viewport` correcto y **sin bloqueo de zoom** (`width=device-width, initial-scale=1.0, viewport-fit=cover`). `apple-mobile-web-app-status-bar-style: black-translucent` con fondo crema: en iOS instalado el texto de la barra de estado queda blanco sobre crema. | `index.html:5-10` |
| Caché de Supabase REST | `NetworkFirst`, 6 s de espera, 200 entradas, 1 h. **Clave = URL, sin usuario.** Cachea respuestas autenticadas (perfil, contenido, finanzas, roles) y las sirve sin red o si la red tarda más de 6 s, aunque haya cambiado el usuario. | `vite.config.ts:193-209` |
| Caché de Supabase Storage | `CacheFirst` 7 días para `/storage/v1/*`, incluidas URL firmadas de comprobantes de pago (`useTalentPayments.ts:263,276`, firma de 1 h): el SW las sigue sirviendo después de vencer la firma y después de cerrar sesión. | `vite.config.ts:210-224` |
| Edge Functions | `NetworkOnly` (correcto). | `vite.config.ts:168-177` |
| Chunks JS/CSS | Precaché mínimo (index + vendors base) y `StaleWhileRevalidate` 7 días para los demás. No hay `navigateFallback`, así que **sin red no abre ninguna ruta** aunque el SW esté activo. | `vite.config.ts:147-159,178-192` |
| Video Bunny | `.m3u8` NetworkFirst 1 h y `.ts/.m4s` CacheFirst 36 h (feed). Correcto para contenido público. | `vite.config.ts:240-278` |
| Caché de React Query en localStorage | `kreoon-rq-v1`: se vuelca **toda** la caché exitosa (arrays ≤100, ≤4 MB, 1 h) y se rehidrata al arrancar **sin comprobar el usuario**. En el preview, sin sesión y solo visitando la home, ya ocupaba 268 KB. | `src/App.tsx:410-453` |
| Cierre de sesión | `signOut` solo borra `activeRole` y llama a `supabase.auth.signOut()`. No limpia `queryClient` (memoria), ni `kreoon-rq-v1`, ni cachés del SW, ni `currentOrganizationId`, `selectedClientId`, `kiro-chat-history`, borradores ni `sessionStorage`. | `src/hooks/useAuth.tsx:713-716` |
| Aislamiento | Solo `board_user_prefs_${userId}_${orgId}` y `content_notifications_${userId}` incluyen usuario. El resto de claves privadas son globales (lista completa en `diagnostico.md` §3). | — |
| Online/offline | `useOnlineStatus.ts` existe pero nadie lo importa. `refetchOnReconnect: false`. No hay aviso de «Sin conexión». | `src/hooks/useOnlineStatus.ts`, `src/App.tsx:403` |
| Instalar | No hay `beforeinstallprompt` ni botón «Instalar». (Correcto mientras el SW no se registre: no debe ofrecerse.) | grep |
| Push | Infraestructura existe (`push-sw.js`, `push-send`), pero sin SW registrado no funciona. **El encargo pide no pedir permisos push**: se mantiene así. | `public/push-sw.js` |

## 2. Qué cachear y qué NO

### Sí (seguro y útil)
- **Shell de la app**: `index.html`, CSS y JS de entrada, chunks de las 5 pantallas de la barra inferior (precaché), fuentes, iconos y logo.
- **`navigateFallback: '/index.html'`** con `navigateFallbackDenylist` para `/auth/callback`, `/reset-password`, `/onboarding/`, `/review/`, `/preview/` y cualquier ruta con `#access_token`.
- **Página «Sin conexión»** propia (dentro del shell, no HTML aparte) que se muestra cuando no hay red y no hay datos en memoria.
- **Contenido público e inmutable**: miniaturas y segmentos de Bunny (ya existe), imágenes optimizadas del portafolio público, fuentes.

### No
- **Respuestas de Supabase REST autenticadas**: pasar la regla a `NetworkOnly`. El «último dato conocido» se resuelve en la app (memoria de React Query), no en el SW, porque el SW no sabe quién es el usuario.
- **Supabase Storage firmado** (`/object/sign/`) y **autenticado** (`/object/authenticated/`): `NetworkOnly`. Solo `/object/public/` puede ir a `CacheFirst`.
- **Edge Functions**: sigue `NetworkOnly`.
- **Respuestas de Auth** (`/auth/v1/*`): `NetworkOnly` explícito.
- **Archivos de subida** (crudos de proyecto, entregas): nunca se cachean.

## 3. Aislamiento por usuario y organización

1. **Clave de ámbito**: `scope = ${userId}:${organizationId}` disponible en un único módulo (`src/lib/storage/scopedStorage.ts`, nuevo) con `get/set/remove/clearScope/clearAllScopes`.
2. **Persistencia de React Query**: si se conserva, la clave pasa a `kreoon-rq-v2:${userId}:${orgId}`, solo con una **lista blanca** de `queryKey` no sensibles (catálogos: países, estados de la organización, etiquetas). Nunca finanzas, perfiles ajenos, guiones ni notificaciones. Al hidratar se comprueba que la sesión actual coincide con el ámbito; si no, se descarta.
3. **Borradores** (constructor de perfil, registro, onboarding): clave `draft:${scope}:${entidad}`. Sin PII en claro salvo que el usuario la esté escribiendo; nunca documento de identidad ni fecha de nacimiento en localStorage (hoy `kreoon_onboarding_quiz` sí los guarda — `NovaProfileDataStep.tsx:268-451`).
4. **Cambio de organización**: limpia las queries con `organization_id` anterior (`queryClient.removeQueries({ predicate })`) y las claves de ámbito anterior.

## 4. Limpieza al cerrar sesión (orden)

1. Cancelar subidas en curso (avisar si hay alguna: «Tienes 1 subida en curso. Si sales, se cancela»).
2. `queryClient.cancelQueries()` → `queryClient.clear()`.
3. Borrar `kreoon-rq-v*`, `currentOrganizationId`, `selectedClientId`, `activeRole`, `kreoon-auth-store`, claves de KIRO, `unsaved_changes_backup` y todas las claves `draft:${scope}:*` y `*:${scope}`.
4. `sessionStorage.clear()` salvo `kreoon_access_gate`.
5. Si hay SW: `caches.keys()` → borrar las cachés que contengan datos de usuario (`supabase-rest-*`, `supabase-storage-*`). Las de shell y Bunny público se conservan.
6. `supabase.auth.signOut()` y `navigate('/auth', { replace: true })`.
7. También en: expulsión por baneo (`useAuth.tsx:388-390`), sesión expirada (`SIGNED_OUT` sin acción del usuario) y cambio de cuenta en la misma pestaña.

Se centraliza en `useAuth.signOut` para que los 9 llamadores actuales (`Sidebar.tsx:591`, `MobileNav.tsx:422`, `AccountMenu.tsx:71`, etc.) hereden la limpieza sin tocarlos.

## 5. Actualizaciones sin perder borradores

- Mantener `registerType: 'prompt'` y `skipWaiting: false` (ya están).
- Registrar el SW con `useRegisterSW` de `virtual:pwa-register/react` (con `onNeedRefresh`, `onRegisteredSW` y comprobación cada 30 min, como hoy).
- Aviso de actualización como **barra discreta** (no tarjeta flotante) encima de la barra inferior: «Hay una versión nueva. Actualizar». Sin emoji ni spinner.
- Antes de recargar: `await flushDrafts()` (cada borrador registrado guarda su estado local) y **si hay subidas en curso o un formulario con cambios sin guardar en el servidor, se pospone** («Termina de guardar y actualizamos»).
- Los borradores locales llevan `schemaVersion`; si la versión nueva cambia el formato, se migran o se descartan con aviso, nunca en silencio.
- `cacheId` nuevo (`kreoon-v7`) al quitar la caché REST para que `cleanupOutdatedCaches` elimine `supabase-rest-v2` en todos los clientes que ya tienen un SW antiguo.

## 6. Instalación por plataforma

| Plataforma | Comportamiento | Qué mostrar |
|---|---|---|
| Android / Chrome, Edge | `beforeinstallprompt` disponible cuando el SW está activo y el manifest es válido. | Botón «Instalar app» **solo** en Cuenta, solo si el evento llegó y la app no está en `display-mode: standalone`. Nunca en el portafolio público ni en el registro. |
| iOS / iPadOS Safari | No hay evento. Se instala con Compartir → «Agregar a inicio». Push solo con app instalada (≥16.4) — no se pedirá. | En Cuenta, fila «Usar como app» que abre un panel inferior con los 2 pasos ilustrados. Solo en Safari, no en Chrome iOS (no puede instalar). |
| Escritorio | Chrome/Edge permiten instalar. | Sin promoción; el usuario lo hace desde el navegador. |
| Navegadores integrados (Instagram, TikTok, WhatsApp) | No instalan. | Nada; en el portafolio público, el botón compartir sigue funcionando. |

Condición para mostrar cualquier «Instalar»: SW registrado y activo **y** `navigateFallback` funcionando **y** página sin conexión probada. Hasta entonces no se ofrece.

## 7. Cambios de manifest propuestos

```json
{
  "id": "/",
  "name": "Kreoon",
  "short_name": "Kreoon",
  "lang": "es",
  "dir": "ltr",
  "start_url": "/creator-dashboard?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#FAF8F5",
  "theme_color": "#FAF8F5",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `start_url`: lo resuelve el destino post-login (`src/lib/routing/postAuth.ts`); `/creator-dashboard` es correcto para el rol creador, pero si el manifest es único para todos los roles conviene `"/"` y dejar que la home redirija a quien tiene sesión. **Decisión pendiente** (ver `plan-implementacion.md`).
- Quitar `public/manifest.webmanifest` o el del plugin (una sola fuente; recomendado: el del plugin).
- `theme_color` crema para que la barra de estado combine con la cabecera clara; `status-bar-style: default`.
- Iconos nuevos: maskable con margen del 20 %, `apple-touch-icon` 180×180.

## 8. Pruebas de aceptación PWA

1. Lighthouse PWA/«Installable» en el preview (Chrome móvil emulado): manifest válido, SW controla la página.
2. Modo avión tras la primera visita: `/creator-dashboard` abre el shell y muestra «Sin conexión» con datos en memoria si los hay; no hay pantalla blanca.
3. Usuario A cierra sesión, usuario B entra en el mismo navegador: Application → Local Storage y Cache Storage no contienen datos de A; en modo avión B no ve nada de A.
4. Nueva versión desplegada con un borrador abierto en el constructor: aparece el aviso; al actualizar el borrador sigue ahí.
5. iOS (si hay dispositivo real): instalar, abrir, barra de estado legible, áreas seguras correctas, girar a horizontal.
