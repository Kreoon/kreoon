import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            description: "Incluye tu API key en el header x-api-key para autenticación"
          },
          endpoints: {
            "/content": {
              GET: {
                description: "Listar todo el contenido",
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
                body: "Campos a actualizar"
              }
            },
            "/clients": {
              GET: { description: "Listar todos los clientes" },
              POST: {
                description: "Crear nuevo cliente",
                body: {
                  name: "string (required)",
                  contact_email: "string",
                  contact_phone: "string"
                }
              }
            },
            "/creators": {
              GET: { description: "Listar todos los creadores" }
            },
            "/ai/generate-script": {
              POST: {
                description: "Generar guion con IA",
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
    if (!isPublic && !apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required. Add x-api-key header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    // Content endpoints
    if (path === "/content") {
      if (req.method === "GET") {
        const status = url.searchParams.get("status");
        const client_id = url.searchParams.get("client_id");
        const creator_id = url.searchParams.get("creator_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        let query = supabase.from("content").select("*");
        
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
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("id", contentId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Clients endpoints
    if (path === "/clients") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "POST") {
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
      // Get org_id from query params if provided
      const orgId = url.searchParams.get("org_id");
      
      let query = supabase
        .from("organization_member_roles")
        .select("user_id")
        .eq("role", "creator");
      
      if (orgId) {
        query = query.eq("organization_id", orgId);
      }
      
      const { data: rolesData } = await query;
      const creatorIds = rolesData?.map(r => r.user_id) || [];

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
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("AI not configured");
      }

      const prompt = `Genera un guion de video para:
CLIENTE: ${body.client_name || "Cliente"}
PRODUCTO: ${body.product || "Producto"}
OBJETIVO: ${body.objective || "Awareness"}
DURACIÓN: ${body.duration || "60 segundos"}
TONO: ${body.tone || "Profesional"}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
