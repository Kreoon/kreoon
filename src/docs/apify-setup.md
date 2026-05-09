# Apify Scraper — Configuración e Integración

## ¿Qué hace?

`apify-scraper` es un Edge Function aislado que hace **inteligencia competitiva en tiempo real** scrapeando 3 fuentes en paralelo por cada competidor:

| Actor | Fuente | Output |
|---|---|---|
| `apify/facebook-ads-scraper` | **Meta Ads Library** | Ads activos pagados (Facebook + Instagram) |
| `clockworks/free-tiktok-scraper` | **TikTok** | Top posts por engagement (con duración, likes, hashtags) |
| `apify/instagram-scraper` | **Instagram** | Posts del feed (caption, likes, tipo) |

Output normalizado y compacto, listo para inyectar en prompts de Gemini.

---

## 1. Configurar API Key

1. Ir a https://console.apify.com/account/integrations
2. Copiar el **Personal API Token**
3. Supabase Dashboard → tu proyecto → **Edge Functions** → **Secrets**
4. Agregar:
   ```
   APIFY_API_KEY = apify_api_xxxxxxxxxxxxxxxxxxxx
   ```

---

## 2. Plan recomendado de Apify

| Plan | Precio/mes | Créditos incluidos | Recomendación |
|---|---|---|---|
| Free | $0 | $5 USD | Solo testing, ~3 ADN al mes |
| **Starter** | **$49** | **$49 USD** | **Recomendado** — ~30 ADN al mes |
| Scale | $499 | $499 USD | Para volumen alto (300+ ADN/mes) |

---

## 3. Costo estimado por uso

### Por ejecución del scraper (5 competidores × 20 resultados/fuente):

| Fuente | Resultados | $/result | Total |
|---|---|---|---|
| Meta Ads | 100 | $0.01 | $1.00 |
| TikTok | 100 | GRATIS | $0.00 |
| Instagram | 100 | $0.005 | $0.50 |
| **Total Apify** | | | **~$1.50 USD** |

### Costo total del ADN Recargado V2 con Apify:

| Componente | Costo |
|---|---|
| Perplexity (21 queries) | ~$0.05 |
| Gemini 2.5 Flash (output 160K tokens) | ~$0.06 |
| Apify (5 competidores) | ~$1.50 |
| **Total real** | **~$1.61 USD** |

**Cobramos al cliente:** 1,500 tokens KREOON
**Margen:** depende del precio interno del token

---

## 4. Health check

Verifica que la función está desplegada y la key configurada:

```bash
curl -X GET https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/apify-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Respuesta esperada:
```json
{
  "status": "ok",
  "service": "apify-scraper",
  "api_key_configured": true,
  "max_competitors": 5,
  "max_results_per_source": 20,
  "actors": ["apify/facebook-ads-scraper", "clockworks/free-tiktok-scraper", "apify/instagram-scraper"]
}
```

Si `api_key_configured` es `false`, debes configurar `APIFY_API_KEY` en los secrets de Supabase.

---

## 5. Test de scraping completo

```bash
curl -X POST https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/apify-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Gomitas funcionales para niños",
    "productCategory": "suplementos infantiles",
    "competitors": [
      { "name": "Smarty Pants", "instagram": "smartypantsvitamins", "tiktok": "smartypants" },
      { "name": "Gummy Bears", "instagram": "vitafusion" }
    ],
    "keywords": ["vitaminas niños", "gomitas", "concentración"],
    "country": "Colombia"
  }' | jq .
```

Respuesta exitosa:
```json
{
  "success": true,
  "data": {
    "scraping_summary": {
      "competitors_scraped": 2,
      "total_ads_found": 24,
      "total_tiktok_posts": 18,
      "total_instagram_posts": 17,
      "scraped_at": "2026-05-08T..."
    },
    "competitors": [...]
  },
  "elapsed_seconds": 84.3,
  "message": "Scraped 2 competitors successfully"
}
```

**Tiempo esperado:** 60-180s (depende del tamaño de las cuentas y disponibilidad de Apify)

---

## 6. Graceful degradation

La función está diseñada para **fallar gracefully**:

- Si `APIFY_API_KEY` no está configurada → retorna 400 con hint claro
- Si un actor falla → continúa con los otros 2 actors
- Si un competidor falla → continúa con los siguientes
- Si todo falla → retorna `{ success: false, data: null }` sin romper

El pipeline del ADN Recargado podrá usar `apifyData` si está disponible, o continuar sin él si no.

---

## 7. Próxima fase: integración con `generate-full-research`

Una vez verificado que `apify-scraper` funciona aisladamente, la integración con el pipeline del ADN será:

1. **Phase 0 (market_overview)** dispara Apify después de cargar DNAs
2. Resultado se guarda en `sales_angles_data.apifyData` (sin migración necesaria)
3. **Phases 3, 5, 6, 9, 10, 12, 14** (competitors, differentiation, sales_angles, video_creatives, content_calendar, landing_pages, paid_ads) lo leen vía `reconstructPrevResults` y lo inyectan en sus prompts via `formatApifyForPrompt(apifyData, "ads")`
4. `research_progress.apifyStatus` lo expone al frontend (polling existente)

---

## 8. Deploy

```bash
npx supabase functions deploy apify-scraper
```

El `verify_jwt = true` está en `supabase/config.toml` — solo usuarios autenticados pueden invocarla.
