import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PANCAKE_API_BASE = "https://crm.pancake.vn/api/workspaces";

// Los campos de ubicación (País, Provincia, Distrito) están en extra_infor.full_address.
// province_id y district_id son IDs internos de Pancake (solo para Vietnam) → null para LATAM.
// country_code, province_name, district_name son texto libre y sí son seteables por API.

interface PancakeExtraAddress {
  address?: string;
  country_code?: string;
  province_name?: string;
  district_name?: string;
  full_address?: string;
}

interface PancakeContact {
  id?: string;
  name: string;
  phone_number?: string;
  secondary_phone_number?: string;
  email?: string;
  birthday?: string;
  full_address?: string | string[]; // Array ["texto", "cod_tel_pais"] fija País; string plano activa geocoder
  extra_infor?: { full_address?: PancakeExtraAddress };
  source?: string[];
  note?: string;
  pancake_tag?: string[];
}

const SOURCE_MAP: Record<string, string> = {
  instagram: "-3",
  facebook: "-1",
  tiktok: "-5",
  whatsapp: "-6",
  google: "-9",
  telegram: "-13",
};

const TAG_CREADOR = "waba_105352325912296_0";
const TAG_MARCA   = "waba_105352325912296_1";

interface SyncResult {
  success: boolean;
  action: "created" | "updated" | "skipped" | "failed";
  pancake_id?: string;
  user_id: string;
  reason?: string;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("3") && digits.length === 10) return `57${digits}`;
  if (digits.startsWith("00") && digits.length > 10) return digits.slice(2);
  return digits;
}

const COUNTRY_NAMES: Record<string, string> = {
  CO: "Colombia", MX: "México", AR: "Argentina", BR: "Brasil",
  PE: "Perú", CL: "Chile", EC: "Ecuador", VE: "Venezuela",
  UY: "Uruguay", PY: "Paraguay", BO: "Bolivia", CR: "Costa Rica",
  PA: "Panamá", DO: "República Dominicana", GT: "Guatemala",
  HN: "Honduras", SV: "El Salvador", NI: "Nicaragua", CU: "Cuba",
  PR: "Puerto Rico", US: "Estados Unidos", ES: "España",
  CA: "Canadá", GB: "Reino Unido", DE: "Alemania", FR: "Francia",
};

// Códigos de teléfono por país — usados en el array full_address para fijar País en Pancake
// sin activar el geocoder (que puede asignar países incorrectos por coincidencia de texto).
const COUNTRY_PHONE_CODES: Record<string, string> = {
  CO: "57",  MX: "52",  AR: "54",  BR: "55",
  PE: "51",  CL: "56",  EC: "593", VE: "58",
  UY: "598", PY: "595", BO: "591", CR: "506",
  PA: "507", DO: "1",   GT: "502", HN: "504",
  SV: "503", NI: "505", CU: "53",  PR: "1",
  US: "1",   ES: "34",  CA: "1",   GB: "44",
  DE: "49",  FR: "33",
};

const CO_CITY_TO_DEPT: Record<string, string> = {
  "bogotá": "Bogotá D.C.", "bogota": "Bogotá D.C.", "bogotá d.c.": "Bogotá D.C.",
  "medellín": "Antioquia", "medellin": "Antioquia",
  "cali": "Valle del Cauca",
  "barranquilla": "Atlántico",
  "cartagena": "Bolívar",
  "bucaramanga": "Santander",
  "pereira": "Risaralda",
  "manizales": "Caldas",
  "ibagué": "Tolima", "ibague": "Tolima",
  "cúcuta": "Norte de Santander", "cucuta": "Norte de Santander",
  "santa marta": "Magdalena",
  "villavicencio": "Meta",
  "armenia": "Quindío",
  "neiva": "Huila",
  "montería": "Córdoba", "monteria": "Córdoba",
  "pasto": "Nariño",
  "sincelejo": "Sucre",
  "popayán": "Cauca", "popayan": "Cauca",
  "valledupar": "Cesar",
  "tunja": "Boyacá",
  "florencia": "Caquetá",
  "riohacha": "La Guajira",
  "bello": "Antioquia",
  "itagüí": "Antioquia", "itagui": "Antioquia",
  "envigado": "Antioquia",
  "sabaneta": "Antioquia",
  "soledad": "Atlántico",
  "soacha": "Cundinamarca",
  "palmira": "Valle del Cauca",
  "buenaventura": "Valle del Cauca",
  "barrancabermeja": "Santander",
};

