/**
 * cloudflare-live-service - Gestión de Live Streaming con Cloudflare Stream
 * Crea, gestiona y termina transmisiones en vivo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
const CLOUDFLARE_CUSTOMER_SUBDOMAIN = Deno.env.get("CLOUDFLARE_CUSTOMER_SUBDOMAIN") || "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface LiveInput {
  uid: string;
  rtmps: {
    url: string;
    streamKey: string;
  };
  webRTC: {
    url: string;
  };
  webRTCPlayback: {
    url: string;
  };
  meta?: Record<string, string>;
  created: string;
  modified: string;
  status: {
    current: {
      state: string;
    };
  };
}

async function createLiveInput(userId: string, creatorProfileId: string): Promise<LiveInput> {
  // Verificar configuración
  if (!CLOUDFLARE_ACCOUNT_ID) {
    console.error("[Cloudflare] CLOUDFLARE_ACCOUNT_ID no está configurado");
    throw new Error("Cloudflare no está configurado correctamente (ACCOUNT_ID)");
  }
  if (!CLOUDFLARE_API_TOKEN) {
    console.error("[Cloudflare] CLOUDFLARE_API_TOKEN no está configurado");
    throw new Error("Cloudflare no está configurado correctamente (API_TOKEN)");
  }

  console.log("[Cloudflare] Creando live input para user:", userId);
  console.log("[Cloudflare] Account ID:", CLOUDFLARE_ACCOUNT_ID.substring(0, 8) + "...");

  const requestBody = {
    meta: {
      user_id: userId,
      creator_profile_id: creatorProfileId,
      platform: "kreoon",
    },
    recording: {
      mode: "automatic",
      requireSignedURLs: false,
      allowedOrigins: ["*"],
    },
    defaultCreator: userId,
  };

  console.log("[Cloudflare] Request body:", JSON.stringify(requestBody));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  const data = await response.json();

  console.log("[Cloudflare] Response status:", response.status);
  console.log("[Cloudflare] Response:", JSON.stringify(data));

  if (!data.success) {
    console.error("[Cloudflare] Error creating live input:", data.errors);
    throw new Error(data.errors?.[0]?.message || "Failed to create live input");
  }

  console.log("[Cloudflare] Live input created:", data.result.uid);
  console.log("[Cloudflare] WHIP URL:", data.result.webRTC?.url);

  return data.result;
}

async function getLiveInput(liveInputId: string): Promise<LiveInput | null> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`,
    {
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    return null;
  }

  return data.result;
}

async function deleteLiveInput(liveInputId: string): Promise<boolean> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  const data = await response.json();
  return data.success;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear body primero para conocer la acción
    const body = await req.json();
    const { action, ...params } = body;

    // Acciones públicas que no requieren autenticación
    const publicActions = ["get-public-stream", "get-active-streams", "cleanup-orphan-streams"];

    let user: { id: string } | null = null;

    if (!publicActions.includes(action)) {
      // Verificar autenticación para acciones protegidas
      const authHeader = req.headers.get("Authorization");
      console.log("[Auth] Action:", action, "Has auth header:", !!authHeader);

      if (!authHeader) {
        console.error("[Auth] No authorization header for action:", action);
        throw new Error("No authorization header");
      }

      const token = authHeader.replace("Bearer ", "");
      console.log("[Auth] Token length:", token.length, "Preview:", token.substring(0, 30) + "...");

      const { data: authData, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        console.error("[Auth] Error validating token:", authError.message, authError.status);
        throw new Error(`Invalid token: ${authError.message}`);
      }

      if (!authData.user) {
        console.error("[Auth] No user in auth data");
        throw new Error("Invalid token: no user");
      }

      console.log("[Auth] User authenticated:", authData.user.id);
      user = authData.user;
    }

    let result: unknown;

    switch (action) {
      // ============================================
      // CREAR LIVE INPUT (una vez por creador)
      // ============================================
      case "create-live-input": {
        const { creatorProfileId, title, description, category, isShoppingEnabled } = params;

        // Verificar si ya tiene un live input
        const { data: existingStream } = await supabase
          .from("creator_live_streams")
          .select("id, cf_live_input_id")
          .eq("user_id", user.id)
          .eq("status", "idle")
          .maybeSingle();

        if (existingStream?.cf_live_input_id) {
          // Ya tiene uno, retornar el existente
          const liveInput = await getLiveInput(existingStream.cf_live_input_id);
          if (liveInput) {
            result = {
              streamId: existingStream.id,
              whipUrl: liveInput.webRTC.url,
              playbackUrl: `https://${CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${liveInput.uid}/manifest/video.m3u8`,
              playbackUrlWebrtc: liveInput.webRTCPlayback.url,
            };
            break;
          }
        }

        // Crear nuevo live input en Cloudflare
        const liveInput = await createLiveInput(user.id, creatorProfileId || "");

        // Guardar en BD
        const { data: stream, error: insertError } = await supabase
          .from("creator_live_streams")
          .insert({
            user_id: user.id,
            creator_profile_id: creatorProfileId || null,
            cf_live_input_id: liveInput.uid,
            cf_stream_key: liveInput.rtmps.streamKey,
            cf_whip_url: liveInput.webRTC.url,
            cf_playback_url: `https://${CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${liveInput.uid}/manifest/video.m3u8`,
            cf_playback_url_webrtc: liveInput.webRTCPlayback.url,
            title: title || "En Vivo",
            description: description || null,
            category: category || null,
            is_shopping_enabled: isShoppingEnabled || false,
            status: "idle",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        result = {
          streamId: stream.id,
          whipUrl: liveInput.webRTC.url,
          rtmpsUrl: liveInput.rtmps.url,
          streamKey: liveInput.rtmps.streamKey,
          playbackUrl: stream.cf_playback_url,
          playbackUrlWebrtc: stream.cf_playback_url_webrtc,
        };
        break;
      }

      // ============================================
      // OBTENER CREDENCIALES DE STREAM
      // ============================================
      case "get-stream-credentials": {
        const { streamId } = params;

        const { data: stream, error } = await supabase
          .from("creator_live_streams")
          .select("*")
          .eq("id", streamId)
          .eq("user_id", user.id)
          .single();

        if (error || !stream) {
          throw new Error("Stream not found or not authorized");
        }

        result = {
          streamId: stream.id,
          whipUrl: stream.cf_whip_url,
          playbackUrl: stream.cf_playback_url,
          playbackUrlWebrtc: stream.cf_playback_url_webrtc,
          status: stream.status,
        };
        break;
      }

      // ============================================
      // INICIAR STREAM (marcar como connecting/live)
      // ============================================
      case "start-stream": {
        const { streamId, title, description, category, isShoppingEnabled } = params;

        const { data: stream, error: fetchError } = await supabase
          .from("creator_live_streams")
          .select("*")
          .eq("id", streamId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !stream) {
          throw new Error("Stream not found");
        }

        // Actualizar info y estado
        const { data: updated, error: updateError } = await supabase
          .from("creator_live_streams")
          .update({
            title: title || stream.title,
            description: description || stream.description,
            category: category || stream.category,
            is_shopping_enabled: isShoppingEnabled ?? stream.is_shopping_enabled,
            status: "connecting",
            started_at: new Date().toISOString(),
            // Reset métricas
            current_viewers: 0,
            peak_viewers: 0,
            total_views: 0,
            total_likes: 0,
            total_comments: 0,
            duration_seconds: 0,
          })
          .eq("id", streamId)
          .select()
          .single();

        if (updateError) throw updateError;

        result = {
          streamId: updated.id,
          status: updated.status,
          whipUrl: updated.cf_whip_url,
          playbackUrl: updated.cf_playback_url,
        };
        break;
      }

      // ============================================
      // CONFIRMAR LIVE (cuando Cloudflare confirma conexión)
      // ============================================
      case "confirm-live": {
        const { streamId } = params;

        const { data: updated, error } = await supabase
          .from("creator_live_streams")
          .update({
            status: "live",
          })
          .eq("id", streamId)
          .eq("user_id", user.id)
          .eq("status", "connecting")
          .select()
          .single();

        if (error) throw error;

        result = { success: true, status: "live" };
        break;
      }

      // ============================================
      // TERMINAR STREAM
      // ============================================
      case "end-stream": {
        const { streamId } = params;

        const { data: stream, error: fetchError } = await supabase
          .from("creator_live_streams")
          .select("*")
          .eq("id", streamId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !stream) {
          throw new Error("Stream not found");
        }

        // Calcular duración
        const startedAt = stream.started_at ? new Date(stream.started_at) : new Date();
        const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

        // Marcar viewers como salidos
        await supabase
          .from("live_stream_viewers")
          .update({ left_at: new Date().toISOString() })
          .eq("stream_id", streamId)
          .is("left_at", null);

        // Actualizar stream
        const { data: updated, error: updateError } = await supabase
          .from("creator_live_streams")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            current_viewers: 0,
          })
          .eq("id", streamId)
          .select()
          .single();

        if (updateError) throw updateError;

        result = {
          success: true,
          duration_seconds: durationSeconds,
          total_views: updated.total_views,
          peak_viewers: updated.peak_viewers,
          total_likes: updated.total_likes,
          total_comments: updated.total_comments,
        };
        break;
      }

      // ============================================
      // OBTENER STREAM ACTIVO DEL USUARIO
      // ============================================
      case "get-my-active-stream": {
        const { data: stream } = await supabase
          .from("creator_live_streams")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["connecting", "live"])
          .maybeSingle();

        result = { stream };
        break;
      }

      // ============================================
      // ACTUALIZAR INFO DEL STREAM
      // ============================================
      case "update-stream": {
        const { streamId, title, description, category, allowComments, allowReactions, isUnlisted } = params;

        const { data: updated, error } = await supabase
          .from("creator_live_streams")
          .update({
            title,
            description,
            category,
            allow_comments: allowComments,
            allow_reactions: allowReactions,
            is_unlisted: isUnlisted,
          })
          .eq("id", streamId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        result = { stream: updated };
        break;
      }

      // ============================================
      // OBTENER STREAM PÚBLICO (para viewers)
      // ============================================
      case "get-public-stream": {
        const { streamId, creatorSlug } = params;

        // Si no hay streamId ni creatorSlug, retornar null
        if (!streamId && !creatorSlug) {
          result = { stream: null };
          break;
        }

        // Construir query base sin joins problemáticos
        let query = supabase
          .from("creator_live_streams")
          .select("*")
          .eq("status", "live")
          .eq("is_unlisted", false);

        if (streamId) {
          query = query.eq("id", streamId);
        } else if (creatorSlug) {
          // Buscar creator_profile por slug primero
          const { data: profileData } = await supabase
            .from("creator_profiles")
            .select("id")
            .eq("slug", creatorSlug)
            .maybeSingle();

          if (profileData?.id) {
            query = query.eq("creator_profile_id", profileData.id);
          } else {
            result = { stream: null };
            break;
          }
        }

        const { data: stream, error } = await query.maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching public stream:", error);
          throw error;
        }

        if (!stream) {
          result = { stream: null };
          break;
        }

        // Obtener datos adicionales por separado
        const [profileResult, creatorProfileResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", stream.user_id)
            .maybeSingle(),
          stream.creator_profile_id
            ? supabase
                .from("creator_profiles")
                .select("slug, bio, rating_avg")
                .eq("id", stream.creator_profile_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        // Combinar resultados
        const enrichedStream = {
          ...stream,
          creator_name: profileResult.data?.full_name || null,
          creator_avatar: profileResult.data?.avatar_url || null,
          creator_slug: creatorProfileResult.data?.slug || null,
          creator_bio: creatorProfileResult.data?.bio || null,
          creator_rating: creatorProfileResult.data?.rating_avg || null,
        };

        result = { stream: enrichedStream };
        break;
      }

      // ============================================
      // LISTA DE STREAMS ACTIVOS
      // ============================================
      case "get-active-streams": {
        const { limit = 20, category } = params;

        const { data: streams, error } = await supabase
          .rpc("get_active_live_streams", {
            p_limit: limit,
            p_category: category || null,
          });

        if (error) throw error;

        result = { streams: streams || [] };
        break;
      }

      // ============================================
      // PREPARAR PARA NUEVO LIVE (reset stream existente)
      // ============================================
      case "prepare-for-live": {
        const { title, description, category, isShoppingEnabled } = params;

        // Buscar stream idle existente o crear nuevo
        let { data: stream } = await supabase
          .from("creator_live_streams")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "idle")
          .maybeSingle();

        if (!stream) {
          // Buscar stream ended y resetear
          const { data: endedStream } = await supabase
            .from("creator_live_streams")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "ended")
            .order("ended_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (endedStream) {
            const { data: reset, error } = await supabase
              .from("creator_live_streams")
              .update({
                status: "idle",
                title: title || "En Vivo",
                description: description || null,
                category: category || null,
                is_shopping_enabled: isShoppingEnabled || false,
                started_at: null,
                ended_at: null,
                current_viewers: 0,
                peak_viewers: 0,
                total_views: 0,
                total_likes: 0,
                total_comments: 0,
                duration_seconds: 0,
              })
              .eq("id", endedStream.id)
              .select()
              .single();

            if (error) throw error;
            stream = reset;
          }
        }

        if (!stream) {
          // Necesita crear nuevo - obtener creator_profile_id
          const { data: profile } = await supabase
            .from("creator_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          // Crear live input directamente (sin llamada recursiva)
          console.log("Creating new live input for user:", user.id);

          const liveInput = await createLiveInput(user.id, profile?.id || "");

          // Guardar en BD
          const { data: newStream, error: insertError } = await supabase
            .from("creator_live_streams")
            .insert({
              user_id: user.id,
              creator_profile_id: profile?.id || null,
              cf_live_input_id: liveInput.uid,
              cf_stream_key: liveInput.rtmps.streamKey,
              cf_whip_url: liveInput.webRTC.url,
              cf_playback_url: `https://${CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${liveInput.uid}/manifest/video.m3u8`,
              cf_playback_url_webrtc: liveInput.webRTCPlayback.url,
              title: title || "En Vivo",
              description: description || null,
              category: category || null,
              is_shopping_enabled: isShoppingEnabled || false,
              status: "idle",
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error inserting stream:", insertError);
            throw insertError;
          }

          console.log("Stream created successfully:", newStream.id);

          result = {
            streamId: newStream.id,
            whipUrl: liveInput.webRTC.url,
            rtmpsUrl: liveInput.rtmps.url,
            streamKey: liveInput.rtmps.streamKey,
            playbackUrl: newStream.cf_playback_url,
            playbackUrlWebrtc: newStream.cf_playback_url_webrtc,
          };
          break;
        }

        result = {
          streamId: stream.id,
          whipUrl: stream.cf_whip_url,
          playbackUrl: stream.cf_playback_url,
          playbackUrlWebrtc: stream.cf_playback_url_webrtc,
          status: stream.status,
        };
        break;
      }

      // ============================================
      // CLEANUP: Resetear streams huérfanos
      // ============================================
      case "cleanup-orphan-streams": {
        console.log("[Cleanup] Looking for orphan streams...");

        // Buscar streams con status 'live' o 'connecting'
        const { data: liveStreams, error: fetchError } = await supabase
          .from("creator_live_streams")
          .select("id, cf_live_input_id, status, user_id")
          .in("status", ["live", "connecting"]);

        if (fetchError) {
          throw fetchError;
        }

        const resetResults: Array<{ id: string; action: string; cfState?: string }> = [];

        for (const stream of liveStreams || []) {
          if (!stream.cf_live_input_id) {
            // No tiene live input, resetear
            await supabase
              .from("creator_live_streams")
              .update({ status: "idle", started_at: null })
              .eq("id", stream.id);
            resetResults.push({ id: stream.id, action: "reset_no_cf_input" });
            continue;
          }

          // Verificar estado en Cloudflare
          try {
            const cfResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${stream.cf_live_input_id}`,
              {
                headers: {
                  "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
              }
            );

            const cfData = await cfResponse.json();

            if (!cfData.success) {
              // Live input no existe en Cloudflare, resetear
              await supabase
                .from("creator_live_streams")
                .update({ status: "idle", started_at: null, cf_live_input_id: null })
                .eq("id", stream.id);
              resetResults.push({ id: stream.id, action: "reset_cf_not_found" });
              continue;
            }

            const cfState = cfData.result?.status?.current?.state;
            console.log(`[Cleanup] Stream ${stream.id} CF state: ${cfState}`);

            if (cfState === "disconnected" || cfState === "idle") {
              // Cloudflare dice que no está conectado, resetear
              await supabase
                .from("creator_live_streams")
                .update({ status: "idle", started_at: null })
                .eq("id", stream.id);
              resetResults.push({ id: stream.id, action: "reset_cf_disconnected", cfState });
            } else {
              // Está realmente conectado
              resetResults.push({ id: stream.id, action: "kept_connected", cfState });
            }
          } catch (cfError) {
            console.error(`[Cleanup] Error checking CF for ${stream.id}:`, cfError);
            resetResults.push({ id: stream.id, action: "error", cfState: String(cfError) });
          }
        }

        result = {
          checked: liveStreams?.length || 0,
          results: resetResults,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cloudflare Live Service error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
