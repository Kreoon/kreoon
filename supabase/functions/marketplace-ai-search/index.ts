import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedQuery {
  roles: string[];
  location: string | null;
  categories: string[];
  keywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple keyword extraction (can be enhanced with AI later)
    const parsed = parseNaturalQuery(query);

    // Build filter object for frontend
    const filters = {
      search: parsed.keywords.join(' '),
      country: parsed.location,
      marketplace_roles: parsed.roles,
      category: parsed.categories[0] || null,
    };

    return new Response(
      JSON.stringify({
        parsed,
        filters,
        suggestions: generateSuggestions(query)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseNaturalQuery(query: string): ParsedQuery {
  const q = query.toLowerCase();

  // Extract roles
  const roleMap: Record<string, string> = {
    'ugc': 'ugc_creator',
    'creador ugc': 'ugc_creator',
    'editor': 'video_editor',
    'editor de video': 'video_editor',
    'fotógrafo': 'photographer',
    'fotografo': 'photographer',
    'community': 'community_manager',
    'diseñador': 'graphic_designer',
  };

  const roles: string[] = [];
  for (const [keyword, role] of Object.entries(roleMap)) {
    if (q.includes(keyword)) roles.push(role);
  }

  // Extract location
  const locationMap: Record<string, string> = {
    'bogotá': 'CO',
    'bogota': 'CO',
    'colombia': 'CO',
    'méxico': 'MX',
    'mexico': 'MX',
    'cdmx': 'MX',
    'chile': 'CL',
    'argentina': 'AR',
    'perú': 'PE',
    'peru': 'PE',
  };

  let location: string | null = null;
  for (const [keyword, code] of Object.entries(locationMap)) {
    if (q.includes(keyword)) {
      location = code;
      break;
    }
  }

  // Extract categories
  const categoryMap: Record<string, string> = {
    'belleza': 'belleza',
    'skincare': 'belleza',
    'moda': 'moda',
    'fitness': 'fitness',
    'tech': 'tech',
    'tecnología': 'tech',
    'food': 'food',
    'comida': 'food',
    'gaming': 'gaming',
  };

  const categories: string[] = [];
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (q.includes(keyword)) categories.push(cat);
  }

  // Remaining words as keywords
  const stopwords = ['busco', 'para', 'en', 'de', 'un', 'una', 'marca', 'creador', 'creator'];
  const keywords = query
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.includes(w.toLowerCase()));

  return { roles, location, categories, keywords };
}

function generateSuggestions(query: string): string[] {
  return [
    'editor de video para TikTok',
    'fotógrafo de producto en México',
    'creador UGC para skincare',
  ];
}
