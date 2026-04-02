import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RecommendationRequest {
  user_id: string;
  limit?: number;
  refresh?: boolean;
}

interface CreatorRecommendation {
  creator_user_id: string;
  score: number;
  reasons: string[];
}

// ── Behavioral scoring from user_feed_events ──────────────────────────

async function scoreBehavioral(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  creatorUserIds: string[],
): Promise<Map<string, { score: number; reasons: string[] }>> {
  const scores = new Map<string, { score: number; reasons: string[] }>();

  // Get recent profile interaction events (last 500)
  const { data: events } = await supabase
    .from("user_feed_events")
    .select("item_id, event_type, duration_ms, metadata")
    .eq("user_id", userId)
    .eq("item_type", "profile")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!events || events.length === 0) return scores;

  // Aggregate events per creator
  const creatorEvents = new Map<
    string,
    { views: number; totalDwell: number; saves: number; follows: number; likes: number }
  >();

  for (const event of events) {
    const creatorId = event.item_id;
    if (!creatorUserIds.includes(creatorId)) continue;

    const entry = creatorEvents.get(creatorId) || {
      views: 0,
      totalDwell: 0,
      saves: 0,
      follows: 0,
      likes: 0,
    };

    switch (event.event_type) {
      case "view_start":
      case "view_end":
        entry.views++;
        if (event.duration_ms) entry.totalDwell += event.duration_ms;
        break;
      case "save":
        entry.saves++;
        break;
      case "follow":
        entry.follows++;
        break;
      case "like":
        entry.likes++;
        break;
    }

    creatorEvents.set(creatorId, entry);
  }

  // Score each creator based on behavioral signals
  for (const [creatorId, agg] of creatorEvents) {
    let score = 0;
    const reasons: string[] = [];

    // Saved: 20 pts
    if (agg.saves > 0) {
      score += 20;
      reasons.push("Guardaste este perfil");
    }

    // Followed: 15 pts
    if (agg.follows > 0) {
      score += 15;
      reasons.push("Lo sigues");
    }

    // Multiple views: interest signal (max 10)
    if (agg.views >= 3) {
      score += Math.min(10, agg.views * 2);
      reasons.push("Visitaste este perfil varias veces");
    }

    // Dwell time: long viewing = interest (max 10)
    const avgDwell = agg.views > 0 ? agg.totalDwell / agg.views : 0;
    if (avgDwell > 30000) {
      score += 10;
    } else if (avgDwell > 15000) {
      score += 5;
    }

    // Likes on their content: 5 pts
    if (agg.likes > 0) {
      score += Math.min(5, agg.likes * 2);
    }

    if (score > 0) {
      scores.set(creatorId, { score: Math.min(40, score), reasons });
    }
  }

  return scores;
}

// ── AI Interest Profile matching ──────────────────────────────────────

async function scoreAIInterests(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  creators: Array<{ user_id: string; categories: string[]; content_types: string[] }>,
): Promise<Map<string, { score: number; reasons: string[] }>> {
  const scores = new Map<string, { score: number; reasons: string[] }>();

  const { data: interestData } = await supabase
    .from("user_interest_profile")
    .select("top_categories, top_creators, engagement_stats")
    .eq("user_id", userId)
    .single();

  if (!interestData) return scores;

  const topCreators: string[] = (interestData.top_creators as string[]) || [];
  const topCategories: string[] = (interestData.top_categories as string[]) || [];
  const stats = (interestData.engagement_stats as Record<string, unknown>) || {};
  const preferredContentType = (stats.preferred_content_type as string) || null;

  for (const creator of creators) {
    let score = 0;
    const reasons: string[] = [];

    // Direct top_creators match: 15 pts
    if (topCreators.includes(creator.user_id)) {
      score += 15;
      reasons.push("Entre tus creadores favoritos");
    }

    // Category overlap with AI-computed top_categories: 5 pts each, max 10
    const catOverlap = creator.categories.filter((c) =>
      topCategories.some((tc) => tc.toLowerCase() === c.toLowerCase()),
    ).length;
    if (catOverlap > 0) {
      score += Math.min(10, catOverlap * 5);
      reasons.push("Coincide con tus intereses");
    }

    // Content type match: max 5
    if (preferredContentType && creator.content_types.includes(preferredContentType)) {
      score += 5;
    }

    if (score > 0) {
      scores.set(creator.user_id, { score: Math.min(30, score), reasons });
    }
  }

  return scores;
}

// ── Collaborative filtering ───────────────────────────────────────────

