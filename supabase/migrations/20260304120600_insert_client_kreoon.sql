-- ============================================================
-- CLIENTE: KREOON (Cliente interno estratégico)
-- Fecha: 2026-03-04
-- ============================================================

-- Insertar cliente KREOON en UGC Colombia
DO $$
DECLARE
  v_org_id UUID;
  v_client_id UUID;
BEGIN
  -- Obtener organization_id de UGC Colombia
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name ILIKE '%ugc colombia%'
     OR slug = 'ugc-colombia'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organización UGC Colombia no encontrada, usando la primera organización disponible';
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna organización';
  END IF;

  -- Verificar si ya existe el cliente KREOON
  SELECT id INTO v_client_id FROM clients WHERE name = 'KREOON' AND organization_id = v_org_id;

  IF v_client_id IS NOT NULL THEN
    RAISE NOTICE 'Cliente KREOON ya existe con ID: %', v_client_id;
    RETURN;
  END IF;

  -- Insertar cliente KREOON
  INSERT INTO clients (
    organization_id,
    name,
    contact_email,
    contact_phone,
    logo_url,
    notes,
    bio,
    instagram,
    tiktok,
    portfolio_url,
    is_public,
    username,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    'KREOON',
    'alexander@kreoon.com',
    NULL,
    'https://cdn.kreoon.com/brand/KR-logo.jpg',
    'Cliente interno estratégico. La plataforma Kreoon es el sistema operativo sobre el que opera UGC Colombia. Caso de uso real y prueba de concepto del producto.',
    'Sistema operativo para la economía creativa de LATAM. Plataforma SaaS multi-tenant que unifica gestión de contenido, marketplace de talento verificado, IA generativa, pagos con escrow y analytics en un solo sistema.',
    'https://instagram.com/kreoon.app',
    'https://tiktok.com/@kreoon.app',
    'https://kreoon.com',
    true,
    'kreoon',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_client_id;

  RAISE NOTICE 'Cliente KREOON creado con ID: %', v_client_id;

  -- Insertar ADN de marca completo
  INSERT INTO client_dna (
    client_id,
    transcription,
    emotional_analysis,
    audience_locations,
    dna_data,
    status,
    version,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_client_id,
    'Audio grabado describiendo KREOON: Sistema operativo para agencias creativas de LATAM. Fundado en 2024 por Alexander Castro, nació de la experiencia real operando UGC Colombia. Resuelve el caos operativo de agencias que usan 6+ herramientas fragmentadas. Producto estrella: Plan Agencia Pro a $599 USD/mes. Cliente ideal: fundadores de agencias creativas 28-38 años que facturan $3K-$15K USD/mes y quieren escalar sin contratar más gente. Diferenciador: única plataforma LATAM que integra IA + gestión + marketplace + escrow + analytics. Voz de marca: directa, estratégica, cálida. Colores: púrpura (#7C3AED) y azul (#2563EB). Tagline: Escala tu agencia creativa sin caos operativo.',
    '{"overall_mood": "confident", "confidence_level": 92, "passion_topics": ["escalamiento de agencias", "automatización operativa", "economía creativa LATAM"], "communication_style": {"pace": "moderate", "clarity": "very_clear", "energy": "high"}}',
    '[{"code": "CO", "name": "Colombia", "flag": "🇨🇴"}, {"code": "MX", "name": "México", "flag": "🇲🇽"}, {"code": "EC", "name": "Ecuador", "flag": "🇪🇨"}]',
    '{
      "business_identity": {
        "name": "KREOON",
        "industry": "SaaS / Economía Creativa",
        "sub_industry": "Software para agencias de contenido",
        "description": "Sistema operativo para la economía creativa de LATAM. Plataforma SaaS multi-tenant que unifica gestión de contenido, marketplace de talento verificado, IA generativa, pagos con escrow y analytics en un solo sistema.",
        "business_model": "B2B SaaS",
        "years_in_market": "2 años",
        "competitive_landscape": "Compite contra stacks fragmentados (Notion+Asana+Drive), marketplaces de USA (Billo/Cohley), y software de gestión genérico (Monday/Asana). Único jugador LATAM con solución integral.",
        "origin_story": "Nació de la experiencia real operando UGC Colombia, la agencia de contenido más grande de Colombia. Construido desde adentro del negocio creativo para resolver los problemas reales de escalamiento.",
        "mission": "Democratizar el acceso a infraestructura enterprise para agencias creativas de LATAM.",
        "unique_factor": "Única plataforma construida POR operadores de agencias creativas PARA operadores de agencias creativas. Probada con 300+ videos mensuales."
      },
      "value_proposition": {
        "main_usp": "El único sistema operativo para agencias creativas de LATAM que combina IA, gestión de producción y marketplace de talento en una sola plataforma — con escrow nativo y analytics integrado.",
        "differentiators": [
          "Construido desde la operación real de UGC Colombia",
          "IA nativa integrada (KIRO) para guiones, research y matching",
          "Marketplace de talento verificado con sistema UP de reputación",
          "Escrow nativo para pagos seguros a creadores",
          "Dashboard de cliente en tiempo real"
        ],
        "proof_points": [
          "UGC Colombia opera 300+ videos mensuales sobre Kreoon",
          "28+ clientes activos y 64+ usuarios en la plataforma",
          "Reducción del 60% en tiempo de coordinación"
        ],
        "brand_promise": "Tu agencia funcionará aunque tú estés de vacaciones.",
        "main_problem_solved": "El caos operativo de gestionar agencias creativas con 6+ herramientas fragmentadas que no se hablan entre sí.",
        "solution_description": "Un único sistema que reemplaza Notion, WhatsApp, Drive, Excel, marketplaces externos y herramientas de pago con una plataforma unificada diseñada específicamente para operaciones creativas.",
        "key_benefits": [
          "Gestiona el doble de clientes con el mismo equipo",
          "Visibilidad en tiempo real del estado de cada pieza",
          "Talento verificado disponible en minutos para reemplazos",
          "Dashboard que hace que clientes dejen de llamar preguntando avances"
        ],
        "transformation_promise": "De cuello de botella dependiente de WhatsApp a arquitecto de una agencia que escala sola."
      },
      "ideal_customer": {
        "demographic": {
          "age_range": "28-38 años",
          "gender": "60% mujeres / 40% hombres",
          "location": "Colombia, México, Ecuador, Guatemala - zonas urbanas",
          "income_level": "Facturación agencia: $3K-$15K USD/mes",
          "occupation": "Fundadores y directores de agencias creativas"
        },
        "psychographic": {
          "values": ["Profesionalismo", "Escalabilidad", "Eficiencia", "Independencia"],
          "interests": ["Marketing digital", "Economía creativa", "Productividad", "SaaS", "Emprendimiento"],
          "personality_traits": ["Ambiciosos", "Perfeccionistas", "Multitaskers", "Visionarios", "Prácticos"],
          "lifestyle": "Trabajan 50-60 horas semanales, están saturados de coordinación operativa, quieren tiempo para estrategia y nuevos clientes."
        },
        "pain_points": [
          "Caos operativo por 6+ herramientas fragmentadas",
          "Sin visibilidad en tiempo real del estado de contenido",
          "Dificultad para reemplazar talento rápidamente",
          "Clientes preguntando constantemente por avances",
          "Imposibilidad de escalar sin aumentar equipo",
          "Sin métricas para demostrar ROI"
        ],
        "desires": [
          "Gestionar el doble de clientes con el mismo equipo",
          "Operación que funcione sin depender del fundador",
          "Dashboard en tiempo real para clientes",
          "Talento verificado disponible en minutos",
          "Métricas reales para retener clientes más tiempo"
        ],
        "objections": [
          "Ya tengo Notion/Asana/Drive y funciona",
          "Es caro para mi agencia pequeña",
          "No tengo tiempo para implementar algo nuevo",
          "Mis creadores no van a adaptarse"
        ],
        "buying_triggers": [
          "Rechazar un cliente por falta de capacidad operativa",
          "Perder un cliente por mala comunicación de avances",
          "Creador que falla y no hay reemplazo rápido",
          "Burnout del fundador por coordinación excesiva"
        ]
      },
      "flagship_offer": {
        "name": "Plan Agencia Pro",
        "description": "Infraestructura operativa completa para agencias creativas de LATAM. Reemplaza Notion, WhatsApp, Drive y Excel con un sistema único.",
        "price_range": "$599 USD/mes",
        "main_benefit": "Escalar sin caos y sin contratar más equipo",
        "funnel_role": "core",
        "price": "$599 USD/mes",
        "price_justification": "El costo del stack fragmentado (herramientas + tiempo de coordinación) supera $583 USD/mes. Kreoon lo unifica y agrega IA + marketplace + escrow.",
        "included_features": [
          "Gestión Kanban de producción ilimitada",
          "Dashboard de cliente en tiempo real",
          "KIRO - IA integrada para guiones y research",
          "Marketplace de talento verificado",
          "Escrow para pagos seguros",
          "Analytics de rendimiento",
          "Usuarios ilimitados"
        ],
        "guarantees": [
          "Onboarding guiado en 1 semana",
          "Soporte prioritario por WhatsApp",
          "Migración de datos incluida"
        ],
        "urgency_elements": [
          "Precio de early adopter por tiempo limitado",
          "Acceso a comunidad Kreoon de agencias LATAM"
        ]
      },
      "brand_identity": {
        "brand_archetype": "El Creador + El Sabio",
        "personality_traits": ["Directo", "Estratégico", "Cálido", "Profesional", "Innovador"],
        "tone_of_voice": "Directo y estratégico. Sin rodeos. Habla en resultados concretos y métricas reales. Cálido pero profesional, como un socio de confianza que dice la verdad.",
        "communication_style": "Habla como operador de agencia, no como vendedor de software. Usa ejemplos reales, números concretos, y evita buzzwords vacíos.",
        "tagline_suggestions": [
          "Escala tu agencia creativa sin caos operativo",
          "Tu operación como reloj",
          "De cuello de botella a arquitecto del crecimiento"
        ],
        "key_messages": [
          "El caos operativo no es normal",
          "Gestiona el doble con el mismo equipo",
          "Tu agencia funcionará aunque estés de vacaciones",
          "Construido por operadores para operadores"
        ],
        "voice": {
          "tone": ["Directo", "Estratégico", "Cálido"],
          "do_say": ["Escala sin caos", "Tu operación como reloj", "Resultados concretos", "Números reales"],
          "dont_say": ["Revoluciona todo", "Solución 360°", "Disrupting", "Prueba gratis", "Sin compromiso"]
        },
        "messaging": {
          "tagline": "Escala tu agencia creativa sin caos operativo",
          "elevator_pitch": "Kreoon es el sistema operativo para agencias creativas de LATAM. Reemplaza 6 herramientas fragmentadas con una sola plataforma que integra gestión, marketplace de talento e IA. La misma infraestructura que usa UGC Colombia para producir 300 videos mensuales.",
          "key_messages": ["Escala sin caos", "Talento verificado en minutos", "Dashboard que vende por ti"]
        }
      },
      "visual_identity": {
        "primary_colors": ["#7C3AED"],
        "secondary_colors": ["#2563EB", "#10B981"],
        "color_psychology": "Púrpura para creatividad e innovación, azul para confianza y profesionalismo, verde para crecimiento y resultados.",
        "typography_style": "Sans-serif moderna y limpia. Geométrica para títulos, humanista para cuerpo.",
        "imagery_style": "Screenshots reales de la plataforma, rostros de creadores LATAM, espacios de trabajo modernos pero accesibles.",
        "mood_keywords": ["Profesional", "Moderno", "Accesible", "Confiable", "Innovador"],
        "brand_colors": ["#7C3AED", "#2563EB", "#10B981"],
        "color_meaning": "Púrpura creativo, azul confiable, verde crecimiento",
        "visual_style": ["Minimalista", "Moderno", "Tech-forward"],
        "content_themes": ["Screenshots de producto", "Casos de éxito", "Behind the scenes de agencias"],
        "photography_style": "Auténtica, no stock. Creadores reales trabajando, reuniones de equipo, laptops con la plataforma.",
        "mood": "Profesional pero accesible. Tech pero humano."
      },
      "marketing_strategy": {
        "content_pillars": [
          {"name": "Operación sin caos", "description": "Antes/después de operación, errores que cuestan clientes, costo oculto de fragmentación", "content_ideas": ["Día en la vida antes vs después de Kreoon", "5 señales de que tu stack te está costando clientes", "Calculadora del costo real de tus herramientas"]},
          {"name": "IA aplicada al trabajo creativo", "description": "Demo de KIRO, research automático, guiones generados, matching de talento", "content_ideas": ["KIRO genera un guión en 30 segundos", "De brief a research en 2 minutos", "Cómo la IA encuentra el creador perfecto"]},
          {"name": "Prueba social y casos reales", "description": "UGC Colombia, testimonios, números reales", "content_ideas": ["Cómo UGC Colombia opera 300 videos/mes", "Testimonio: de 5 a 15 clientes en 3 meses", "Los números detrás de una agencia escalada"]},
          {"name": "Educación para escalar agencias", "description": "Errores de escalamiento, pricing, modelo agencia LATAM", "content_ideas": ["Por qué fracasan las agencias al escalar", "Cómo cobrar lo que vales", "El modelo de agencia creativa moderna"]}
        ],
        "recommended_platforms": [
          {"name": "LinkedIn", "priority": "high", "strategy": "Contenido educativo para founders, casos de éxito, thought leadership", "content_types": ["Carruseles", "Videos cortos", "Artículos", "Polls"]},
          {"name": "Instagram", "priority": "high", "strategy": "Behind the scenes, demos rápidas, testimonios en Reels", "content_types": ["Reels", "Stories", "Carruseles"]},
          {"name": "TikTok", "priority": "medium", "strategy": "Demos cortas, humor de agencia, trends creativos", "content_types": ["Videos cortos", "Duets", "Trends"]}
        ],
        "content_formats": ["Carruseles educativos", "Videos demo 30-60s", "Testimonios UGC", "Lives Q&A", "Casos de estudio"],
        "posting_frequency": "4-5 publicaciones semanales distribuidas entre plataformas",
        "engagement_tactics": ["Responder todos los comentarios en menos de 2 horas", "DMs personalizados a founders que interactúan", "Colaboraciones con otros founders de agencias"],
        "hashtag_strategy": ["#AgenciasCreativas", "#EconomiaCreativa", "#MarketingDigital", "#UGCColombia", "#SaaSLATAM"],
        "primary_objective": "Generar leads calificados de agencias $3K-$15K USD/mes",
        "secondary_objectives": ["Posicionamiento como líder en economía creativa LATAM", "Construcción de comunidad de agencias"],
        "main_cta": "Agenda tu demo personalizada",
        "channels": ["LinkedIn", "Instagram", "TikTok", "Email", "WhatsApp"],
        "monthly_budget": "$2,000-$5,000 USD en ads",
        "funnel_strategy": "TOFU: contenido educativo sobre caos operativo → MOFU: demos y casos de éxito → BOFU: llamada de diagnóstico + onboarding"
      },
      "ads_targeting": {
        "meta_targeting": {
          "interests": ["Marketing digital", "Agencias de publicidad", "Creadores de contenido", "Emprendimiento", "SaaS", "Productividad", "Social media marketing", "Influencer marketing"],
          "behaviors": ["Dueños de pequeños negocios", "Usuarios de apps de productividad", "Early adopters de tecnología"],
          "demographics": ["25-45 años", "Nivel educativo universitario", "Ubicación urbana LATAM"],
          "lookalike_suggestions": ["Seguidores de competidores", "Visitantes de landing page", "Leads de formulario"]
        },
        "google_targeting": {
          "keywords": ["software para agencias", "gestión de contenido", "plataforma UGC", "marketplace de creadores", "herramientas para agencias", "automatizar agencia", "escalar agencia de marketing"],
          "audiences": ["Dueños de agencias digitales", "Marketers", "Fundadores startups"],
          "placements": ["YouTube", "Display Network sitios de marketing", "Gmail"]
        },
        "tiktok_targeting": {
          "interests": ["Marketing", "Emprendimiento", "Tecnología", "Productividad"],
          "behaviors": ["Usuarios que siguen cuentas de marketing", "Creadores activos"],
          "creators_to_follow": ["@marketingdigital", "@emprendimiento", "@agenciasdepublicidad"]
        },
        "hook_suggestions": [
          "Así era mi día gestionando 8 clientes por WhatsApp...",
          "¿Cuántas herramientas usas para tu agencia? Yo usaba 6.",
          "Manejamos 300 videos al mes. Este es el sistema.",
          "Tu agencia cobra $5K pero opera como si cobrara $500",
          "¿Rechazaste un cliente porque no tienes capacidad?"
        ],
        "ad_copy_angles": [
          {"angle_name": "Costo oculto", "headline": "Tu stack fragmentado te cuesta más de $583/mes", "body": "Notion + Asana + Drive + WhatsApp + marketplace + pagos. Cada herramienta tiene un costo. Cada integración que falta tiene un costo mayor: tu tiempo.", "cta": "Calcula cuánto te cuesta"},
          {"angle_name": "Transformación", "headline": "De cuello de botella a arquitecto del crecimiento", "body": "Deja de ser indispensable para todo. Kreoon automatiza la coordinación para que tú hagas estrategia.", "cta": "Ve cómo funciona"},
          {"angle_name": "Prueba social", "headline": "300 videos al mes. Un solo sistema.", "body": "UGC Colombia, la agencia de contenido más grande de Colombia, opera toda su producción sobre Kreoon. Tú también puedes.", "cta": "Conoce el caso"}
        ],
        "interests": ["Marketing digital", "Agencias de publicidad", "Creadores de contenido", "Emprendimiento", "SaaS", "Productividad", "Social media marketing", "Influencer marketing", "TikTok for Business", "Meta Business Suite"],
        "behaviors": ["Dueños de pequeños negocios", "Usuarios de apps de productividad", "Early adopters"],
        "lookalike_sources": ["Clientes actuales de Kreoon", "Visitantes de kreoon.com", "Leads de demo"],
        "keywords_google": ["software agencias creativas", "plataforma ugc colombia", "marketplace creadores latam", "gestión producción contenido", "herramientas agencias digitales", "automatizar agencia marketing", "escalar agencia contenido", "saas agencias"],
        "hashtags": ["#AgenciasCreativas", "#EconomiaCreativa", "#MarketingDigital", "#UGCColombia", "#CreadoresLATAM", "#SaaSLATAM", "#EscalaTuAgencia", "#ContentCreators", "#MarketingLATAM", "#AgenciasDigitales"],
        "negative_keywords": ["gratis", "curso", "tutorial básico", "empleo", "trabajo", "freelance"]
      },
      "metadata": {
        "generated_at": "2026-03-04T12:00:00Z",
        "ai_model": "manual_entry",
        "language": "es",
        "emotional_context_used": true
      }
    }'::jsonb,
    'completed',
    1,
    true,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'ADN de marca de KREOON creado exitosamente';
END $$;

-- Verificar inserción
SELECT id, name, organization_id, contact_email FROM clients WHERE name = 'KREOON';
