# MCP Architecture Document — Kreoon
*Generado automáticamente: 2026-05-08*
*Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc*

---

## 1. INVENTORY

### 1.1 Tablas (480+ en producción)

**Tablas activas por dominio:**

#### Core / Auth
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `profiles` | id (uuid, FK→auth.users), full_name, avatar_url, bio, country, city, account_type | ✅ | Perfil público de usuario |
| `organizations` | id, name, slug, plan, owner_id, settings (jsonb) | ✅ | Tenant principal |
| `organization_members` | id, organization_id, user_id, active_role, joined_at | ✅ | Multi-tenant bridge |
| `organization_member_roles` | member_id, role (AppRole) | ✅ | Roles múltiples por miembro |
| `organization_member_badges` | member_id, badge_level (bronze/silver/gold) | ✅ | Sistema ambassador (no es rol) |
| `organization_invitations` | org_id, email, role, token, expires_at | ✅ | Invitaciones pendientes |
| `organization_join_requests` | org_id, user_id, status, message | ✅ | Solicitudes de acceso |
| `user_roles` | user_id, role, organization_id | ✅ | Roles globales de plataforma |
| `known_devices` | user_id, device_fingerprint, trusted | ✅ | Seguridad 2FA |
| `login_history` | user_id, ip, user_agent, success | ✅ | Auditoría de acceso |
| `audit_logs` | user_id, action, table_name, record_id, changes (jsonb) | ✅ | Log de cambios |
| `api_keys` | user_id, key_hash, scope, last_used | ✅ | API keys para integraciones |

#### Contenido
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `clients` | id, org_id, name, industry, logo_url | ✅ | Clientes de la agencia |
| `products` | id, client_id, name, description, strategy, brief_data (jsonb), brief_status, research_progress (jsonb), full_research_v3 (jsonb), research_v3_progress (jsonb), business_type, deleted_at | ✅ | Core: brief + research |
| `content` | id, product_id, status, script, recorded_url, edited_url, assigned_creator_id, assigned_editor_id | ✅ | Pieza de contenido |
| `content_history` | content_id, changed_by, old_status, new_status, changed_at | ✅ | Auditoría de estados |
| `content_comments` | content_id, user_id, body, timestamp_ref | ✅ | Comentarios con timestamp |
| `content_script_versions` | content_id, version, script, created_by | ✅ | Versionado de guiones |
| `content_collaborators` | content_id, user_id, role | ✅ | Acceso compartido |
| `content_status_logs` | content_id, old_status, new_status | ✅ | Transiciones de estado |
| `content_licenses` | content_id, client_id, type, expires_at | ✅ | Licencias de uso |
| `organization_statuses` | org_id, name, color, order, type (board/content) | ✅ | Estados personalizados |
| `board_settings` | org_id, columns_config (jsonb) | ✅ | Config kanban |

#### ADN Research (IA)
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `adn_research_sessions` | id, product_id, org_id, status, progress (jsonb), result (jsonb), error_message, token_cost | ✅ | Sesiones de investigación IA 22 pasos |
| `adn_prompts` | id, step_key, prompt_text, version | ✅ (service_role) | Prompts de cada paso ADN |
| `product_dna` | id, product_id, dna_data (jsonb), version | ✅ | DNA generado del producto |
| `client_dna` | id, client_id, dna_data (jsonb) | ✅ | DNA del cliente/marca |
| `talent_dna` | id, user_id, dna_data (jsonb) | ✅ | DNA del creador |
| `ai_token_balances` | org_id, balance_total, balance_reserved | ✅ | Saldo de tokens IA |
| `ai_token_transactions` | org_id, amount, type, reference_id, created_at | ✅ | Movimientos de tokens |
| `ai_tokenization_config` | action_type, token_cost | ✅ (public read) | Costos por acción |
| `ai_usage_logs` | org_id, function_name, tokens_used, model | ✅ | Log de uso IA |
| `ai_prompt_config` | org_id, context, prompt_text | ✅ | Prompts custom por org |
| `ai_assistant_config` | org_id, model, temperature, system_prompt | ✅ | Config asistente IA |
| `ai_assistant_knowledge` | org_id, content, category | ✅ | Base de conocimiento |

#### Marketplace
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `marketplace_campaigns` | id, org_id, title, description, budget, pricing_mode (fixed/auction/range), status, requirements (jsonb) | ✅ | Campaña pública |
| `campaign_applications` | campaign_id, creator_id, status, bid_amount, proposal | ✅ | Aplicaciones de creadores |
| `marketplace_contracts` | campaign_id, creator_id, brand_id, terms (jsonb), status | ✅ | Contratos firmados |
| `marketplace_contract_deliverables` | contract_id, title, due_date, status | ✅ | Entregables del contrato |
| `marketplace_proposals` | campaign_id, creator_id, message, portfolio_items | ✅ | Propuestas |
| `marketplace_projects` | id, campaign_id, creator_id, brand_id, status, deliverables (jsonb) | ✅ | Proyecto activo |
| `project_deliveries` | project_id, creator_id, file_url, bunny_video_id, status | ✅ | Entregas del proyecto |
| `campaign_invitations` | campaign_id, creator_id, status, expires_at | ✅ | Invitaciones directas |
| `campaign_media` | campaign_id, url, type | ✅ | Archivos de la campaña |
| `campaign_metrics` | campaign_id, views, clicks, conversions | ✅ | Métricas de campaña |
| `creator_profiles` | user_id, bio, specialties[], rates (jsonb), portfolio_url, verification_status | ✅ | Perfil marketplace creador |
| `creator_services` | creator_id, service_type, price, delivery_days | ✅ | Servicios ofrecidos |
| `creator_reviews` | creator_id, reviewer_id, rating, comment | ✅ | Reseñas |
| `marketplace_reviews` | project_id, reviewer_id, rating, public_comment | ✅ | Reseñas marketplace |
| `org_talent_lists` | org_id, name, description | ✅ | Listas de talento |
| `org_talent_list_members` | list_id, creator_id | ✅ | Miembros de lista |
| `marketplace_favorites` | user_id, creator_id | ✅ | Favoritos |
| `marketplace_org_invitations` | org_id, email, creator_id | ✅ | Invitaciones de org |
| `marketplace_interactions` | user_id, creator_id, type | ✅ | Interacciones |
| `marketplace_verifications` | creator_id, verified_by, verification_type | ✅ | Verificaciones |
| `marketplace_reputation` | creator_id, score, level | ✅ | Reputación marketplace |

