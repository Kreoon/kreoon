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
  refresh_seed?: string; // Unique seed for each refresh to randomize order
}

interface UserInterestProfile {
  top_tags: string[];
  top_categories: string[];
  top_creators: string[];
  engagement_stats: {
    avg_watch_time?: number;
    preferred_media_type?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, following_ids = [], liked_content_ids = [], viewed_content_ids = [], limit = 50, refresh_seed } = await req.json() as RecommendationRequest;
    
    // Generate a unique session seed for randomization
    const sessionSeed = refresh_seed || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user interest profile if available
    let userInterests: UserInterestProfile | null = null;
    if (user_id) {
      const { data: interestData } = await supabase
        .from('user_interest_profile')
        .select('top_tags, top_categories, top_creators, engagement_stats')
        .eq('user_id', user_id)
        .single();
      
      if (interestData) {
        userInterests = {
          top_tags: (interestData.top_tags as string[]) || [],
          top_categories: (interestData.top_categories as string[]) || [],
          top_creators: (interestData.top_creators as string[]) || [],
          engagement_stats: (interestData.engagement_stats as any) || {},
        };
      }
    }

    // Fetch user's recent engagement events for personalization
    let recentlyEngagedCreators: string[] = [];
    if (user_id) {
      const { data: recentEvents } = await supabase
        .from('user_feed_events')
        .select('item_id, item_type, event_type, duration_ms')
        .eq('user_id', user_id)
        .in('event_type', ['like', 'save', 'view_end'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentEvents && recentEvents.length > 0) {
        // Get creator IDs from recently engaged content
        const engagedContentIds = recentEvents
          .filter(e => e.item_type === 'content')
          .map(e => e.item_id);
        
        if (engagedContentIds.length > 0) {
          const { data: engagedContent } = await supabase
            .from('content')
            .select('creator_id')
            .in('id', engagedContentIds.slice(0, 50));
          
          recentlyEngagedCreators = [...new Set(
            (engagedContent || [])
              .map(c => c.creator_id)
              .filter(Boolean) as string[]
          )];
        }
      }
    }

    // Fetch all available content
    const [{ data: contentData }, { data: postData }] = await Promise.all([
      supabase
        .from('content')
        .select('id, title, creator_id, client_id, created_at, views_count, likes_count')
        .eq('is_published', true)
        .or('video_url.not.is.null,bunny_embed_url.not.is.null,video_urls.not.is.null')
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

      // 5. Creator affinity boost (based on recent engagement)
      if (item.creator_id && recentlyEngagedCreators.includes(item.creator_id)) {
        score += 25;
      }

      // 6. User interest profile boost
      if (userInterests && item.creator_id) {
        if (userInterests.top_creators.includes(item.creator_id)) {
          score += 30;
        }
      }

      // 7. Media type preference
      if (userInterests?.engagement_stats?.preferred_media_type) {
        if (item.media_type === userInterests.engagement_stats.preferred_media_type) {
          score += 10;
        }
      }

      // 8. Liked content creator boost
      if (item.creator_id && liked_content_ids.length > 0) {
        score += 5;
      }

      // 9. Enhanced random factor for variety (changes every refresh)
      // Uses session seed + item id for consistent but varied randomization
      const seed = sessionSeed + item.id;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      // Increased random factor range for more variety: -25 to +25
      const randomFactor = (Math.abs(hash) % 50) - 25;
      score += randomFactor;

      // 10. Additional shuffle factor based on content position
      // This ensures even similarly scored content appears in different order
      const positionShuffle = (Math.abs(hash >> 8) % 15) - 7;
      score += positionShuffle;

      return { ...item, score };
    });

    // Sort by score
    const sorted = scoredContent.sort((a, b) => b.score - a.score);

    // Diversify creators so one person doesn't dominate consecutively
    const diversifyByCreator = (
      items: Array<ContentItem & { score: number }>,
      maxConsecutive = 2
    ) => {
      const remaining = [...items];
      const result: Array<ContentItem & { score: number }> = [];

      let lastCreator: string | null = null;
      let streak = 0;

      while (remaining.length > 0 && result.length < limit) {
        // Prefer an item from a different creator if current streak is too high
        let pickIndex = 0;

        if (lastCreator && streak >= maxConsecutive) {
          const idx = remaining.findIndex((it) => (it.creator_id || it.id) !== lastCreator);
          pickIndex = idx === -1 ? 0 : idx;
        }

        const picked = remaining.splice(pickIndex, 1)[0];
        result.push(picked);

        const pickedCreator = picked.creator_id || picked.id;
        if (pickedCreator === lastCreator) {
          streak += 1;
        } else {
          lastCreator = pickedCreator;
          streak = 1;
        }
      }

      return result;
    };

    const recommended = diversifyByCreator(sorted, 2)
      .map(({ score, ...item }) => item);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: recommended,
        has_personalization: !!userInterests || recentlyEngagedCreators.length > 0,
      }),
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
