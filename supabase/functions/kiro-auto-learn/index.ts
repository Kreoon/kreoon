import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, callAI } from "../_shared/ai-providers.ts";

// ═══════════════════════════════════════════════════════════════════════════
// KIRO AUTO-LEARN — Genera conocimiento automático de eventos de plataforma
// Trigger: Llamado cuando se crea contenido, productos, research, clientes
// ═══════════════════════════════════════════════════════════════════════════

interface AutoLearnRequest {
  type: "content" | "product" | "research" | "client";
  organizationId: string;
  recordId: string;
  data?: Record<string, any>;
}

const MAX_AUTO_ENTRIES_PER_ORG = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, organizationId, recordId, data }: AutoLearnRequest = await req.json();

    if (!type || !organizationId || !recordId) {
      return new Response(JSON.stringify({ error: "Missing type, organizationId, or recordId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auto-learning is enabled for this org and type
    const { data: config } = await supabase
      .from("ai_assistant_config")
      .select("auto_learn_content, auto_learn_research, auto_learn_products, auto_learn_clients, kiro_enabled")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Default to enabled if no config exists
    const isEnabled = (() => {
      if (!config) return true;
      if (!config.kiro_enabled) return false;
      switch (type) {
        case "content": return config.auto_learn_content !== false;
        case "research": return config.auto_learn_research !== false;
        case "product": return config.auto_learn_products !== false;
        case "client": return config.auto_learn_clients !== false;
        default: return true;
      }
    })();

    if (!isEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "Auto-learn disabled for this type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Fetch record data based on type ───
    let title = "";
    let rawContent = "";
    const sourceType = `auto_${type}`;

    switch (type) {
      case "content": {
        const { data: record } = await supabase
          .from("content")
          .select("title, description, status, content_type, script_text, creator_id, editor_id, client_id, clients(name)")
          .eq("id", recordId)
          .single();

        if (!record) break;
        title = `Contenido: ${record.title}`;
        rawContent = [
          `Título: ${record.title}`,
          record.description ? `Descripción: ${record.description.substring(0, 300)}` : null,
          `Tipo: ${record.content_type || "video"}`,
          `Estado: ${record.status}`,
          (record as any).clients?.name ? `Cliente: ${(record as any).clients.name}` : null,
          record.script_text ? `Guión (extracto): ${record.script_text.substring(0, 200)}` : null,
        ].filter(Boolean).join(". ");
        break;
      }

      case "product": {
        const { data: record } = await supabase
          .from("products")
          .select("name, description, brand, category, target_audience, key_benefits, client_id, clients(name)")
          .eq("id", recordId)
          .single();

        if (!record) break;
        title = `Producto: ${record.name}`;
        rawContent = [
          `Nombre: ${record.name}`,
          record.brand ? `Marca: ${record.brand}` : null,
          record.category ? `Categoría: ${record.category}` : null,
          record.description ? `Descripción: ${record.description.substring(0, 300)}` : null,
          record.target_audience ? `Audiencia: ${record.target_audience}` : null,
          record.key_benefits ? `Beneficios: ${record.key_benefits}` : null,
          (record as any).clients?.name ? `Cliente: ${(record as any).clients.name}` : null,
        ].filter(Boolean).join(". ");
        break;
      }

      case "research": {
        const { data: record } = await supabase
          .from("product_research")
          .select("step_name, result, product_id, products(name)")
          .eq("id", recordId)
          .single();

        if (!record) break;
        const productName = (record as any).products?.name || "Producto";
        title = `Investigación: ${record.step_name} — ${productName}`;
        const resultText = typeof record.result === "string"
          ? record.result
          : JSON.stringify(record.result || {});
        rawContent = `Investigación "${record.step_name}" del producto "${productName}": ${resultText.substring(0, 500)}`;
        break;
      }

      case "client": {
        const { data: record } = await supabase
          .from("clients")
          .select("name, category, description, website, is_vip")
          .eq("id", recordId)
          .single();

        if (!record) break;
        title = `Cliente: ${record.name}`;
        rawContent = [
          `Nombre: ${record.name}`,
          record.category ? `Categoría: ${record.category}` : null,
          record.description ? `Descripción: ${record.description.substring(0, 300)}` : null,
          record.website ? `Web: ${record.website}` : null,
          record.is_vip ? "Cliente VIP" : null,
        ].filter(Boolean).join(". ");
        break;
      }
    }

    if (!title || !rawContent) {
      return new Response(JSON.stringify({ skipped: true, reason: "No data found for record" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Generate a concise summary using AI ───
    let summary = rawContent;
    try {
      const result = await callAI(
        "Eres un asistente que resume información de una plataforma UGC. Resume la siguiente información en 2-3 oraciones concisas en español, enfocándote en los datos más relevantes. No uses markdown ni bullet points.",
        `Resume esta información: ${rawContent}`,
        { model: "gemini-2.5-flash", temperature: 0.3 },
      );
      if (typeof result.content === "string" && result.content.length > 20) {
        summary = result.content;
      }
    } catch {
      // Use raw content if AI fails
      summary = rawContent.substring(0, 500);
    }

    // ─── Check for duplicate ───
    const { data: existing } = await supabase
      .from("ai_assistant_knowledge")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("source_id", recordId)
      .eq("source", sourceType)
      .maybeSingle();

    if (existing) {
      // Update existing entry
      await supabase
        .from("ai_assistant_knowledge")
        .update({
          title,
          content: summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      console.log(`[kiro-auto-learn] Updated: ${title}`);
    } else {
      // Insert new entry
      await supabase
        .from("ai_assistant_knowledge")
        .insert({
          organization_id: organizationId,
          title,
          content: summary,
          knowledge_type: type === "content" ? "process" : type === "research" ? "guide" : "faq",
          source: sourceType,
          source_id: recordId,
          is_platform: false,
          is_active: true,
        });

      console.log(`[kiro-auto-learn] Created: ${title}`);
    }

    // ─── Cleanup: keep max entries per org ───
    const { count } = await supabase
      .from("ai_assistant_knowledge")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .neq("source", "manual")
      .eq("is_platform", false);

    if (count && count > MAX_AUTO_ENTRIES_PER_ORG) {
      const excess = count - MAX_AUTO_ENTRIES_PER_ORG;
      const { data: oldEntries } = await supabase
        .from("ai_assistant_knowledge")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("source", "manual")
        .eq("is_platform", false)
        .order("created_at", { ascending: true })
        .limit(excess);

      if (oldEntries && oldEntries.length > 0) {
        const ids = oldEntries.map((e: any) => e.id);
        await supabase
          .from("ai_assistant_knowledge")
          .delete()
          .in("id", ids);

        console.log(`[kiro-auto-learn] Cleaned up ${ids.length} old auto-entries`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, title, source: sourceType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[kiro-auto-learn] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
