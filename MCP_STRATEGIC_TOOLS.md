# MCP Strategic Tools — Kreoon
*Versión 1.0 | 2026-05-08*
*El OS para Creadores, abierto a Agentes IA*

---

## 1. HERRAMIENTAS DISPONIBLES (26 Tools)

### Grupo 1: 🎬 GUIONES INTELIGENTES (4 tools)

---

#### `generate_script`
Genera guiones UGC listos para grabar usando el sistema ESFERA de Kreoon (framework de 5 fases: Exposición, Situación, Fricción, Evolución, Resultado, Acción).

**Input:**
```json
{
  "product_id": "uuid",
  "style": "viral | professional | funny | educational | ugc",
  "platform": "tiktok | instagram | youtube | reels | linkedin",
  "tone": "casual | formal | humorous | emotional | educational",
  "hooks_count": 3,
  "max_seconds": 60,
  "sales_angle": "string (opcional — si no se pasa, se usa el del product DNA)",
  "audience_country": "CO | MX | US | PE | CL | AR | BR"
}
```

**Output:**
```json
{
  "scripts": [
    {
      "id": "uuid",
      "hook": "string — primeros 3 segundos",
      "hook_variants": ["string", "string", "string"],
      "body": "string — desarrollo completo con marcas [ACCIÓN]",
      "cta": "string",
      "duration_estimate_seconds": 45,
      "platform_tips": {
        "tiktok": "Primeros 2s en pantalla, música trending",
        "instagram": "Ratio 9:16, subtítulos desde seg 1"
      },
      "emotion_map": {
        "opening": "curiosidad",
        "middle": "identificación",
        "close": "urgencia"
      }
    }
  ],
  "metadata": {
    "product_name": "string",
    "model_used": "perplexity | gemini | openai",
    "tokens_used": 1200,
    "generated_at": "ISO8601"
  }
}
```

**Edge Function:** `multi-ai` (prompt de `src/lib/prompts/scripts/creator.ts`)
**Auth scope:** `write:scripts`
**Rate limit:** 10 req/min | 100 req/día
**Costo:** 50 AI tokens / script generado

---

#### `improve_script`
Mejora un guion existente con feedback específico o enfoque de optimización. Usa los 14 AI Skills de Kreoon (hooks-specialist, virality-optimizer, cta-specialist, emotion-architect, etc.)

**Input:**
```json
{
  "script_id": "uuid (content.id en DB)",
  "feedback": "Más humor, menos texto en el medio",
  "focus": "engagement | conversions | watch_time | virality",
  "ab_variants": 2,
  "skills_to_apply": ["hooks-specialist", "cta-specialist", "virality-optimizer"]
}
```

**Output:**
```json
{
  "original_script": "string",
  "original_score": 72,
  "variants": [
    {
      "variant_id": "A",
      "script": "string",
      "changes_summary": "Hook más directo, CTA con urgencia",
      "predicted_improvement": "+18% watch time",
      "skills_applied": ["hooks-specialist", "emotion-architect"]
    }
  ],
  "recommendations": [
    "Añadir texto en pantalla en los primeros 3 segundos",
    "Usar música de tendencia en TikTok Colombia"
  ]
}
```

**Auth scope:** `write:scripts`
**Rate limit:** 20 req/min
**Costo:** 30 AI tokens / mejora

---

#### `adapt_script_for_platform`
Adapta un guion existente a las especificaciones y algoritmo de otra plataforma.

**Input:**
```json
{
  "script_id": "uuid",
  "target_platform": "tiktok | instagram | youtube | linkedin | twitter",
  "audience_segment": "Gen Z | Millennials | B2B | 25-35 professionals",
  "include_hashtags": true,
  "include_posting_time": true
}
```

**Output:**
```json
{
  "adapted_script": "string",
  "platform_specs": {
    "optimal_duration_seconds": 45,
    "aspect_ratio": "9:16",
    "caption_max_chars": 2200,
    "hashtag_slots": 5
  },
  "hashtag_recommendations": ["#ugccolombia", "#creadordecontenido"],
  "best_posting_times": ["Martes 7pm", "Jueves 12pm", "Domingo 9pm"],
  "caption": "string — texto para el post",
  "platform_tips": ["string"]
}
```

**Auth scope:** `read:scripts, write:scripts`
**Rate limit:** 30 req/min
**Costo:** 20 AI tokens

---

#### `generate_hooks_library`
Genera una biblioteca de hooks para un producto, organizados por emoción y estimación de CTR.

**Input:**
```json
{
  "product_id": "uuid",
  "niche": "skincare | fintech | fitness | education | ecommerce",
  "emotions": ["curiosidad", "miedo", "humor", "sorpresa", "identificación"],
  "hook_count": 15,
  "platform": "tiktok | instagram | youtube",
  "country": "CO | MX | US"
}
```

**Output:**
```json
{
  "hooks": [
    {
      "text": "string — gancho exacto ≤ 3 segundos",
      "emotion": "curiosidad",
      "format": "pregunta | afirmación | dato | historia | controversia",
      "ctr_estimate": 4.2,
      "duration_seconds": 2.5
    }
  ],
  "hook_sequences": [
    "Hook para TOFU → Hook para MOFU → Hook para BOFU"
  ],
  "top_3_recommended": ["string", "string", "string"]
}
```