#### Finanzas / Wallet
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `unified_wallets` | id, user_id, balance_available, balance_reserved, currency, stripe_connect_account_id, stripe_connect_status | ✅ | Wallet unificado |
| `unified_transactions` | id, wallet_id, amount, type, reference_id, reference_type, status, metadata (jsonb) | ✅ | Transacciones unificadas |
| `withdrawal_requests` | id, wallet_id, amount, method, status, stripe_transfer_id, mercury_wire_id, external_reference | ✅ | Solicitudes de retiro |
| `escrow_holds` | id, project_id, amount, status, distributions (jsonb), stripe_payment_intent_id | ✅ | Fondos en escrow |
| `payment_transactions` | id, user_id, amount, currency, gateway, status | ✅ | Transacciones de pago |
| `payment_methods` | user_id, type, stripe_payment_method_id, last4 | ✅ | Métodos de pago |
| `brand_credits` | brand_id, balance | ✅ | Créditos de marca |
| `brand_credit_transactions` | brand_id, amount, type, reference | ✅ | Movimientos de créditos |
| `exchange_rates` | from_currency, to_currency, rate, updated_at | ✅ (public read) | Tasas de cambio |
| `platform_subscriptions` | user_id, plan, status, stripe_subscription_id, current_period_end | ✅ | Suscripciones |
| `referral_codes` | user_id, code, type | ✅ | Códigos de referido |
| `referral_earnings` | referral_id, amount, status | ✅ | Ganancias por referido |
| `org_referral_commissions` | org_id, referrer_id, amount | ✅ | Comisiones org |

#### UP — Sistema de Reputación
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `up_events` | id, user_id, event_type, points, metadata (jsonb), created_at | ✅ | Eventos que dan/quitan puntos |
| `up_event_types` | code, label, points_base, role_multipliers (jsonb) | ✅ | Tipos de eventos |
| `up_user_scores` | user_id, season_id, total_points, rank | ✅ | Score por temporada |
| `up_creadores` | user_id, season_id, points, metrics (jsonb) | ✅ | Leaderboard creadores |
| `up_editores` | user_id, season_id, points | ✅ | Leaderboard editores |
| `up_seasons` | id, name, start_date, end_date, active | ✅ | Temporadas |
| `up_quests` | id, title, description, reward_points, conditions (jsonb) | ✅ | Misiones |
| `up_quest_progress` | user_id, quest_id, progress, completed_at | ✅ | Progreso de misiones |
| `up_rules` | event_type, role, multiplier, max_per_day | ✅ | Reglas de puntuación |
| `up_settings` | org_id, config (jsonb) | ✅ | Configuración UP |
| `role_archetypes` | role, archetype_name, description | ✅ | Arquetipos por rol |
| `user_reputation_totals` | user_id, total_points, season_points, rank | ✅ | Totales de reputación |
| `reputation_events` | user_id, event_type, points, reference_id | ✅ | Log de eventos (legacy) |

#### KAE — Analytics
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `kae_visitors` | id, anonymous_id, user_id, first_seen, last_seen | ✅ | Visitantes únicos |
| `kae_sessions` | id, visitor_id, org_id, started_at, ended_at, utm_source, utm_campaign | ✅ | Sesiones de visita |
| `kae_events` | id (particionado por mes), session_id, event_type, properties (jsonb), timestamp | ✅ | Eventos (particionado) |
| `kae_conversions` | id, session_id, conversion_type, value, currency | ✅ | Conversiones |
| `kae_ad_platforms` | org_id, platform, pixel_id, api_token | ✅ | Configuración pixel |
| `kae_platform_logs` | session_id, platform, event_sent, response | ✅ | Log de envío a plataformas |

#### Social & Scheduling
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `social_accounts` | user_id, platform, account_id, access_token, refresh_token, expires_at | ✅ | Cuentas sociales conectadas |
| `social_metrics` | social_account_id, date, followers, engagement_rate, impressions | ✅ | Métricas sociales |
| `social_metrics_snapshots` | account_id, snapshot_date, data (jsonb) | ✅ | Snapshots históricos |
| `scheduled_posts` | org_id, content_id, platform, scheduled_at, status, payload (jsonb) | ✅ | Posts programados |
| `social_publish_logs` | post_id, platform, status, response | ✅ | Log de publicación |
| `social_scrape_targets` | url, platform, org_id | ✅ | Targets de scraping |
| `social_scrape_items` | target_id, data (jsonb), scraped_at | ✅ | Datos scrapeados |

#### Booking
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `booking_event_types` | user_id, title, duration_minutes, price, currency, slug | ✅ | Tipos de evento |
| `bookings` | event_type_id, host_id, guest_email, start_time, end_time, status, meeting_url | ✅ | Reservas confirmadas |
| `booking_availability` | user_id, day_of_week, start_time, end_time | ✅ | Disponibilidad semanal |
| `booking_exceptions` | user_id, date, type (blocked/available) | ✅ | Excepciones de calendario |
| `calendar_integrations` | user_id, provider (google/ical), tokens (jsonb) | ✅ | Calendarios conectados |

#### Email Marketing
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `email_campaigns` | org_id, subject, body_html, segment_id, status, sent_at | ✅ | Campañas email |
| `email_drip_sequences` | org_id, name, trigger_type | ✅ | Secuencias drip |
| `email_drip_steps` | sequence_id, delay_days, subject, body_html | ✅ | Pasos de la secuencia |
| `email_drip_enrollments` | user_id, sequence_id, current_step, enrolled_at | ✅ | Usuarios en secuencias |
| `email_segments` | org_id, name, conditions (jsonb) | ✅ | Segmentos de audiencia |
| `email_templates` | org_id, name, subject, body_html | ✅ | Plantillas |
| `email_events` | campaign_id, user_id, event_type (open/click/bounce) | ✅ | Eventos de email |

#### Streaming / Live
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `streaming_sessions_v2` | id, creator_id, title, status, stream_key, restream_id | ✅ | Sesiones de streaming |
| `streaming_channels_v2` | session_id, platform, rtmp_url, stream_key | ✅ | Canales por plataforma |
| `streaming_chat_messages_v2` | session_id, platform, author, message, timestamp | ✅ | Chat multi-plataforma |
| `live_streaming_channels` | org_id, channel_name, cloudflare_stream_id | ✅ | Canales Cloudflare |
| `live_hour_wallets` | user_id, balance_hours | ✅ | Wallet de horas live |
| `live_hosting_requests` | requester_id, host_id, event_date, hours, status | ✅ | Solicitudes de hosting |

