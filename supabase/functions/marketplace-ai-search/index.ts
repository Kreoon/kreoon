import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_MAP: Record<string, string[]> = {
  ugc:            ['ugc_creator'],
  creador:        ['ugc_creator', 'lifestyle_creator'],
  influencer:     ['micro_influencer', 'nano_influencer', 'macro_influencer'],
  microinfluencer: ['micro_influencer'],
  nanoinfluencer: ['nano_influencer'],
  macroinfluencer: ['macro_influencer'],
  editor:         ['video_editor', 'colorist', 'motion_graphics'],
  motion:         ['motion_graphics', 'animator_2d3d'],
  fotografo:      ['photographer'],
  disenador:      ['graphic_designer'],
  locutor:        ['voice_artist'],
  voz:            ['voice_artist'],
  estratega:      ['content_strategist', 'digital_strategist'],
  community:      ['community_manager'],
  smm:            ['social_media_manager'],
  trafficker:     ['trafficker'],
  seo:            ['seo_specialist'],
  desarrollador:  ['web_developer', 'app_developer'],
  instructor:     ['online_instructor'],
  streamer:       ['live_streamer'],
  podcast:        ['podcast_host'],
  embajador:      ['brand_ambassador'],
};

// ISO 3166-1 alpha-2 para países LATAM
const COUNTRY_MAP: Record<string, string> = {
  colombia: 'CO', bogota: 'CO', medellin: 'CO', cali: 'CO', barranquilla: 'CO',
  mexico: 'MX', cdmx: 'MX', guadalajara: 'MX', monterrey: 'MX',
  chile: 'CL', santiago: 'CL',
  argentina: 'AR', 'buenos aires': 'AR',
  peru: 'PE', lima: 'PE',
  ecuador: 'EC', quito: 'EC', guayaquil: 'EC',
  venezuela: 'VE', caracas: 'VE',
  brasil: 'BR', 'sao paulo': 'BR',
  uruguay: 'UY', montevideo: 'UY',
  bolivia: 'BO',
  paraguay: 'PY',
  panama: 'PA',
  'costa rica': 'CR',
  guatemala: 'GT',
  espana: 'ES', madrid: 'ES', barcelona: 'ES',
  'estados unidos': 'US', usa: 'US', eeuu: 'US', miami: 'US',
};

const CITY_MAP: Record<string, string> = {
  bogota: 'Bogotá', medellin: 'Medellín', cali: 'Cali', barranquilla: 'Barranquilla',
  cdmx: 'CDMX', guadalajara: 'Guadalajara', monterrey: 'Monterrey',
  santiago: 'Santiago', 'buenos aires': 'Buenos Aires',
  lima: 'Lima', quito: 'Quito', guayaquil: 'Guayaquil',
  caracas: 'Caracas', miami: 'Miami',
};

