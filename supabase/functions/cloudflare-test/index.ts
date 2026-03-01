/**
 * cloudflare-test - Verificar conexión con Cloudflare Stream
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
const CLOUDFLARE_CUSTOMER_SUBDOMAIN = Deno.env.get("CLOUDFLARE_CUSTOMER_SUBDOMAIN") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const liveInputId = url.searchParams.get("live_input_id");

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_check: {
      CLOUDFLARE_ACCOUNT_ID: CLOUDFLARE_ACCOUNT_ID ? `${CLOUDFLARE_ACCOUNT_ID.substring(0, 8)}...` : "NOT SET",
      CLOUDFLARE_API_TOKEN: CLOUDFLARE_API_TOKEN ? "SET (hidden)" : "NOT SET",
      CLOUDFLARE_CUSTOMER_SUBDOMAIN: CLOUDFLARE_CUSTOMER_SUBDOMAIN || "NOT SET",
    },
  };

  // Verificar conexión con Cloudflare
  if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN) {
    try {
      // Si se especifica un live_input_id, obtener detalles de ese input
      if (liveInputId) {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`,
          {
            headers: {
              "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
          }
        );

        const data = await response.json();

        results.live_input_detail = {
          status: response.status,
          success: data.success,
          errors: data.errors || [],
          result: data.success ? {
            uid: data.result.uid,
            created: data.result.created,
            modified: data.result.modified,
            status: data.result.status,
            meta: data.result.meta,
            webRTC: data.result.webRTC,
            webRTCPlayback: data.result.webRTCPlayback,
            rtmps: data.result.rtmps ? {
              url: data.result.rtmps.url,
              streamKey: data.result.rtmps.streamKey ? `${data.result.rtmps.streamKey.substring(0, 10)}...` : null,
            } : null,
          } : null,
        };

        // Obtener videos asociados al live input (grabaciones)
        const videosResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?search=${liveInputId}`,
          {
            headers: {
              "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
          }
        );

        const videosData = await videosResponse.json();
        results.associated_videos = {
          count: videosData.result?.length || 0,
          videos: videosData.result?.map((v: any) => ({
            uid: v.uid,
            status: v.status,
            duration: v.duration,
            liveInput: v.liveInput,
            created: v.created,
          })) || [],
        };

      } else {
        // Listar todos los live inputs
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
          {
            headers: {
              "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
            },
          }
        );

        const data = await response.json();

        results.cloudflare_api = {
          status: response.status,
          success: data.success,
          live_inputs_count: data.result?.length || 0,
          errors: data.errors || [],
        };

        // Mostrar todos los live inputs con detalles
        if (data.result?.length > 0) {
          results.live_inputs = data.result.map((input: any) => ({
            uid: input.uid,
            created: input.created,
            modified: input.modified,
            status: input.status,
            meta: input.meta,
            hasWebRTC: !!input.webRTC?.url,
            hasRTMPS: !!input.rtmps?.url,
          }));
        }
      }

      // Si es POST, permitir acciones adicionales
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));

        if (body.action === "test-create") {
          console.log("[Test] Creating test live input...");

          const createResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                meta: {
                  test: "true",
                  platform: "kreoon",
                },
                recording: {
                  mode: "off",
                },
              }),
            }
          );

          const createData = await createResponse.json();

          results.test_create = {
            status: createResponse.status,
            success: createData.success,
            errors: createData.errors || [],
          };

          if (createData.success && createData.result) {
            results.test_create.live_input = {
              uid: createData.result.uid,
              webRTC: createData.result.webRTC,
              webRTCPlayback: createData.result.webRTCPlayback,
              rtmps: {
                url: createData.result.rtmps?.url,
                streamKey: createData.result.rtmps?.streamKey ? "SET" : "NOT SET",
              },
            };

            // Eliminar el live input de prueba
            const deleteResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${createData.result.uid}`,
              {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
              }
            );

            const deleteData = await deleteResponse.json();
            results.test_delete = {
              success: deleteData.success,
            };
          }
        }

        if (body.action === "delete" && body.live_input_id) {
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${body.live_input_id}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
              },
            }
          );

          const deleteData = await deleteResponse.json();
          results.delete_result = {
            success: deleteData.success,
            errors: deleteData.errors || [],
          };
        }
      }

    } catch (error) {
      results.cloudflare_api = {
        error: error.message,
      };
    }
  } else {
    results.cloudflare_api = {
      error: "Missing required environment variables",
    };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