#### CRM Plataforma
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `platform_leads` | email, name, source, status, org_id | ✅ | Leads de plataforma |
| `brands` | id, name, industry, logo_url, website | ✅ | Marcas en el sistema |
| `brand_profiles` | brand_id, description, target_audience, budget_range | ✅ | Perfiles de marca |
| `partner_communities` | id, name, slug, description, owner_id | ✅ | Comunidades partner |
| `partner_community_memberships` | community_id, user_id, role | ✅ | Miembros de comunidades |

#### Ad Intelligence & Generator
| Tabla | Columnas clave | RLS | Notas |
|-------|---------------|-----|-------|
| `ad_library_ads` | user_id, platform, ad_id, creative_url, copy, targeting (jsonb) | ✅ | Anuncios guardados |
| `ad_library_collections` | user_id, name | ✅ | Colecciones de anuncios |
| `ad_generator_products` | org_id, name, images[], description | ✅ | Productos para generar ads |
| `ad_generated_banners` | product_id, url, format, prompt | ✅ | Banners generados |
| `ad_tracking_pixels` | org_id, platform, pixel_id, config (jsonb) | ✅ | Pixels de tracking |

**Tablas de backup/deprecated (no usar en MCP):**
- `_backup_*` (6 tablas) — snapshots legacy
- `kte_*_deprecated` (6 tablas) — tracking antiguo
- `user_subscriptions_deprecated` — reemplazado por `platform_subscriptions`

**Vistas (views):**
- `v_duplicate_content` — contenido duplicado
- `v_license_expiration_notices` — licencias por vencer
- `v_org_creators_with_stats` — creadores con métricas
- `v_platform_leads_summary` — resumen leads
- `v_users_needing_attention` — usuarios con problemas

---

### 1.2 Edge Functions (116 total)

#### Bunny CDN (Video/Media) — 18 funciones
| Función | Acción | JWT | Parámetros entrada | Response |
|---------|--------|-----|--------------------|----------|
| `bunny-upload` | Subir video | Req | `{file, title, content_id, org_id}` | `{video_id, cdn_url, status}` |
| `bunny-upload-v2` | Subir video v2 | Req | `{file, metadata}` | `{video_id, cdn_url}` |
| `bunny-download` | Descargar video | Req | `{video_id, content_id}` | `{download_url, filename}` |
| `bunny-download-v2` | Descargar v2 | Req | `{video_id}` | `{download_url}` |
| `bunny-download-zip` | Descargar ZIP | Req | `{video_ids[]}` | `{zip_url}` |
| `bunny-thumbnail` | Generar thumbnail | Req | `{video_id}` | `{thumbnail_url}` |
| `bunny-thumbnail-v2` | Thumbnail v2 | Req | `{video_id}` | `{thumbnail_url}` |
| `bunny-status` | Estado de video | Req | `{video_id}` | `{status, progress}` |
| `bunny-status-v2` | Estado v2 | Req | `{video_id}` | `{status}` |
| `bunny-storage` | Gestión storage | Req | `{action, path}` | `{url}` |
| `bunny-raw-upload` | Upload raw/imagen | Req | `{file, path, storage_zone}` | `{url}` |
| `bunny-raw-download` | Download raw | Req | `{path}` | `{url}` |
| `bunny-raw-delete` | Eliminar raw | Req | `{path}` | `{success}` |
| `bunny-raw-zip` | ZIP de raws | Req | `{paths[]}` | `{zip_url}` |
| `bunny-marketplace-status` | Estado video marketplace | Req | `{video_id}` | `{status}` |
| `bunny-marketplace-upload` | Upload marketplace | Req | `{file, project_id}` | `{video_id, cdn_url}` |
| `bunny-delete` | Eliminar video | Req | `{video_id}` | `{success}` |
| `bunny-webhook` | Webhook CDN | ❌ | `{VideoGuid, Status}` (Bunny payload) | `{ok}` |

**Config Bunny CDN:**
- `BUNNY_LIBRARY_ID` — ID de biblioteca de video
- `BUNNY_API_KEY` — API key de Bunny
- `BUNNY_CDN_HOSTNAME` — dominio CDN (ej: `vz-78fcd769-050.b-cdn.net`)
- `BUNNY_IMAGES_HOSTNAME` / `BUNNY_ASSETS_HOSTNAME` — Storage zones para imágenes/assets
- API base: `https://video.bunnycdn.com/library/{library_id}/videos`

#### ADN Research (IA) — 4 funciones
| Función | Acción | JWT | Parámetros | Response |
|---------|--------|-----|------------|----------|
| `adn-orchestrator` | Inicia research 22 pasos | Req | `{action: "start"\|"regenerate_tab"\|"get_status", product_id, organization_id, config: {include_client_dna, include_social_intelligence}}` | `{success, session_id, status}` |
| `adn-orchestrator-lite` | Versión simplificada (dispara n8n) | Req | `{product_id, organization_id}` | `{session_id}` |
| `adn-research-v3` | Motor de 22 pasos de research | Req (interno) | `{session_id, product_id, org_id}` | Actualiza `adn_research_sessions` |
| `adn-continue` | Continuar sesión interrumpida | Req | `{session_id}` | `{success, status}` |

**Flujo ADN:**
1. Frontend → `adn-orchestrator` (verifica tokens, crea sesión)
2. Orquestador → `adn-research-v3` (fire-and-forget, 22 pasos: Perplexity + Gemini)
3. Frontend polling `adn_research_sessions.status` / `adn_research_sessions.progress`
4. Al completar: resultado en `products.full_research_v3` + `adn_research_sessions.result`
- **Costo:** 2400 tokens ADN completo, 120 tokens por tab regenerada

#### AI / Análisis — 12 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `multi-ai` | ❌ | Router multi-proveedor (Perplexity → Gemini → OpenAI) |
| `ai-assistant` | ❌ | Asistente IA con config por org |
| `analyze-product-dna` | Req | Analiza product DNA con Perplexity + Gemini |
| `analyze-video-content` | Req | Analiza contenido de video con Gemini Vision |
| `generate-client-dna` | Req | Genera DNA de cliente |
| `generate-project-dna` | Req | Genera DNA de proyecto |
| `build-image-prompt` | ❌ | Construye prompts para generación de imágenes |
| `generate-achievement-icon` | Req | Genera icono de logro con IA |
| `generate-ad-banner` | Req | Genera banner publicitario |
| `ai-creator-matching` | Req | Matching IA creador-campaña |
| `kiro-auto-learn` | ❌ | Auto-aprendizaje del asistente KIRO |
| `evaluate-profile-tokens` | Req | Evalúa y tokeniza perfil de usuario |

