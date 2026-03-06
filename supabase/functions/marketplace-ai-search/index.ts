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

const COUNTRY_MAP: Record<string, string> = {
  colombia: 'Colombia', bogota: 'Colombia', medellin: 'Colombia', cali: 'Colombia', barranquilla: 'Colombia',
  mexico: 'México', cdmx: 'México', guadalajara: 'México', monterrey: 'México',
  chile: 'Chile', santiago: 'Chile',
  argentina: 'Argentina', 'buenos aires': 'Argentina',
  peru: 'Perú', lima: 'Perú',
  ecuador: 'Ecuador', quito: 'Ecuador', guayaquil: 'Ecuador',
  venezuela: 'Venezuela', caracas: 'Venezuela',
  'estados unidos': 'Estados Unidos', usa: 'Estados Unidos', miami: 'Estados Unidos',
};

const CITY_MAP: Record<string, string> = {
  bogota: 'Bogotá', medellin: 'Medellín', cali: 'Cali', barranquilla: 'Barranquilla',
  cdmx: 'CDMX', guadalajara: 'Guadalajara', monterrey: 'Monterrey',
  santiago: 'Santiago', 'buenos aires': 'Buenos Aires',
  lima: 'Lima', quito: 'Quito', guayaquil: 'Guayaquil',
  caracas: 'Caracas', miami: 'Miami',
};

const NICHE_MAP: Record<string, string> = {
  belleza: 'belleza', skincare: 'belleza', maquillaje: 'belleza', cosmeticos: 'belleza',
  moda: 'moda', ropa: 'moda', fashion: 'moda', estilo: 'moda',
  fitness: 'fitness', gym: 'fitness', deporte: 'fitness', ejercicio: 'fitness',
  tech: 'tech', tecnologia: 'tech', gadgets: 'tech',
  food: 'food', comida: 'food', cocina: 'food', gastronomia: 'food', recetas: 'food',
  hogar: 'hogar', decoracion: 'hogar', casa: 'hogar',
  gaming: 'gaming', videojuegos: 'gaming', gamer: 'gaming',
  mascotas: 'mascotas', pets: 'mascotas', perros: 'mascotas', gatos: 'mascotas',
  educacion: 'educación', cursos: 'educación', aprendizaje: 'educación',
  viajes: 'viajes', travel: 'viajes', turismo: 'viajes',
  bebes: 'bebés', maternidad: 'bebés', mama: 'bebés', embarazo: 'bebés',
  salud: 'salud', wellness: 'salud', bienestar: 'salud',
  finanzas: 'finanzas', dinero: 'finanzas', inversiones: 'finanzas',
  musica: 'música', music: 'música',
  automotriz: 'automotriz', autos: 'automotriz', carros: 'automotriz',
};

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseNaturalQuery(query: string) {
  const q = normalizeStr(query);
  const roles: string[] = [];
  const niches: string[] = [];
  let country: string | null = null;
  let city: string | null = null;
  let price_max: number | null = null;
  let accepts_exchange: boolean | null = null;
  let min_rating: number | null = null;
  let is_available: boolean | null = null;
  let confidence = 0;

  // Detectar roles
  for (const [kw, rs] of Object.entries(ROLE_MAP)) {
    if (q.includes(normalizeStr(kw))) {
      roles.push(...rs);
      confidence += 15;
    }
  }

  // Detectar país y ciudad
  for (const [kw, countryName] of Object.entries(COUNTRY_MAP)) {
    if (q.includes(normalizeStr(kw))) {
      country = countryName;
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

  // Detectar nichos
  for (const [kw, n] of Object.entries(NICHE_MAP)) {
    if (q.includes(normalizeStr(kw))) {
      niches.push(n);
      confidence += 10;
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
  const nicheLabel = [...new Set(niches)][0] || '';
  const locLabel = city || country || '';

  if (roleLabel && nicheLabel) {
    suggestions.push(`${roleLabel} especializado en ${nicheLabel}`);
  }
  if (roleLabel && locLabel) {
    suggestions.push(`${roleLabel} en ${locLabel} disponible ahora`);
  }
  if (!roleLabel && nicheLabel) {
    suggestions.push(`creador UGC para ${nicheLabel}`);
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
      city,
      niches: [...new Set(niches)],
      price_max,
      accepts_exchange,
      min_rating,
      is_available,
      clean_keywords,
      confidence,
    },
    filters: {
      query: clean_keywords.join(' '),
      roles: roles.length > 0 ? [...new Set(roles)] : null,
      location_country: country,
      location_city: city,
      niches: niches.length > 0 ? [...new Set(niches)] : null,
      max_price: price_max,
      min_rating,
      accepts_exchange,
      is_available,
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

    // Gemini para queries complejas (>15 chars y confianza baja)
    if (use_gemini && Deno.env.get('GEMINI_API_KEY') && query.length > 15 && result.parsed.confidence < 50) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Eres un parser para marketplace de talento creativo LATAM.
Analiza la consulta y retorna SOLO JSON sin markdown ni explicaciones:
{
  "roles": [],
  "country": null,
  "city": null,
  "niches": [],
  "price_max": null,
  "accepts_exchange": null,
  "is_available": null,
  "clean_keywords": []
}

Roles válidos: ugc_creator, lifestyle_creator, video_editor, photographer, micro_influencer, nano_influencer, macro_influencer, content_strategist, trafficker, graphic_designer, motion_graphics, voice_artist, community_manager, social_media_manager, live_streamer, podcast_host, brand_ambassador, web_developer, app_developer, online_instructor

Nichos: belleza, moda, fitness, tech, food, hogar, gaming, mascotas, educación, viajes, bebés, salud, finanzas, música, automotriz

Países: Colombia, México, Chile, Argentina, Perú, Ecuador, Venezuela, Estados Unidos

Consulta del usuario: "${query}"`
                }]
              }],
              generationConfig: { temperature: 0, maxOutputTokens: 400 }
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

              // Merge con resultados locales, Gemini tiene prioridad
              result.parsed = {
                ...result.parsed,
                ...gParsed,
                confidence: 90
              };

              result.filters = {
                ...result.filters,
                query: (gParsed.clean_keywords || result.parsed.clean_keywords).join(' '),
                roles: gParsed.roles?.length > 0 ? gParsed.roles : result.filters.roles,
                niches: gParsed.niches?.length > 0 ? gParsed.niches : result.filters.niches,
                location_country: gParsed.country || result.filters.location_country,
                location_city: gParsed.city || result.filters.location_city,
                max_price: gParsed.price_max ?? result.filters.max_price,
                accepts_exchange: gParsed.accepts_exchange ?? result.filters.accepts_exchange,
                is_available: gParsed.is_available ?? result.filters.is_available,
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