interface AddressResult {
  fullText: string;
  phoneCode?: string;  // código tel. del país → enviado en el array full_address para fijar País
  extraAddr: PancakeExtraAddress;
}

function buildAddress(profile: Record<string, unknown>): AddressResult | undefined {
  const rawCountry = profile.country as string | undefined;
  const countryCode = rawCountry?.toUpperCase() ?? undefined;
  const countryName = countryCode ? (COUNTRY_NAMES[countryCode] ?? rawCountry) : undefined;
  const phoneCode = countryCode ? COUNTRY_PHONE_CODES[countryCode] : undefined;

  const street = (profile.address as string | undefined)?.trim() || undefined;
  const city   = (profile.city as string | undefined)?.trim() || undefined;

  if (!street && !city && !countryCode) return undefined;

  const province = city && countryCode === "CO"
    ? CO_CITY_TO_DEPT[city.toLowerCase().trim()]
    : undefined;

  const fullText = [street, city, countryName].filter(Boolean).join(", ");

  const extraAddr: PancakeExtraAddress = {
    ...(street      ? { address: street }          : {}),
    ...(countryCode ? { country_code: countryCode }: {}),
    ...(province    ? { province_name: province }  : {}),
    ...(city        ? { district_name: city }      : {}),
    full_address: fullText,
  };

  return { fullText, phoneCode, extraAddr };
}

function buildNote(p: Record<string, unknown>, roles: string[]): string | undefined {
  const lines: string[] = [];

  // Rol y nivel profesional
  const activeRole = p.active_role as string;
  const allRoles = [...new Set([...(activeRole ? [activeRole] : []), ...roles])];
  if (allRoles.length > 0) lines.push(`Rol: ${allRoles.join(", ")}`);

  const level = p.experience_level as string;
  const rate = p.rate_per_content as number;
  const currency = (p.rate_currency as string) ?? "USD";
  const levelStr = level ? `Nivel: ${level}` : null;
  const rateStr = rate ? `Tarifa: ${rate} ${currency}/contenido` : null;
  if (levelStr || rateStr) lines.push([levelStr, rateStr].filter(Boolean).join(" | "));

  // Scores y métricas
  const scoreItems: string[] = [];
  const quality = p.quality_score_avg as number;
  const reliability = p.reliability_score as number;
  const rating = p.avg_rating as number;
  const contracts = p.total_contracts_completed as number;
  if (quality) scoreItems.push(`Calidad: ${quality}`);
  if (reliability) scoreItems.push(`Confiabilidad: ${reliability}`);
  if (rating) scoreItems.push(`Rating: ${rating}`);
  if (contracts) scoreItems.push(`Contratos: ${contracts}`);
  if (scoreItems.length > 0) lines.push(scoreItems.join(" | "));

  // Datos personales
  const gender = p.gender as string;
  const nationality = p.nationality as string;
  const availability = p.availability_status as string;
  const ambassador = p.is_ambassador as boolean;
  if (gender) lines.push(`Género: ${gender}`);
  if (nationality) lines.push(`Nacionalidad: ${nationality}`);
  if (availability) lines.push(`Disponibilidad: ${availability}`);
  if (ambassador) lines.push(`Embajador: Sí`);

  // Redes sociales
  const socials: string[] = [];
  const ig = (p.social_instagram as string) ?? (p.instagram as string);
  const tt = (p.social_tiktok as string) ?? (p.tiktok as string);
  const fb = (p.social_facebook as string) ?? (p.facebook as string);
  const li = p.social_linkedin as string;
  const yt = p.social_youtube as string;
  const tw = (p.social_twitter as string) ?? (p.social_x as string);
  const portfolio = p.portfolio_url as string;
  if (ig) socials.push(`Instagram: ${ig}`);
  if (tt) socials.push(`TikTok: ${tt}`);
  if (fb) socials.push(`Facebook: ${fb}`);
  if (li) socials.push(`LinkedIn: ${li}`);
  if (yt) socials.push(`YouTube: ${yt}`);
  if (tw) socials.push(`Twitter/X: ${tw}`);
  if (portfolio) socials.push(`Portfolio: ${portfolio}`);
  if (socials.length > 0) {
    lines.push("");
    lines.push("Redes Sociales:");
    lines.push(...socials);
  }

  // Tags y categorías
  const specialties = (p.specialties_tags as string[]) ?? [];
  const categories = (p.content_categories as string[]) ?? [];
  const interests = (p.interests as string[]) ?? [];
  if (specialties.length > 0) lines.push(`Especialidades: ${specialties.join(", ")}`);
  if (categories.length > 0) lines.push(`Categorías: ${categories.join(", ")}`);
  if (interests.length > 0) lines.push(`Intereses: ${interests.join(", ")}`);

  // Tagline y bio
  const tagline = p.tagline as string;
  const bio = p.bio as string;
  if (tagline) { lines.push(""); lines.push(`"${tagline}"`); }
  if (bio) { lines.push(""); lines.push(`Bio: ${bio}`); }

  // Meta Kreoon
  lines.push("");
  lines.push(`Kreoon ID: ${p.id}`);
  const createdAt = p.created_at as string;
  if (createdAt) {
    try { lines.push(`Registro: ${new Date(createdAt).toISOString().split("T")[0]}`); } catch { /* ok */ }
  }
  lines.push(`Onboarding: ${p.onboarding_completed ? "Completado" : "Pendiente"}`);

  const result = lines.join("\n").trim();
  return result.length > 0 ? result : undefined;
}

