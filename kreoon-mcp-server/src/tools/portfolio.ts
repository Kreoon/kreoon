import { createClient } from "@supabase/supabase-js";
import type { AuthContext, ToolResult } from "../types.js";
import { emitWebhookEvent } from "../webhookEmitter.js";
import { isSafePublicHost } from "../ssrfGuard.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const portfolioToolDefinitions = [
  {
    name: "get_my_portfolio",
    description:
      "👤 VER el portafolio del marketplace: perfil, items, servicios y bloques de diseño actuales. " +
      "Cuándo usarla: 'mostrame mi portafolio', 'cómo se ve mi perfil', antes de generar/editar para saber qué hay. " +
      "Un talento SIEMPRE ve el suyo (creator_id se ignora). Un admin puede pasar creator_id de un miembro de su organización.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org cuyo portafolio se quiere ver. Ignorado para talento." },
      },
      required: [],
    },
  },
  {
    name: "generate_portfolio",
    description:
      "✨ GENERA el portafolio COMPLETO con IA usando los datos reales del creador (bio, items, servicios, reseñas) " +
      "y le da un diseño rico (colores, gradientes, tipografía) según el 'vibe' pedido — tipo Canva, no un template rígido. " +
      "Se guarda como BORRADOR (no se publica solo). Usá publish_portfolio después para que salga en el marketplace. " +
      "Cuándo usarla: 'armame mi portafolio', 'generá mi perfil de marketplace', 'rediseñá mi portafolio con estilo X'. " +
      "Nunca inventa datos: si falta información (ej. sin items de portafolio) genera un portafolio honesto con placeholders, no datos falsos. " +
      "Costo: ~400 tokens IA.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
        vibe: {
          type: "string",
          description: "Estilo visual pedido en lenguaje natural, ej. 'minimalista oscuro y elegante', 'colorido y juvenil', 'editorial premium'. Default: profesional y moderno.",
        },
      },
      required: [],
    },
  },
  {
    name: "update_portfolio_block",
    description:
      "✏️ EDICIÓN QUIRÚRGICA de un bloque existente del portafolio (texto, color, estilo, visibilidad) sin regenerar el resto. " +
      "Cuándo usarla: 'cambiá el color del hero a azul', 'ocultá el bloque de precios', 'el texto del about que diga X'. " +
      "Usá get_my_portfolio primero para obtener el block_id.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
        block_id: { type: "string", description: "UUID del bloque a editar (viene de get_my_portfolio)" },
        config: { type: "object", description: "Nuevo config del bloque (reemplaza completo, opcional)" },
        styles: { type: "object", description: "Nuevos estilos del bloque (colores, fondo, tipografía, sombra, etc. — reemplaza completo, opcional)" },
        content: { type: "object", description: "Nuevo contenido/texto del bloque (reemplaza completo, opcional)" },
        is_visible: { type: "boolean", description: "Mostrar u ocultar el bloque, opcional" },
      },
      required: ["block_id"],
    },
  },
  {
    name: "publish_portfolio",
    description:
      "🚀 PUBLICA el portafolio: convierte el borrador en la versión pública y activa el perfil en el marketplace " +
      "(is_active=true). Cuándo usarla: 'publicá mi portafolio', 'ya está listo, subilo'.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
      },
      required: [],
    },
  },
  {
    name: "add_portfolio_item",
    description:
      "➕ AGREGA un trabajo (video/imagen) al portafolio. Requiere una media_url YA subida (Bunny CDN u otro host) — " +
      "esta tool NO sube archivos, solo registra la referencia con su metadata.",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
        media_url: { type: "string", description: "URL ya hosteada del video/imagen" },
        media_type: { type: "string", enum: ["video", "image", "carousel"], description: "Default: video" },
        title: { type: "string", description: "Título del trabajo" },
        description: { type: "string", description: "Descripción breve" },
        thumbnail_url: { type: "string", description: "URL de la miniatura" },
        category: { type: "string", description: "Categoría del trabajo (ej. moda, tech, fitness)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags libres" },
      },
      required: ["media_url"],
    },
  },
  {
    name: "list_portfolio_items",
    description: "📋 LISTA los trabajos actuales del portafolio (para revisar antes de generar/editar).",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
        limit: { type: "number", description: "Default 30", minimum: 1, maximum: 100 },
      },
      required: [],
    },
  },
  {
    name: "import_external_design",
    description:
      "🎨 IMPORTA un diseño externo como bloque del portafolio (borrador): un link de Figma (se embebe de forma segura) " +
      "o una imagen ya exportada de Gamma/Stitch/Canva/cualquier herramienta de diseño. " +
      "Cuándo usarla: 'importá este diseño de Figma', 'agregá esta imagen que exporté de Gamma/Stitch'. " +
      "NO acepta HTML ni links genéricos — solo figma.com o una URL de imagen real (se verifica el content-type).",
    inputSchema: {
      type: "object",
      properties: {
        creator_id: { type: "string", description: "Solo admin: UUID del miembro de la org. Ignorado para talento." },
        source_url: { type: "string", description: "URL de Figma (https://www.figma.com/...) o de una imagen (https://.../diseno.png)" },
        title: { type: "string", description: "Título/alt del diseño, opcional" },
      },
      required: ["source_url"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handlePortfolioTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult> {
  switch (toolName) {
    case "get_my_portfolio":        return getMyPortfolio(args, auth);
    case "generate_portfolio":      return generatePortfolio(args, auth);
    case "update_portfolio_block":  return updatePortfolioBlock(args, auth);
    case "publish_portfolio":       return publishPortfolio(args, auth);
    case "add_portfolio_item":      return addPortfolioItem(args, auth);
    case "list_portfolio_items":    return listPortfolioItems(args, auth);
    case "import_external_design":  return importExternalDesign(args, auth);
    default: return { success: false, error: `Tool desconocida: ${toolName}` };
  }
}

// ─── Ownership ───────────────────────────────────────────────────────────────
// Un talento SIEMPRE opera sobre su propio user_id (auth.user_id), ignorando
// cualquier creator_id recibido. Un admin puede pasar el user_id de un
// miembro de SU organización — se valida contra organization_members, nunca
// se confía en el creator_id de args a ciegas (mismo patrón anti-IDOR usado
// en el resto del MCP).
async function resolveTargetUserId(
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<{ userId?: string; error?: string }> {
  const requested = args.creator_id as string | undefined;

  if (auth.group !== "admin" || !requested) {
    return { userId: auth.user_id };
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", requested)
    .eq("organization_id", auth.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!member) return { error: "creator_id no es miembro de esta organización" };
  return { userId: requested };
}

// Cualquier usuario con rol talent/admin puede no tener aún una fila en
// creator_profiles (nunca pasó por el wizard del marketplace). Se crea una
// mínima sembrada desde profiles, así generate_portfolio funciona en el
// primer uso sin pasos previos manuales.
async function ensureCreatorProfile(userId: string): Promise<{ profile?: Record<string, unknown>; error?: string }> {
  const { data: existing } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { profile: existing };

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("creator_profiles")
    .insert({
      user_id: userId,
      display_name: baseProfile?.full_name ?? "Creador KREOON",
      avatar_url: baseProfile?.avatar_url ?? null,
      bio: baseProfile?.bio ?? null,
    })
    .select("*")
    .single();

  if (error) return { error: `No se pudo crear el perfil de creador: ${error.message}` };
  return { profile: created };
}

// ─── Implementations ─────────────────────────────────────────────────────────

async function getMyPortfolio(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const [itemsRes, servicesRes, blocksRes] = await Promise.all([
    supabase.from("portfolio_items")
      .select("id, title, description, media_type, media_url, thumbnail_url, category, tags, is_public, display_order")
      .eq("creator_id", profile!.id).order("display_order", { ascending: true }),
    supabase.from("creator_services")
      .select("id, service_type, title, description, price_type, price_amount, price_currency, delivery_days, is_active")
      .eq("user_id", target.userId!),
    supabase.from("profile_builder_blocks")
      .select("id, block_type, order_index, is_visible, is_draft, config, styles, content")
      .eq("profile_id", profile!.id).order("order_index", { ascending: true }),
  ]);

  return {
    success: true,
    data: {
      profile: {
        id: profile!.id,
        display_name: profile!.display_name,
        slug: profile!.slug,
        bio: profile!.bio,
        avatar_url: profile!.avatar_url,
        banner_url: profile!.banner_url,
        level: profile!.level,
        is_active: profile!.is_active,
        is_available: profile!.is_available,
        rating_avg: profile!.rating_avg,
        completed_projects: profile!.completed_projects,
        base_price: profile!.base_price,
        currency: profile!.currency,
        marketplace_roles: profile!.marketplace_roles,
        categories: profile!.categories,
        builder_has_draft: profile!.builder_has_draft,
      },
      portfolio_items: itemsRes.data ?? [],
      services: servicesRes.data ?? [],
      blocks: blocksRes.data ?? [],
    },
  };
}

async function generatePortfolio(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const [itemsRes, servicesRes, reviewsRes] = await Promise.all([
    supabase.from("portfolio_items")
      .select("title, description, media_type, thumbnail_url, category, tags")
      .eq("creator_id", profile!.id).eq("is_public", true)
      .order("display_order", { ascending: true }).limit(12),
    supabase.from("creator_services")
      .select("title, service_type, description, price_type, price_amount, price_currency, delivery_days")
      .eq("user_id", target.userId!).eq("is_active", true),
    supabase.from("creator_reviews")
      .select("rating, title, comment")
      .eq("creator_id", profile!.id).eq("is_public", true)
      .order("created_at", { ascending: false }).limit(6),
  ]);

  // Plan real del creador no está mapeado a una columna estable todavía —
  // por defecto "free" (conservador: nunca sobre-otorga bloques premium
  // como contact/social_links a quien no pagó por ellos).
  const plan = "free";

  const { data: fnData, error: fnError } = await supabase.functions.invoke("portfolio-ai", {
    body: {
      action: "generate_portfolio",
      payload: {
        profile: {
          display_name: profile!.display_name,
          bio: profile!.bio,
          categories: profile!.categories,
          content_types: profile!.content_types,
          level: profile!.level,
          marketplace_roles: profile!.marketplace_roles,
          base_price: profile!.base_price,
          currency: profile!.currency,
          rating_avg: profile!.rating_avg,
          completed_projects: profile!.completed_projects,
          avatar_url: profile!.avatar_url,
          banner_url: profile!.banner_url,
        },
        portfolio_items: itemsRes.data ?? [],
        services: servicesRes.data ?? [],
        reviews: reviewsRes.data ?? [],
        vibe: (args.vibe as string) ?? "profesional y moderno",
        plan,
        mcp_caller_user_id: target.userId,
      },
      organizationId: auth.org_id,
    },
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });

  if (fnError) return { success: false, error: `generate_portfolio: ${fnError.message}` };

  const rawBlocks = (fnData?.data?.blocks ?? fnData?.blocks) as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return { success: false, error: "La IA no devolvió bloques válidos. Reintentá o ajustá el vibe pedido." };
  }

  // Salvaguarda: hero_banner (si vino) siempre primero, resto conserva orden.
  const sorted = [...rawBlocks].sort((a, b) => {
    const aHero = a.type === "hero_banner" ? 0 : 1;
    const bHero = b.type === "hero_banner" ? 0 : 1;
    return aHero - bHero;
  });

  const normalized = sorted.map((b, i) => ({
    type: b.type,
    orderIndex: i,
    isVisible: b.isVisible ?? true,
    config: b.config ?? {},
    styles: b.styles ?? {},
    content: b.content ?? {},
  }));

  const { error: rpcError } = await supabase.rpc("mcp_save_portfolio_blocks", {
    p_profile_id: profile!.id,
    p_blocks: normalized,
    p_is_draft: true,
  });

  if (rpcError) return { success: false, error: `No se pudo guardar el portafolio: ${rpcError.message}` };

  return {
    success: true,
    data: {
      profile_id: profile!.id,
      blocks_count: normalized.length,
      is_draft: true,
      message: "Portafolio generado como borrador. Usá publish_portfolio para publicarlo en el marketplace.",
    },
    tokens_used: 400,
  };
}

async function updatePortfolioBlock(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const { block_id, config, styles, content, is_visible } = args;
  if (!block_id) return { success: false, error: "block_id requerido" };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (config !== undefined) updates.config = config;
  if (styles !== undefined) updates.styles = styles;
  if (content !== undefined) updates.content = content;
  if (is_visible !== undefined) updates.is_visible = is_visible;

  if (Object.keys(updates).length === 1) {
    return { success: false, error: "No se proporcionaron campos a actualizar" };
  }

  const { data, error } = await supabase
    .from("profile_builder_blocks")
    .update(updates)
    .eq("id", block_id as string)
    .eq("profile_id", profile!.id) // el bloque debe pertenecer a ESTE perfil, no a cualquiera
    .select("id, block_type, order_index, is_visible, config, styles, content")
    .maybeSingle();

  if (error) return { success: false, error: `update_portfolio_block: ${error.message}` };
  if (!data) return { success: false, error: "Bloque no encontrado o no pertenece a este portafolio" };
  return { success: true, data };
}

async function publishPortfolio(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const { error } = await supabase.rpc("mcp_publish_portfolio_blocks", { p_profile_id: profile!.id });
  if (error) return { success: false, error: `publish_portfolio: ${error.message}` };

  emitWebhookEvent(auth, "portfolio.published", { profile_id: profile!.id, user_id: target.userId });

  return {
    success: true,
    data: { profile_id: profile!.id, published: true, message: "Portafolio publicado. Ya es visible en el marketplace." },
  };
}

async function addPortfolioItem(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const media_url = args.media_url as string | undefined;
  if (!media_url) return { success: false, error: "media_url requerido (URL ya subida a Bunny u otro host)" };

  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({
      creator_id: profile!.id,
      title: args.title ?? null,
      description: args.description ?? null,
      media_type: (args.media_type as string) ?? "video",
      media_url,
      thumbnail_url: args.thumbnail_url ?? null,
      category: args.category ?? null,
      tags: args.tags ?? [],
      is_public: true,
    })
    .select("id, title, media_type, media_url, thumbnail_url, category, created_at")
    .single();

  if (error) return { success: false, error: `add_portfolio_item: ${error.message}` };
  return { success: true, data };
}

async function listPortfolioItems(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const { data, error } = await supabase
    .from("portfolio_items")
    .select("id, title, description, media_type, media_url, thumbnail_url, category, tags, is_public, display_order, created_at")
    .eq("creator_id", profile!.id)
    .order("display_order", { ascending: true })
    .limit((args.limit as number) ?? 30);

  if (error) return { success: false, error: `list_portfolio_items: ${error.message}` };
  return { success: true, data: { items: data ?? [], count: data?.length ?? 0 } };
}

const ALLOWED_FIGMA_HOSTS = new Set(["www.figma.com", "figma.com"]);

// No confía en la extensión de la URL sola: si no matchea un patrón de imagen
// obvio, hace un HEAD real y valida el Content-Type — evita que alguien pase
// una URL cualquiera (ej. una página HTML) disfrazada de ".png?x=1". Antes de
// cualquier fetch, resuelve DNS y rechaza IPs privadas/loopback/link-local
// (guard de SSRF). redirect:"manual" evita seguir un 3xx que podría reapuntar
// a un destino interno no validado.
async function looksLikeImage(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!(await isSafePublicHost(parsed.hostname))) return false;

  if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url)) return true;

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) return false; // no seguir redirects
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

async function importExternalDesign(args: Record<string, unknown>, auth: AuthContext): Promise<ToolResult> {
  const target = await resolveTargetUserId(args, auth);
  if (target.error) return { success: false, error: target.error };

  const { profile, error: profileErr } = await ensureCreatorProfile(target.userId!);
  if (profileErr) return { success: false, error: profileErr };

  const sourceUrl = args.source_url as string | undefined;
  if (!sourceUrl) return { success: false, error: "source_url requerido" };

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { success: false, error: "source_url inválida" };
  }
  if (parsed.protocol !== "https:") return { success: false, error: "source_url debe ser HTTPS" };

  const title = (args.title as string | undefined) ?? null;
  let content: Record<string, unknown>;

  if (ALLOWED_FIGMA_HOSTS.has(parsed.hostname.toLowerCase())) {
    const embedUrl = `https://www.figma.com/embed?${new URLSearchParams({ embed_host: "kreoon", url: sourceUrl }).toString()}`;
    content = { provider: "figma", source_url: sourceUrl, figma_embed_url: embedUrl, title };
  } else {
    // Único otro caso soportado: una imagen real (Gamma/Stitch/Canva no
    // tienen un embed oficial como Figma, pero sus exports SÍ son imágenes).
    // Nunca se acepta HTML/script arbitrario de un dominio no confiable.
    if (!(await looksLikeImage(sourceUrl))) {
      return {
        success: false,
        error: "Fuente no soportada. Usá un link de Figma (figma.com) o una URL de imagen ya exportada (Gamma, Stitch, Canva, etc.)",
      };
    }
    content = { provider: "image", source_url: sourceUrl, image_url: sourceUrl, title };
  }

  const { count } = await supabase
    .from("profile_builder_blocks")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile!.id).eq("is_draft", true);

  if ((count ?? 0) >= 15) {
    return { success: false, error: "Ya tenés 15 bloques en el borrador (el máximo permitido). Quitá alguno antes de importar otro diseño." };
  }

  const { data: maxRow } = await supabase
    .from("profile_builder_blocks")
    .select("order_index")
    .eq("profile_id", profile!.id).eq("is_draft", true)
    .order("order_index", { ascending: false })
    .limit(1).maybeSingle();

  const nextOrder = ((maxRow?.order_index as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("profile_builder_blocks")
    .insert({
      profile_id: profile!.id,
      block_type: "external_design",
      order_index: nextOrder,
      is_visible: true,
      is_draft: true,
      config: {},
      styles: {},
      content,
    })
    .select("id, block_type, order_index, content")
    .single();

  if (error) return { success: false, error: `import_external_design: ${error.message}` };
  return { success: true, data };
}
