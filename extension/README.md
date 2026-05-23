# Kreoon Capture — Extensión Chrome

Captura contenido viral de YouTube, Instagram, TikTok y Ads Manager, y lo replica automáticamente en tus proyectos Kreoon con análisis de Gemini AI.

## Plataformas soportadas

| Plataforma | Transcripción | Métricas | Tipo |
|---|---|---|---|
| YouTube | Gemini AI (video completo) | Views, Likes | Orgánico |
| TikTok | Caption + análisis IA | Views, Likes, Shares | Orgánico |
| Instagram | Caption + análisis IA | Likes | Orgánico |
| Meta Ads Manager | Copy del anuncio | — | Pagado |
| TikTok Ads Manager | Copy del anuncio | — | Pagado |

## Instalación en desarrollo

```bash
cd extension
npm install
npm run build
```

Luego en Chrome:
1. Ir a `chrome://extensions`
2. Activar "Modo desarrollador"
3. Click "Cargar sin empaquetar"
4. Seleccionar la carpeta `extension/dist`

## Desarrollo con hot reload

```bash
npm run dev
```

Chrome recargará la extensión automáticamente al detectar cambios.

## Deploy de la Edge Function

```bash
npx supabase functions deploy extension-video-capture --no-verify-jwt
```

> La función **sí** verifica JWT (configurado en config.toml). El `--no-verify-jwt` es solo para el deploy local.

## Estructura

```
src/
├── popup/          → Icono de la barra de Chrome (login, notificaciones)
├── sidepanel/      → Panel lateral con wizard de captura
├── background/     → Service worker (polling, mensajes, notificaciones)
├── content/        → Scripts inyectados por plataforma
└── shared/         → Tipos, storage, API de Kreoon
```

## Flujo de captura

1. Content script detecta video → muestra botón **K** verde
2. Click en K → `CAPTURE_VIDEO` message al service worker
3. Service worker guarda metadata y abre el side panel
4. Side panel muestra los datos, usuario elige proyecto
5. Click "Analizar" → llama a Edge Function `extension-video-capture`
6. Gemini transcribe/analiza → se crea el content item en Kreoon
7. Panel muestra resultado con score viral y hooks detectados