#### Finanzas / Wallet — 5 funciones
| Función | JWT | Acción | Parámetros entrada |
|---------|-----|--------|-------------------|
| `escrow-service` | Req | `create/fund/approve/release/dispute/refund` escrow | `{project_type, total_amount, distributions[], milestones[]}` |
| `campaign-checkout` | Req | `create-publish-checkout / create-bid-checkout` | `{campaign_id, amount, currency}` |
| `wallet-process-withdrawal` | Req (admin) | Procesa retiro (Stripe/Mercury/manual) | `{withdrawal_id, status, external_reference}` |
| `wallet-mercury-payout` | Req (admin) | Pago via Mercury Bank | `{withdrawal_id, account_number, routing}` |
| `wallet-connect` | Req | Conecta Stripe Connect account | `{user_id}` → `{onboarding_url}` |

#### Marketplace — 5 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `verify-campaign-access` | Req | Verifica que el usuario tiene acceso a campaña |
| `campaign-notifications` | ❌ | Envía notificaciones de campañas |
| `marketplace-score-updater` | ❌ | Actualiza scores de marketplace |
| `upload-campaign-media` | Req | Sube medios de campaña a Bunny |
| `referral-service` | Req | Gestión de referidos y comisiones |

#### Social Media — 6 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `social-scheduler` | Req | Programa publicaciones |
| `social-publish` | ❌ | Publica en plataformas sociales |
| `social-scraper` | Req (admin) | Scrapea perfiles sociales |
| `social-metrics` | Req | Obtiene métricas de cuentas sociales |
| `ad-intelligence` | Req (admin) | Inteligencia de anuncios (Meta Ad Library) |
| `feed-recommendations` | ❌ | Recomendaciones del feed |

#### KAE Analytics — 5 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `kae-track` | ❌ | Track evento de analytics |
| `kae-identify` | ❌ | Identifica visitor/usuario |
| `kae-conversion` | ❌ | Registra conversión |
| `kae-test-connection` | ❌ | Test de conexión KAE |
| `capture-lead` | ❌ | Captura lead desde landing |

#### Booking — 6 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `booking-create` | ❌ | Crea reserva (pública) |
| `booking-confirm` | Req | Confirma reserva |
| `booking-reminder` | ❌ | Envía recordatorios |
| `calendar-google-auth` | Req | Inicia OAuth Google Calendar |
| `calendar-google-callback` | ❌ | Callback OAuth |
| `calendar-google-sync` | Req | Sincroniza calendario Google |
| `calendar-check-conflicts` | Req | Verifica conflictos de horario |

#### Streaming — 8 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `streaming-hub` | Req | Hub de streaming (gestión sesiones) |
| `streaming-obs-bridge` | Req | Bridge RTMP para OBS |
| `streaming-webhook` | ❌ | Webhooks de Restream |
| `streaming-webhook-v2` | ❌ | Webhooks v2 |
| `streaming-chat-aggregator` | ❌ | Agrega chat multi-plataforma |
| `streaming-shopping` | Req | Integración e-commerce en live |
| `cloudflare-live-webhook` | ❌ | Webhooks Cloudflare Stream |
| `restream-api` | Req | Proxy API de Restream |

#### Email / Notificaciones — 10 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `email-marketing-service` | Req | Gestión campañas email (Resend) |
| `email-drip-processor` | ❌ | Procesa pasos de secuencias drip |
| `auth-email-proxy` | ❌ | Proxy emails de auth |
| `resend-domain-management` | Req | Gestión dominios Resend |
| `resend-webhook` | ❌ | Webhooks de Resend |
| `send-invitation` | Req | Envía invitación a organización |
| `send-recruitment` | Req | Email de reclutamiento |
| `send-support-email` | ❌ | Email de soporte |
| `notify-new-member` | ❌ | Notifica nuevo miembro |
| `workflow-notifications` | ❌ | Notificaciones de workflow |

#### Integraciones — 8 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `ghl-sync` | ❌ | Sync bidireccional con GoHighLevel |
| `n8n-proxy` | Req | Proxy para llamar n8n workflows |
| `pancake-sync-organization` | Req | Sync con PancakeCRM |
| `sync-to-kreoon` | ❌ | Migración de datos a Kreoon |
| `migrate-to-kreoon` | Req | Migración completa |
| `migrate-storage` | Req (admin) | Migración de archivos |
| `subscription-service` | Req | Gestión suscripciones Stripe |
| `partner-community-service` | Req | Gestión comunidades partner |

#### Utilidades — 12 funciones
| Función | JWT | Descripción |
|---------|-----|-------------|
| `api` | ❌ | API pública REST para n8n/Zapier/Make |
| `org-public-info` | ❌ | Info pública de org (sin auth) |
| `fetch-document` | Req | Fetch de documentos externos |
| `kreoon-sql` | Req (admin) | Ejecuta SQL (admin only) |
| `interest-extractor` | ❌ | Extrae intereses de usuario |
| `suggest-role` | Req | Sugiere rol para usuario |
| `save-product-brief` | Req | Guarda brief de producto |
| `update-exchange-rates` | ❌ | Actualiza tasas de cambio |
| `marketing-auth` | ❌ | Auth para marketing tools |
| `cleanup-expired-stories` | ❌ | Limpia stories expiradas (cron) |
| `verify-custom-domain` | Req | Verifica dominio custom |
| `marketing-campaigns/metrics/reports` | Req | Módulo marketing ads |

---

### 1.3 Rutas de la App (100+ total)

#### Públicas (sin auth)
```
/                          → HomePage
/marketplace               → MarketplaceExplorePage (TalentGate)
/marketplace/campaigns     → CampaignsFeedPage (TalentGate)
/marketplace/campaigns/:id → CampaignDetailPage (TalentGate)
/marketplace/creator/:id   → CreatorProfilePage (TalentGate)
/marketplace/org/:slug     → OrgProfilePage (TalentGate)
/p/:username               → PublicCreatorPage
/@:username                → PublicCreatorPage
/company/:username         → CompanyProfilePage
/profile/:userId           → PublicProfilePage
/review/:token             → PublicReviewPage
/preview/:token            → ProfilePreviewPage
/book/:username            → PublicBookingPage
/book/:username/:eventSlug → PublicBookingPage
/templates                 → TemplateLibraryPage
/portafolio                → PortfolioShowcasePage
/casos-de-exito            → CaseStudies
/casos-de-exito/:slug      → CaseStudyDetail
/calculadora-ugc           → UGCPriceCalculator
/pricing/creators          → CreatorPricingPage
/unete                     → Unete (landing)
/unete/talento             → UneteTalento
/unete/marcas              → UneteMarcas
/unete/organizaciones      → UneteOrganizaciones
/r/:code                   → ReferralLanding
/auth                      → Auth
/register                  → Register
/auth/org/:slug            → OrgRegister
/org/:slug/talento         → OrgPortfolioPage
/org/:slug/contenido       → OrgContentShowcase
/communidad/:slug          → PartnerCommunityLanding
/privacy | /terms | /data-deletion | /legal/:documentType → Páginas legales
/blog                      → BlogPage
```

