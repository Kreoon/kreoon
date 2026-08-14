// ============================================================================
// client-onboarding-process — vuelca el formulario enviado al resto del sistema
// ============================================================================
//
// verify_jwt = true. Además del JWT, valida server-side que el caller sea staff
// de la organización DEL FORMULARIO.
//
// Pasos, todos idempotentes (se puede reintentar sin duplicar):
//   1. cliente     — actualiza `clients` con los datos de contacto y marca.
//   2. invitacion  — da acceso al portal (delega en client-portal-invite).
//   3. adn         — crea la fila de product_dna y dispara generate-product-dna.
//   4. pipeline    — crea el run de client_pipeline_runs (pipeline-orchestrator).
//   5. cierre      — status 'processed' + notifica al staff.
//
// DATOS FISCALES: razón social, NIT, dirección fiscal y representante NO se
// copian a `clients`. `clients.is_public` tiene DEFAULT true y existe la
// política "Anyone can view public client profiles" (TO anon), así que copiarlos
// los expondría. Viven solo en client_onboarding_forms. Además este paso pone
// is_public = false en el cliente onboardeado.
//
// PRODUCTO: no se crea la fila de `products` acá. `generate-product-dna` ya la
// crea ella misma al terminar (INSERT incondicional, con los datos de IA ya
// enriquecidos). Crearla también acá daría dos productos por procesamiento.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

/** `EdgeRuntime.waitUntil` lo expone el runtime de Supabase, no los tipos de
 *  Deno. Retiene los disparos que no se esperan para que el runtime no los
 *  cancele al devolver la respuesta. */
declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;

const ROLES_HABILITADOS = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** type mapeado en el frontend. Un type nuevo revienta KiroNotificationBridge. */
const NOTIFICATION_TYPE = "content_update";
const NOTIFICATION_ENTITY_TYPE = "client_onboarding";

// deno-lint-ignore no-explicit-any
type Sb = any;

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/** Texto plano y ordenado con las secciones de marca, producto y contenido.
 *  Cumple el mismo rol que la transcripción del audio en ProductDNAWizard. */
