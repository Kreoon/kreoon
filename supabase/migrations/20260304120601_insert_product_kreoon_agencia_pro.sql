-- ============================================================
-- PRODUCTO: Plan Agencia Pro — KREOON
-- Fecha: 2026-03-04
-- ============================================================

DO $$
DECLARE
  v_client_id UUID;
  v_org_id UUID;
  v_product_id UUID;
BEGIN
  -- Obtener client_id de KREOON
  SELECT c.id, c.organization_id INTO v_client_id, v_org_id
  FROM clients c
  WHERE c.name = 'KREOON'
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente KREOON no encontrado. Ejecutar primero la migración del cliente.';
  END IF;

  -- Verificar si ya existe el producto
  SELECT id INTO v_product_id FROM products WHERE client_id = v_client_id AND name ILIKE '%agencia pro%';

  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Producto Plan Agencia Pro ya existe con ID: %', v_product_id;
    RETURN;
  END IF;

  -- Insertar producto con research completo
  INSERT INTO products (
    client_id,
    name,
    description,
    brief_status,
    brief_data,
    market_research,
    ideal_avatar,
    avatar_profiles,
    competitor_analysis,
    sales_angles_data,
    content_strategy,
    created_at,
    updated_at
  ) VALUES (
    v_client_id,
    'Plan Agencia Pro — KREOON',
    'Infraestructura operativa completa para agencias creativas de LATAM. Reemplaza Notion, WhatsApp, Drive y Excel con un sistema único que gestiona clientes, equipos, producción, talento, pagos y analytics — con IA integrada desde el core.',
    'completed',

    -- brief_data
    '{
      "productName": "Plan Agencia Pro — KREOON",
      "productDescription": "Sistema operativo para agencias creativas. SaaS multi-tenant con gestión Kanban, marketplace de talento, IA, escrow y analytics.",
      "targetMarket": "Agencias creativas LATAM con 5-25 clientes activos",
      "targetCountry": "Colombia, México, Ecuador, Guatemala",
      "mainObjective": "Escalar operación sin caos y sin contratar más equipo",
      "budget": "599 USD/mes",
      "timeline": "Implementación en 1 semana",
      "contentTypes": ["Demo", "Case Study", "Tutorial", "Social Proof", "Comparativo"],
      "salesChannel": "Direct + Referral + Organic",
      "price": "$599 USD/mes",
      "currency": "USD"
    }'::jsonb,

    -- market_research
    '{
      "marketOverview": {
        "marketSize": "Economía creator global: $250B USD. LATAM representa ~8% con crecimiento del 35% anual.",
        "growthTrend": "Creciente. Más agencias digitales emergentes en LATAM post-pandemia. Demanda de herramientas especializadas en aumento.",
        "opportunity": "Gap enorme entre herramientas genéricas (Notion, Asana) y necesidades reales de agencias creativas latinas.",
        "totalAddressableMarket": "50,000+ agencias creativas activas en LATAM",
        "serviceableMarket": "15,000 agencias con facturación $3K-$15K USD/mes"
      },
      "pains": [
        "Caos operativo por 6+ herramientas fragmentadas que no se hablan entre sí",
        "Sin visibilidad en tiempo real del estado de cada pieza de contenido",
        "Dificultad para reemplazar talento fallido rápidamente",
        "Clientes preguntando constantemente por avances sin poder dar respuesta inmediata",
        "Imposibilidad de escalar clientes sin aumentar el equipo proporcionalmente",
        "Sin métricas para demostrar el ROI del contenido producido",
        "Dependencia total del fundador para coordinación diaria",
        "Pagos a creadores desorganizados y sin trazabilidad"
      ],
      "desires": [
        "Gestionar el doble de clientes con el mismo equipo",
        "Operación que funcione sin depender del fundador en cada decisión",
        "Dashboard que muestre el avance al cliente en tiempo real",
        "Talento verificado disponible en minutos para reemplazos o escala",
        "Métricas reales para retener clientes más tiempo",
        "Tiempo para estrategia y cierre de nuevos clientes",
        "Profesionalizar la imagen de la agencia"
      ],
      "objections": [
        {"objection": "Ya tengo Notion/Asana/Drive y funciona", "response": "Funcionan separadas, pero el costo de coordinación entre ellas supera $583/mes en tiempo. Kreoon las unifica y agrega IA + marketplace + pagos."},
        {"objection": "Es caro para mi agencia pequeña", "response": "El Plan Starter es $249/mes. Y el costo de NO tener sistemas te limita a rechazar clientes por falta de capacidad."},
        {"objection": "No tengo tiempo para implementar algo nuevo", "response": "Onboarding guiado en 1 semana. Migración de datos incluida. Soporte por WhatsApp."},
        {"objection": "Mis creadores no van a adaptarse", "response": "La interfaz es más simple que WhatsApp. Creadores de UGC Colombia se adaptaron en 2 días."}
      ],
      "salesAngles": [
        "El costo oculto de la fragmentación operativa supera tu suscripción mensual",
        "De cuello de botella a arquitecto del crecimiento de tu agencia",
        "Lo que UGC Colombia logró con 300 videos al mes sobre Kreoon",
        "Tu operación funcionando como reloj mientras tú cierras nuevos clientes",
        "La agencia profesional que tus clientes ven vs la que realmente eres operando"
      ],
      "keyInsights": [
        "El 78% de agencias creativas LATAM usa 5+ herramientas no integradas",
        "El tiempo de coordinación representa el 40% del día de un fundador de agencia",
        "Las agencias con sistemas integrados crecen 3x más rápido que las fragmentadas"
      ]
    }'::jsonb,

    -- ideal_avatar
    '{
      "name": "Valeria",
      "age": 32,
      "location": "Bogotá, Colombia",
      "occupation": "Fundadora de agencia de contenido UGC",
      "income": "$4,000 - $8,000 USD/mes facturación agencia",
      "teamSize": "5 personas (2 creadores, 1 editor, 1 estratega, ella directora)",
      "activeClients": 8,
      "jtbd": {
        "functional": "Gestionar más clientes con el mismo equipo sin colapsar la operación",
        "emotional": "Sentir que su agencia es profesional y escalable, no dependiente de ella en todo",
        "social": "Ser reconocida como directora de una agencia tecnológica y moderna en LATAM"
      },
      "dayInLife": "Empieza el día respondiendo WhatsApps de coordinación. Revisa Excel de estados. Recibe llamada de cliente preguntando por avance. Busca creador de reemplazo por DM. Cierra el día sin haber podido trabajar en estrategia ni en nuevos clientes.",
      "triggerToBuy": "Rechaza un cliente potencial de $1,500/mes porque sabe que su operación no aguanta más volumen. Ese momento la hace buscar una solución real.",
      "currentTools": ["Notion", "Asana", "Google Drive", "WhatsApp", "Excel", "Transferencias manuales"],
      "frustrations": ["No tiene tiempo para estrategia", "Clientes la llaman pidiendo actualizaciones", "Cuando un creador falla tarda días en reemplazarlo"],
      "goals": ["Duplicar clientes sin duplicar estrés", "Tener tiempo para cerrar nuevos deals", "Verse como agencia tech, no como freelancer grande"]
    }'::jsonb,

    -- avatar_profiles (3 avatares estratégicos)
    '{
      "profiles": [
        {
          "id": "avatar_1",
          "name": "Valeria — La Fundadora Saturada",
          "age": 32,
          "location": "Bogotá, Colombia",
          "archetype": "Builder atrapada en operación",
          "description": "Fundó su agencia con talento y visión. Hoy tiene 8 clientes pero trabaja 60 horas semanales coordinando en lugar de creando estrategia. Es el cuello de botella de su propio negocio.",
          "painLevel": "Alto",
          "buyingPower": "Alto",
          "mainPain": "Es el cuello de botella de su propio negocio y no puede escalar sin quemarse",
          "mainDesire": "Una agencia que funcione sin ella en cada micro-decisión",
          "triggerMessage": "Escala sin caos. Tu operación como reloj.",
          "contentAngles": ["Día en la vida antes/después", "Calculadora de horas perdidas en coordinación", "Cómo dejar de ser indispensable"],
          "objectionToAddress": "Ya tengo mis herramientas funcionando"
        },
        {
          "id": "avatar_2",
          "name": "Andrés — El Freelancer que quiere ser Agencia",
          "age": 27,
          "location": "Medellín, Colombia",
          "archetype": "Solopreneur en transición",
          "description": "Maneja 3-4 clientes solo. Quiere armar equipo pero no tiene los sistemas para soportar más volumen sin perder calidad. Sabe que si contrata sin sistemas, será peor.",
          "painLevel": "Medio-Alto",
          "buyingPower": "Medio",
          "mainPain": "No puede crecer sin tener caos desde el día 1 con un equipo",
          "mainDesire": "Infraestructura profesional antes de contratar la primera persona",
          "triggerMessage": "Construye tu agencia sobre sistemas, no sobre improvisación.",
          "contentAngles": ["De freelancer a agencia: los 5 errores que evitar", "El sistema antes que el equipo", "Cómo escalar sin perder calidad"],
          "objectionToAddress": "Todavía soy pequeño para necesitar un sistema"
        },
        {
          "id": "avatar_3",
          "name": "Mariana — La Directora de Agencia Establecida",
          "age": 38,
          "location": "Ciudad de México, México",
          "archetype": "Operadora madura buscando modernización",
          "description": "Agencia de 5 años, 15 clientes, equipo de 10. Opera bien pero con herramientas viejas. Sus competidores más jóvenes se ven más tech y profesionales. Necesita modernizarse sin disrumpir lo que ya funciona.",
          "painLevel": "Medio",
          "buyingPower": "Alto",
          "mainPain": "Sus competidores más jóvenes se ven más tech y profesionales",
          "mainDesire": "Adoptar tecnología sin disrumpir una operación que ya funciona",
          "triggerMessage": "Kreoon se adapta a tu operación, no al revés.",
          "contentAngles": ["Moderniza tu agencia sin romper lo que funciona", "El dashboard que impresiona a tus clientes", "Por qué las agencias tech ganan más contratos"],
          "objectionToAddress": "Cambiar sistemas es muy complicado y riesgoso"
        }
      ]
    }'::jsonb,

    -- competitor_analysis
    '{
      "competitors": [
        {
          "name": "Notion + Asana + Drive (Stack fragmentado)",
          "type": "Alternativa fragmentada",
          "marketShare": "~60% de agencias usan este combo",
          "strengths": ["Familiar para todos", "Flexible individualmente", "Bajo costo por herramienta"],
          "weaknesses": ["No integrados entre sí", "Sin marketplace de talento", "Sin IA creativa", "Sin pagos integrados", "Alto costo de tiempo de coordinación"],
          "ourAdvantage": "Todo en uno. El costo real del stack fragmentado supera $583 USD/mes en tiempo + herramientas. Kreoon lo unifica.",
          "positioning": "Superioridad funcional"
        },
        {
          "name": "Billo / Cohley",
          "type": "Marketplace UGC USA",
          "marketShare": "Líderes en USA, casi nulos en LATAM",
          "strengths": ["Catálogo grande de creadores USA", "Marca establecida", "Procesos simples"],
          "weaknesses": ["Solo USA/inglés", "Sin gestión operativa de agencia", "Sin IA", "Sin analytics integrado", "Pricing alto para LATAM"],
          "ourAdvantage": "LATAM-native. Gestión completa de producción + marketplace + IA en una sola plataforma. Precios en realidad LATAM.",
          "positioning": "Especialización regional"
        },
        {
          "name": "Hub (México)",
          "type": "Marketplace LATAM",
          "marketShare": "Líder regional en marketplaces",
          "strengths": ["Presencia regional establecida", "Conoce el mercado LATAM", "Red de creadores"],
          "weaknesses": ["Sin gestión de producción para agencias", "Sin IA", "Sin analytics de rendimiento", "Solo marketplace, no sistema operativo"],
          "ourAdvantage": "Kreoon es el sistema completo. Hub solo conecta creadores, Kreoon opera toda la agencia.",
          "positioning": "Solución integral vs punto único"
        },
        {
          "name": "Monday.com / Asana",
          "type": "Gestión de proyectos genérica",
          "marketShare": "~25% de agencias usan uno de estos",
          "strengths": ["Marca global fuerte", "Ecosistema de integraciones maduro", "Flexibilidad"],
          "weaknesses": ["Genérico, no diseñado para creativos", "Sin marketplace", "Sin IA creativa", "Sin pagos", "Curva de aprendizaje alta para personalizarlo"],
          "ourAdvantage": "Diseñado específicamente para operaciones creativas de LATAM. Funciona out-of-the-box sin personalización.",
          "positioning": "Especialización vertical"
        },
        {
          "name": "Desarrollo a medida",
          "type": "Software custom",
          "marketShare": "~5% de agencias grandes",
          "strengths": ["Personalización total", "Control completo"],
          "weaknesses": ["$50K+ de inversión inicial", "6-12 meses de desarrollo", "Sin mantenimiento incluido", "Riesgo técnico alto"],
          "ourAdvantage": "Infraestructura enterprise lista en días, no meses. Desde $249/mes sin inversión inicial.",
          "positioning": "Velocidad y bajo riesgo"
        }
      ],
      "differentiation": "Única plataforma LATAM que integra IA + gestión operativa + marketplace de talento + escrow + analytics en un solo sistema. Construida desde adentro del negocio creativo real por los operadores de UGC Colombia.",
      "competitiveMatrix": {
        "features": ["Gestión Kanban", "Marketplace talento", "IA integrada", "Escrow pagos", "Analytics", "Dashboard cliente"],
        "kreoon": [true, true, true, true, true, true],
        "notionStack": [true, false, false, false, false, false],
        "billo": [false, true, false, true, false, false],
        "monday": [true, false, false, false, false, false]
      }
    }'::jsonb,

    -- sales_angles_data
    '{
      "angles": [
        {
          "id": "angle_1",
          "title": "El costo oculto del caos operativo",
          "hook": "Tu agencia cobra $5K al mes pero opera como si cobrara $500",
          "description": "Mostrar el costo real de la fragmentación: tiempo de coordinación + herramientas separadas + clientes perdidos por falta de capacidad. El costo oculto supera la suscripción mensual.",
          "targetAvatar": "Valeria — La Fundadora Saturada",
          "spherePhase": "engage",
          "cta": "Calcula cuánto te cuesta tu stack actual",
          "emotionalTrigger": "Frustración por trabajar mucho y sentir que no avanza",
          "proofPoints": ["Stack fragmentado cuesta +$583/mes en tiempo", "40% del día se va en coordinación"]
        },
        {
          "id": "angle_2",
          "title": "De cuello de botella a arquitecto del crecimiento",
          "hook": "¿Y si tu agencia funcionara aunque tú estuvieras de vacaciones?",
          "description": "Transformación emocional: pasar de ser indispensable (cuello de botella) a ser el estratega que diseña el sistema. La agencia funciona sin depender de ti para cada decisión.",
          "targetAvatar": "Valeria — La Fundadora Saturada",
          "spherePhase": "solution",
          "cta": "Ve cómo UGC Colombia opera 300 videos al mes",
          "emotionalTrigger": "Deseo de libertad y escalabilidad real",
          "proofPoints": ["UGC Colombia: 300 videos/mes", "28 clientes activos", "Fundador trabaja en estrategia, no coordinación"]
        },
        {
          "id": "angle_3",
          "title": "La prueba social latinoamericana",
          "hook": "UGC Colombia: de WhatsApp a 300 videos mensuales con sistema",
          "description": "Caso de uso real. La agencia que cofundó Kreoon opera sobre Kreoon. Números reales: 28 clientes, 64+ usuarios activos, 300+ videos mensuales.",
          "targetAvatar": "Mariana — La Directora Establecida",
          "spherePhase": "solution",
          "cta": "Ver caso de estudio completo",
          "emotionalTrigger": "Confianza en solución probada por pares",
          "proofPoints": ["300+ videos mensuales", "28 clientes activos", "64+ usuarios en plataforma", "Reducción 60% tiempo coordinación"]
        },
        {
          "id": "angle_4",
          "title": "Talento verificado en minutos, no días",
          "hook": "Cuando un creador falla, ¿cuánto tiempo pierdes buscando reemplazo?",
          "description": "Dolor específico: reemplazo de talento. Kreoon tiene marketplace con reputación real (sistema UP) + reasignación automática. De días de búsqueda a minutos.",
          "targetAvatar": "Andrés — El Freelancer que quiere ser Agencia",
          "spherePhase": "engage",
          "cta": "Conoce el sistema UP de reputación",
          "emotionalTrigger": "Ansiedad por depender de personas que pueden fallar",
          "proofPoints": ["Marketplace con reputación verificada", "Reasignación en 3 días máximo", "Historial de cada creador visible"]
        },
        {
          "id": "angle_5",
          "title": "El dashboard que vende por ti",
          "hook": "¿Tu cliente todavía te llama para preguntar cómo va su contenido?",
          "description": "Feature específico: dashboard de cliente en tiempo real. Elimina llamadas innecesarias, hace que la agencia se vea más profesional, y aumenta retención porque el cliente siente control.",
          "targetAvatar": "Valeria — La Fundadora Saturada",
          "spherePhase": "solution",
          "cta": "Ver demo del dashboard de cliente",
          "emotionalTrigger": "Frustración por interrupciones constantes + deseo de verse profesional",
          "proofPoints": ["Dashboard en tiempo real para cada cliente", "Reducción 80% en llamadas de seguimiento", "Retención de clientes +25%"]
        }
      ],
      "puv": "El único sistema operativo para agencias creativas de LATAM que combina IA, gestión de producción y marketplace de talento en una sola plataforma — con escrow nativo y analytics integrado. Construido por operadores para operadores.",
      "transformation": {
        "before": "Agencia dependiente del fundador, operando con 6 herramientas fragmentadas, sin visibilidad de avance, perdiendo clientes por falta de capacidad, pagando más de $583/mes en tiempo perdido.",
        "after": "Agencia escalable que opera sola, con dashboards en tiempo real para clientes, talento verificado disponible en minutos, métricas para demostrar ROI, y fundador enfocado en estrategia y crecimiento."
      },
      "leadMagnets": [
        {"name": "Calculadora de costo del stack fragmentado", "type": "tool", "stage": "tofu"},
        {"name": "Plantilla de onboarding de cliente en Kreoon", "type": "template", "stage": "mofu"},
        {"name": "Case study: UGC Colombia 300 videos/mes", "type": "pdf", "stage": "mofu"},
        {"name": "Checklist: 10 señales de que tu agencia necesita un sistema", "type": "checklist", "stage": "tofu"},
        {"name": "Diagnóstico gratuito de operación", "type": "call", "stage": "bofu"}
      ],
      "videoCreatives": [
        {
          "concept": "Día en la vida: antes vs después de Kreoon",
          "format": "9:16 vertical 60s",
          "hook": "Así era mi día gestionando 8 clientes por WhatsApp...",
          "angle": "angle_1",
          "targetPlatform": "Instagram Reels, TikTok"
        },
        {
          "concept": "Demo rápida: brief a tablero en 2 minutos",
          "format": "9:16 vertical 45s",
          "hook": "Esto es lo que pasa cuando un cliente te manda un brief en Kreoon",
          "angle": "angle_5",
          "targetPlatform": "Instagram Reels, TikTok, LinkedIn"
        },
        {
          "concept": "Testimonio UGC Colombia",
          "format": "9:16 vertical 30s",
          "hook": "Manejamos 300 videos al mes. Este es el sistema que usamos.",
          "angle": "angle_3",
          "targetPlatform": "Todas"
        },
        {
          "concept": "Calculadora en acción",
          "format": "9:16 vertical 30s",
          "hook": "¿Cuánto te cuestan tus 6 herramientas? Spoiler: más de $583/mes",
          "angle": "angle_1",
          "targetPlatform": "TikTok, Instagram"
        }
      ]
    }'::jsonb,

    -- content_strategy
    '{
      "tagline": "Kreoon: Escala tu agencia creativa sin caos operativo",
      "brandPromise": "Kreoon te da la infraestructura para que tu talento escale sin que tú te quiebres en el intento.",
      "brandVoice": {
        "tone": "Directo, estratégico, cálido. Habla en resultados, no en features. Como un socio que dice la verdad.",
        "says": ["Escala sin caos", "Tu operación como reloj", "Gestiona el doble con el mismo equipo", "Construido por operadores para operadores"],
        "neverSays": ["Prueba gratis", "Revoluciona todo", "Solución 360°", "Disrupting", "Sin compromiso", "Líder del mercado"]
      },
      "contentPillars": [
        {
          "name": "Operación sin caos",
          "description": "Contenido sobre los problemas reales de operar agencias fragmentadas",
          "topics": ["Antes/después de operación", "Errores que cuestan clientes", "Costo oculto de fragmentación", "Cálculo real de tiempo perdido"],
          "frequency": "2 posts/semana"
        },
        {
          "name": "IA aplicada al trabajo creativo",
          "description": "Demos y educación sobre cómo la IA transforma el trabajo creativo",
          "topics": ["Demo de KIRO generando guiones", "Research automático", "Matching inteligente de talento", "IA que entiende marcas"],
          "frequency": "1 post/semana"
        },
        {
          "name": "Prueba social y casos reales",
          "description": "Testimonios, números, y behind the scenes de agencias reales",
          "topics": ["UGC Colombia case study", "Testimonios de usuarios", "Números reales", "Behind the scenes"],
          "frequency": "1-2 posts/semana"
        },
        {
          "name": "Educación para escalar agencias",
          "description": "Contenido educativo de valor para fundadores de agencias",
          "topics": ["Errores de escalamiento", "Cómo mostrar dashboards a clientes", "Pricing de agencias", "Modelo agencia LATAM moderna"],
          "frequency": "1 post/semana"
        }
      ],
      "esferaInsights": {
        "engage": {
          "objective": "Capturar atención de founders frustrados con su operación",
          "hooks": ["Tu stack fragmentado te cuesta más de lo que crees", "¿Cuántas horas perdiste esta semana coordinando?", "El caos operativo no es normal"],
          "formats": ["Reels problemáticos", "Carruseles educativos", "Polls"],
          "metrics": ["Alcance", "Saves", "Shares"]
        },
        "solution": {
          "objective": "Mostrar cómo Kreoon resuelve los problemas identificados",
          "content": ["Demos de producto", "Caso UGC Colombia", "Comparativos vs alternativas", "Features específicos"],
          "formats": ["Videos demo", "Case studies", "Testimonios"],
          "metrics": ["Click to website", "Demo requests", "Time on page"]
        },
        "remarketing": {
          "objective": "Convertir visitantes en leads y leads en clientes",
          "content": ["Calculadora de ROI", "Testimonios específicos por objeción", "Garantías", "Oferta limitada"],
          "formats": ["Ads con social proof", "Email sequences", "WhatsApp follow-up"],
          "metrics": ["Conversión", "CAC", "Pipeline value"]
        },
        "fidelize": {
          "objective": "Retener y convertir clientes en promotores",
          "content": ["Onboarding guiado", "Tips de uso avanzado", "Comunidad Kreoon", "Referral program"],
          "formats": ["Email onboarding", "In-app tooltips", "Community events"],
          "metrics": ["NPS", "Churn", "Referrals"]
        }
      },
      "executiveSummary": "Kreoon debe posicionarse como el sistema operativo inevitable para cualquier agencia creativa de LATAM que quiera escalar. El mensaje central es simple: el caos operativo no es normal, y Kreoon es la infraestructura para eliminarlo. La estrategia de contenido mezcla educación (mostrar el costo del problema) con prueba social (UGC Colombia como caso real) y demo directa (la plataforma habla por sí misma). El funnel va de awareness del problema → solución demostrada → conversión con urgencia → retención con comunidad.",
      "platforms": {
        "linkedin": {
          "priority": "high",
          "audience": "Founders de agencias, CMOs, decision makers",
          "frequency": "3-4 posts/semana",
          "bestContent": ["Carruseles educativos", "Case studies", "Thought leadership"],
          "bestTimes": ["Martes-Jueves 9-11am"]
        },
        "instagram": {
          "priority": "high",
          "audience": "Creativos, founders jóvenes, team leads",
          "frequency": "5-7 posts/semana (incluyendo stories)",
          "bestContent": ["Reels demo", "Stories behind scenes", "Carruseles tips"],
          "bestTimes": ["Lunes-Viernes 12-2pm, 7-9pm"]
        },
        "tiktok": {
          "priority": "medium",
          "audience": "Creativos jóvenes, aspirantes a agencia",
          "frequency": "3-5 videos/semana",
          "bestContent": ["Demos rápidas", "Humor de agencia", "Trends adaptados"],
          "bestTimes": ["Martes-Viernes 6-9pm"]
        }
      },
      "hashtags": {
        "primary": ["#AgenciasCreativas", "#EconomiaCreativa", "#MarketingDigital"],
        "secondary": ["#UGCColombia", "#CreadoresLATAM", "#SaaSLATAM", "#EscalaTuAgencia"],
        "campaign": ["#KreoonSystem", "#EscalaSinCaos"]
      },
      "contentCalendar": {
        "week1": {
          "monday": {"pillar": "Operación sin caos", "format": "Carrusel educativo"},
          "tuesday": {"pillar": "Educación", "format": "Video corto"},
          "wednesday": {"pillar": "IA aplicada", "format": "Demo Reel"},
          "thursday": {"pillar": "Prueba social", "format": "Testimonio"},
          "friday": {"pillar": "Operación sin caos", "format": "Meme/humor"}
        }
      }
    }'::jsonb,

    NOW(),
    NOW()
  )
  RETURNING id INTO v_product_id;

  RAISE NOTICE 'Producto Plan Agencia Pro creado con ID: %', v_product_id;
END $$;

-- Verificar inserción
SELECT
  p.id,
  p.name,
  p.brief_status,
  c.name as client_name,
  CASE WHEN p.market_research IS NOT NULL THEN 'OK' ELSE 'FALTA' END as research,
  CASE WHEN p.avatar_profiles IS NOT NULL THEN 'OK' ELSE 'FALTA' END as avatares,
  CASE WHEN p.sales_angles_data IS NOT NULL THEN 'OK' ELSE 'FALTA' END as angulos,
  CASE WHEN p.content_strategy IS NOT NULL THEN 'OK' ELSE 'FALTA' END as estrategia
FROM products p
JOIN clients c ON p.client_id = c.id
WHERE c.name = 'KREOON';
