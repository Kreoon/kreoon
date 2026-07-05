// ============================================================================
// academy-signed-video-url
// Devuelve una URL de reproduccion para una leccion de Academia SOLO si el
// caller tiene acceso real (free preview / instructor / drip-unlock cumplido).
// Para lecciones Bunny, firma el embed con Embed View Token Authentication
// (expira en 5 min) para que video_bunny_id/URL nunca viajen sin control server-side.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsJsonResponse, handleCorsOptions } from "../_shared/cors.ts";

const EXPIRES_SECONDS = 5 * 60;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return corsJsonResponse(req, { error: "invalid JSON body" }, 400);
  }

  const lessonId = body?.lesson_id;
  if (!lessonId) {
    return corsJsonResponse(req, { error: "lesson_id is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader ?? "" } },
  });

  const { data: { user } = { user: null } } = authHeader
    ? await supabaseUser.auth.getUser()
    : { data: { user: null } };

  if (!user) {
    return corsJsonResponse(req, { error: "unauthorized" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: lesson, error: lessonError } = await supabaseAdmin
    .from("academy_lessons")
    .select("id, course_id, video_source, video_bunny_id, video_url, is_free_preview")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return corsJsonResponse(req, { error: "lesson not found" }, 404);
  }

  const { data: course } = await supabaseAdmin
    .from("academy_courses")
    .select("instructor_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  const isInstructor = course?.instructor_id === user.id;

  let unlocked = lesson.is_free_preview === true || isInstructor;
  if (!unlocked) {
    const { data: unlockResult } = await supabaseAdmin.rpc("academy_evaluate_unlock", {
      p_target_type: "lesson",
      p_target_id: lesson.id,
      p_user_id: user.id,
    });
    unlocked = unlockResult?.unlocked === true;
  }

  if (!unlocked) {
    return corsJsonResponse(req, { error: "forbidden: lesson locked" }, 403);
  }

  if (lesson.video_source !== "bunny" || !lesson.video_bunny_id) {
    return corsJsonResponse(req, {
      mode: "passthrough",
      video_source: lesson.video_source,
      video_url: lesson.video_url ?? null,
    });
  }

  const libraryId = Deno.env.get("BUNNY_LIBRARY_ID") ?? "";
  const securityKey = Deno.env.get("BUNNY_STREAM_TOKEN_KEY");
  const expires = Math.floor(Date.now() / 1000) + EXPIRES_SECONDS;

  let tokenQuery = "";
  if (securityKey) {
    const token = await sha256Hex(`${securityKey}${lesson.video_bunny_id}${expires}`);
    tokenQuery = `&token=${token}&expires=${expires}`;
  }

  const embedUrl =
    `https://iframe.mediadelivery.net/embed/${libraryId}/${lesson.video_bunny_id}` +
    `?autoplay=false&responsive=true&preload=true${tokenQuery}`;

  return corsJsonResponse(req, { mode: "bunny_embed", embed_url: embedUrl, expires });
});