function buildTags(p: Record<string, unknown>, roles: string[]): string[] | undefined {
  const activeRole = p.active_role as string;
  const allRoles = [...new Set([...(activeRole ? [activeRole] : []), ...roles])];
  const pancakeTags: string[] = [];

  const CREATOR_ROLES = ["content_creator", "editor", "digital_strategist", "creative_strategist", "community_manager"];
  if (allRoles.some((r) => CREATOR_ROLES.includes(r))) pancakeTags.push(TAG_CREADOR);
  if (allRoles.includes("client")) pancakeTags.push(TAG_MARCA);

  return pancakeTags.length > 0 ? pancakeTags : undefined;
}

function buildSource(registrationSource: string | null | undefined): string[] {
  if (!registrationSource) return ["-12"]; // Form (web)
  const mapped = SOURCE_MAP[registrationSource.toLowerCase()];
  return mapped ? [mapped] : ["-12"];
}

// Nota: La búsqueda por teléfono de Pancake no filtra correctamente — siempre devuelve
// el primer contacto del workspace. Se eliminó para evitar asignaciones incorrectas.

async function upsertContact(
  workspaceId: string,
  apiKey: string,
  contact: PancakeContact
): Promise<{ ok: boolean; data: unknown; pancakeId?: string }> {
  const url = `${PANCAKE_API_BASE}/${workspaceId}/contact/records?api_key=${apiKey}`;

  console.log(`[pancake-sync] upsert → ${contact.id ? "UPDATE" : "CREATE"} | name="${contact.name}" phone="${contact.phone_number}"`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });

  const data = await res.json().catch(() => ({}));
  console.log(`[pancake-sync] response status=${res.status} id=${(data as Record<string, unknown>)?.data ? (data as Record<string, Record<string, unknown>>).data?.id : "?"}`);

  if (!res.ok) return { ok: false, data };

  const d = data as Record<string, unknown>;
  const pancakeId =
    ((d?.data as Record<string, unknown>)?.id as string) ??
    (d?.id as string) ??
    undefined;

  return { ok: true, data, pancakeId };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PANCAKE_API_KEY = Deno.env.get("PANCAKE_API_KEY");
  const PANCAKE_WORKSPACE_ID = Deno.env.get("PANCAKE_WORKSPACE_ID") ?? "4708";

  if (!PANCAKE_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, action: "skipped", reason: "PANCAKE_API_KEY_not_configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.user_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "user_id es requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id, full_name, email, phone, whatsapp_phone,
      pancake_contact_id,
      date_of_birth, address, city, country,
      bio, tagline, gender, nationality,
      instagram, facebook, tiktok,
      social_instagram, social_facebook, social_tiktok,
      social_linkedin, social_youtube, social_twitter, social_x,
      username, portfolio_url, active_role,
      experience_level, rate_per_content, rate_currency,
      quality_score_avg, reliability_score, avg_rating,
      total_contracts_completed, is_ambassador,
      availability_status, registration_source,
      specialties_tags, content_categories, interests,
      created_at, onboarding_completed
    `)
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: `Perfil no encontrado: ${profileError?.message}` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: rolesData } = await supabase
    .from("organization_member_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(5);

  const roles = rolesData?.map((r: { role: string }) => r.role) ?? [];

  const p = profile as Record<string, unknown>;

  // ── Construir valores ────────────────────────────────────────────────────
  const waPhone = p.whatsapp_phone as string | null;
  const stdPhone = p.phone as string | null;
  const primaryPhone = waPhone ?? stdPhone;
  const phoneValue = primaryPhone ? normalizePhone(primaryPhone) : undefined;

  // Teléfono secundario: solo si son distintos
  const secondaryRaw = waPhone && stdPhone && waPhone !== stdPhone ? stdPhone : null;
  const secondaryPhone = secondaryRaw ? normalizePhone(secondaryRaw) : undefined;

  const nameValue = (() => {
    const n = p.full_name as string;
    return n?.trim() || (p.email as string) || userId;
  })();

  const emailValue = (() => {
    const e = p.email as string;
    return e?.trim() || undefined;
  })();

  const birthdayValue = (() => {
    const dob = p.date_of_birth as string;
    if (!dob) return undefined;
    try { return new Date(dob).toISOString(); } catch { return undefined; }
  })();

  const addressValue = buildAddress(p);
  const noteValue = buildNote(p, roles);
  const tagsValue = buildTags(p, roles);
  const sourceValue = buildSource(p.registration_source as string | null);

  // Sin teléfono → no se crea ni actualiza en Pancake CRM
  if (!phoneValue) {
    console.log(`[pancake-sync] user=${userId} sin teléfono — omitido`);
    return new Response(
      JSON.stringify({ success: false, action: "skipped", reason: "no_phone", user_id: userId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[pancake-sync] Sincronizando user=${userId} | nombre="${nameValue}" | roles=${roles.join(",")}`);

  const result: SyncResult = { success: false, action: "skipped", user_id: userId };

  function buildContact(existingId?: string): PancakeContact {
    const contact: PancakeContact = {
      name: nameValue,
      ...(phoneValue ? { phone_number: phoneValue } : {}),
      ...(secondaryPhone ? { secondary_phone_number: secondaryPhone } : {}),
      ...(emailValue ? { email: emailValue } : {}),
      ...(birthdayValue ? { birthday: birthdayValue } : {}),
      // Si tenemos código de país, enviamos array ["texto", "cod"] para fijar País sin geocoding.
      // Si no hay código, mandamos texto plano (Pancake lo geocodificará pero no hay país que fijar).
      ...(addressValue ? {
        full_address: addressValue.phoneCode
          ? [addressValue.fullText, addressValue.phoneCode]
          : addressValue.fullText,
      } : {}),
      source: sourceValue,
      ...(noteValue ? { note: noteValue } : {}),
      ...(tagsValue ? { pancake_tag: tagsValue } : {}),
    };
    if (existingId) contact.id = existingId;
    return contact;
  }

  // ── RUTA 1: Ya tiene pancake_contact_id → update directo ─────────────────
  const storedPancakeId = p.pancake_contact_id as string | undefined;
  if (storedPancakeId) {
    const { ok, pancakeId } = await upsertContact(PANCAKE_WORKSPACE_ID, PANCAKE_API_KEY, buildContact(storedPancakeId));
    result.success = ok;
    result.action = ok ? "updated" : "failed";
    result.pancake_id = pancakeId ?? storedPancakeId;
    return new Response(JSON.stringify(result), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── RUTA 2: Crear nuevo contacto ─────────────────────────────────────────
  console.log(`[pancake-sync] Creando nuevo contacto en Pancake para user=${userId}`);
  const { ok, pancakeId } = await upsertContact(PANCAKE_WORKSPACE_ID, PANCAKE_API_KEY, buildContact());

  if (ok && pancakeId) {
    await supabase.from("profiles")
      .update({ pancake_contact_id: pancakeId } as Record<string, unknown>)
      .eq("id", userId)
      .then(() => {}).catch(() => {});
    result.success = true;
    result.action = "created";
    result.pancake_id = pancakeId;
  } else if (ok) {
    result.success = true;
    result.action = "created";
    result.reason = "pancake_id_not_returned";
  } else {
    result.action = "failed";
  }

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
