import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentItem {
  id: string;
  title: string;
  creator_id: string | null;
  client_id: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  type: 'content' | 'post';
  media_type?: 'video' | 'image';
}

interface RecommendationRequest {
  user_id?: string;
  following_ids?: string[];
  liked_content_ids?: string[];
  viewed_content_ids?: string[];
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, following_ids = [], liked_content_ids = [], viewed_content_ids = [], limit = 50 } = await req.json() as RecommendationRequest;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all available content
    const [{ data: contentData }, { data: postData }] = await Promise.all([
      supabase
        .from('content')
        .select('id, title, creator_id, client_id, created_at, views_count, likes_count')
        .eq('is_published', true)
        .or('video_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('portfolio_posts')
        .select('id, user_id, media_type, created_at, views_count, likes_count')
        .order('created_at', { ascending: false })
        .limit(200)
    ]);

    // Filter posts from public profiles
    const postUserIds = [...new Set((postData || []).map(p => p.user_id))];
    const { data: profiles } = postUserIds.length > 0
      ? await supabase.from('profiles').select('id, is_public').in('id', postUserIds)
      : { data: [] };

    const publicUserIds = new Set((profiles || []).filter(p => p.is_public !== false).map(p => p.id));

    // Map all content to unified format
    const allContent: ContentItem[] = [
      ...(contentData || []).map(c => ({
        id: c.id,
        title: c.title,
        creator_id: c.creator_id,
        client_id: c.client_id,
        created_at: c.created_at,
        views_count: c.views_count || 0,
        likes_count: c.likes_count || 0,
        type: 'content' as const,
        media_type: 'video' as const,
      })),
      ...(postData || [])
        .filter(p => publicUserIds.has(p.user_id))
        .map(p => ({
          id: p.id,
          title: '',
          creator_id: p.user_id,
          client_id: null,
          created_at: p.created_at,
          views_count: p.views_count || 0,
          likes_count: p.likes_count || 0,
          type: 'post' as const,
          media_type: p.media_type as 'video' | 'image',
        })),
    ];

    // Score each content item
    const scoredContent = allContent.map(item => {
      let score = 0;
      const now = Date.now();
      const createdAt = new Date(item.created_at).getTime();
      const ageHours = (now - createdAt) / (1000 * 60 * 60);

      // 1. Following boost (highest priority)
      if (item.creator_id && following_ids.includes(item.creator_id)) {
        score += 100;
      }

      // 2. Recency score (newer = higher)
      if (ageHours < 24) {
        score += 50;
      } else if (ageHours < 72) {
        score += 30;
      } else if (ageHours < 168) {
        score += 15;
      }

      // 3. Engagement score (normalized)
      const engagementScore = Math.min(20, Math.log10(item.likes_count + 1) * 5 + Math.log10(item.views_count + 1) * 2);
      score += engagementScore;

      // 4. Diversity penalty for already viewed
      if (viewed_content_ids.includes(item.id)) {
        score -= 30;
      }

      // 5. Similar content boost (if user liked content from same creator/client)
      if (item.creator_id && liked_content_ids.length > 0) {
        // This would ideally check if creator has other liked content
        score += 5;
      }

      // 6. Random factor for variety (changes periodically)
      const seed = new Date().toISOString().slice(0, 13) + item.id;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      const randomFactor = (Math.abs(hash) % 20) - 10; // -10 to +10
      score += randomFactor;

      return { ...item, score };
    });

    // Sort by score and return
    const recommended = scoredContent
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...item }) => item);

    return new Response(
      JSON.stringify({ success: true, recommendations: recommended }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in feed-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