**Auth scope:** `write:scripts`
**Rate limit:** 5 req/min
**Costo:** 80 AI tokens / librería

---

### Grupo 2: 🧬 ADN & RESEARCH INTELIGENTE (4 tools)

---

#### `start_adn_research`
Inicia el proceso de investigación ADN de 22 pasos para un producto. Proceso async — retorna `session_id` para polling.

**Input:**
```json
{
  "product_id": "uuid",
  "organization_id": "uuid",
  "config": {
    "include_client_dna": true,
    "include_social_intelligence": true,
    "include_ad_intelligence": false,
    "depth": "quick | detailed | comprehensive",
    "locations": ["Colombia", "México"]
  }
}
```

**Output:**
```json
{
  "success": true,
  "session_id": "uuid",
  "status": "gathering",
  "estimated_minutes": 10,
  "token_cost": 2400,
  "balance_after": 12600,
  "polling_endpoint": "GET /mcp/v1/adn/status/{session_id}"
}
```

**Edge Function:** `adn-orchestrator`
**Auth scope:** `write:research`
**Rate limit:** 2 req/min | 20 req/día (costo alto)
**Prerrequisitos:** `ai_token_balances.balance_total >= 2400`
**Errores:**
- `402` — tokens insuficientes (`current_balance`, `required_tokens` en body)
- `409` — ya existe sesión activa para ese producto

---

#### `get_adn_status`
Consulta el estado de una sesión ADN en curso.

**Input:**
```json
{
  "session_id": "uuid"
}
```

**Output:**
```json
{
  "session_id": "uuid",
  "status": "pending | gathering | researching | completed | error",
  "progress": {
    "current_step": 14,
    "total_steps": 22,
    "percentage": 63,
    "step_label": "Análisis de competencia LATAM",
    "steps_completed": ["market_overview", "avatar_definition", "pain_points"]
  },
  "result": null,
  "error_message": null,
  "started_at": "ISO8601",
  "estimated_completion": "ISO8601"
}
```

**Cuando `status = "completed"`:**
```json
{
  "result": {
    "market_overview": "string",
    "unique_selling_proposition": "string",
    "target_avatar": { "age": "25-35", "job": "...", "pain": "..." },
    "pain_points": ["string"],
    "transformation_promise": "string",
    "competitive_advantage": ["string"],
    "positioning_angle": "string",
    "sales_angles": [{ "angle": "string", "hook": "string", "cta": "string" }],
    "content_strategy": { "pillars": ["string"], "formats": ["string"] },
    "competitor_analysis": [{ "name": "string", "strengths": [], "weaknesses": [] }]
  }
}
```

**Auth scope:** `read:research`
**Rate limit:** 60 req/min (polling)

---

#### `search_market_intelligence`
Busca inteligencia de mercado usando Perplexity AI con contexto de LATAM.

**Input:**
```json
{
  "query": "growth hacking tools para ecommerce LATAM 2026",
  "market": "latam | global | colombia | mexico | usa",
  "include_statistics": true,
  "include_competitors": true,
  "max_results": 10
}
```

**Output:**
```json
{
  "insights": [
    {
      "title": "string",
      "content": "string",
      "source": "URL",
      "relevance_score": 87,
      "key_data_points": { "stat1": "...", "stat2": "..." }
    }
  ],
  "market_trends": ["string"],
  "opportunities": ["string"],
  "key_statistics": {
    "market_size": "USD 2.3B",
    "growth_rate": "23% YoY",
    "key_players": ["string"]
  },
  "model_used": "perplexity",
  "sources_count": 8
}
```

**Auth scope:** `read:research`
**Rate limit:** 10 req/min
**Costo:** 100 AI tokens

---

#### `get_product_dna_result`
Retorna el resultado completo del ADN de un producto ya procesado.

**Input:**
```json
{
  "product_id": "uuid",
  "sections": ["market_overview", "avatar", "angles", "competition", "content_strategy"]
}
```

**Output:** Objeto con las secciones solicitadas del `products.full_research_v3`.

**Auth scope:** `read:research`
**Rate limit:** 60 req/min

---

### Grupo 3: 🎯 PERFIL MARKETPLACE INTELIGENTE (4 tools)

---

#### `get_creator_public_profile`
Retorna el perfil público de un creador — solo datos públicos.

**Input:**
```json
{
  "creator_id": "uuid",
  "username": "string (alternativo a creator_id)",
  "include_portfolio": true,
  "include_reviews": true,
  "include_services": true
}
```