#### Protegidas por rol
```
/dashboard                 → Dashboard           [admin, team_leader]
/board                     → ContentBoard        [admin, team_leader, strategist, creator, editor, client]
/content                   → Content             [admin, strategist, creator, editor]
/talent                    → UnifiedTalentPage   [admin, team_leader, strategist]
/clients-hub               → UnifiedClientsPage  [admin, team_leader, strategist]
/scripts                   → Scripts             [admin, editor, strategist]
/ranking                   → Ranking             [admin, creator, editor] (RootOnly)
/ambassador                → AmbassadorPage      [admin]
/marketing                 → Marketing           [admin, strategist] (RootOnly)
/social-hub                → SocialHubPage       [any authenticated]
/settings                  → Settings            [any authenticated]
/planes                    → PlanesPage          [any authenticated]
/creator-dashboard         → CreatorDashboard    [any authenticated]
/editor-dashboard          → EditorDashboard     [editor]
/strategist-dashboard      → StrategistDashboard [strategist]
/client-dashboard          → ClientDashboard     [client]
/client-board              → ClientContentBoard  [client]
/research/:productId       → ResearchLanding     [any authenticated]
```

#### Marketplace protegido
```
/marketplace/dashboard         → MarketplaceDashboard  [any authenticated]
/marketplace/hire/:creatorId   → HiringWizardPage      [any authenticated]
/marketplace/profile/setup     → CreatorProfileSetup   [any authenticated]
/marketplace/campaigns/create  → CampaignWizardPage    [any authenticated]
/marketplace/my-campaigns      → BrandCampaignsPage    [any authenticated]
/marketplace/creator-campaigns → CreatorCampaignsPage  [any authenticated]
/marketplace/talent-lists      → TalentListsPage       [any authenticated]
/marketplace/invitations       → MarketplaceInvitationsPage [any authenticated]
/marketplace/inquiries         → MarketplaceInquiriesPage   [any authenticated]
```

#### Wallet (RootOnly)
```
/wallet                    → WalletPage          [any authenticated]
/wallet/transactions       → TransactionsPage    [any authenticated]
/wallet/withdrawals        → WithdrawalsPage     [any authenticated]
/admin/wallets             → AdminWalletsPage    [admin]
```

#### Admin (RootOnly)
```
/admin/analytics           → KAEAnalyticsDashboard   [admin]
/admin/ad-intelligence     → AdIntelligencePage      [admin]
/admin/social-scraper      → SocialScraperPage       [admin]
/admin/papelera            → PapeleraPage            [admin]
/admin/dev-modules         → DevModulesPage          [RootOnly]
/crm                       → PlatformAdminDashboard  [platformAdmin]
/crm/leads                 → PlatformCRMLeads        [platformAdmin]
/crm/organizaciones        → PlatformCRMOrganizations [platformAdmin]
/crm/marcas                → BrandsCRM               [platformAdmin]
/crm/finanzas              → PlatformCRMFinances      [platformAdmin]
```

---

### 1.4 Contexts / Providers Globales (11 total)

| Context | Archivo | Qué expone |
|---------|---------|------------|
| `AuthProvider` | `hooks/useAuth.tsx` | `{user, session, profile, roles[], orgId, loading, hasRole(), login(), logout(), switchOrg()}` |
| `BrandingProvider` | `contexts/BrandingContext` | `{brandColor, logo, orgSlug, customDomain}` |
| `ImpersonationProvider` | `contexts/ImpersonationContext` | `{isImpersonating, impersonatedUser, impersonationKey, startImpersonation(), stopImpersonation()}` |
| `DemoModeProvider` | `contexts/DemoModeContext` | `{isDemoMode, toggleDemo()}` |
| `AnalyticsProvider` | `contexts/AnalyticsContext` | `{track(), identify(), page()}` |
| `AICopilotProvider` | `contexts/AICopilotContext` | `{notifications[], addNotification(), clearNotification()}` |
| `TrialProvider` | `contexts/TrialContext` | `{isOnTrial, trialEndsAt, daysLeft}` |
| `UnsavedChangesProvider` | `contexts/UnsavedChangesContext` | `{hasChanges, setHasChanges(), confirmNavigation()}` |
| `CurrencyProvider` | `contexts/CurrencyContext` | `{currency, setCurrency(), convert()}` |
| `KiroProvider` | `contexts/KiroContext` | `{isOpen, toggle(), messages[], sendMessage()}` (asistente IA) |
| `StrategistClientProvider` | `contexts/StrategistClientContext` | `{selectedClient, setSelectedClient()}` |

---

### 1.5 Tipos TypeScript Críticos

```typescript
// Roles del sistema
type AppRole = 'admin' | 'content_creator' | 'editor' | 'digital_strategist' 
             | 'creative_strategist' | 'community_manager' | 'client';

type AccountType = 'talent' | 'organization' | 'client';
type UserType    = 'talent' | 'client' | 'admin';
type AmbassadorLevel = 'bronze' | 'silver' | 'gold';

type Specialization = 
  'ugc' | 'nano_influencer' | 'micro_influencer' | 'macro_influencer' 
  | 'lifestyle' | 'photographer' | 'live_streamer' | 'podcast_host' | 'voice_artist'
  | 'video_editor' | 'motion_graphics' | 'colorist' | 'sound_designer' 
  | 'animator' | 'director' | 'producer'
  | 'seo' | 'sem' | 'trafficker' | 'email_marketing' | 'growth_hacker' | 'cro' | 'crm'
  | 'content_strategy' | 'social_media' | 'copywriting' | 'graphic_design'
  | 'brand_manager' | 'marketing_director' | 'agency';

// Escrow distributions
interface Distribution {
  user_id: string;
  role: 'creator' | 'editor' | 'organization';
  percentage: number;
}

// ADN Orchestrator
type OrchestratorAction = 'start' | 'regenerate_tab' | 'get_status';

interface OrchestratorInput {
  action: OrchestratorAction;
  product_id?: string;
  organization_id: string;
  config?: {
    include_client_dna: boolean;
    include_social_intelligence: boolean;
    include_ad_intelligence: boolean;
    locations?: string[];
  };
  session_id?: string; // para regenerate_tab
  tab_key?: string;    // para regenerate_tab
}
```

