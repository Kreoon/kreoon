// ============================================================================
// KREOON — Prompts archivados: consultoría de negocio
//
// Estos 10 pasos salieron del Research Unificado el 2026-08-13
// (ver docs/RESEARCH_UNIFICADO.md §2). NO se borraron: la plataforma genera
// CONTENIDO, y esto es consultoría de negocio — buen material para un add-on
// futuro, pero fuera del flujo que el cliente valida hoy.
//
// Están tal cual estaban, con sus interpolaciones (${baseContext},
// ${targetMarket}, prevResults). Para revivir uno hay que devolverlo a
// getStepPrompt, volver a declarar su schema, su entrada en TOKEN_MAP,
// STEP_SKILLS y STEP_SEQUENCE.
//
// Pasos archivados: launch_strategy, landing_pages, whatsapp_funnel, paid_ads,
// email_marketing, pricing_strategy, kpis_dashboard, seo_strategy,
// partnerships, community_strategy.
// ============================================================================

/* eslint-disable */
export const PROMPTS_CONSULTORIA_ARCHIVADOS: Record<string, string> = {

    launch_strategy: `Disena ESTRATEGIA DE LANZAMIENTO COMPLETA.

${baseContext}

PUV:
${prev.puv_transformation?.puv?.statement || "N/A"}

INSTRUCCIONES CRITICAS:
- Plan REALISTA para equipo de 1-5 personas
- Incluye estrategia organica y de pago
- Secuencia de emails con copy resumido
- Presupuesto adaptado a LATAM
- Metricas claras
- INTEGRA los canales y targeting del ADN de marca

Genera: preLaunch (duration, objectives, actions, contentPlan, checklist), launch (dayPlan, offer con bonuses/urgency/scarcity/guarantee, emailSequence 5-7, channels), postLaunch (retentionActions, postSaleContent, referralStrategy, nonBuyerFollowUp, analysisChecklist), budget (organic/paid/totalEstimated), timeline (6-8 hitos), team, metrics (preLaunch/launch/postLaunch).`,


    landing_pages: `Genera 2 VARIACIONES COMPLETAS de landing page para este producto.
Cada variacion es una propuesta diferente — no la misma con cambios menores.

${baseContext}

PUV (de paso anterior):
${prev.puv_transformation?.puv?.statement || "N/A"}

AVATAR PRIMARIO:
${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 800)}

DOLORES CRITICOS:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}: ${p.impact}`).join("\n") || "N/A"}