**Output:**
```json
{
  "profile": {
    "id": "uuid",
    "display_name": "string",
    "username": "string",
    "slug": "string",
    "bio": "string",
    "avatar_url": "string",
    "banner_url": "string",
    "location_city": "string",
    "location_country": "CO",
    "country_flag": "🇨🇴",
    "primary_role": "content_creator",
    "categories": ["lifestyle", "fitness"],
    "content_types": ["ugc", "reels"],
    "languages": ["es", "en"],
    "platforms": ["instagram", "tiktok"],
    "social_links": { "instagram": "@...", "tiktok": "@..." },
    "level": "bronze | silver | gold | diamond",
    "is_verified": true,
    "is_available": true,
    "base_price": 150,
    "currency": "USD",
    "accepts_product_exchange": false,
    "response_time_hours": 24,
    "rating_avg": 4.8,
    "rating_count": 23,
    "completed_projects": 47,
    "on_time_delivery_pct": 98,
    "profile_completeness": 85,
    "trust_score": 87.5,
    "search_score": 92,
    "subscription_tier": "creator_free | creator_pro",
    "showreel_url": "string"
  },
  "portfolio": {
    "items": [{ "id": "uuid", "title": "...", "thumbnail_url": "...", "platform": "...", "type": "video | image" }]
  },
  "services": [
    { "service_type": "ugc_video_30s", "price": 150, "delivery_days": 5, "description": "..." }
  ],
  "reviews": {
    "avg_rating": 4.8,
    "items": [{ "rating": 5, "comment": "...", "reviewer_name": "...", "date": "..." }]
  },
  "data_classification": "PUBLIC_ONLY"
}
```

**Auth scope:** `read:profiles` (o sin auth para datos públicos)
**Rate limit:** 120 req/min

---

#### `optimize_creator_profile`
Analiza el perfil de un creador con IA y sugiere mejoras específicas para aumentar visibilidad y conversiones.

**Input:**
```json
{
  "creator_id": "uuid",
  "focus": "visibility | conversions | premium_leads | trust_score",
  "apply_changes": false
}
```

**Output:**
```json
{
  "current_scores": {
    "profile_completeness": 65,
    "search_score": 71,
    "trust_score": 60,
    "ranking_tier": "standard"
  },
  "improvements": [
    {
      "field": "bio",
      "current_value": "Soy creador de contenido",
      "suggested_value": "Creador UGC con +50 proyectos para marcas en LATAM...",
      "impact": "high",
      "score_gain": 8,
      "reason": "Bio con <100 chars pierde 5 puntos en profile_completeness"
    },
    {
      "field": "portfolio_videos",
      "current_value": "1 video",
      "suggested_value": "Mínimo 3 videos en HD",
      "impact": "high",
      "score_gain": 12,
      "reason": "Portfolio con <3 videos pierde posición en ranking"
    }
  ],
  "projected_scores": {
    "profile_completeness": 88,
    "search_score": 91,
    "trust_score": 82,
    "ranking_tier": "rising"
  },
  "estimated_lead_increase": "+35% en 30 días"
}
```

**Auth scope:** `write:profiles`
**Rate limit:** 10 req/min
**Costo:** 30 AI tokens

---

#### `update_creator_profile`
Actualiza campos del perfil de un creador.

**Input:**
```json
{
  "creator_id": "uuid",
  "updates": {
    "bio": "string",
    "categories": ["lifestyle", "fitness"],
    "content_types": ["ugc", "reels"],
    "base_price": 200,
    "currency": "USD",
    "languages": ["es", "en"],
    "is_available": true,
    "response_time_hours": 12,
    "accepts_product_exchange": false,
    "social_links": { "instagram": "@handle", "tiktok": "@handle" }
  }
}
```

**Output:**
```json
{
  "updated": true,
  "profile_completeness_before": 65,
  "profile_completeness_after": 78,
  "search_score_impact": "+12 puntos",
  "warnings": ["La bio tiene menos de 100 caracteres — recomendamos ampliarla"]
}
```

**Auth scope:** `write:profiles`
**Rate limit:** 30 req/min

---

#### `generate_portfolio_description`
Genera una descripción optimizada para un item del portfolio.

**Input:**
```json
{
  "portfolio_item_id": "uuid",
  "video_context": "string — descripción de lo que muestra el video",
  "include_metrics": true,
  "tone": "casual | professional | creative",
  "include_seo_tags": true
}
```

**Output:**
```json
{
  "description": "string — descripción atractiva para el portfolio",
  "highlights": ["Grabado en 4K", "Storytelling emocional", "CTA directo"],
  "seo_tags": ["#ugc", "#contentcreator", "#colombia"],
  "character_count": 245
}
```

**Auth scope:** `write:profiles`
**Rate limit:** 30 req/min
**Costo:** 20 AI tokens

---

### Grupo 4: 🔍 BÚSQUEDA INTELIGENTE DE PERFILES (4 tools)

---

#### `search_creators`
Búsqueda avanzada de creadores con filtros, scoring y ranking del marketplace de Kreoon.

**Input:**
```json
{
  "query": "ugc creators fitness Colombia",
  "filters": {
    "primary_role": ["content_creator", "editor"],
    "categories": ["fitness", "lifestyle"],
    "content_types": ["ugc", "reels"],
    "languages": ["es"],
    "location_country": ["CO", "MX"],
    "is_available": true,
    "is_verified": true,
    "min_rating": 4.0,
    "max_base_price": 300,
    "min_completed_projects": 5,
    "level": ["silver", "gold"],
    "accepts_product_exchange": false
  },
  "sort_by": "ranking | profile_completeness | rating_avg | base_price | recent_activity",
  "limit": 20,
  "offset": 0
}
```

