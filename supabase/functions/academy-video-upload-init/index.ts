// ============================================================================
// academy-video-upload-init
// Crea el objeto de video en Bunny Stream y devuelve las credenciales TUS
// para que el navegador suba el archivo directo a Bunny (sin pasar por
// nuestro servidor). Solo el instructor del curso puede iniciar un upload
// para una leccion de ese curso.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsJsonResponse, handleCorsOptions } from "../_shared/cors.ts";

const EXPIRES_SECONDS = 4 * 60 * 60; // 4h: suficiente para uploads grandes en conexiones lentas

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
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Sin titulo";
  if (!lessonId) {
    return corsJsonResponse(req, { error: "lesson_id is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID");
  const bunnyApiKey = Deno.env.get("BUNNY_STREAM_TOKEN_KEY");

  if (!bunnyLibraryId || !bunnyApiKey) {
    return corsJsonResponse(req, { error: "Bunny Stream no esta configurado" }, 500);
  }

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
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return corsJsonResponse(req, { error: "lesson not found" }, 404);
  }

  const { data: course } = await supabaseAdmin
    .from("academy_courses")
    .select("instructor_id, space_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course || course.instructor_id !== user.id) {
    return corsJsonResponse(req, { error: "forbidden: not the course instructor" }, 403);
  }

  // Paso 1: crear el objeto de video en Bunny Stream
  const createResponse = await fetch(
    `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        AccessKey: bunnyApiKey,
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    console.error("[academy-video-upload-init] Bunny create video failed:", createResponse.status, errText.slice(0, 300));
    return corsJsonResponse(req, { error: "no se pudo crear el video en Bunny" }, 502);
  }

  const video = await createResponse.json();
  const videoId: string = video.guid;

  // Paso 2: credenciales de firma TUS (esquema distinto al de reproduccion:
  // libraryId + apiKey + expirationTime + videoId, en ese orden)
  const expirationTime = Math.floor(Date.now() / 1000) + EXPIRES_SECONDS;
  const signature = await sha256Hex(`${bunnyLibraryId}${bunnyApiKey}${expirationTime}${videoId}`);

  return corsJsonResponse(req, {
    videoId,
    libraryId: bunnyLibraryId,
    expirationTime,
    signature,
    tusEndpoint: "https://video.bunnycdn.com/tusupload",
  });
});