OBJECIONES PRINCIPALES:
${prevPains?.objections?.slice(0, 4).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

TRANSFORMACION:
${JSON.stringify(prev.puv_transformation?.transformation || {}).substring(0, 600)}

LEAD MAGNETS:
${prev.lead_magnets?.leadMagnets?.slice(0, 2).map((l: any) => `- ${l.name}: ${l.promise}`).join("\n") || "N/A"}

ANGULOS TOP 3:
${prevSales?.salesAngles?.slice(0, 3).map((a: any) => `- ${a.hookExample}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- VARIACION A "La Directa" → para audiencia caliente (nivel 4-5 Schwartz), oferta visible desde el hero
- VARIACION B "La Educativa" → para audiencia tibia (nivel 2-3 Schwartz), construye confianza primero
- Cada variacion debe tener 8-11 secciones completas (hero, problem, agitation, solution, social_proof, authority, offer, guarantee, faq, final_cta)
- Cada seccion incluye copy_full LISTO PARA COPIAR Y PEGAR
- Headlines pasan el test de 3 segundos
- Testimoniales con nombre + ciudad + resultado especifico (ficticios pero creibles)
- Garantia simple sin condiciones complicadas
- Incluir ab_testing_plan con 2 tests + tech_stack_recommendation`,


    whatsapp_funnel: `Genera el FUNNEL COMPLETO DE VENTAS POR WHATSAPP con 3-4 tipos de secuencias.

${baseContext}

PUV:
${prev.puv_transformation?.puv?.statement || "N/A"}

LEAD MAGNET PRINCIPAL:
${prev.lead_magnets?.leadMagnets?.[0]?.name || "N/A"} - ${prev.lead_magnets?.leadMagnets?.[0]?.promise || ""}

OBJECIONES PRINCIPALES:
${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

AVATAR PRIMARIO:
${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 800)}

MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- 3 tipos de funnel obligatorios: CAPTACION (5-7 mensajes en 7-10 dias), CIERRE (3-5 mensajes en 3-5 dias), REACTIVACION (2-3 mensajes en 3 dias)
- Cada mensaje LISTO PARA COPIAR Y PEGAR (incluir emojis adecuados)
- Maximo 150 palabras por mensaje (se leen en movil)
- Personalizacion con [Nombre] siempre
- Primer mensaje NUNCA con pitch directo de venta
- Incluir audio_script para mensajes clave (60-90 segundos)
- branch_flows con respuestas a objeciones comunes ("muy caro", "lo pienso", "no me interesa")
- Respeta horarios LATAM (8am-8pm hora local)
- Incluir whatsapp_setup (account_type, automation_tools, compliance) y performance_benchmarks`,


    paid_ads: `Genera la ESTRATEGIA COMPLETA DE PAID ADS para Meta y TikTok.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
AVATAR PRIMARIO: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
ANGULOS TOP 5: ${prevSales?.salesAngles?.slice(0, 5).map((a: any) => `- ${a.hookExample}`).join("\n") || "N/A"}
CREATIVOS DISPONIBLES: ${prev.video_creatives?.creatives?.length || 0} creativos generados
LANDING PRINCIPAL: ${prev.landing_pages?.landing_pages?.[0]?.sections?.[0]?.headline || "N/A"}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- Estructura por temperatura: 20-30% frio, 40-50% tibio, 30-40% caliente
- Meta ads: minimo 3 campanas (awareness, consideration, conversion)
- TikTok ads: incluir Spark Ads para usar contenido organico ganador
- Presupuestos en USD/dia, considerar minimos LATAM (Meta $10/dia, TikTok $20/dia)
- Cada creativo referenciado a uno de los video_creatives generados
- Incluir testing plan, kill criteria, scaling criteria
- benchmarks_latam con CPM, CTR, CPA, ROAS reales del sector
- monthly_execution_calendar con foco semanal por mes
- common_mistakes_to_avoid especificos a LATAM`,


    email_marketing: `Genera la ESTRATEGIA COMPLETA DE EMAIL MARKETING con secuencias listas.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
LEAD MAGNET: ${prev.lead_magnets?.leadMagnets?.[0]?.name || "N/A"} - ${prev.lead_magnets?.leadMagnets?.[0]?.promise || ""}
OBJECIONES: ${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}
AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
PRECIO: A definir (consultar baseContext)
MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- welcome_sequence: 7 emails LISTOS PARA COPIAR Y PEGAR (no plantillas vacias)
- Cada email: subject (30-50 chars), preview_text, body completo (150-300 palabras)
- Tono: persona escribiendole a otra persona, NUNCA corporativo
- Parrafos maximo 3 lineas (se lee en movil)
- 1 solo CTA por email
- launch_sequence con pre-launch (5 emails) y launch (3 emails)
- reactivation_sequence: 3 emails para lista fria (60+ dias sin abrir)
- platform_recommendation: ActiveCampaign, Mailchimp, Klaviyo o Brevo segun caso
- best_practices_latam: dias, horarios, palabras a evitar y que funcionan
- KPIs target reales (open >25%, click >3%)`,


    pricing_strategy: `Genera la ESTRATEGIA COMPLETA DE PRECIOS para este producto/servicio.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
COMPETIDORES: ${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.price}`).join("\n") || "N/A"}
DOLORES CRITICOS: ${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain} (impacto: ${p.impact})`).join("\n") || "N/A"}
LEAD MAGNETS: ${JSON.stringify(prev.lead_magnets?.leadMagnets?.slice(0, 2) || []).substring(0, 400)}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- recommended_price_usd basado en analisis competitivo y posicionamiento
- price_in_local_currency con conversion + precio psicologico ($497 vs $500)
- Mostrar costo del PROBLEMA antes del precio (anclaje Hormozi)
- value_ladder_complete: free, entry, core, premium, continuity (todos los peldanos)
- payment_plans: planes de cuotas SIEMPRE en LATAM (Wompi, PayU, MercadoPago)
- discount_policy: cuando si y cuando no descontar (la urgencia falsa destruye confianza)
- revenue_projections con 3 escenarios (conservador, realista, optimista) + assumptions`,


    kpis_dashboard: `Genera el DASHBOARD COMPLETO DE KPIs para esta estrategia 360.

${baseContext}

CANALES ACTIVOS: Organico (parrilla generada), Paid (Meta+TikTok), Email, WhatsApp, Landing
PRESUPUESTO PAID: ${prev.paid_ads?.paid_ads_strategy?.budget_recommendation?.minimum_usd_monthly || 0} USD/mes minimo
PRECIO: ${prev.pricing_strategy?.pricing_strategy?.price_analysis?.recommended_price_usd || 0} USD
MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- north_star_metric: LA metrica unica que define el exito (ej: clientes mensuales recurrentes)
- aarrr_metrics: completo (Acquisition, Activation, Retention, Revenue, Referral) con formula y target
- channel_kpis para cada canal con metricas, frecuencia de revision y herramientas LATAM
- decision_triggers: condiciones if/then accionables (ej: "Si CTR<1% por 3 dias → cambiar hook")
- weekly y monthly review_checklist con acciones especificas
- tools_stack con herramientas reales (GA4, Hotjar, Microsoft Clarity, Make, Zapier, etc) y costos
- red_flags con sintomas, diagnostico y accion inmediata`,


    seo_strategy: `Genera la ESTRATEGIA COMPLETA DE SEO Y CONTENIDO LARGO.

${baseContext}

AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
COMPETIDORES: ${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name} (${c.website || "sin web"})`).join("\n") || "N/A"}
PARRILLA TEMAS: ${JSON.stringify(prev.content_calendar?.weeklyThemes?.slice(0, 2) || []).substring(0, 300)}
MERCADO: ${targetMarket}

