# Public Showcase API

API pública read-only que expone datos de la organizacion **UGC Colombia** para el sitio ugccolombia.co.

## URL de Produccion

```
https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-showcase
```

## Consumidor

- **ugccolombia.co** (Next.js 15 en Vercel)
- Proxy server-side en `/api/showcase` del sitio

## Endpoints

### GET ?action=videos&limit=N

Devuelve videos aprobados aleatorios de UGC Colombia.

**Parametros:**
- `limit` (opcional): Numero de videos (1-24, default 12)

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "title": "Titulo del video",
    "video_url": "https://iframe.mediadelivery.net/embed/...",
    "thumbnail_url": "https://...",
    "creator_handle": "username-creador",
    "brand_name": "Nombre de la Marca"
  }
]
```

### GET ?action=stats

Devuelve estadisticas de la organizacion UGC Colombia.

**Respuesta:**
```json
{
  "creators_count": 36,
  "brands_count": 30,
  "campaigns_completed": 255,
  "videos_approved": 307,
  "updated_at": "2026-04-09T12:00:00.000Z"
}
```

## Tablas utilizadas

| Tabla | Campos | Filtro |
|-------|--------|--------|
| `organizations` | id | `slug = 'ugc-colombia'` |
| `content` | id, title, video_url, video_urls, thumbnail_url, creator_id, client_id, status | `organization_id = UGC Colombia AND status IN ('approved', 'paid')` |
| `clients` | id, name | `organization_id = UGC Colombia` |
| `profiles` | id, full_name, username | (join desde content.creator_id) |

## Metricas

- **creators_count**: Creadores unicos con contenido aprobado/pagado
- **brands_count**: Clientes/marcas de la organizacion
- **campaigns_completed**: Videos con status 'paid'
- **videos_approved**: Videos con status 'approved' + 'paid'

## CORS

Origenes permitidos:
- `https://ugccolombia.co`
- `https://www.ugccolombia.co`
- `*.vercel.app` (previews)
- `http://localhost:3000` (desarrollo)

Para agregar nuevos origenes, editar el array `ALLOWED_ORIGINS` en `index.ts`.

## Cache

- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- CDN cache: 60 segundos
- Stale content: 5 minutos mientras revalida

## Deploy

```bash
# Desarrollo local
supabase functions serve public-showcase

# Smoke test local
curl 'http://localhost:54321/functions/v1/public-showcase?action=stats'
curl 'http://localhost:54321/functions/v1/public-showcase?action=videos&limit=6'

# Deploy a produccion (sin JWT - funcion publica)
supabase functions deploy public-showcase --no-verify-jwt --project-ref wjkbqcrxwsmvtxmqgiqc

# Verificacion post-deploy
curl 'https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-showcase?action=stats'

# Verificar CORS
curl -H 'Origin: https://ugccolombia.co' -I \
  'https://wjkbqcrxwsmvtxmqgiqc.functions.supabase.co/public-showcase?action=stats'
```

## Seguridad

- **Solo lectura**: No hay endpoints de escritura
- **Sin JWT**: La funcion es publica por diseno
- **Filtrado por organizacion**: Solo expone datos de UGC Colombia
- **Sin PII**: No expone emails, telefonos, pagos ni datos sensibles
- **Service Role**: Usa internamente service_role_key pero nunca lo expone