---

## 2. DATA FLOWS

### 2.1 Brief → ADN Research → Contenido

```
1. Crear producto
   INSERT products (client_id, name, description, brief_data, business_type)
   → products.brief_status = 'draft'

2. Guardar brief completo
   CALL save-product-brief({product_id, brief_data})
   → products.brief_status = 'completed'

3. Iniciar ADN Research
   CALL adn-orchestrator({action: 'start', product_id, organization_id, config})
   → Verifica tokens (≥2400 en ai_token_balances)
   → INSERT adn_research_sessions (status: 'pending')
   → Reserva tokens (ai_token_transactions)
   → AWAIT intelligence-gatherer (~2-3 min)
   → FIRE-AND-FORGET adn-research-v3 (22 pasos, ~8 min)
   → Retorna {session_id}

4. Frontend polling
   SELECT status, progress FROM adn_research_sessions WHERE id = session_id
   Estados: pending → gathering → researching → completed | error
   progress = {current_step: 1-22, step_label: '...', percentage: 0-100}

5. Al completar
   UPDATE products SET full_research_v3 = result, research_v3_progress = final_progress
   UPDATE adn_research_sessions SET status = 'completed', result = full_result
   Tokens consumidos → ai_token_transactions (type: 'debit')

6. Crear contenido
   INSERT content (product_id, status: 'brief_completed', assigned_creator_id)
   → Creator accede al brief + research

7. Ciclo de vida del contenido
   Estados: brief_completed → script_draft → script_approved → assigned 
         → recording → recorded → editing → edited → review → delivered
   Cada cambio → INSERT content_history + UPDATE content_status_logs
```

### 2.2 Campaign → Checkout → Escrow → Payout

```
1. Marca crea campaña
   INSERT marketplace_campaigns (org_id, title, budget, pricing_mode, requirements)
   pricing_mode: 'fixed' | 'auction' | 'range'
   Status: draft → published

2. Publicar campaña (pago)
   CALL campaign-checkout/create-publish-checkout({campaign_id, amount, currency})
   → Stripe Checkout Session
   → Redirect a Stripe
   → Webhook Stripe → actualiza marketplace_campaigns.status = 'active'

3. Creadores aplican
   INSERT campaign_applications (campaign_id, creator_id, bid_amount, proposal)
   Status: pending_review

4. Marca acepta creador
   UPDATE campaign_applications SET status = 'accepted'
   INSERT marketplace_projects (campaign_id, creator_id, status: 'in_progress')
   
5. Pago por aplicación (si auction)
   CALL campaign-checkout/create-bid-checkout({campaign_id, bid_amount})
   → Stripe Checkout Session

6. Crear escrow
   CALL escrow-service/create({
     project_type: 'marketplace_direct',
     project_id, total_amount,
     distributions: [{creator: 70%}, {organization: 30%}]
   })
   → INSERT escrow_holds (status: 'pending')
   → Stripe PaymentIntent (hold)

7. Confirmar escrow (fondos retenidos)
   CALL escrow-service/fund({escrow_id})
   → UPDATE escrow_holds.status = 'funded'
   → Stripe confirmación de captura

8. Creador entrega trabajo
   INSERT project_deliveries (project_id, file_url, bunny_video_id)
   CALL bunny-upload({file, project_id})

9. Marca aprueba
   CALL escrow-service/release({escrow_id})
   → Stripe transfer a cuenta conectada
   → INSERT unified_transactions por cada distribución
   → UPDATE unified_wallets.balance_available += amount
   → UPDATE escrow_holds.status = 'released'

10. Creador solicita retiro
    INSERT withdrawal_requests (wallet_id, amount, method: 'stripe_connect'|'mercury'|'manual')
    CALL wallet-process-withdrawal({withdrawal_id, status: 'approved'})
    → Stripe payout OR Mercury wire transfer
    → UPDATE withdrawal_requests.status = 'completed'
    → UPDATE unified_wallets.balance_available -= amount
```

### 2.3 Wallet — Transacciones

```
Tablas: unified_wallets ↔ unified_transactions ↔ withdrawal_requests
Moneda base: USD (conversiones via exchange_rates)

Tipos de transacción (unified_transactions.type):
- 'escrow_release' — pago de proyecto completado
- 'withdrawal'     — retiro de fondos
- 'referral_bonus' — comisión por referido
- 'subscription'   — pago de suscripción
- 'campaign_payment' — pago de campaña

Métodos de retiro:
- 'stripe_connect' → Stripe Transfer API a cuenta conectada
- 'mercury'        → Mercury Bank wire transfer
- 'manual'         → Procesado manualmente por admin
```

### 2.4 UP — Sistema de Reputación

```
Eventos que generan puntos:
- Contenido entregado → INSERT up_events (event_type, points)
- Reseña recibida → up_events
- Campaña completada → up_events
- Quest completada → up_events
- etc.

Procesamiento (via Edge Functions o triggers SQL):
1. INSERT up_events
2. Trigger actualiza up_user_scores (total acumulado de la temporada)
3. Actualiza up_creadores / up_editores (leaderboard)
4. Verifica si se completó algún up_quest
5. Si quest completada → INSERT up_events (reward)

Temporadas: up_seasons.active = true → season activa
Al cambiar temporada: snapshot de scores → up_season_snapshots
```

### 2.5 KAE Analytics

```
Flujo de tracking (frontend → edge functions → DB):

1. Visitor llega
   CALL kae-identify({anonymous_id, properties})
   → INSERT kae_visitors (anonymous_id)
   → INSERT kae_sessions (visitor_id, utm_params)

2. Evento ocurre
   CALL kae-track({session_id, event_type, properties})
   → INSERT kae_events_{YYYY_MM} (particionado por mes)

3. Conversión
   CALL kae-conversion({session_id, type, value})
   → INSERT kae_conversions

4. Forward a plataformas (si configurado):
   → Meta Pixel / CAPI
   → TikTok Events API
   → Google Analytics 4
   Logs en kae_platform_logs
```

---