async function scoreCollaborative(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  creatorUserIds: string[],
): Promise<Map<string, { score: number; reasons: string[] }>> {
  const scores = new Map<string, { score: number; reasons: string[] }>();

  // Find creators the user has saved
  const { data: userSaved } = await supabase
    .from("saved_creators")
    .select("creator_id")
    .eq("user_id", userId);

  if (!userSaved || userSaved.length === 0) return scores;

  const savedCreatorIds = userSaved.map((s) => s.creator_id);

  // Find other users who saved the same creators
  const { data: similarUsers } = await supabase
    .from("saved_creators")
    .select("user_id, creator_id")
    .in("creator_id", savedCreatorIds)
    .neq("user_id", userId)
    .limit(200);

  if (!similarUsers || similarUsers.length === 0) return scores;

  // Count co-saves per user
  const userCounts = new Map<string, number>();
  for (const row of similarUsers) {
    userCounts.set(row.user_id, (userCounts.get(row.user_id) || 0) + 1);
  }

  // Get top similar users (those who share 2+ saved creators)
  const topSimilarUserIds = [...userCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([uid]) => uid);

  if (topSimilarUserIds.length === 0) return scores;

  // Get what those similar users saved that the current user hasn't
  const { data: otherSaved } = await supabase
    .from("saved_creators")
    .select("creator_id")
    .in("user_id", topSimilarUserIds)
    .limit(100);

  if (!otherSaved) return scores;

  // Count how many similar users saved each creator
  const creatorFreq = new Map<string, number>();
  for (const row of otherSaved) {
    if (!savedCreatorIds.includes(row.creator_id)) {
      creatorFreq.set(row.creator_id, (creatorFreq.get(row.creator_id) || 0) + 1);
    }
  }

  // Map creator_profiles.id → user_id for creators we're scoring
  // We need creator_profiles to resolve this
  const { data: creatorMappings } = await supabase
    .from("creator_profiles")
    .select("id, user_id")
    .in("id", [...creatorFreq.keys()]);

  if (!creatorMappings) return scores;

  for (const mapping of creatorMappings) {
    const freq = creatorFreq.get(mapping.id) || 0;
    if (freq > 0 && creatorUserIds.includes(mapping.user_id)) {
      const score = Math.min(20, freq * 5);
      scores.set(mapping.user_id, {
        score,
        reasons: ["Popular entre usuarios similares"],
      });
    }
  }

  return scores;
}

// ── Main handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { user_id, limit = 30, refresh = false } =
      (await req.json()) as RecommendationRequest;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (6-hour TTL)
    if (!refresh) {
      const { data: cached } = await supabase
        .from("suggested_profiles_cache")
        .select("suggested_user_id, score, reason")
        .eq("user_id", user_id)
        .gt("expires_at", new Date().toISOString())
        .order("score", { ascending: false })
        .limit(limit);

      if (cached && cached.length >= 5) {
        return new Response(
          JSON.stringify({
            success: true,
            recommendations: cached.map((c) => ({
              creator_user_id: c.suggested_user_id,
              score: Number(c.score),
              reasons: c.reason ? c.reason.split("|") : [],
            })),
            has_personalization: true,
            from_cache: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log(`[marketplace-recommendations] Computing for user ${user_id}`);

    // Fetch all active creators
    const { data: creators } = await supabase
      .from("creator_profiles")
      .select("id, user_id, categories, content_types, languages, location_country, level, rating_avg, completed_projects")
      .eq("is_active", true)
      .neq("user_id", user_id);

    if (!creators || creators.length === 0) {
      return new Response(
        JSON.stringify({ success: true, recommendations: [], has_personalization: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const creatorUserIds = creators.map((c) => c.user_id);

    // Run all server-side scoring in parallel
    const [behavioralScores, aiScores, collaborativeScores] = await Promise.all([
      scoreBehavioral(supabase, user_id, creatorUserIds),
      scoreAIInterests(
        supabase,
        user_id,
        creators.map((c) => ({
          user_id: c.user_id,
          categories: c.categories || [],
          content_types: c.content_types || [],
        })),
      ),
      scoreCollaborative(supabase, user_id, creatorUserIds),
    ]);

    // Merge scores
    const recommendations: CreatorRecommendation[] = creators.map((creator) => {
      const behavioral = behavioralScores.get(creator.user_id) || { score: 0, reasons: [] };
      const ai = aiScores.get(creator.user_id) || { score: 0, reasons: [] };
      const collaborative = collaborativeScores.get(creator.user_id) || { score: 0, reasons: [] };

      const totalScore = behavioral.score + ai.score + collaborative.score;
      const reasons = [
        ...behavioral.reasons,
        ...ai.reasons,
        ...collaborative.reasons,
      ];

      return {
        creator_user_id: creator.user_id,
        score: totalScore,
        reasons: [...new Set(reasons)],
      };
    });

    // Sort by score descending, keep only those with a score > 0
    const ranked = recommendations
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Cache results (6-hour TTL)
    if (ranked.length > 0) {
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

      // Delete old cache entries
      await supabase
        .from("suggested_profiles_cache")
        .delete()
        .eq("user_id", user_id);

      // Insert new cache
      const cacheRows = ranked.map((r) => ({
        user_id,
        suggested_user_id: r.creator_user_id,
        score: r.score,
        reason: r.reasons.join("|"),
        expires_at: expiresAt,
      }));

      await supabase.from("suggested_profiles_cache").insert(cacheRows);
    }

    const hasPersonalization =
      behavioralScores.size > 0 || aiScores.size > 0 || collaborativeScores.size > 0;

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: ranked,
        has_personalization: hasPersonalization,
        from_cache: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[marketplace-recommendations] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