**Output:**
```json
{
  "creators": [
    {
      "id": "uuid",
      "display_name": "string",
      "username": "string",
      "avatar_url": "string",
      "primary_role": "content_creator",
      "categories": ["fitness"],
      "base_price": 180,
      "currency": "USD",
      "rating_avg": 4.9,
      "completed_projects": 52,
      "is_verified": true,
      "level": "gold",
      "location_country": "CO",
      "search_score": 94,
      "ranking_tier": "top",
      "profile_completeness": 92,
      "is_available": true,
      "portfolio_preview": [
        { "thumbnail_url": "string", "type": "video" }
      ]
    }
  ],
  "pagination": {
    "total": 147,
    "limit": 20,
    "offset": 0,
    "has_more": true
  },
  "search_metadata": {
    "filters_applied": 5,
    "query_time_ms": 45
  }
}
```

**Auth scope:** `read:profiles` (o sin auth para búsqueda pública)
**Rate limit:** 60 req/min

---

#### `score_creator_for_campaign`
Calcula qué tan buen fit es un creador para una campaña específica usando IA de matching.

**Input:**
```json
{
  "creator_id": "uuid",
  "campaign_id": "uuid"
}
```

**Output:**
```json
{
  "overall_score": 87,
  "recommendation": "highly_recommended | good_fit | consider | not_recommended",
  "score_breakdown": {
    "experience_match": 90,
    "style_fit": 85,
    "availability_fit": 100,
    "budget_fit": 80,
    "portfolio_quality": 88,
    "review_score": 95,
    "location_match": 100
  },
  "reasoning": [
    "9 proyectos de fitness completados — alta experiencia en el nicho",
    "Tarifa dentro del presupuesto de la campaña",
    "Ubicación en Colombia — mercado objetivo"
  ],
  "red_flags": [],
  "model_confidence": 0.91
}
```

**Edge Function:** `ai-creator-matching`
**Auth scope:** `read:profiles, read:campaigns`
**Rate limit:** 30 req/min
**Costo:** 40 AI tokens

---

#### `get_trending_creators`
Retorna los creadores con mejor performance en un período.

**Input:**
```json
{
  "category": "fitness | lifestyle | tech | beauty | food",
  "country": "CO | MX | US | LATAM",
  "timeframe": "7d | 30d | 90d",
  "limit": 10
}
```

**Output:**
```json
{
  "creators": [{ "...profile_summary..." }],
  "trends": {
    "emerging_categories": ["fintech ugc", "health & wellness"],
    "growing_demand": ["short-form video", "product review ugc"],
    "avg_rate_trend": "+12% vs período anterior",
    "top_languages": ["es", "pt"]
  }
}
```

**Auth scope:** `read:profiles`
**Rate limit:** 30 req/min

---

#### `get_talent_matching_for_product`
Recomienda los mejores creadores para un producto/brief específico con IA.

**Input:**
```json
{
  "product_id": "uuid",
  "role_needed": "creator | editor | both",
  "budget_max": 500,
  "deadline": "ISO8601",
  "max_results": 5
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "creator_id": "uuid",
      "display_name": "string",
      "confidence": 88,
      "fit_score": 91,
      "reasoning": "Experiencia en skincare, avatar similar, disponible esta semana",
      "estimated_cost": 220
    }
  ],
  "alternatives": [{ "creator_id": "uuid", "fit_score": 76 }]
}
```

**Edge Function:** `ai-creator-matching` (con prompt de `src/lib/ai/prompts/talent.ts`)
**Auth scope:** `read:profiles, read:research`
**Rate limit:** 10 req/min
**Costo:** 60 AI tokens

---

### Grupo 5: 📱 INTEGRACIÓN REDES SOCIALES (4 tools)

---

#### `publish_to_social`
Publica contenido en múltiples plataformas sociales simultáneamente o con programación.

**Input:**
```json
{
  "creator_id": "uuid",
  "content": {
    "caption": "string",
    "video_url": "string (URL de Bunny CDN)",
    "images": ["string"],
    "hashtags": ["#ugccolombia"],
    "mentions": ["@marca"]
  },
  "platforms": {
    "instagram": { "scheduled_at": null, "story": false },
    "tiktok": { "scheduled_at": "ISO8601", "privacy": "public" },
    "youtube": { "scheduled_at": null, "visibility": "public", "title": "string" },
    "linkedin": { "scheduled_at": null }
  }
}
```

**Output:**
```json
{
  "published": [
    {
      "platform": "instagram",
      "post_id": "string",
      "url": "https://instagram.com/p/...",
      "status": "published | scheduled | failed",
      "scheduled_for": null
    }
  ],
  "errors": [
    { "platform": "tiktok", "error": "Token expirado — reconectar cuenta" }
  ],
  "summary": { "success": 2, "failed": 1, "scheduled": 0 }
}
```

**Edge Function:** `social-publish`
**Auth scope:** `write:social`
**Rate limit:** 5 req/min
**Prerrequisito:** `social_accounts` con tokens activos para las plataformas

---