## 3. INTEGRACIONES EXTERNAS

| Proveedor | Endpoint Base | Auth | Edge Functions | Env Vars |
|-----------|--------------|------|---------------|----------|
| **Stripe** | `https://api.stripe.com` | Secret Key | `escrow-service`, `campaign-checkout`, `wallet-process-withdrawal`, `wallet-connect`, `subscription-service` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Bunny CDN** | `https://video.bunnycdn.com` | API Key Header | `bunny-upload`, `bunny-download`, `bunny-thumbnail`, `bunny-delete`, `bunny-*` | `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_CDN_HOSTNAME`, `BUNNY_IMAGES_HOSTNAME`, `BUNNY_ASSETS_HOSTNAME` |
| **Perplexity** | `https://api.perplexity.ai/chat/completions` | Bearer Token | `adn-research-v3`, `analyze-product-dna`, `multi-ai` | `PERPLEXITY_API_KEY` |
| **Gemini** | `https://generativelanguage.googleapis.com/v1beta/` | API Key / OpenAI compat | `adn-research-v3`, `analyze-product-dna`, `analyze-video-content`, `build-image-prompt`, `ai-creator-matching`, `api` | `GEMINI_API_KEY` |
| **Restream** | `https://api.restream.io` | OAuth / API Key | `restream-api`, `streaming-webhook` | `RESTREAM_API_KEY` |
| **Mercury Bank** | Mercury API | API Key | `wallet-mercury-payout` | `MERCURY_API_KEY` |
| **n8n** | `https://dev.kreoon.com` | Webhook URL (secreto) | `adn-orchestrator-lite`, `n8n-proxy` | `N8N_ADN_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` |
| **GoHighLevel** | GHL API | API Key / OAuth | `ghl-sync` | `GHL_API_KEY`, `GHL_LOCATION_ID` |
| **Resend** | `https://api.resend.com` | Bearer Token | `email-marketing-service`, `send-invitation`, `auth-email-proxy`, `resend-webhook` | `RESEND_API_KEY` |
| **Cloudflare Stream** | Cloudflare API | API Token | `cloudflare-live-webhook` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| **Google Calendar** | `https://www.googleapis.com/calendar` | OAuth 2.0 | `calendar-google-auth`, `calendar-google-callback`, `calendar-google-sync` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **PancakeCRM** | Pancake API | API Key | `pancake-sync-organization` | `PANCAKE_API_KEY` |

---

## 4. SECURITY MATRIX

### Roles y Permisos

**3 Grupos de permisos:**
- `admin`: acceso total a su organización + funciones de gestión
- `talent`: acceso a features de creación de contenido y marketplace
- `client`: acceso limitado a revisión y aprobación

**Mapping de roles a grupos:**
```
admin, team_leader       → grupo 'admin'
content_creator, editor, digital_strategist, 
creative_strategist, community_manager → grupo 'talent'
client                   → grupo 'client'
```

### Patrones RLS por categoría

**Patrón org-isolation (la mayoría de tablas):**
```sql
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = table.organization_id
    AND om.user_id = auth.uid()
  )
)
```

**Patrón admin-only (tablas sensibles):**
```sql
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
```

**Patrón public-read (datos públicos del marketplace):**
```sql
-- SELECT abierto para anon + authenticated
-- INSERT/UPDATE solo para authenticated
```

**Patrón owner-only (datos personales):**
```sql
USING (user_id = auth.uid())
```

**Tablas con RLS desactivado (acceso via service_role):**
- `adn_prompts` — solo service_role puede escribir
- `_backup_*` — solo service_role

### Variables de Entorno (Supabase Secrets)
Nunca en el código. Acceso via `Deno.env.get()` en Edge Functions:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
BUNNY_API_KEY, BUNNY_LIBRARY_ID, BUNNY_CDN_HOSTNAME
PERPLEXITY_API_KEY
GEMINI_API_KEY
RESEND_API_KEY
RESTREAM_API_KEY
MERCURY_API_KEY
GHL_API_KEY, GHL_LOCATION_ID
N8N_ADN_WEBHOOK_URL
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

---

## 5. MCP TOOLS CANDIDATES

### Tier 1 — Lectura (seguras, alto valor)

| Tool Name | Descripción | Tabla/Función | Auth |
|-----------|-------------|---------------|------|
| `get_org_content` | Lista contenido de la org con filtros (status, creator, client) | `content` + `products` + `clients` | org_member |
| `get_content_detail` | Detalle completo de una pieza + research + historial | `products.full_research_v3`, `content_history` | org_member |
| `get_campaigns` | Lista campañas del marketplace (públicas o de la org) | `marketplace_campaigns` | anon/auth |
| `get_campaign_detail` | Detalle de campaña + aplicaciones | `marketplace_campaigns` + `campaign_applications` | auth |
| `get_wallet_balance` | Saldo y transacciones recientes | `unified_wallets` + `unified_transactions` | owner |
| `get_org_members` | Lista miembros de la org con roles | `organization_members` + `organization_member_roles` | org_member |
| `get_creator_profile` | Perfil público de un creador | `creator_profiles` + `social_metrics` | anon |
| `get_products` | Lista productos/briefs de la org | `products` | org_member |
| `get_adn_session_status` | Estado actual de una sesión de research ADN | `adn_research_sessions` | org_member |
| `get_token_balance` | Saldo de tokens IA de la org | `ai_token_balances` | org_member |
| `get_kae_analytics` | Métricas de analytics (sesiones, eventos, conversiones) | `kae_sessions` + `kae_conversions` | org_member |
| `get_booking_availability` | Disponibilidad de calendario de un usuario | `booking_event_types` + `booking_availability` | anon |
| `search_creators` | Busca creadores por especialidad, rol, rating | `creator_profiles` + `marketplace_reputation` | anon |

### Tier 2 — Escritura (requieren validación extra)

| Tool Name | Descripción | Tabla/Función | Auth |
|-----------|-------------|---------------|------|
| `create_content` | Crear nueva pieza de contenido | INSERT `content` | org_admin/strategist |
| `update_content_status` | Cambiar estado de contenido | UPDATE `content` | role-dependent |
| `create_campaign` | Publicar campaña en marketplace | INSERT `marketplace_campaigns` | auth |
| `apply_to_campaign` | Aplicar como creador a campaña | INSERT `campaign_applications` | creator |
| `submit_delivery` | Subir entregable de proyecto | `bunny-upload` + INSERT `project_deliveries` | creator |
| `create_booking` | Reservar slot de calendario | `booking-create` edge function | anon |
| `send_campaign_invitation` | Invitar creador a campaña | INSERT `campaign_invitations` | brand |
| `capture_lead` | Capturar lead desde landing | `capture-lead` edge function | anon |

