import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback, getAPIKey, corsHeaders } from "../_shared/ai-providers.ts";

type Action = "generate_titles" | "generate_description";

interface RequestBody {
  action: Action;
  contentType?: string;
  title?: string;
  clientId?: string | null;
  organizationId?: string | null;
}

const FALLBACK_TITLES = (contentType: string) => [
  `${contentType} para mi marca`,
  `Campaña UGC ${new Date().getFullYear()}`,
  `Creadores para mi producto`,
];

// ── Carga contexto de ADN desde la base de datos ─────────────────────────────

async function loadBrandContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clientId?: string | null,
  organizationId?: string | null,
): Promise<string> {
  const parts: string[] = [];

  try {
    let clientIds: string[] = [];

    if (clientId) {
      // Ruta directa: el frontend sabe exactamente qué cliente está activo
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id, name, category, bio")
        .eq("id", clientId)
        .is("deleted_at", null)
        .maybeSingle();

      if (clientRow) {
        parts.push(`Marca: ${clientRow.name}`);
        if (clientRow.category) parts.push(`Categoría: ${clientRow.category}`);
        if (clientRow.bio) parts.push(`Bio de la marca: ${clientRow.bio}`);
        clientIds = [clientRow.id];
        console.log(`[loadBrandContext] resolved via clientId: ${clientRow.name}`);
      }
    } else {
      // Fallback: resolver por org → membership
      let resolvedOrgId = organizationId ?? null;

      if (!resolvedOrgId) {
        const { data: memberships } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (memberships?.length) {
          resolvedOrgId = memberships[0].organization_id;
          console.log(`[loadBrandContext] resolved org via membership: ${resolvedOrgId?.slice(0, 8)}`);
        }
      }

      if (!resolvedOrgId) return "";

      const { data: orgRow } = await supabase
        .from("organizations")
        .select("name, description")
        .eq("id", resolvedOrgId)
        .maybeSingle();

      if (orgRow?.name) parts.push(`Marca / Organización: ${orgRow.name}`);
      if (orgRow?.description) parts.push(`Descripción: ${orgRow.description}`);

      // Filtrar por user_id primero para obtener el cliente propio del usuario
      const { data: ownedClient } = await supabase
        .from("clients")
        .select("id, name, category, bio")
        .eq("organization_id", resolvedOrgId)
        .eq("user_id", userId)
        .eq("is_internal_brand", false)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (ownedClient) {
        if (ownedClient.name) parts.unshift(`Marca: ${ownedClient.name}`);
        if (ownedClient.category) parts.push(`Categoría: ${ownedClient.category}`);
        if (ownedClient.bio) parts.push(`Bio de la marca: ${ownedClient.bio}`);
        clientIds = [ownedClient.id];
        console.log(`[loadBrandContext] resolved via user_id: ${ownedClient.name}`);
      }
    }

    // 2. ADN de marca (client_dna activo y completado)
    const { data: dnaRow } = await supabase
      .from("client_dna")
      .select("dna_data, emotional_analysis")
      .in("client_id", clientIds)
      .eq("is_active", true)
      .eq("status", "completed")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dnaRow?.dna_data) {
      const d = dnaRow.dna_data as any;
      const bi = d.business_identity;
      const vp = d.value_proposition;
      const brand = d.brand_identity;
      const ic = d.ideal_customer;
      const ms = d.marketing_strategy;

      if (bi?.description) parts.push(`Negocio: ${bi.description}`);
      if (bi?.unique_factor) parts.push(`Factor diferenciador: ${bi.unique_factor}`);
      if (bi?.mission) parts.push(`Misión: ${bi.mission}`);
      if (vp?.main_usp) parts.push(`Propuesta de valor: ${vp.main_usp}`);
      if (vp?.brand_promise) parts.push(`Promesa de marca: ${vp.brand_promise}`);
      if (brand?.tone_of_voice) parts.push(`Tono de voz: ${brand.tone_of_voice}`);
      if (brand?.communication_style) parts.push(`Estilo de comunicación: ${brand.communication_style}`);
      if (brand?.key_messages?.length) {
        const msgs = (brand.key_messages as string[]).slice(0, 3);
        parts.push(`Mensajes clave: ${msgs.join("; ")}`);
      }
      if (brand?.tagline_suggestions?.length) {
        parts.push(`Taglines: ${(brand.tagline_suggestions as string[]).slice(0, 2).join(" / ")}`);
      }
      if (ic?.demographic) {
        const dem = ic.demographic;
        const audience = [dem.age_range, dem.gender, dem.location].filter(Boolean).join(", ");
        if (audience) parts.push(`Audiencia objetivo: ${audience}`);
      }
      if (ic?.pain_points?.length) {
        parts.push(`Pain points del cliente: ${(ic.pain_points as string[]).slice(0, 2).join("; ")}`);
      }
      if (ms?.content_pillars?.length) {
        const pillars = (ms.content_pillars as any[]).slice(0, 2).map((p: any) => p.name).join(", ");
        if (pillars) parts.push(`Pilares de contenido: ${pillars}`);
      }
    }

    // 3. ADN de producto más reciente (completado)
    const { data: pdnaRow } = await supabase
      .from("product_dna")
      .select("wizard_responses, content_brief, strategy_recommendations")
      .in("client_id", clientIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pdnaRow) {
      const wr = pdnaRow.wizard_responses as any;
      if (wr?.product_name) parts.push(`Producto principal: ${wr.product_name}`);
      if (wr?.product_description) parts.push(`Descripción del producto: ${String(wr.product_description).slice(0, 200)}`);
      if (wr?.target_audience) parts.push(`Target del producto: ${wr.target_audience}`);
      if (wr?.main_benefit) parts.push(`Beneficio principal: ${wr.main_benefit}`);
      if (wr?.price_range) parts.push(`Rango de precio: ${wr.price_range}`);

      const cb = pdnaRow.content_brief as any;
      if (cb?.key_message) parts.push(`Mensaje clave del producto: ${cb.key_message}`);
      if (cb?.content_angle) parts.push(`Ángulo de contenido: ${cb.content_angle}`);

      const sr = pdnaRow.strategy_recommendations as any;
      if (sr?.ugc_strategy) parts.push(`Estrategia UGC: ${String(sr.ugc_strategy).slice(0, 150)}`);
    }
  } catch (e) {
    console.error("loadBrandContext error:", e);
  }

  return parts.join("\n");
}