#### `schedule_content_batch`
Programa un lote de publicaciones con estrategia de posting óptima.

**Input:**
```json
{
  "creator_id": "uuid",
  "posts": [
    {
      "content_id": "uuid (content.id)",
      "platforms": ["instagram", "tiktok"],
      "caption": "string",
      "preferred_date": "ISO8601"
    }
  ],
  "strategy": "daily | every_other_day | weekdays | custom",
  "start_date": "ISO8601",
  "optimize_times": true
}
```

**Output:**
```json
{
  "scheduled_count": 5,
  "schedule": [
    { "post_index": 0, "platform": "instagram", "scheduled_at": "ISO8601", "reasoning": "Martes 7pm — mejor engagement histórico" }
  ],
  "calendar_preview": [
    { "date": "2026-05-12", "posts": 2, "platforms": ["instagram", "tiktok"] }
  ]
}
```

**Auth scope:** `write:social`
**Rate limit:** 10 req/min

---

#### `get_social_analytics`
Retorna métricas de cuentas sociales conectadas.

**Input:**
```json
{
  "creator_id": "uuid",
  "platforms": ["instagram", "tiktok"],
  "timeframe": "7d | 30d | 90d",
  "include_top_posts": true
}
```

**Output:**
```json
{
  "analytics": [
    {
      "platform": "instagram",
      "followers": 45200,
      "following": 1200,
      "engagement_rate": 4.7,
      "avg_reach": 12000,
      "avg_impressions": 18000,
      "follower_growth_pct": 3.2,
      "best_posting_time": "Martes 7pm - 9pm",
      "top_posts": [
        { "post_id": "...", "impressions": 85000, "engagement_rate": 8.2 }
      ]
    }
  ],
  "cross_platform_insights": [
    "TikTok genera 3x más alcance que Instagram para tu nicho",
    "Mejor día de publicación: Martes y Jueves"
  ]
}
```

**Edge Function:** `social-metrics`
**Auth scope:** `read:social`
**Rate limit:** 30 req/min

---

#### `sync_social_to_portfolio`
Sincroniza los mejores posts de redes sociales al portfolio del creador.

**Input:**
```json
{
  "creator_id": "uuid",
  "platforms": ["instagram", "tiktok"],
  "min_engagement_rate": 3.0,
  "max_items": 12,
  "overwrite_existing": false
}
```

**Output:**
```json
{
  "synced_items": 8,
  "skipped_duplicates": 3,
  "portfolio_count_before": 5,
  "portfolio_count_after": 13,
  "synced_posts": [
    { "platform": "instagram", "post_id": "...", "engagement_rate": 6.2, "thumbnail_url": "..." }
  ]
}
```

**Auth scope:** `write:profiles, read:social`
**Rate limit:** 5 req/min

---

### Grupo 6: 💰 FINANZAS & PAYOUTS (6 tools)

---

#### `get_wallet_overview`
Retorna el resumen financiero completo del wallet de un creador.

**Input:**
```json
{
  "creator_id": "uuid",
  "timeframe": "30d | 90d | ytd | all",
  "include_breakdown": true
}
```

**Output:**
```json
{
  "wallet": {
    "id": "uuid",
    "available_balance": 1250.00,
    "pending_balance": 350.00,
    "reserved_balance": 0.00,
    "total_earned": 5800.00,
    "total_withdrawn": 4200.00,
    "total_spent": 350.00,
    "currency": "USD",
    "stripe_connect_status": "active | not_connected | pending_verification",
    "payout_method": "stripe_connect | bank_transfer | mercury"
  },
  "period_summary": {
    "earned": 1200.00,
    "withdrawn": 800.00,
    "fees_paid": 45.00,
    "net": 1155.00
  },
  "monthly_breakdown": [
    { "month": "2026-04", "earned": 650.00, "withdrawn": 400.00, "net": 250.00 }
  ]
}
```

**Auth scope:** `read:wallet`
**Rate limit:** 60 req/min
**Restricción:** Solo retorna datos del `creator_id` autenticado (owner-only)

---

#### `get_transaction_history`
Historial paginado de transacciones del wallet.

**Input:**
```json
{
  "creator_id": "uuid",
  "type": "all | earned | withdrawn | spent | referral | refund",
  "status": "completed | pending | failed",
  "date_from": "ISO8601",
  "date_to": "ISO8601",
  "limit": 20,
  "offset": 0
}
```