// Mapeo de nichos → category del marketplace
const CATEGORY_MAP: Record<string, string> = {
  belleza: 'belleza', skincare: 'belleza', maquillaje: 'belleza', cosmeticos: 'belleza',
  moda: 'moda', ropa: 'moda', fashion: 'moda', estilo: 'moda',
  fitness: 'fitness', gym: 'fitness', deporte: 'fitness', ejercicio: 'fitness', crossfit: 'fitness',
  tech: 'tech', tecnologia: 'tech', gadgets: 'tech',
  food: 'food', comida: 'food', cocina: 'food', gastronomia: 'food', recetas: 'food', restaurante: 'food',
  hogar: 'hogar', decoracion: 'hogar', casa: 'hogar', deco: 'hogar',
  gaming: 'gaming', videojuegos: 'gaming', gamer: 'gaming',
  mascotas: 'mascotas', pets: 'mascotas', perros: 'mascotas', gatos: 'mascotas',
  educacion: 'educacion', cursos: 'educacion', aprendizaje: 'educacion',
  viajes: 'viajes', travel: 'viajes', turismo: 'viajes',
  bebes: 'bebes', maternidad: 'bebes', mama: 'bebes', embarazo: 'bebes', familia: 'bebes',
  salud: 'salud', wellness: 'salud', bienestar: 'salud',
  finanzas: 'finanzas', dinero: 'finanzas', inversiones: 'finanzas',
  musica: 'musica', music: 'musica',
  automotriz: 'automotriz', autos: 'automotriz', carros: 'automotriz',
  arte: 'arte',
};

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseNaturalQuery(query: string) {
  const q = normalizeStr(query);
  const roles: string[] = [];
  let category: string | null = null;
  let country: string | null = null;
  let city: string | null = null;
  let price_max: number | null = null;
  let accepts_exchange: boolean | null = null;
  let min_rating: number | null = null;
  let is_available: boolean | null = null;
  let confidence = 0;

  // Detectar roles - priorizar frases más largas
  const sortedRoles = Object.entries(ROLE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, rs] of sortedRoles) {
    if (q.includes(normalizeStr(kw))) {
      roles.push(...rs);
      confidence += 15;
    }
  }

  // Detectar país - priorizar frases más largas
  const sortedCountries = Object.entries(COUNTRY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, countryCode] of sortedCountries) {
    if (q.includes(normalizeStr(kw))) {
      country = countryCode;
      confidence += 15;
      break;
    }
  }

  for (const [kw, cityName] of Object.entries(CITY_MAP)) {
    if (q.includes(normalizeStr(kw))) {
      city = cityName;
      confidence += 10;
      break;
    }
  }

  // Detectar categoría (primer match)
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (q.includes(normalizeStr(kw))) {
      category = cat;
      confidence += 10;
      break;
    }
  }

  // Detectar precio máximo
  const priceMatch = q.match(/(?:menos de|hasta|maximo|max|bajo|menor a)\s*\$?\s*(\d+)/);
  if (priceMatch) {
    price_max = parseInt(priceMatch[1]);
    confidence += 10;
  }

  // Detectar canje
  if (q.includes('canje') || q.includes('trueque') || q.includes('intercambio') || q.includes('producto')) {
    accepts_exchange = true;
    confidence += 10;
  }

  // Detectar disponibilidad
  if (q.includes('disponible') || q.includes('ahora') || q.includes('inmediato')) {
    is_available = true;
    confidence += 5;
  }

  // Detectar rating mínimo
  const ratingMatch = q.match(/(?:rating|calificacion|estrellas)\s*(?:mayor|minimo|min|>=|>)?\s*(\d+(?:\.\d+)?)/);
  if (ratingMatch) {
    min_rating = parseFloat(ratingMatch[1]);
    confidence += 5;
  }

  // Limpiar keywords para búsqueda textual
  const stopwords = new Set([
    'busco', 'necesito', 'quiero', 'para', 'en', 'de', 'un', 'una', 'marca',
    'creador', 'que', 'con', 'por', 'mi', 'del', 'al', 'y', 'o', 'a', 'las',
    'los', 'el', 'la', 'me', 'se', 'lo', 'es', 'son', 'como', 'su', 'sus',
    'estoy', 'buscando', 'encontrar', 'alguien', 'persona', 'profesional'
  ]);
  const clean_keywords = query.split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w.toLowerCase()))
    .slice(0, 8);

  // Generar sugerencias inteligentes
  const suggestions: string[] = [];
  const roleLabel = [...new Set(roles)][0]?.replace(/_/g, ' ') || 'creador UGC';
  const countryLabels: Record<string, string> = {
    CO: 'Colombia', MX: 'México', CL: 'Chile', AR: 'Argentina',
    PE: 'Perú', EC: 'Ecuador', VE: 'Venezuela', BR: 'Brasil', ES: 'España', US: 'USA',
  };
  const locLabel = city || (country ? countryLabels[country] : '') || '';

  if (roleLabel && category) {
    suggestions.push(`${roleLabel} especializado en ${category}`);
  }
  if (roleLabel && locLabel) {
    suggestions.push(`${roleLabel} en ${locLabel} disponible ahora`);
  }
  if (!roleLabel && category) {
    suggestions.push(`creador UGC para ${category}`);
  }
  if (roleLabel) {
    suggestions.push(`${roleLabel} que acepte canje de producto`);
  }

  // Sugerencias por defecto
  if (suggestions.length < 3) {
    suggestions.push('micro-influencer de fitness en Medellín');
    suggestions.push('editor de video para TikTok con motion graphics');
    suggestions.push('creador UGC de belleza que acepte canje');
  }

  return {
    parsed: {
      roles: [...new Set(roles)],
      country,
      category,
      price_max,
      accepts_exchange,
      clean_keywords,
      confidence,
    },
    suggestions: suggestions.slice(0, 3),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, use_gemini } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query mínimo 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result = parseNaturalQuery(query);

    // Gemini para queries complejas (>12 chars y confianza baja)
    if (use_gemini && Deno.env.get('GEMINI_API_KEY') && query.length > 12 && result.parsed.confidence < 50) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Eres un parser para marketplace de talento creativo en LATAM. Analiza este query y responde SOLO JSON sin markdown:
{
  "roles": [],
  "country": null,
  "category": null,
  "price_max": null,
  "accepts_exchange": null,
  "clean_keywords": []
}

Roles válidos (usa exactamente estos): ugc_creator, lifestyle_creator, micro_influencer, nano_influencer, macro_influencer, brand_ambassador, live_streamer, podcast_host, photographer, copywriter, graphic_designer, voice_artist, video_editor, motion_graphics, sound_designer, colorist, director, producer, animator_2d3d, content_strategist, social_media_manager, community_manager, digital_strategist, trafficker, seo_specialist, email_marketer, growth_hacker, crm_specialist, conversion_optimizer, web_developer, app_developer, ai_specialist, online_instructor, workshop_facilitator

Categorías válidas: belleza, moda, fitness, tech, food, hogar, gaming, mascotas, educacion, viajes, bebes, salud, automotriz, musica, arte

Países en ISO 2: CO, MX, CL, AR, PE, EC, VE, BR, US, ES

Query: "${query}"`
                }]
              }],
              generationConfig: { temperature: 0, maxOutputTokens: 300 }
            })
          }
        );

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            .replace(/```json|```/g, '').trim();

          if (text) {
            try {
              const gParsed = JSON.parse(text);

              // Merge: Gemini complementa al parser local
              result.parsed = {
                roles: gParsed.roles?.length > 0 ? gParsed.roles : result.parsed.roles,
                country: gParsed.country ?? result.parsed.country,
                category: gParsed.category ?? result.parsed.category,
                price_max: gParsed.price_max ?? result.parsed.price_max,
                accepts_exchange: gParsed.accepts_exchange ?? result.parsed.accepts_exchange,
                clean_keywords: gParsed.clean_keywords?.length > 0 ? gParsed.clean_keywords : result.parsed.clean_keywords,
                confidence: 90,
              };
            } catch {
              // JSON parse failed, keep local results
            }
          }
        }
      } catch {
        // Gemini failed, fallback al parser local
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
