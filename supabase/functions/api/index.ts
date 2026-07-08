import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Hash API key using SHA-256
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key against stored keys — also returns the owner's user_id
async function validateApiKey(
  supabase: any,
  apiKey: string,
): Promise<{ valid: boolean; permissions: string[]; userId: string | null }> {
  const keyHash = await hashApiKey(apiKey);

  const { data: validKey, error } = await supabase
    .from('api_keys')
    .select('permissions, expires_at, is_active, user_id')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !validKey) {
    return { valid: false, permissions: [], userId: null };
  }

  // Check expiration
  if (validKey.expires_at && new Date(validKey.expires_at) < new Date()) {
    return { valid: false, permissions: [], userId: null };
  }

  // Update last_used_at
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash);

  return {
    valid: true,
    permissions: validKey.permissions || ['read'],
    userId: validKey.user_id ?? null,
  };
}

// Check if operation is allowed based on permissions
function hasPermission(permissions: string[], requiredPermission: string): boolean {
  if (permissions.includes('admin')) return true;
  return permissions.includes(requiredPermission);
}

// Resolve the organization IDs that a user belongs to.
// Returns [] if userId is null or the user has no memberships.
async function getOrgIdsForUser(supabase: any, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map((r: { organization_id: string }) => r.organization_id);
}