**Output:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "escrow_release",
      "amount": 350.00,
      "currency": "USD",
      "description": "Pago - Proyecto UGC Fitness Brand",
      "project_id": "uuid",
      "campaign_id": "uuid",
      "status": "completed",
      "date": "ISO8601",
      "balance_after": 1250.00
    }
  ],
  "pagination": { "total": 47, "limit": 20, "offset": 0 }
}
```

**Auth scope:** `read:wallet`
**Rate limit:** 60 req/min

---

#### `request_withdrawal`
Solicita un retiro de fondos del wallet.

**Input:**
```json
{
  "creator_id": "uuid",
  "amount": 500.00,
  "currency": "USD",
  "method": "stripe_connect | mercury | bank_transfer",
  "payment_details": {
    "stripe_account_id": "acct_xxx",
    "mercury_email": "creator@email.com",
    "bank_account_number": "...",
    "bank_routing": "..."
  },
  "notes": "Retiro mensual"
}
```

**Output:**
```json
{
  "withdrawal_id": "uuid",
  "status": "pending",
  "amount": 500.00,
  "fee": 5.00,
  "fee_percentage": 1.0,
  "net_amount": 495.00,
  "currency": "USD",
  "method": "stripe_connect",
  "estimated_arrival": "2026-05-10T00:00:00Z",
  "balance_after_request": 750.00
}
```

**Edge Function:** (crea `withdrawal_requests`, admin procesa con `wallet-process-withdrawal`)
**Auth scope:** `write:withdrawal`
**Rate limit:** 3 req/day (por seguridad)
**Prerrequisito:** `available_balance >= amount`, método de pago configurado

---

#### `get_subscription_status`
Retorna el estado de la suscripción y límites del plan.

**Input:**
```json
{
  "user_id": "uuid",
  "organization_id": "uuid (alternativo)"
}
```

**Output:**
```json
{
  "subscription": {
    "tier": "creator_free | creator_pro | agency | enterprise",
    "status": "trialing | active | paused | cancelled",
    "price_monthly": 29.00,
    "currency": "USD",
    "billing_cycle": "monthly | annual",
    "trial_ends_at": "ISO8601",
    "current_period_end": "ISO8601",
    "cancel_at_period_end": false
  },
  "plan_limits": {
    "ai_tokens_monthly": 5000,
    "max_portfolio_items": 30,
    "max_active_projects": 10,
    "social_scheduling": true,
    "advanced_analytics": false,
    "white_label": false,
    "api_access": true
  },
  "usage": {
    "ai_tokens_used": 2300,
    "ai_tokens_remaining": 2700,
    "portfolio_items": 12,
    "active_projects": 3
  }
}
```

**Auth scope:** `read:subscription`
**Rate limit:** 60 req/min

---

#### `get_referral_stats`
Estadísticas del programa de referidos del creador.

**Input:**
```json
{
  "creator_id": "uuid"
}
```

**Output:**
```json
{
  "referral_code": "CREATOR123",
  "referral_url": "https://kreoon.com/r/CREATOR123",
  "total_referred": 12,
  "active_referrals": 8,
  "total_earned_usd": 240.00,
  "pending_earnings_usd": 45.00,
  "commission_rate": 0.10,
  "payout_schedule": "monthly",
  "top_referrals": [
    { "referred_username": "...", "status": "active", "earnings_generated": 80.00 }
  ]
}
```

**Auth scope:** `read:wallet`
**Rate limit:** 30 req/min

---

#### `check_token_balance`
Consulta el saldo de tokens IA de una organización.

**Input:**
```json
{
  "organization_id": "uuid"
}
```

**Output:**
```json
{
  "balance_total": 15000,
  "balance_reserved": 2400,
  "balance_available": 12600,
  "token_costs": {
    "adn_full_research": 2400,
    "adn_tab_regenerate": 120,
    "script_generate": 50,
    "script_improve": 30,
    "hooks_library": 80,
    "creator_matching": 40,
    "market_intelligence": 100
  },
  "usage_last_30d": 8500,
  "active_sessions": 1
}
```

**Auth scope:** `read:wallet`
**Rate limit:** 60 req/min

---

## 2. AUTENTICACIÓN & SCOPES

### Generar API Key

```http
POST https://kreoon.com/api/v1/auth/api-keys
Authorization: Bearer {user_jwt}
Content-Type: application/json

{
  "name": "Mi integración n8n",
  "scopes": ["read:scripts", "write:scripts", "read:profiles", "read:wallet"],
  "organization_id": "uuid",
  "expires_at": "2027-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "api_key": "sk-kreoon-xxxxxxxxxxxxxxxxxxxxxxxx",
  "key_id": "uuid",
  "scopes": ["read:scripts", "write:scripts", "read:profiles", "read:wallet"],
  "expires_at": "2027-01-01T00:00:00Z",
  "created_at": "ISO8601"
}
```

⚠️ La key completa solo se muestra una vez. Guárdala en un vault seguro.

### Tabla de Scopes

| Scope | Acceso |
|-------|--------|
| `read:scripts` | Leer guiones propios |
| `write:scripts` | Generar y mejorar guiones |
| `read:profiles` | Leer perfiles públicos + propios |
| `write:profiles` | Actualizar perfil propio |
| `read:campaigns` | Ver campañas y aplicaciones |
| `write:campaigns` | Crear y gestionar campañas |
| `read:research` | Ver resultados ADN |
| `write:research` | Iniciar investigación ADN |
| `read:wallet` | Ver saldo y transacciones |
| `write:withdrawal` | Solicitar retiros |
| `read:social` | Ver métricas sociales |
| `write:social` | Publicar en redes sociales |
| `read:subscription` | Ver estado de suscripción |
| `admin:*` | Acceso total (requiere rol admin) |

### Uso en requests

```http
GET https://kreoon.com/mcp/v1/profiles/{creator_id}
Authorization: Bearer sk-kreoon-xxxxxxxxxxxxxxxxxxxxxxxx
X-Organization-ID: {organization_id}
Content-Type: application/json
```

### Validación interna (cada llamada)

```typescript
// 1. Verificar key válida y no expirada
const key = await db.query('SELECT * FROM mcp_api_keys WHERE key_hash = $1 AND NOT revoked', [hash])
if (!key || key.expires_at < now()) → 401

