import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createProxyToken,
  forwardPutToBunny,
  functionUrl,
  getRequestUser,
  jsonResponse,
  legacyCompatEnabled,
  signTusUpload,
  uploadCorsHeaders,
  verifyProxyToken,
} from "../_shared/bunnyUploadSecurity.ts";

const FN = "bunny-upload-v2";
const LEGACY_STREAM_MAX_BYTES = 5 * 1024 * 1024 * 1024;

interface BunnyVideoResponse {
  guid: string;
  title: string;
  status: number;
}

/**
 * Bunny Upload V2
 * 1. JSON (application/json): crea el video y devuelve credenciales TUS firmadas (`tus`).
 *    Nunca devuelve la API key.
 * 2. FormData (multipart/form-data): recibe el archivo y lo sube a Bunny desde el servidor.
 * 3. PUT: proxy legado (frontend antiguo) con token de un solo video en `AccessKey`.
 * Todas las rutas (salvo el PUT con token) exigen JWT de usuario válido.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: uploadCorsHeaders });
  }

  try {
    const bunnyApiKey = Deno.env.get("BUNNY_API_KEY")!;
    const bunnyLibraryId = Deno.env.get("BUNNY_LIBRARY_ID")!;
    const bunnyCdnHostname = Deno.env.get("BUNNY_CDN_HOSTNAME") || "";

    if (!bunnyApiKey || !bunnyLibraryId) {
      throw new Error("Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID");
    }

    // === PUT: proxy legado ===
    if (req.method === "PUT") {
      const token = req.headers.get("AccessKey") || "";
      const payload = await verifyProxyToken(token, FN);
      if (!payload || payload.kind !== "stream") {
        return jsonResponse({ success: false, error: "Token de subida inválido o vencido" }, 401);
      }
      return await forwardPutToBunny(
        req,
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${payload.target}`,
        bunnyApiKey,
        payload.max,
        "application/octet-stream",
      );
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const user = await getRequestUser(req, admin);
    if (!user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const contentType = req.headers.get("content-type") || "";

    let fileName: string;
    let folder: string;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // === FormData path: file included, upload server-side ===
      const formData = await req.formData();
      file = formData.get("file") as File;
      fileName = (formData.get("fileName") as string) || file?.name || "video";
      folder = (formData.get("folder") as string) || "uploads";

      if (!file) {
        return jsonResponse({ success: false, error: "file is required in FormData" }, 400);
      }

      console.log(`[bunny-upload-v2] FormData upload: ${fileName}, size: ${file.size}, folder: ${folder}`);
    } else {
      const body = await req.json();
      fileName = body.fileName;
      folder = body.folder || "uploads";

      if (!fileName) {
        return jsonResponse({ success: false, error: "fileName is required" }, 400);
      }
    }

    // Generate unique title
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split("-")[0];
    const safeName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 30);
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9-_/]/g, "-").substring(0, 60);

    const title = `${safeFolder}/${safeName}-${timestamp}-${randomId}`;

    // Step 1: Create video entry in Bunny Stream
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
      {
        method: "POST",
        headers: {
          "AccessKey": bunnyApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[bunny-upload-v2] Create video error:", errorText);
      return jsonResponse({ success: false, error: "No se pudo crear el video en Bunny" }, 502);
    }

    const videoData: BunnyVideoResponse = await createResponse.json();
    console.log("[bunny-upload-v2] Created video:", videoData.guid, "user:", user.id);

    const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`;
    const thumbnailUrl = bunnyCdnHostname
      ? `https://${bunnyCdnHostname}/${videoData.guid}/thumbnail.jpg`
      : `https://vz-${bunnyLibraryId}.b-cdn.net/${videoData.guid}/thumbnail.jpg`;

    // If FormData with file: upload to Bunny server-side (proxy)
    if (file) {
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "AccessKey": bunnyApiKey,
          "Content-Type": "application/octet-stream",
        },
        // @ts-ignore - Deno supports ReadableStream as body
        body: file.stream(),
        // @ts-ignore - duplex required for streaming body in Deno
        duplex: "half",
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("[bunny-upload-v2] Upload to Bunny error:", errorText);
        return jsonResponse({ success: false, error: "No se pudo subir el video a Bunny" }, 502);
      }

      return jsonResponse({
        success: true,
        videoId: videoData.guid,
        embedUrl,
        thumbnailUrl,
        uploaded: true,
      });
    }

    // JSON path: credenciales TUS firmadas (sin API key)
    const response: Record<string, unknown> = {
      success: true,
      videoId: videoData.guid,
      embedUrl,
      thumbnailUrl,
      filePath: title,
      tus: await signTusUpload(bunnyLibraryId, bunnyApiKey, videoData.guid),
    };

    if (legacyCompatEnabled()) {
      // Frontend antiguo: PUT a uploadUrl con AccessKey -> ahora es esta función + token.
      response.uploadUrl = functionUrl(FN);
      response.accessKey = await createProxyToken({
        fn: FN,
        kind: "stream",
        target: videoData.guid,
        max: LEGACY_STREAM_MAX_BYTES,
        uid: user.id,
      });
    }

    return jsonResponse(response);

  } catch (error) {
    console.error("[bunny-upload-v2] Error:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
