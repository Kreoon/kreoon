// ============================================================
// KAE TRACK - Batched Event Processing
// ============================================================
//
// Receives batched events from the client SDK (useAnalytics hook),
// enriches with geo data, upserts visitors/sessions, and inserts events.
// Conversion forwarding to ad platforms is handled by kae-conversion.
//
// JWT: verify_jwt = false (anonymous visitors send events)

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VisitorContext {
  anonymous_id: string;
  session_id: string;
  user_id?: string;
  utms: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  click_ids: {
    fbclid?: string;
    ttclid?: string;
    gclid?: string;
    li_fat_id?: string;
  };
  referrer?: string;
  landing_page?: string;
}

interface TrackEvent {
  event_name: string;
  event_category: string;
  properties: Record<string, unknown>;
  page_url: string;
  page_path: string;
  page_title: string;
  page_referrer: string;
  device_type: string;
  browser: string;
  os: string;
  screen_width: number;
  screen_height: number;
  client_timestamp: string;
}

interface RequestBody {
  events: TrackEvent[];
  context: VisitorContext;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { events, context }: RequestBody = await req.json();

    // Obtener geo data del request
    const geo = {
      country: req.headers.get("cf-ipcountry") || "Unknown",
      city: req.headers.get("cf-ipcity") || "Unknown",
      region: req.headers.get("cf-region") || "Unknown",
    };

    // 1. Upsert visitor
    const { error: visitorError } = await supabase
      .from("kae_visitors")
      .upsert({
        anonymous_id: context.anonymous_id,
        first_utm_source: context.utms.utm_source,
        first_utm_medium: context.utms.utm_medium,
        first_utm_campaign: context.utms.utm_campaign,
        first_utm_content: context.utms.utm_content,
        first_utm_term: context.utms.utm_term,
        first_referrer: context.referrer,
        first_landing_page: context.landing_page,
        fbclid: context.click_ids.fbclid,
        ttclid: context.click_ids.ttclid,
        gclid: context.click_ids.gclid,
        li_fat_id: context.click_ids.li_fat_id,
        user_agent: req.headers.get("user-agent"),
        device_type: events[0]?.device_type,
        browser: events[0]?.browser,
        os: events[0]?.os,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        user_id: context.user_id || null,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: "anonymous_id",
        ignoreDuplicates: false,
      });

    if (visitorError) {
      console.error("Error upserting visitor:", visitorError);
    }

    // 2. Upsert session
    const { error: sessionError } = await supabase
      .from("kae_sessions")
      .upsert({
        session_id: context.session_id,
        anonymous_id: context.anonymous_id,
        user_id: context.user_id || null,
        utm_source: context.utms.utm_source,
        utm_medium: context.utms.utm_medium,
        utm_campaign: context.utms.utm_campaign,
        utm_content: context.utms.utm_content,
        utm_term: context.utms.utm_term,
        referrer: context.referrer,
        landing_page: context.landing_page,
        page_views: events.filter(e => e.event_name === "page_view").length,
        events_count: events.length,
        last_activity_at: new Date().toISOString(),
      }, {
        onConflict: "session_id",
        ignoreDuplicates: false,
      });

    if (sessionError) {
      console.error("Error upserting session:", sessionError);
    }

    // 3. Insert events
    const eventsToInsert = events.map(event => ({
      anonymous_id: context.anonymous_id,
      user_id: context.user_id || null,
      session_id: context.session_id,
      event_name: event.event_name,
      event_category: event.event_category,
      properties: event.properties,
      page_url: event.page_url,
      page_path: event.page_path,
      page_title: event.page_title,
      page_referrer: event.page_referrer,
      device_type: event.device_type,
      browser: event.browser,
      os: event.os,
      screen_width: event.screen_width,
      screen_height: event.screen_height,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      client_timestamp: event.client_timestamp,
    }));

    const { error: eventsError } = await supabase
      .from("kae_events")
      .insert(eventsToInsert);

    if (eventsError) {
      console.error("Error inserting events:", eventsError);
      throw eventsError;
    }

    return new Response(
      JSON.stringify({ success: true, events_tracked: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in kae-track:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