// 2. Verificar scope
if (!key.scopes.includes(required_scope)) → 403

// 3. Verificar acceso al recurso (RLS)
if (key.creator_id && resource.creator_id !== key.creator_id) → 403

// 4. Rate limit
const count = await redis.incr(`rl:${key_id}:${minute}`)
if (count > key.rate_limit_per_minute) → 429

// 5. Log de auditoría
INSERT mcp_audit_logs (key_id, action, resource_id, ip, timestamp)
```

---

## 3. EJEMPLOS FUNCIONALES

### cURL — Generar guion

```bash
curl -X POST https://kreoon.com/mcp/v1/scripts/generate \
  -H "Authorization: Bearer sk-kreoon-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "abc-123-def",
    "style": "viral",
    "platform": "tiktok",
    "tone": "casual",
    "hooks_count": 3,
    "max_seconds": 45,
    "audience_country": "CO"
  }'
```

### JavaScript — Buscar creadores

```javascript
const response = await fetch('https://kreoon.com/mcp/v1/creators/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-kreoon-xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filters: {
      categories: ['fitness', 'lifestyle'],
      location_country: ['CO'],
      is_available: true,
      max_base_price: 300
    },
    sort_by: 'ranking',
    limit: 10
  })
});
const { creators } = await response.json();
```

### JavaScript — Iniciar ADN + polling

```javascript
// 1. Iniciar research
const { session_id } = await kreoon.mcp.startAdnResearch({
  product_id: 'abc-123',
  organization_id: 'org-456',
  config: { include_client_dna: true, depth: 'comprehensive' }
});

// 2. Poll hasta completar
async function pollUntilDone(sessionId) {
  while (true) {
    const { status, progress, result } = await kreoon.mcp.getAdnStatus({ session_id: sessionId });
    console.log(`Paso ${progress.current_step}/22: ${progress.step_label}`);
    if (status === 'completed') return result;
    if (status === 'error') throw new Error('ADN falló');
    await new Promise(r => setTimeout(r, 15000)); // poll cada 15s
  }
}

const dna = await pollUntilDone(session_id);
```

### n8n — HTTP Request Node

```json
{
  "method": "POST",
  "url": "https://kreoon.com/mcp/v1/scripts/generate",
  "headers": {
    "Authorization": "Bearer {{ $credentials.kreoonApiKey }}",
    "X-Organization-ID": "{{ $node['Get Org'].data.org_id }}"
  },
  "body": {
    "product_id": "{{ $node['Trigger'].data.product_id }}",
    "style": "viral",
    "platform": "tiktok"
  }
}
```

---

## 4. SECURITY MATRIX

| Dato | Clasificación | Quién puede leerlo |
|------|--------------|-------------------|
| Nombre, bio, avatar, portfolio | PUBLIC | Cualquiera sin auth |
| Rating, completed_projects, level | PUBLIC | Cualquiera sin auth |
| Servicios y precios publicados | PUBLIC | Cualquiera con `read:profiles` |
| Saldo del wallet | PRIVATE | Solo owner con `read:wallet` |
| Historial de transacciones | PRIVATE | Solo owner con `read:wallet` |
| API keys propias | PRIVATE | Solo owner (hash en BD) |
| Tokens IA | PRIVATE | Owner + admin de la org |
| Social tokens (OAuth) | PRIVATE | Solo backend (nunca en API) |
| Datos bancarios | PRIVATE | Solo en Edge Functions admin |
| DNA privado del producto | ORG-PRIVATE | Miembros de la org |
| Información de otras personas | BLOCKED | Nunca retornar |

---

## 5. RATE LIMITS & QUOTAS

| Tool | Req/min | Req/día | AI tokens | Plan mínimo |
|------|---------|---------|-----------|-------------|
| `generate_script` | 10 | 100 | 50/script | free |
| `improve_script` | 20 | 200 | 30/mejora | free |
| `adapt_script_for_platform` | 30 | 300 | 20 | free |
| `generate_hooks_library` | 5 | 50 | 80/librería | free |
| `start_adn_research` | 2 | 20 | 2400/sesión | free |
| `get_adn_status` | 60 | — | 0 | free |
| `search_market_intelligence` | 10 | 100 | 100 | free |
| `search_creators` | 60 | 1000 | 0 | free |
| `score_creator_for_campaign` | 30 | 200 | 40 | free |
| `get_creator_public_profile` | 120 | — | 0 | free |
| `optimize_creator_profile` | 10 | 50 | 30 | free |
| `publish_to_social` | 5 | 50 | 0 | pro |
| `schedule_content_batch` | 10 | 50 | 0 | pro |
| `get_social_analytics` | 30 | 200 | 0 | free |
| `get_wallet_overview` | 60 | — | 0 | free |
| `request_withdrawal` | — | 3 | 0 | free |
| `get_transaction_history` | 60 | — | 0 | free |
| `get_talent_matching_for_product` | 10 | 50 | 60 | pro |
| `generate_portfolio_description` | 30 | 100 | 20 | free |

**Plan override:** Cuentas `enterprise` tienen límites 10x superiores.

---

## 6. AUDIT & LOGGING

Cada llamada MCP registra en `mcp_audit_logs`:

```sql
SELECT al.action, al.resource_type, al.ip_address, al.response_status,
       al.ai_tokens_used, al.created_at, ak.name as key_name
