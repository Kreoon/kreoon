import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "process") {
      // Fetch all due scheduled posts
      const { data: duePosts, error: fetchErr } = await supabase
        .rpc("get_due_scheduled_posts");

      if (fetchErr) {
        console.error("Error fetching due posts:", fetchErr);
        return new Response(
          JSON.stringify({ error: "Failed to fetch due posts" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!duePosts || duePosts.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, message: "No posts due" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[social-scheduler] Processing ${duePosts.length} due posts`);

      const results: Array<{ post_id: string; status: string; error?: string }> = [];

      for (const post of duePosts) {
        try {
          // Mark as publishing
          await supabase
            .from("scheduled_posts")
            .update({ status: "publishing" })
            .eq("id", post.id);

          // Invoke the publish function
          const { data, error } = await supabase.functions.invoke(
            "social-publish/publish",
            { body: { post_id: post.id } }
          );

          if (error) {
            console.error(`[social-scheduler] Publish failed for ${post.id}:`, error);

            // Increment retry count
            const newRetry = (post.retry_count || 0) + 1;
            const newStatus = newRetry >= (post.max_retries || 3) ? "failed" : "scheduled";

            await supabase
              .from("scheduled_posts")
              .update({
                status: newStatus,
                retry_count: newRetry,
                error_message: error.message || "Publish invocation failed",
              })
              .eq("id", post.id);

            results.push({ post_id: post.id, status: "error", error: error.message });
          } else {
            results.push({ post_id: post.id, status: "dispatched" });
          }
        } catch (err) {
          console.error(`[social-scheduler] Error processing post ${post.id}:`, err);

          const newRetry = (post.retry_count || 0) + 1;
          await supabase
            .from("scheduled_posts")
            .update({
              status: newRetry >= (post.max_retries || 3) ? "failed" : "scheduled",
              retry_count: newRetry,
              error_message: String(err),
            })
            .eq("id", post.id);

          results.push({ post_id: post.id, status: "error", error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ processed: duePosts.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v2: Process content queues - assign next available slot to draft posts
    if (action === "process-queues") {
      const { data: activeQueues, error: queueErr } = await supabase
        .from("content_queue")
        .select("*")
        .eq("is_active", true);

      if (queueErr) {
        console.error("[social-scheduler] Error fetching queues:", queueErr);
        return new Response(
          JSON.stringify({ error: "Failed to fetch queues" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!activeQueues || activeQueues.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, message: "No active queues" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalAssigned = 0;

      for (const queue of activeQueues) {
        // Find draft posts for this queue's account/group
        const postQuery = supabase
          .from("scheduled_posts")
          .select("id")
          .eq("status", "draft")
          .is("scheduled_at", null)
          .order("created_at", { ascending: true })
          .limit(5);

        if (queue.account_id) {
          postQuery.contains("target_account_ids", [queue.account_id]);
        }

        const { data: draftPosts } = await postQuery;
        if (!draftPosts || draftPosts.length === 0) continue;

        // Get next available slot via RPC
        for (const draft of draftPosts) {
          const accountOrGroupId = queue.account_id || queue.group_id;
          if (!accountOrGroupId) continue;

          const { data: nextSlot } = await supabase
            .rpc("get_next_queue_slot", {
              p_queue_owner_id: accountOrGroupId,
              p_after: new Date().toISOString(),
            });

          if (nextSlot) {
            await supabase
              .from("scheduled_posts")
              .update({
                scheduled_at: nextSlot,
                status: "scheduled",
              })
              .eq("id", draft.id);

            totalAssigned++;
          }
        }
      }

      return new Response(
        JSON.stringify({ processed: activeQueues.length, assigned: totalAssigned }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual trigger: schedule a post for immediate publish
    if (action === "publish-now") {
      const { post_id } = await req.json();
      if (!post_id) {
        return new Response(
          JSON.stringify({ error: "post_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update scheduled_at to now and status to scheduled
      await supabase
        .from("scheduled_posts")
        .update({ scheduled_at: new Date().toISOString(), status: "publishing" })
        .eq("id", post_id);

      // Directly invoke publish
      const { data, error } = await supabase.functions.invoke(
        "social-publish/publish",
        { body: { post_id } }
      );

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[social-scheduler] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