### Tier 3 — IA / Async (alto valor, mayor costo)

| Tool Name | Descripción | Función | Auth |
|-----------|-------------|---------|------|
| `start_adn_research` | Inicia research ADN de 22 pasos (async) | `adn-orchestrator` | org_member |
| `regenerate_adn_tab` | Regenera una pestaña del ADN (120 tokens) | `adn-orchestrator` (regenerate_tab) | org_member |
| `match_creators_to_campaign` | Matching IA de creadores para campaña | `ai-creator-matching` | org_admin |
| `analyze_video_content` | Analiza video con IA | `analyze-video-content` | org_member |
| `generate_ad_banner` | Genera banner publicitario con IA | `generate-ad-banner` | org_member |

### Tier 4 — Admin (requieren rol admin)

| Tool Name | Descripción | Función | Auth |
|-----------|-------------|---------|------|
| `process_withdrawal` | Procesa retiro de wallet | `wallet-process-withdrawal` | platform_admin |
| `release_escrow` | Libera fondos del escrow | `escrow-service/release` | platform_admin |
| `get_platform_stats` | Estadísticas generales de la plataforma | `v_platform_leads_summary` + queries | platform_admin |
| `scrape_social_profile` | Scrapea perfil social | `social-scraper` | platform_admin |

---

## 6. DEPENDENCIES & CONSTRAINTS

### Dependencias críticas entre tools

```
start_adn_research
  REQUIRES: product_id (products table)
  REQUIRES: ai_token_balances.balance_total >= 2400
  REQUIRES: no sesión activa para el mismo product_id
  UPDATES: adn_research_sessions, products, ai_token_balances

create_campaign
  REQUIRES: user tiene organization_id y rol admitido
  OPTIONAL: campaign-checkout para publicar (costo Stripe)
  CREATES: marketplace_campaigns

apply_to_campaign
  REQUIRES: marketplace_campaigns.status = 'active'
  REQUIRES: creator_profile existe para el user
  CREATES: campaign_applications

submit_delivery
  REQUIRES: marketplace_projects.status = 'in_progress'
  REQUIRES: Bunny CDN configured (BUNNY_LIBRARY_ID, BUNNY_API_KEY)
  CREATES: project_deliveries + bunny video
  
release_escrow
  REQUIRES: escrow_holds.status = 'funded'
  REQUIRES: Stripe Connect account del creador con status 'active'
  UPDATES: unified_wallets, unified_transactions, escrow_holds
```

### Orden de ejecución para onboarding MCP

```
1. Autenticación
   GET user JWT → Supabase Auth
   
2. Selección de Org
   GET /org_members WHERE user_id = $uid
   
3. Verificar permisos
   GET /organization_member_roles WHERE member_id = $member_id
   
4. Operaciones disponibles según rol:
   - admin:    todos los tools Tier 1-4
   - talent:   Tier 1 (lectura) + Tier 2 (escritura propia) + Tier 3 (IA limitada)
   - client:   solo get_org_content, get_content_detail (filtrado por su org)
```

### Constraints importantes

- **Multi-tenant OBLIGATORIO**: Toda query debe incluir `organization_id` en el WHERE.
- **ADN tokens**: Verificar balance antes de `start_adn_research`. Sin tokens = error 402.
- **Bunny CDN**: Los uploads son async. La función retorna `video_id` pero el video puede tardar 1-5 min en procesarse. Usar `bunny-status` para polling.
- **Escrow**: No se puede liberar si el creador no tiene Stripe Connect activo. Verificar `unified_wallets.stripe_connect_status = 'active'`.
- **RLS enforced**: Todas las operaciones pasan por RLS de Supabase. El MCP debe usar JWT del usuario, no `service_role` (excepto para operaciones admin explícitas).
- **Rate limiting**: Tabla `rate_limits` con control por IP/user. El MCP debe respetar estos límites.
- **Soft deletes**: `products` tiene `deleted_at`. Siempre filtrar `WHERE deleted_at IS NULL`.
- **Particionado KAE**: Los eventos KAE están en tablas particionadas por mes (`kae_events_YYYY_MM`). Las queries al MCP deben especificar rango de fechas.

---

## 7. EJEMPLOS DE QUERIES SQL REALES

### Obtener contenido de una org
```sql
SELECT c.id, c.status, p.name as product_name, cl.name as client_name,
       c.assigned_creator_id, c.script, c.recorded_url
FROM content c
JOIN products p ON c.product_id = p.id
JOIN clients cl ON p.client_id = cl.id
WHERE cl.org_id = $organization_id
  AND p.deleted_at IS NULL
  AND ($status IS NULL OR c.status = $status)
ORDER BY c.updated_at DESC;
```

### Verificar balance de tokens ADN
```sql
SELECT balance_total, balance_reserved,
       (balance_total - COALESCE(balance_reserved, 0)) as balance_available
FROM ai_token_balances
WHERE organization_id = $org_id;
```

### Obtener sesiones ADN activas
```sql
SELECT id, product_id, status, progress, created_at
FROM adn_research_sessions
WHERE organization_id = $org_id
  AND status IN ('pending', 'gathering', 'researching')
ORDER BY created_at DESC;
```

### Wallet y últimas transacciones
```sql
SELECT w.balance_available, w.balance_reserved, w.currency,
       t.amount, t.type, t.status, t.created_at
FROM unified_wallets w
LEFT JOIN unified_transactions t ON t.wallet_id = w.id
WHERE w.user_id = $user_id
ORDER BY t.created_at DESC
LIMIT 20;
```

### Creadores disponibles en marketplace
```sql
SELECT cp.user_id, p.full_name, p.avatar_url, 
       cp.specialties, cp.rates, cp.verification_status,
       mr.score as reputation_score
FROM creator_profiles cp
JOIN profiles p ON cp.user_id = p.user_id
LEFT JOIN marketplace_reputation mr ON mr.creator_id = cp.user_id
WHERE cp.verification_status = 'verified'
  AND ($specialty IS NULL OR $specialty = ANY(cp.specialties))
ORDER BY mr.score DESC NULLS LAST
LIMIT 50;
```

---

*Documento generado el 2026-05-08 por auditoría automática del proyecto Kreoon.*
*Próximo paso: usar este documento para diseñar las herramientas MCP exactas del servidor.*
