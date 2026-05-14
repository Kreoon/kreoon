import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PANCAKE_API_BASE = "https://crm.pancake.vn/api/workspaces";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const PANCAKE_API_KEY = Deno.env.get("PANCAKE_API_KEY") ?? "";
    const PANCAKE_WORKSPACE_ID = Deno.env.get("PANCAKE_WORKSPACE_ID") ?? "4708";

    let mode = "cleanup";
    let dryRun = false;
    let targetId = "";
    try {
      const body = await req.json();
      mode = body?.mode ?? "cleanup";
      dryRun = body?.dry_run === true;
      targetId = body?.contact_id ?? "";
    } catch (_e) { /* ok */ }

    // ── MODO: clear_location — fuerza Colombia (57) borrando datos incorrectos ─
    if (mode === "clear_location" && targetId) {
      const url = `${PANCAKE_API_BASE}/${PANCAKE_WORKSPACE_ID}/contact/records?api_key=${PANCAKE_API_KEY}`;

      // Intento 1: full_address como array [texto, "57"] → país=Colombia, sin provincia
      let body: Record<string, unknown> = {
        id: targetId,
        full_address: ["", "57"],
      };
      let resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data1 = await resp.json().catch(() => ({}));
      const inner1 = (data1 as Record<string, unknown>)?.data as Record<string, unknown>;
      const extraAfter1 = (inner1?.extra_infor as Record<string, unknown>)?.full_address;

      return new Response(JSON.stringify({
        attempt: "full_address_array_57",
        status: resp.status,
        extra_infor_after: extraAfter1,
        raw: inner1,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ── MODO: find — busca un contacto específico por ID en la paginación ─
    if (mode === "find" && targetId) {
      const BASE = `${PANCAKE_API_BASE}/${PANCAKE_WORKSPACE_ID}/contact/records?api_key=${PANCAKE_API_KEY}`;
      let cursor = "";

      for (let i = 0; i < 30; i++) {
        const url = cursor
          ? `${BASE}&limit=50&cursor=${encodeURIComponent(cursor)}`
          : `${BASE}&limit=50`;

        const resp = await fetch(url);
        if (!resp.ok) break;

        const json = await resp.json() as Record<string, unknown>;
        const inner = json?.data as Record<string, unknown> | null;
        const entries = (inner?.entries ?? []) as Array<Record<string, unknown>>;

        for (const entry of entries) {
          if (entry.id === targetId) {
            return new Response(JSON.stringify({
              found: true,
              all_keys: Object.keys(entry),
              entry,
            }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }

        cursor = (inner?.cursor as string) ?? "";
        if (!entries.length || !cursor) break;
        await new Promise((res) => setTimeout(res, 300));
      }

      return new Response(JSON.stringify({ found: false, contact_id: targetId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── MODO: cleanup ─────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("pancake_contact_id")
      .not("pancake_contact_id", "is", null);

    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validIds = new Set<string>();
    for (const p of profiles ?? []) {
      if (p.pancake_contact_id) validIds.add(p.pancake_contact_id as string);
    }

    const allPancakeIds: string[] = [];
    const BASE = `${PANCAKE_API_BASE}/${PANCAKE_WORKSPACE_ID}/contact/records?api_key=${PANCAKE_API_KEY}`;
    let cursor = "";

    for (let i = 0; i < 30; i++) {
      const url = cursor
        ? `${BASE}&limit=50&cursor=${encodeURIComponent(cursor)}`
        : `${BASE}&limit=50`;

      const resp = await fetch(url);
      if (!resp.ok) break;

      const json = await resp.json() as Record<string, unknown>;
      const inner = json?.data as Record<string, unknown> | null;
      const entries = (inner?.entries ?? []) as Array<Record<string, unknown>>;

      for (const entry of entries) {
        const id = entry.id as string | undefined;
        if (id) allPancakeIds.push(id);
      }

      cursor = (inner?.cursor as string) ?? "";
      if (!entries.length || !cursor) break;
      await new Promise((res) => setTimeout(res, 300));
    }

    const orphans = allPancakeIds.filter((id) => !validIds.has(id));

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true,
        valid_kreoon_ids: validIds.size,
        total_pancake: allPancakeIds.length,
        orphans: orphans.length,
        orphan_ids: orphans,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of orphans) {
      const delUrl = `${PANCAKE_API_BASE}/${PANCAKE_WORKSPACE_ID}/contact/records?api_key=${PANCAKE_API_KEY}&record_ids[]=${id}`;
      const delResp = await fetch(delUrl, { method: "DELETE" });
      if (delResp.ok) { deleted.push(id); } else { failed.push(id); }
      await new Promise((res) => setTimeout(res, 200));
    }

    return new Response(JSON.stringify({
      valid_kreoon_ids: validIds.size,
      total_pancake: allPancakeIds.length,
      orphans: orphans.length,
      deleted: deleted.length,
      failed: failed.length,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