// ── Servidor ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: RequestBody = await req.json();
    const { action, contentType, title, clientId, organizationId } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action requerida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener usuario autenticado y cargar contexto de ADN
    const authHeader = req.headers.get("Authorization");
    let brandContext = "";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) {
        brandContext = await loadBrandContext(supabase, user.id, clientId, organizationId);
        console.log(`[campaign-wizard-ai] context loaded for user ${user.id.slice(0, 8)} clientId=${clientId?.slice(0, 8) ?? "none"}: ${brandContext.length} chars`);
      }
    }

    const geminiKey = getAPIKey("gemini");
    const openaiKey = getAPIKey("openai");
    const aiConfigs = [
      geminiKey && { provider: "gemini", model: "gemini-2.5-flash", apiKey: geminiKey },
      openaiKey && { provider: "openai", model: "gpt-4o-mini", apiKey: openaiKey },
    ].filter(Boolean) as Array<{ provider: string; model: string; apiKey: string }>;

    if (aiConfigs.length === 0) {
      if (action === "generate_titles") {
        return new Response(JSON.stringify({ titles: FALLBACK_TITLES(contentType || "UGC") }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ description: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextBlock = brandContext
      ? `\n\nCONTEXTO DE LA MARCA (usa esta información para personalizar la respuesta):\n${brandContext}\n`
      : "";

    // ── Acción: generar títulos ───────────────────────────────────────────────
    if (action === "generate_titles") {
      if (!contentType) {
        return new Response(JSON.stringify({ error: "contentType requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `Eres un experto en marketing UGC para LATAM. Genera exactamente 3 nombres creativos y específicos para una campaña de contenido UGC. Responde SOLO con un JSON array de strings. Ejemplo: ["Nombre 1","Nombre 2","Nombre 3"]`;

      const userPrompt = `Tipo de contenido: ${contentType}.${contextBlock}
Genera 3 nombres de campaña UGC que:
- Tengan máximo 6 palabras
- Estén en español y sean llamativos y profesionales
- Si hay contexto de marca, que reflejen el nombre real de la marca, el producto y el tono de voz
- Sean específicos (no genéricos como "Mi Campaña UGC")
Responde SOLO el JSON array, sin texto adicional.`;

      const { result } = await callAIWithFallback(aiConfigs, systemPrompt, userPrompt);

      let titles: string[];
      try {
        const match = String(result).match(/\[[\s\S]*?\]/);
        titles = match ? JSON.parse(match[0]) : FALLBACK_TITLES(contentType);
        if (!Array.isArray(titles) || titles.length < 3) throw new Error("invalid");
      } catch {
        titles = FALLBACK_TITLES(contentType);
      }

      return new Response(JSON.stringify({ titles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Acción: generar descripción ───────────────────────────────────────────
    if (action === "generate_description") {
      if (!contentType || !title) {
        return new Response(JSON.stringify({ error: "contentType y title requeridos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `Eres un experto en briefing de campañas UGC para LATAM. Escribes descripciones personalizadas, claras y persuasivas para campañas de contenido. Si tienes contexto de marca, úsalo para que la descripción sea totalmente específica. Responde SOLO con el texto de la descripción, sin comillas ni explicaciones.`;

      const userPrompt = `Campaña: "${title}"
Tipo de contenido: ${contentType}${contextBlock}
Escribe una descripción de campaña en español (máximo 160 palabras) que:
1. Mencione el nombre real de la marca/producto si está disponible en el contexto
2. Explique qué tipo de contenido se necesita y para qué objetivo
3. Describa el tono alineado con la voz de la marca (usa los datos del contexto)
4. Indique qué mostrar: producto, beneficio principal, transformación
5. Sea atractiva para creadores de contenido LATAM
6. No mencione precios ni presupuestos

Escribe en texto corrido, sin listas ni encabezados.`;

      const { result } = await callAIWithFallback(aiConfigs, systemPrompt, userPrompt);

      return new Response(JSON.stringify({ description: String(result).trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action no reconocida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("campaign-wizard-ai error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