DATOS SEO:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- primary_keywords: 8-12 keywords con search_intent, volumen estimado, dificultad
- long_tail_keywords: 6-10 con menor competencia y alta intencion
- question_keywords: preguntas exactas que hace el avatar (Google + YouTube + TikTok)
- blog_strategy: 3-5 pillar articles + cluster topics (topic clusters)
- youtube_strategy: 10 primeros videos con titulos optimizados
- local_seo si aplica al negocio
- timeline realista: trafico organico tarda 3-6 meses minimo`,


    partnerships: `Genera la ESTRATEGIA COMPLETA DE ALIANZAS Y COLABORACIONES.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
PRECIO: A definir (consultar baseContext)
DIFERENCIADORES: ${JSON.stringify(prev.differentiation?.differentiation?.positioningOpportunities?.slice(0, 3) || []).substring(0, 400)}
MERCADO: ${targetMarket}

POTENCIALES ALIADOS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- affiliate_program: si conviene crearlo, comision (15-30% tipico LATAM), cookie 30-60 dias
- influencer_marketing: tier nano (1K-10K) y micro (10K-100K) con compensacion realista
- ideal_influencer_profile especifico al avatar y mercado
- co_marketing: 3-5 partners IDEALES (no competidores, mismo avatar) con idea concreta de colaboracion
- community_partnerships: comunidades existentes (FB groups, Telegram, Discord) donde esta el avatar
- pr_strategy: medios, podcasts, newsletters reales del nicho
- outreach_template: mensaje listo para copiar y enviar`,


    community_strategy: `Genera la ESTRATEGIA COMPLETA DE COMUNIDAD para este negocio.

${baseContext}

AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
DOLORES PROFUNDOS: ${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}
LEAD MAGNETS: ${JSON.stringify(prev.lead_magnets?.leadMagnets?.slice(0, 2) || []).substring(0, 400)}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- community_concept: nombre + tagline + plataforma adecuada al avatar (WhatsApp para LATAM low-tech, Discord/Skool para tech-savvy)
- onboarding_flow: que ve el nuevo miembro, cuando siente el aha_moment (max 7 dias)
- content_calendar_community: 7 dias con que postear cada dia
- engagement_mechanics: rituales diarios, eventos semanales y mensuales
- monetization clara: si gratis, como genera ingresos; si paga, que justifica
- growth_strategy con plan de los primeros 100 miembros
- moderation_rules para evitar problemas comunes (spam, trolls)
- metrics: que medir y target realista`,
};