function componerTextoParaAdn(formData: Record<string, unknown>): string {
  const marca = (formData.marca ?? {}) as Record<string, unknown>;
  const prod = (formData.producto ?? {}) as Record<string, unknown>;
  const cont = (formData.contenido ?? {}) as Record<string, unknown>;
  const aud = (prod.audiencia ?? {}) as Record<string, unknown>;

  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => String(x ?? "").trim()).join(", ") : "";

  const linea = (etiqueta: string, valor: unknown) => {
    const v = typeof valor === "string" ? valor.trim() : lista(valor);
    return v ? `${etiqueta}: ${v}` : null;
  };

  return [
    "== MARCA ==",
    linea("Historia", marca.historia),
    linea("Tono deseado", marca.tono_deseado),
    linea("Tono a evitar", marca.tono_evitar),
    linea("Competidores", marca.competidores),
    linea("Referentes", marca.referentes),
    linea("Restricciones legales", marca.restricciones_legales),
    linea("Instagram", marca.instagram),
    linea("TikTok", marca.tiktok),
    linea("Sitio web", marca.website),
    "",
    "== QUE VENDE ==",
    linea("Tipo de oferta", prod.tipo_oferta),
    linea("Nombre", prod.nombre),
    linea("Presentaciones o planes", prod.presentaciones),
    linea("Que incluye", prod.componentes),
    linea("Beneficios", prod.beneficios),
    linea("Diferenciales", prod.diferenciales),
    linea("Precio", prod.precio),
    linea("Promociones", prod.promociones),
    linea("Garantías", prod.garantias),
    linea("Dónde se compra", prod.link_tienda),
    linea("Testimonios", prod.testimonios),
    linea("Objeciones frecuentes", prod.objeciones),
    "",
    "== CLIENTE IDEAL ==",
    linea("Edad", aud.edad),
    linea("Género", aud.genero),
    linea("País", aud.pais),
    linea("Problema que le resolvemos", aud.dolor),
    "",
    "== CONTENIDO ==",
    linea("Objetivo", cont.objetivo),
    linea("Plataformas", cont.plataformas),
    linea("Qué probaron antes", cont.historial_contenido),
  ].filter((l) => l !== null).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin: Sb = createClient(url, serviceKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, { error: "unauthorized" }, 401);

  const userClient: Sb = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } = { user: null } } = await userClient.auth
    .getUser();
  if (!caller) return json(req, { error: "unauthorized" }, 401);

  let body: { form_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }
  const formId = body?.form_id;
  if (typeof formId !== "string" || !formId) {
    return json(req, { error: "form_id es requerido" }, 400);
  }

  const { data: form, error: formError } = await admin
    .from("client_onboarding_forms")
    .select(
      "id, organization_id, client_id, status, form_data, processing, submitted_at",
    )
    .eq("id", formId)
    .maybeSingle();

  if (formError || !form) return json(req, { error: "form_not_found" }, 404);

  // ── Autorización contra la org DEL FORMULARIO ────────────────────────────
  const [memberRes, rolesRes] = await Promise.all([
    admin.from("organization_members").select("role")
      .eq("organization_id", form.organization_id).eq("user_id", caller.id)
      .maybeSingle(),
    admin.from("organization_member_roles").select("role")
      .eq("organization_id", form.organization_id).eq("user_id", caller.id),
  ]);
  const rolesCaller = [
    memberRes.data?.role,
    ...((rolesRes.data ?? []) as { role: string }[]).map((r) => r.role),
  ].filter(Boolean) as string[];

  if (!rolesCaller.some((r) => ROLES_HABILITADOS.includes(r))) {
    return json(
      req,
      { error: "forbidden: se requiere admin o estratega de esta organización" },
      403,
    );
  }

  if (form.status !== "submitted" && form.status !== "processed") {
    return json(
      req,
      {
        error: "estado_invalido",
        message: "El formulario todavía no fue enviado por el cliente.",
      },
      409,
    );
  }

  const fd = (form.form_data ?? {}) as Record<string, unknown>;
  const previo = (form.processing ?? {}) as Record<string, unknown>;
  const pasosPrevios = (previo.pasos ?? {}) as Record<string, Sb>;
  const pasos: Record<string, Sb> = { ...pasosPrevios };
  const ahora = () => new Date().toISOString();

  // ── Paso 1: actualizar el cliente (sin datos fiscales) ───────────────────
  try {
    const equipo = (fd.equipo ?? {}) as Record<string, unknown>;
    const aprobador = (equipo.aprobador ?? {}) as Record<string, unknown>;
    const legal = (fd.legal ?? {}) as Record<string, unknown>;
    const marca = (fd.marca ?? {}) as Record<string, unknown>;
    const prod = (fd.producto ?? {}) as Record<string, unknown>;

    const texto = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;

    // Resumen corto para `notes`. Nada fiscal.
    const notas = [
      texto(prod.nombre) ? `Producto: ${texto(prod.nombre)}` : null,
      texto(prod.precio) ? `Precio: ${texto(prod.precio)}` : null,
      texto(marca.tono_deseado) ? `Tono: ${texto(marca.tono_deseado)}` : null,
    ].filter(Boolean).join(" · ");

    const cambios: Record<string, unknown> = {
      contact_email: texto(aprobador.correo) ?? texto(equipo.correo_portal),
      contact_phone: texto(aprobador.celular),
      whatsapp_phone: texto(aprobador.celular),
      main_contact: texto(aprobador.nombre),
      instagram: texto(marca.instagram),
      tiktok: texto(marca.tiktok),
      website: texto(marca.website),
      // Ciudad y país del cliente son datos de contacto, no fiscales.
      city: texto(legal.ciudad),
      country: texto(legal.pais),
      notes: notas || null,
      // El cliente onboardeado deja de ser un perfil público.
      is_public: false,
    };
    // No pisar con null lo que ya tenga cargado el admin.
    for (const k of Object.keys(cambios)) {
      if (cambios[k] === null && k !== "is_public") delete cambios[k];
    }

    const { error } = await admin.from("clients").update(cambios).eq(
      "id",
      form.client_id,
    );
    if (error) throw new Error(error.message);

    pasos.cliente = { ok: true, en: ahora(), detalle: "Datos de contacto y marca actualizados; is_public en false." };
  } catch (e) {
    pasos.cliente = { ok: false, en: ahora(), detalle: String((e as Error).message) };
  }

  // ── Paso 2: invitación al portal (delega, ya es idempotente) ─────────────
  try {
    const res = await fetch(`${url}/functions/v1/client-portal-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ form_id: form.id }),
    });
    const payload = await res.json().catch(() => ({}));
    pasos.invitacion = res.ok
      ? {
        ok: true,
        en: ahora(),
        caso: payload.caso ?? null,
        detalle: payload.message ?? "Invitación procesada.",
      }
      : {
        ok: false,
        en: ahora(),
        detalle: payload.message ?? payload.error ?? `HTTP ${res.status}`,
      };
  } catch (e) {
    pasos.invitacion = { ok: false, en: ahora(), detalle: String((e as Error).message) };
  }

  // ── Paso 3: ADN del producto ─────────────────────────────────────────────
  // Guard de idempotencia: si ya hay product_dna_id, no se recrea ni se
  // reinvoca la IA (cada corrida cuesta Perplexity + Firecrawl + 4 LLM).
  if (pasosPrevios.adn?.product_dna_id) {
    pasos.adn = {
      ...pasosPrevios.adn,
      detalle: "Ya se había disparado; no se repite.",
    };
  } else {
    try {
      const prod = (fd.producto ?? {}) as Record<string, unknown>;
      const cont = (fd.contenido ?? {}) as Record<string, unknown>;
      const transcripcion = componerTextoParaAdn(fd);

      // Mismo contrato que ProductDNAWizard: se inserta la fila de product_dna
      // y luego se invoca generate-product-dna solo con { productDnaId }.
      const { data: dna, error: dnaError } = await admin
        .from("product_dna")
        .insert({
          client_id: form.client_id,
          service_group: "content_creation",
          service_types: Array.isArray(cont.plataformas) ? cont.plataformas : [],
          wizard_responses: {
            origen: "client_onboarding_form",
            onboarding_form_id: form.id,
            product_name: typeof prod.nombre === "string" ? prod.nombre : undefined,
            platforms: Array.isArray(cont.plataformas) ? cont.plataformas : [],
            goals: cont.objetivo ? [cont.objetivo] : [],
            transcription: transcripcion,
          },
          status: "analyzing",
        })
        .select("id")
        .single();

      if (dnaError) throw new Error(dnaError.message);

      // Fire-and-forget: la función es síncrona y tarda minutos (Perplexity +
      // Firecrawl + 4 LLM). No se espera para no colgar la respuesta al admin;
      // el progreso se ve en product_dna.status.
      const disparoAdn = fetch(`${url}/functions/v1/generate-product-dna`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ productDnaId: dna.id }),
      }).catch((err) =>
        console.error("[client-onboarding-process] ADN fire falló:", err)
      );

      // Sin esto el runtime cancela el disparo al responderle al admin, y el
      // ADN no arranca nunca: el product_dna se queda en su estado inicial
      // sin que nadie lo note. Es el primer paso del pipeline del cliente.
      try {
        EdgeRuntime?.waitUntil?.(disparoAdn);
      } catch { /* fuera del runtime de Supabase no hay nada que retener */ }

      pasos.adn = {
        ok: true,
        en: ahora(),
        product_dna_id: dna.id,
        detalle: "ADN disparado; el producto se crea al terminar el análisis.",
      };
    } catch (e) {
      pasos.adn = { ok: false, en: ahora(), detalle: String((e as Error).message) };
    }
  }

  // ── Paso 4: arrancar el pipeline autónomo ────────────────────────────────
  // Sin esto el cliente entra a su portal y ve los cinco pasos en "Aún no
  // empieza" para siempre: la pantalla lee `client_pipeline_runs` y nadie
  // creaba la fila. `start` es idempotente (UNIQUE por client_id), así que
  // reprocesar el formulario no crea un segundo run ni reinicia el vivo.
  try {
    const res = await fetch(`${url}/functions/v1/pipeline-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        action: "start",
        client_id: form.client_id,
        organization_id: form.organization_id,
        onboarding_form_id: form.id,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    pasos.pipeline = res.ok
      ? {
        ok: true,
        en: ahora(),
        detalle: payload.reutilizado
          ? "El proceso del cliente ya estaba en marcha."
          : "Proceso del cliente creado; queda a la espera de su aprobación.",
      }
      : {
        ok: false,
        en: ahora(),
        detalle: payload.message ?? payload.error ?? `HTTP ${res.status}`,
      };
  } catch (e) {
    pasos.pipeline = { ok: false, en: ahora(), detalle: String((e as Error).message) };
  }

  // ── Paso 5: cierre + notificación ────────────────────────────────────────
  const eraProcesado = form.status === "processed";

  await admin
    .from("client_onboarding_forms")
    .update({
      status: "processed",
      processed_at: eraProcesado ? undefined : ahora(),
      processing: {
        pasos,
        procesado_por: caller.id,
        procesado_en: ahora(),
      },
    })
    .eq("id", form.id);

  // Solo se notifica en el PRIMER procesamiento, para que reintentar no genere
  // una avalancha de notificaciones repetidas.
  if (!eraProcesado) {
    try {
      const { data: staff } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", form.organization_id)
        .in("role", ROLES_HABILITADOS);

      const { data: cliente } = await admin
        .from("clients").select("name").eq("id", form.client_id).maybeSingle();

      const ids = [
        ...new Set(((staff ?? []) as { user_id: string }[]).map((m) => m.user_id)),
      ];

      if (ids.length > 0) {
        await admin.from("user_notifications").insert(
          ids.map((userId) => ({
            user_id: userId,
            organization_id: form.organization_id,
            type: NOTIFICATION_TYPE,
            title: "Onboarding procesado",
            message: `Ya se volcaron los datos de ${cliente?.name ?? "el cliente"} y se disparó el ADN del producto.`,
            entity_type: NOTIFICATION_ENTITY_TYPE,
            entity_id: form.id,
          })),
        );
      }
    } catch (e) {
      console.error("[client-onboarding-process] notificación falló:", e);
    }
  }

  const todoOk = Object.values(pasos).every((p) => p?.ok);

  return json(req, {
    ok: todoOk,
    pasos,
    reprocesado: eraProcesado,
    message: todoOk
      ? "Onboarding procesado."
      : "Se procesó con errores en algunos pasos. Puedes reintentar sin duplicar.",
  });
});