// API pública para integraciones con n8n, Zapier, Make, etc.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/api", "");
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

    // Para endpoints públicos que no requieren auth
    const publicEndpoints = ["/health", "/docs"];
    const isPublic = publicEndpoints.some(e => path.startsWith(e));

    // Use Kreoon (external) database if configured
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[api] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // Health check
    if (path === "/health" || path === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: "1.0.0",
          endpoints: [
            "GET /health - Health check",
            "GET /docs - API documentation",
            "GET /content - List content",
            "POST /content - Create content",
            "PATCH /content/:id - Update content",
            "GET /clients - List clients",
            "POST /clients - Create client",
            "GET /creators - List creators",
            "POST /ai/generate-script - Generate script with AI",
            "POST /ai/analyze - Analyze content with AI",
            "POST /webhooks/content-status - Webhook for content status changes",
          ]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // API Documentation
    if (path === "/docs") {
      return new Response(
        JSON.stringify({
          title: "Creartor Studio API",
          version: "1.0.0",
          description: "API pública para integración con n8n, Zapier, Make y otras plataformas de automatización",
          authentication: {
            type: "API Key",
            header: "x-api-key",
            description: "Incluye tu API key en el header x-api-key para autenticación. Las keys se generan desde el panel de administración."
          },
          endpoints: {
            "/content": {
              GET: {
                description: "Listar todo el contenido",
                permissions: ["read"],
                query_params: {
                  status: "Filtrar por estado (draft, script_pending, script_approved, etc.)",
                  client_id: "Filtrar por cliente",
                  creator_id: "Filtrar por creador",
                  limit: "Número de resultados (default: 50)",
                  offset: "Offset para paginación"
                }
              },
              POST: {
                description: "Crear nuevo contenido",
                permissions: ["write", "admin"],
                body: {
                  title: "string (required)",
                  description: "string",
                  client_id: "uuid",
                  creator_id: "uuid",
                  editor_id: "uuid",
                  deadline: "timestamp",
                  creator_payment: "number",
                  editor_payment: "number"
                }
              }
            },
            "/content/:id": {
              PATCH: {
                description: "Actualizar contenido existente",
                permissions: ["write", "admin"],
                body: "Campos a actualizar"
              }
            },
            "/clients": {
              GET: {
                description: "Listar todos los clientes",
                permissions: ["read"]
              },
              POST: {
                description: "Crear nuevo cliente",
                permissions: ["write", "admin"],
                body: {
                  name: "string (required)",
                  contact_email: "string",
                  contact_phone: "string"
                }
              }
            },
            "/creators": {
              GET: {
                description: "Listar todos los creadores",
                permissions: ["read"]
              }
            },
            "/ai/generate-script": {
              POST: {
                description: "Generar guion con IA",
                permissions: ["write", "admin"],
                body: {
                  client_name: "string",
                  product: "string",
                  objective: "string",
                  duration: "string",
                  tone: "string"
                }
              }
            },
            "/webhooks/content-status": {
              POST: {
                description: "Webhook para recibir cambios de estado de contenido",
                permissions: ["write", "admin"],
                body: {
                  content_id: "uuid",
                  new_status: "content_status enum"
                }
              }
            }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar API key para endpoints protegidos
    let callerUserId: string | null = null;

    if (!isPublic) {
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "API key required. Add x-api-key header." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate API key against database
      const { valid, permissions, userId } = await validateApiKey(supabase, apiKey);

      if (!valid) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired API key." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine required permission based on method
      const requiredPermission = req.method === 'GET' ? 'read' : 'write';

      if (!hasPermission(permissions, requiredPermission)) {
        return new Response(
          JSON.stringify({ error: `Insufficient permissions. Required: ${requiredPermission}` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      callerUserId = userId;
    }

    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    // Content endpoints
    if (path === "/content") {
      if (req.method === "GET") {
        // FASE 1: sin filtro de org devolvía contenido de TODAS las orgs.
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        if (orgIds.length === 0) {
          return new Response(
            JSON.stringify({ data: [], count: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const status = url.searchParams.get("status");
        const client_id = url.searchParams.get("client_id");
        const creator_id = url.searchParams.get("creator_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        let query = supabase.from("content").select("*").in("organization_id", orgIds);

        if (status) query = query.eq("status", status);
        if (client_id) query = query.eq("client_id", client_id);
        if (creator_id) query = query.eq("creator_id", creator_id);

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        return new Response(
          JSON.stringify({ data, count: data?.length || 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "POST") {
        // Validate required fields
        if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
          return new Response(
            JSON.stringify({ error: "El campo 'title' es requerido y debe ser un string." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // FASE 1: organization_id del body SIEMPRE debe ser una org del
        // caller (antes solo se validaba si venía client_id).
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        if (orgIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "No tienes organizaciones asociadas a esta API key." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!body.organization_id || !orgIds.includes(body.organization_id)) {
          return new Response(
            JSON.stringify({ error: "organization_id debe ser una de tus organizaciones." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate that client_id belongs to one of the caller's organizations
        if (body.client_id) {
          const { data: clientRow, error: clientErr } = await supabase
            .from('clients')
            .select('organization_id')
            .eq('id', body.client_id)
            .single();
          if (clientErr || !clientRow || !orgIds.includes(clientRow.organization_id)) {
            return new Response(
              JSON.stringify({ error: "El client_id no pertenece a ninguna de tus organizaciones." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const { data, error } = await supabase.from("content").insert(body).select().single();
        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Content by ID
    const contentMatch = path.match(/^\/content\/([a-f0-9-]+)$/);
    if (contentMatch) {
      const contentId = contentMatch[1];

      if (req.method === "PATCH") {
        // FASE 1: sin importar si body.client_id venía o no, el contentId
        // en sí debe pertenecer a una org del caller — antes se podía
        // editar cualquier contenido de cualquier org con solo omitir
        // client_id del body.
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        if (orgIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "No tienes organizaciones asociadas a esta API key." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { data: existingContent, error: existingErr } = await supabase
          .from("content")
          .select("organization_id")
          .eq("id", contentId)
          .single();
        if (existingErr || !existingContent || !orgIds.includes(existingContent.organization_id)) {
          return new Response(
            JSON.stringify({ error: "No tienes acceso a este contenido." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate that client_id (if being updated) belongs to caller's orgs
        if (body.client_id) {
          const { data: clientRow, error: clientErr } = await supabase
            .from('clients')
            .select('organization_id')
            .eq('id', body.client_id)
            .single();
          if (clientErr || !clientRow || !orgIds.includes(clientRow.organization_id)) {
            return new Response(
              JSON.stringify({ error: "El client_id no pertenece a ninguna de tus organizaciones." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const { data, error } = await supabase
          .from("content")
          .update(body)
          .eq("id", contentId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "GET") {
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("id", contentId)
          .single();

        if (error) throw error;
        if (!orgIds.includes(data.organization_id)) {
          return new Response(
            JSON.stringify({ error: "No tienes acceso a este contenido." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Clients endpoints
    if (path === "/clients") {
      if (req.method === "GET") {
        // IDOR fix: only return clients belonging to the caller's organizations
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        if (orgIds.length === 0) {
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .in("organization_id", orgIds)
          .order("created_at", { ascending: false });
        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "POST") {
        // FASE 1: organization_id del body SIEMPRE debe ser una org del
        // caller — antes se insertaba el body crudo sin validar.
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        if (!body.organization_id || !orgIds.includes(body.organization_id)) {
          return new Response(
            JSON.stringify({ error: "organization_id debe ser una de tus organizaciones." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.from("clients").insert(body).select().single();
        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Creators endpoint - now uses organization_member_roles
    if (path === "/creators") {
      // IDOR fix: restrict to caller's organizations unless org_id is explicitly provided
      const orgIds = await getOrgIdsForUser(supabase, callerUserId);

      const orgIdParam = url.searchParams.get("org_id");

      // If a specific org is requested, verify the caller belongs to it
      if (orgIdParam) {
        if (!orgIds.includes(orgIdParam)) {
          return new Response(
            JSON.stringify({ error: "No tienes acceso a esa organización." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const allowedOrgIds = orgIdParam ? [orgIdParam] : orgIds;

      if (allowedOrgIds.length === 0) {
        return new Response(
          JSON.stringify({ data: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = supabase
        .from("organization_member_roles")
        .select("user_id")
        .eq("role", "creator")
        .in("organization_id", allowedOrgIds);

      const { data: rolesData } = await query;
      const creatorIds = rolesData?.map((r: { user_id: string }) => r.user_id) || [];

      if (creatorIds.length === 0) {
        return new Response(
          JSON.stringify({ data: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", creatorIds);

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI endpoints
    if (path === "/ai/generate-script") {
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) {
        throw new Error("AI not configured");
      }

      const prompt = `Genera un guion de video para:
CLIENTE: ${body.client_name || "Cliente"}
PRODUCTO: ${body.product || "Producto"}
OBJETIVO: ${body.objective || "Awareness"}
DURACIÓN: ${body.duration || "60 segundos"}
TONO: ${body.tone || "Profesional"}`;

      const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: "Eres un experto guionista de videos para redes sociales." },
            { role: "user", content: prompt },
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const script = aiData.choices?.[0]?.message?.content || "";

      return new Response(
        JSON.stringify({ script }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Webhook endpoint
    if (path === "/webhooks/content-status") {
      console.log("Webhook received:", body);

      if (body.content_id && body.new_status) {
        // FASE 1: content_id debe pertenecer a una org del caller —
        // antes cualquiera con API key válida cambiaba status de
        // cualquier content_id de cualquier org.
        const orgIds = await getOrgIdsForUser(supabase, callerUserId);
        const { data: existingContent, error: existingErr } = await supabase
          .from("content")
          .select("organization_id")
          .eq("id", body.content_id)
          .single();
        if (existingErr || !existingContent || !orgIds.includes(existingContent.organization_id)) {
          return new Response(
            JSON.stringify({ error: "No tienes acceso a este contenido." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("content")
          .update({ status: body.new_status })
          .eq("id", body.content_id);

        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: "Endpoint not found", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("API Error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
