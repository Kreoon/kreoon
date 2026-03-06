-- ============================================================
-- FIX: Corregir estructura del ADN de KREOON para que coincida
-- con la estructura esperada por el componente ClientDNADisplay
-- ============================================================

DO $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Obtener client_id de KREOON
  SELECT id INTO v_client_id FROM clients WHERE name = 'KREOON' LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Cliente KREOON no encontrado';
    RETURN;
  END IF;

  -- Actualizar la estructura del ADN para que coincida con el componente
  UPDATE client_dna
  SET dna_data = '{
    "business_identity": {
      "name": "KREOON",
      "industry": "SaaS / Economía Creativa",
      "sub_industry": "Software para agencias de contenido",
      "description": "Sistema operativo para la economía creativa de LATAM. Plataforma SaaS multi-tenant que unifica gestión de contenido, marketplace de talento verificado, IA generativa, pagos con escrow y analytics en un solo sistema.",
      "business_model": "B2B SaaS",
      "years_in_market": "2 años",
      "competitive_landscape": "Compite contra stacks fragmentados (Notion+Asana+Drive), marketplaces de USA (Billo/Cohley), y software de gestión genérico (Monday/Asana). Único jugador LATAM con solución integral.",
      "origin_story": "Nació de la experiencia real operando UGC Colombia, la agencia de contenido más grande de Colombia.",
      "mission": "Democratizar el acceso a infraestructura enterprise para agencias creativas de LATAM.",
      "unique_factor": "Única plataforma construida POR operadores de agencias creativas PARA operadores de agencias creativas."
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
      "main_problem_solved": "El caos operativo de gestionar agencias creativas con 6+ herramientas fragmentadas.",
      "solution_description": "Un único sistema que reemplaza Notion, WhatsApp, Drive, Excel, marketplaces externos y herramientas de pago.",
      "key_benefits": [
        "Gestiona el doble de clientes con el mismo equipo",
        "Visibilidad en tiempo real del estado de cada pieza",
        "Talento verificado disponible en minutos",
        "Dashboard que elimina llamadas de seguimiento"
      ],
      "transformation_promise": "De cuello de botella dependiente de WhatsApp a arquitecto de una agencia que escala sola."
    },
    "ideal_customer": {
      "demographics": {
        "age_range": "28-38 años",
        "gender": "60% mujeres / 40% hombres",
        "income_level": "Facturación agencia: $3K-$15K USD/mes",
        "education": "Profesional universitario",
        "occupation": "Fundadores y directores de agencias creativas",
        "location_context": "Colombia, México, Ecuador, Guatemala - zonas urbanas"
      },
      "psychographics": {
        "lifestyle": "Trabajan 50-60 horas semanales, están saturados de coordinación operativa, quieren tiempo para estrategia y nuevos clientes.",
        "values": ["Profesionalismo", "Escalabilidad", "Eficiencia", "Independencia"],
        "interests": ["Marketing digital", "Economía creativa", "Productividad", "SaaS", "Emprendimiento"],
        "media_consumption": ["LinkedIn", "Instagram", "TikTok", "YouTube", "Podcasts de negocios"],
        "purchase_triggers": ["Rechazar cliente por falta de capacidad", "Perder cliente por mala comunicación", "Burnout del fundador"]
      },
      "buying_behavior": {
        "decision_time": "investigador",
        "price_sensitivity": "media",
        "preferred_channels": ["Demo en vivo", "Referidos", "Contenido educativo"],
        "average_ticket": "$250-$600 USD/mes"
      },
      "pain_points": {
        "primary": "Caos operativo por 6+ herramientas fragmentadas que no se hablan entre sí",
        "secondary": [
          "Sin visibilidad en tiempo real del estado de contenido",
          "Dificultad para reemplazar talento rápidamente",
          "Clientes preguntando constantemente por avances",
          "Imposibilidad de escalar sin aumentar equipo"
        ],
        "failed_solutions": [
          "Notion + hojas de cálculo",
          "WhatsApp para coordinación",
          "Contratar más gente sin sistemas"
        ]
      },
      "desires": {
        "functional": "Gestionar el doble de clientes con el mismo equipo",
        "emotional": "Sentir que la agencia es profesional y escalable",
        "social": "Ser reconocido como director de una agencia tecnológica moderna"
      },
      "common_objections": [
        {"objection": "Ya tengo Notion/Asana/Drive y funciona", "response": "Funcionan separadas, pero el costo de coordinación supera $583/mes en tiempo. Kreoon las unifica y agrega IA + marketplace + pagos."},
        {"objection": "Es caro para mi agencia pequeña", "response": "El Plan Starter es $249/mes. El costo de NO tener sistemas te limita a rechazar clientes."},
        {"objection": "No tengo tiempo para implementar algo nuevo", "response": "Onboarding guiado en 1 semana. Migración incluida. Soporte por WhatsApp."},
        {"objection": "Mis creadores no van a adaptarse", "response": "La interfaz es más simple que WhatsApp. Creadores se adaptan en 2 días."}
      ]
    },
    "flagship_offer": {
      "name": "Plan Agencia Pro",
      "description": "Infraestructura operativa completa para agencias creativas de LATAM. Reemplaza Notion, WhatsApp, Drive y Excel con un sistema único.",
      "price_range": "$599 USD/mes",
      "main_benefit": "Escalar sin caos y sin contratar más equipo",
      "funnel_role": "core",
      "price": "$599 USD/mes",
      "price_justification": "El costo del stack fragmentado supera $583 USD/mes en tiempo perdido.",
      "included_features": [
        "Gestión Kanban ilimitada",
        "Dashboard de cliente en tiempo real",
        "KIRO - IA integrada",
        "Marketplace de talento",
        "Escrow para pagos",
        "Analytics de rendimiento"
      ],
      "guarantees": ["Onboarding en 1 semana", "Soporte prioritario por WhatsApp"],
      "urgency_elements": ["Precio de early adopter", "Acceso a comunidad Kreoon"]
    },
    "brand_identity": {
      "brand_archetype": "El Creador + El Sabio",
      "personality_traits": ["Directo", "Estratégico", "Cálido", "Profesional", "Innovador"],
      "tone_of_voice": "Directo y estratégico. Sin rodeos. Habla en resultados concretos.",
      "communication_style": "Habla como operador de agencia, no como vendedor de software.",
      "tagline_suggestions": [
        "Escala tu agencia creativa sin caos operativo",
        "Tu operación como reloj",
        "De cuello de botella a arquitecto del crecimiento"
      ],
      "key_messages": [
        "El caos operativo no es normal",
        "Gestiona el doble con el mismo equipo",
        "Tu agencia funcionará aunque estés de vacaciones"
      ],
      "voice": {
        "tone": ["Directo", "Estratégico", "Cálido"],
        "do_say": ["Escala sin caos", "Tu operación como reloj", "Resultados concretos"],
        "dont_say": ["Revoluciona todo", "Solución 360°", "Disrupting", "Prueba gratis"]
      },
      "messaging": {
        "tagline": "Escala tu agencia creativa sin caos operativo",
        "elevator_pitch": "Kreoon es el sistema operativo para agencias creativas de LATAM. Reemplaza 6 herramientas fragmentadas con una sola plataforma que integra gestión, marketplace de talento e IA.",
        "key_messages": ["Escala sin caos", "Talento verificado en minutos", "Dashboard que vende por ti"]
      }
    },
    "visual_identity": {
      "primary_colors": ["#7C3AED"],
      "secondary_colors": ["#2563EB", "#10B981"],
      "color_psychology": "Púrpura para creatividad e innovación, azul para confianza, verde para crecimiento.",
      "typography_style": "Sans-serif moderna y limpia",
      "imagery_style": "Screenshots reales de la plataforma, rostros de creadores LATAM",
      "mood_keywords": ["Profesional", "Moderno", "Accesible", "Confiable"],
      "brand_colors": ["#7C3AED", "#2563EB", "#10B981"],
      "color_meaning": "Púrpura creativo, azul confiable, verde crecimiento",
      "visual_style": ["Minimalista", "Moderno", "Tech-forward"],
      "content_themes": ["Screenshots de producto", "Casos de éxito", "Behind the scenes"],
      "photography_style": "Auténtica, no stock. Creadores reales trabajando.",
      "mood": "Profesional pero accesible. Tech pero humano."
    },
    "marketing_strategy": {
      "content_pillars": ["Operación sin caos", "IA aplicada al trabajo creativo", "Prueba social y casos reales", "Educación para escalar agencias"],
      "recommended_platforms": [
        {"name": "LinkedIn", "priority": "high", "strategy": "Contenido educativo para founders", "content_types": ["Carruseles", "Videos cortos", "Artículos"]},
        {"name": "Instagram", "priority": "high", "strategy": "Behind the scenes, demos rápidas", "content_types": ["Reels", "Stories", "Carruseles"]},
        {"name": "TikTok", "priority": "medium", "strategy": "Demos cortas, humor de agencia", "content_types": ["Videos cortos", "Trends"]}
      ],
      "content_formats": ["Carruseles educativos", "Videos demo 30-60s", "Testimonios UGC", "Casos de estudio"],
      "posting_frequency": "4-5 publicaciones semanales",
      "engagement_tactics": ["Responder comentarios en 2 horas", "DMs personalizados a founders", "Colaboraciones con founders"],
      "hashtag_strategy": ["#AgenciasCreativas", "#EconomiaCreativa", "#MarketingDigital", "#UGCColombia", "#SaaSLATAM"],
      "primary_objective": "Generar leads calificados de agencias $3K-$15K USD/mes",
      "secondary_objectives": ["Posicionamiento como líder en economía creativa LATAM", "Construcción de comunidad de agencias"],
      "main_cta": "Agenda tu demo personalizada",
      "channels": ["LinkedIn", "Instagram", "TikTok", "Email", "WhatsApp"],
      "monthly_budget": "$2,000-$5,000 USD en ads",
      "funnel_strategy": "TOFU: contenido educativo → MOFU: demos y casos → BOFU: llamada de diagnóstico"
    },
    "ads_targeting": {
      "meta_targeting": {
        "interests": ["Marketing digital", "Agencias de publicidad", "Creadores de contenido", "Emprendimiento", "SaaS"],
        "behaviors": ["Dueños de pequeños negocios", "Usuarios de apps de productividad"],
        "demographics": ["25-45 años", "Nivel universitario", "LATAM urbano"],
        "lookalike_suggestions": ["Clientes actuales", "Visitantes web", "Leads de demo"]
      },
      "google_targeting": {
        "keywords": ["software para agencias", "gestión de contenido", "plataforma UGC", "marketplace creadores"],
        "audiences": ["Dueños de agencias digitales", "Marketers", "Fundadores startups"],
        "placements": ["YouTube", "Display Network", "Gmail"]
      },
      "tiktok_targeting": {
        "interests": ["Marketing", "Emprendimiento", "Tecnología", "Productividad"],
        "behaviors": ["Usuarios que siguen cuentas de marketing", "Creadores activos"],
        "creators_to_follow": ["@marketingdigital", "@emprendimiento"]
      },
      "hook_suggestions": [
        "Así era mi día gestionando 8 clientes por WhatsApp...",
        "¿Cuántas herramientas usas para tu agencia? Yo usaba 6.",
        "Manejamos 300 videos al mes. Este es el sistema.",
        "Tu agencia cobra $5K pero opera como si cobrara $500"
      ],
      "ad_copy_angles": [
        {"angle_name": "Costo oculto", "headline": "Tu stack fragmentado te cuesta más de $583/mes", "body": "Cada herramienta tiene un costo. Cada integración que falta cuesta más: tu tiempo.", "cta": "Calcula cuánto te cuesta"},
        {"angle_name": "Transformación", "headline": "De cuello de botella a arquitecto del crecimiento", "body": "Deja de ser indispensable para todo. Kreoon automatiza la coordinación.", "cta": "Ve cómo funciona"},
        {"angle_name": "Prueba social", "headline": "300 videos al mes. Un solo sistema.", "body": "UGC Colombia opera toda su producción sobre Kreoon. Tú también puedes.", "cta": "Conoce el caso"}
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
  updated_at = NOW()
  WHERE client_id = v_client_id AND is_active = true;

  RAISE NOTICE 'ADN de KREOON actualizado con estructura correcta';
END $$;