FROM mcp_audit_logs al
JOIN mcp_api_keys ak ON al.key_id = ak.id
WHERE ak.organization_id = $org_id
ORDER BY al.created_at DESC
LIMIT 100;
```

Los logs se retienen por 90 días en producción.

---

## 7. INTEGRATION PATTERNS

### n8n → Kreoon MCP

**Workflow: Nuevo brief → ADN → Scripts → Slack**
```
Trigger: Webhook (nuevo product en Kreoon)
→ HTTP Request: POST /mcp/v1/research/start
→ Wait Node: 10 min (ADN tarda ~8-10 min)
→ HTTP Request: GET /mcp/v1/research/status/{session_id}
→ IF: status === 'completed'
→ HTTP Request: POST /mcp/v1/scripts/generate
→ Slack: Enviar scripts generados al canal #contenido
```

### Make.com → Kreoon

**Módulo HTTP → Kreoon API:**
```
Método: POST
URL: https://kreoon.com/mcp/v1/scripts/generate
Headers: Authorization: Bearer {{API_KEY}}
Body (JSON): { "product_id": "...", "style": "viral" }
```

### Zapier → Kreoon

```
Trigger: New row in Google Sheets (nuevo brief)
→ Action: Webhook POST → https://kreoon.com/mcp/v1/scripts/generate
→ Action: Send Email (con el guion generado)
```

---

## 8. WEBHOOK EVENTS

Kreoon emite eventos a endpoints registrados:

### Registrar webhook

```http
POST https://kreoon.com/api/v1/webhooks
Authorization: Bearer {api_key}

{
  "url": "https://tu-servidor.com/kreoon-events",
  "events": ["script.generated", "adn.completed", "payment.released"],
  "secret": "tu-secreto-hmac"
}
```

### Eventos disponibles

| Evento | Descripción | Payload clave |
|--------|-------------|---------------|
| `script.generated` | Guion creado | `{script_id, product_id, platform}` |
| `adn.completed` | Research ADN terminado | `{session_id, product_id, status}` |
| `adn.failed` | Research falló | `{session_id, error_message}` |
| `campaign.published` | Campaña activa | `{campaign_id, budget, platform}` |
| `application.accepted` | Creador aceptado | `{application_id, creator_id, campaign_id}` |
| `delivery.submitted` | Entregable enviado | `{delivery_id, project_id, file_url}` |
| `payment.released` | Pago liberado | `{amount, currency, recipient_id}` |
| `withdrawal.completed` | Retiro completado | `{withdrawal_id, amount, method}` |
| `withdrawal.failed` | Retiro rechazado | `{withdrawal_id, rejection_reason}` |
| `profile.verified` | Perfil verificado | `{creator_id}` |

### Verificar firma HMAC

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === `sha256=${expected}`;
}
```

---

## 9. ERROR CODES

| Código | Error | Solución |
|--------|-------|---------|
| `401` | API key inválida o expirada | Regenerar key |
| `403` | Scope insuficiente | Añadir scope al generar key |
| `402` | Tokens IA insuficientes | Recargar tokens ADN |
| `404` | Recurso no encontrado | Verificar IDs |
| `409` | Conflicto — operación duplicada | Esperar o cancelar operación activa |
| `422` | Input inválido | Verificar tipos y campos requeridos |
| `429` | Rate limit excedido | Esperar `Retry-After` en headers |
| `500` | Error interno | Reintentar con backoff exponencial |
| `503` | Edge function no disponible | Reintentar en 30s |

### Retry logic recomendado

```javascript
async function kreoonRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = err.headers['retry-after'] || (2 ** i * 1000);
        await new Promise(r => setTimeout(r, retryAfter));
      } else if (err.status >= 500) {
        await new Promise(r => setTimeout(r, 2 ** i * 1000));
      } else {
        throw err; // 4xx sin retry
      }
    }
  }
}
```

---

## 10. ROADMAP

### v1.1 (próximo mes)
- `bulk_generate_scripts` — múltiples guiones en un call
- `generate_content_calendar` — calendario editorial del mes
- `analyze_competitor_profile` — análisis de perfiles de competencia

### v1.2
- `stream_script_generation` — streaming SSE del guion mientras se genera
- `voice_clone_script` — guion adaptado para ElevenLabs (voz del creador)
- `video_brief_from_url` — analiza un video y genera brief automático

### v2.0
- SDK oficial (TypeScript + Python)
- GraphQL API adicional
- MCP nativo para Claude Desktop
- Webhooks en tiempo real (WebSockets)
- Sandbox de pruebas aislado
