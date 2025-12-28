import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  user_id: string;
  viewer_id?: string; // For anonymous users
}

interface CreatorStats {
  creator_id: string;
  total_engagement: number;
  views: number;
  likes: number;
  saves: number;
  total_watch_time: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, viewer_id } = await req.json() as ExtractRequest;
    
    if (!user_id && !viewer_id) {
      return new Response(
        JSON.stringify({ error: "user_id or viewer_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's engagement events from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let eventsQuery = supabase
      .from('user_feed_events')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (user_id) {
      eventsQuery = eventsQuery.eq('user_id', user_id);
    } else if (viewer_id) {
      eventsQuery = eventsQuery.eq('viewer_id', viewer_id);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    if (!events || events.length === 0) {
      console.log("No events found for user:", user_id || viewer_id);
      return new Response(
        JSON.stringify({ success: true, message: "No events to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${events.length} events to analyze`);

    // Get unique content IDs
    const contentIds = [...new Set(events.filter(e => e.item_type === 'content').map(e => e.item_id))];
    const postIds = [...new Set(events.filter(e => e.item_type === 'post').map(e => e.item_id))];

    // Fetch content metadata
    const [{ data: contents }, { data: posts }] = await Promise.all([
      contentIds.length > 0 
        ? supabase.from('content').select('id, creator_id, content_type, client_id').in('id', contentIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from('portfolio_posts').select('id, user_id, media_type, tags, category').in('id', postIds)
        : { data: [] }
    ]);

    // Build creator engagement map
    const creatorStats = new Map<string, CreatorStats>();
    const categoryCount = new Map<string, number>();
    const tagCount = new Map<string, number>();
    let totalWatchTime = 0;
    let videoViews = 0;
    let imageViews = 0;

    // Process content events
    const contentMap = new Map((contents || []).map(c => [c.id, c]));
    const postMap = new Map((posts || []).map(p => [p.id, p]));

    for (const event of events) {
      let creatorId: string | null = null;
      let mediaType: string | null = null;
      let tags: string[] = [];
      let category: string | null = null;

      if (event.item_type === 'content') {
        const content = contentMap.get(event.item_id);
        if (content) {
          creatorId = content.creator_id;
          mediaType = 'video';
          if (content.content_type) {
            category = content.content_type;
          }
        }
      } else if (event.item_type === 'post') {
        const post = postMap.get(event.item_id);
        if (post) {
          creatorId = post.user_id;
          mediaType = post.media_type;
          tags = post.tags || [];
          category = post.category;
        }
      }

      // Track media type preference
      if (event.event_type === 'view_end' || event.event_type === 'view_start') {
        if (mediaType === 'video') videoViews++;
        else if (mediaType === 'image') imageViews++;
      }

      // Track watch time
      if (event.duration_ms && event.event_type === 'view_end') {
        totalWatchTime += event.duration_ms;
      }

      // Track category engagement
      if (category) {
        const weight = getEventWeight(event.event_type);
        categoryCount.set(category, (categoryCount.get(category) || 0) + weight);
      }

      // Track tag engagement
      for (const tag of tags) {
        const weight = getEventWeight(event.event_type);
        tagCount.set(tag, (tagCount.get(tag) || 0) + weight);
      }

      // Track creator engagement
      if (creatorId) {
        const existing = creatorStats.get(creatorId) || {
          creator_id: creatorId,
          total_engagement: 0,
          views: 0,
          likes: 0,
          saves: 0,
          total_watch_time: 0,
        };

        existing.total_engagement += getEventWeight(event.event_type);
        
        if (event.event_type === 'view_end') existing.views++;
        if (event.event_type === 'like') existing.likes++;
        if (event.event_type === 'save') existing.saves++;
        if (event.duration_ms) existing.total_watch_time += event.duration_ms;

        creatorStats.set(creatorId, existing);
      }
    }

    // Calculate top creators (by engagement)
    const topCreators = [...creatorStats.values()]
      .sort((a, b) => b.total_engagement - a.total_engagement)
      .slice(0, 20)
      .map(c => c.creator_id);

    // Calculate top categories
    const topCategories = [...categoryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cat]) => cat);

    // Calculate top tags
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

    // Calculate engagement stats
    const totalViews = videoViews + imageViews;
    const avgWatchTime = events.filter(e => e.duration_ms).length > 0
      ? totalWatchTime / events.filter(e => e.duration_ms).length
      : 0;

    const engagementStats = {
      total_events: events.length,
      avg_watch_time: Math.round(avgWatchTime),
      preferred_media_type: videoViews > imageViews ? 'video' : imageViews > videoViews ? 'image' : 'mixed',
      video_views: videoViews,
      image_views: imageViews,
      last_analyzed: new Date().toISOString(),
    };

    // Upsert user interest profile
    const profileData = {
      user_id: user_id || null,
      viewer_id: viewer_id || null,
      top_tags: topTags,
      top_categories: topCategories,
      top_creators: topCreators,
      engagement_stats: engagementStats,
      updated_at: new Date().toISOString(),
    };

    // Check if profile exists
    let existingQuery = supabase.from('user_interest_profile').select('id');
    if (user_id) {
      existingQuery = existingQuery.eq('user_id', user_id);
    } else {
      existingQuery = existingQuery.eq('viewer_id', viewer_id);
    }
    
    const { data: existing } = await existingQuery.single();

    if (existing) {
      // Update existing
      let updateQuery = supabase.from('user_interest_profile').update(profileData);
      if (user_id) {
        updateQuery = updateQuery.eq('user_id', user_id);
      } else {
        updateQuery = updateQuery.eq('viewer_id', viewer_id);
      }
      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('user_interest_profile')
        .insert(profileData);
      if (insertError) {
        console.error("Error inserting profile:", insertError);
        throw insertError;
      }
    }

    console.log("Interest profile updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: {
          top_creators_count: topCreators.length,
          top_categories_count: topCategories.length,
          top_tags_count: topTags.length,
          engagement_stats: engagementStats,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in interest-extractor:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getEventWeight(eventType: string): number {
  switch (eventType) {
    case 'save': return 5;
    case 'follow': return 4;
    case 'like': return 3;
    case 'comment': return 3;
    case 'share': return 4;
    case 'view_end': return 2;
    case 'view_start': return 1;
    default: return 1;
  }
}
