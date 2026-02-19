import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getKreoonClient, validateKreoonAuth } from "../_shared/kreoon-client.ts";
import {
  createSegment,
  deleteSegment,
  syncContactToResend,
  createBroadcast,
  sendBroadcast,
  deleteBroadcast,
  resolveTemplateVariables,
} from "../_shared/resend-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Email Marketing Service
 *
 * Multi-action endpoint for managing email campaigns, segments,
 * contacts sync, and drip sequences.
 *
 * Usage: POST /email-marketing-service?action=<action>
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const { user } = await validateKreoonAuth(req.headers.get("Authorization"));
    const supabase = getKreoonClient();

    // Verify admin access
    const { data: isAdmin } = await supabase.rpc("is_email_marketing_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "No tienes permisos de administrador" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json() : {};

    let result: unknown;

    switch (action) {
      // ─── SEGMENTS ─────────────────────────────────
      case "sync-segment": {
        const { segment_id } = body;
        if (!segment_id) throw new Error("segment_id requerido");

        const { data: localSegment, error } = await supabase
          .from("email_segments")
          .select("*")
          .eq("id", segment_id)
          .single();
        if (error || !localSegment) throw new Error("Segmento no encontrado");

        // Create in Resend if no resend_segment_id
        if (!localSegment.resend_segment_id) {
          const resendSeg = await createSegment(localSegment.name);
          await supabase
            .from("email_segments")
            .update({
              resend_segment_id: resendSeg.id,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", segment_id);
          result = { resend_segment_id: resendSeg.id, synced: true };
        } else {
          result = { resend_segment_id: localSegment.resend_segment_id, synced: false };
        }
        break;
      }

      case "delete-segment": {
        const { segment_id } = body;
        if (!segment_id) throw new Error("segment_id requerido");

        const { data: seg } = await supabase
          .from("email_segments")
          .select("resend_segment_id")
          .eq("id", segment_id)
          .single();

        if (seg?.resend_segment_id) {
          try {
            await deleteSegment(seg.resend_segment_id);
          } catch (e) {
            console.warn("Failed to delete Resend segment:", e.message);
          }
        }

        await supabase.from("email_segments").delete().eq("id", segment_id);
        result = { deleted: true };
        break;
      }

      // ─── SYNC CONTACTS ────────────────────────────
      case "sync-contacts": {
        const { segment_id } = body;
        if (!segment_id) throw new Error("segment_id requerido");

        const { data: segment } = await supabase
          .from("email_segments")
          .select("*")
          .eq("id", segment_id)
          .single();
        if (!segment) throw new Error("Segmento no encontrado");
        if (!segment.resend_segment_id) throw new Error("Segmento no sincronizado con Resend. Ejecuta sync-segment primero.");

        const filters = segment.filter_criteria || {};
        let contactsQuery = supabase.from("org_contacts").select("*");

        // Apply filters from segment criteria
        if (filters.contact_type) {
          contactsQuery = contactsQuery.eq("contact_type", filters.contact_type);
        }
        if (filters.relationship_strength) {
          contactsQuery = contactsQuery.eq("relationship_strength", filters.relationship_strength);
        }
        if (filters.pipeline_stage) {
          contactsQuery = contactsQuery.eq("pipeline_stage", filters.pipeline_stage);
        }
        if (filters.tags && filters.tags.length > 0) {
          contactsQuery = contactsQuery.overlaps("tags", filters.tags);
        }
        if (segment.organization_id) {
          contactsQuery = contactsQuery.eq("organization_id", segment.organization_id);
        }

        const { data: contacts, error: contactsErr } = await contactsQuery;
        if (contactsErr) throw new Error(`Error fetching contacts: ${contactsErr.message}`);

        // Also fetch platform leads if no org filter
        let allContacts = (contacts || []).filter((c: any) => c.email);

        if (!segment.organization_id && filters.source === "leads") {
          const { data: leads } = await supabase
            .from("platform_leads")
            .select("*");
          const leadsWithEmail = (leads || []).filter((l: any) => l.email);
          allContacts = [
            ...allContacts,
            ...leadsWithEmail.map((l: any) => ({
              email: l.email,
              full_name: l.full_name || l.name,
              contact_type: "lead",
            })),
          ];
        }

        // Sync each contact to Resend (with rate-limit safety)
        let synced = 0;
        const errors: string[] = [];

        for (const contact of allContacts) {
          try {
            const [firstName, ...rest] = (contact.full_name || "").split(" ");
            const lastName = rest.join(" ");
            await syncContactToResend(
              contact.email,
              firstName || undefined,
              lastName || undefined,
              [segment.resend_segment_id],
              {
                contact_type: contact.contact_type || "unknown",
                source: "kreoon_crm",
              }
            );
            synced++;
          } catch (e) {
            errors.push(`${contact.email}: ${e.message}`);
          }

          // Rate limit: 2 req/s Resend limit, sync does 2 calls per contact
          if (synced % 2 === 0) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }

        // Update contact count
        await supabase
          .from("email_segments")
          .update({
            contact_count: synced,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", segment_id);

        result = { total: allContacts.length, synced, errors: errors.length > 0 ? errors : undefined };
        break;
      }

      // ─── CAMPAIGNS ────────────────────────────────
      case "create-campaign": {
        const { name, subject, segment_id, template_id, html_body, from_name, from_email, reply_to, scheduled_at } = body;
        if (!name || !subject) throw new Error("name y subject requeridos");

        // Resolve template if provided
        let finalHtml = html_body || "";
        if (template_id && !finalHtml) {
          const { data: template } = await supabase
            .from("email_templates")
            .select("html_body")
            .eq("id", template_id)
            .single();
          if (template) finalHtml = template.html_body;
        }

        // Get Resend segment ID
        let resendSegmentId: string | null = null;
        if (segment_id) {
          const { data: seg } = await supabase
            .from("email_segments")
            .select("resend_segment_id")
            .eq("id", segment_id)
            .single();
          resendSegmentId = seg?.resend_segment_id || null;
        }

        // Create broadcast in Resend (as draft)
        let resendBroadcastId: string | null = null;
        if (resendSegmentId) {
          const fromStr = `${from_name || "KREOON"} <${from_email || "noreply@kreoon.com"}>`;
          const broadcast = await createBroadcast({
            segment_id: resendSegmentId,
            from: fromStr,
            subject,
            html: finalHtml,
            name,
            reply_to,
            send: false,
          });
          resendBroadcastId = broadcast.id;
        }

        // Insert campaign locally
        const { data: campaign, error: campErr } = await supabase
          .from("email_campaigns")
          .insert({
            name,
            subject,
            segment_id,
            template_id,
            html_body: finalHtml,
            from_name: from_name || "KREOON",
            from_email: from_email || "noreply@kreoon.com",
            reply_to,
            status: "draft",
            resend_broadcast_id: resendBroadcastId,
            scheduled_at,
            created_by: user.id,
          })
          .select()
          .single();

        if (campErr) throw new Error(`Error creating campaign: ${campErr.message}`);
        result = campaign;
        break;
      }

      case "send-campaign": {
        const { campaign_id, scheduled_at } = body;
        if (!campaign_id) throw new Error("campaign_id requerido");

        const { data: campaign } = await supabase
          .from("email_campaigns")
          .select("*")
          .eq("id", campaign_id)
          .single();
        if (!campaign) throw new Error("Campaña no encontrada");
        if (!campaign.resend_broadcast_id) throw new Error("Campaña sin broadcast de Resend asociado");
        if (campaign.status !== "draft") throw new Error(`Campaña en estado '${campaign.status}', solo se pueden enviar drafts`);

        // Send via Resend
        await sendBroadcast(campaign.resend_broadcast_id, scheduled_at);

        const newStatus = scheduled_at ? "scheduled" : "sending";
        await supabase
          .from("email_campaigns")
          .update({
            status: newStatus,
            scheduled_at: scheduled_at || null,
            ...(newStatus === "sending" ? { sent_at: new Date().toISOString() } : {}),
          })
          .eq("id", campaign_id);

        result = { status: newStatus, campaign_id };
        break;
      }

      case "cancel-campaign": {
        const { campaign_id } = body;
        if (!campaign_id) throw new Error("campaign_id requerido");

        const { data: campaign } = await supabase
          .from("email_campaigns")
          .select("resend_broadcast_id, status")
          .eq("id", campaign_id)
          .single();
        if (!campaign) throw new Error("Campaña no encontrada");

        if (campaign.resend_broadcast_id && campaign.status === "scheduled") {
          try {
            await deleteBroadcast(campaign.resend_broadcast_id);
          } catch (e) {
            console.warn("Failed to cancel Resend broadcast:", e.message);
          }
        }

        await supabase
          .from("email_campaigns")
          .update({ status: "cancelled" })
          .eq("id", campaign_id);

        result = { cancelled: true };
        break;
      }

      // ─── DRIP SEQUENCES ───────────────────────────
      case "enroll-contacts": {
        const { sequence_id, contacts } = body;
        if (!sequence_id || !contacts?.length) throw new Error("sequence_id y contacts[] requeridos");

        const { data: sequence } = await supabase
          .from("email_drip_sequences")
          .select("id, is_active")
          .eq("id", sequence_id)
          .single();
        if (!sequence) throw new Error("Secuencia no encontrada");
        if (!sequence.is_active) throw new Error("La secuencia está inactiva");

        // Get first step to calculate next_send_at
        const { data: firstStep } = await supabase
          .from("email_drip_steps")
          .select("delay_minutes")
          .eq("sequence_id", sequence_id)
          .eq("is_active", true)
          .order("step_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        const delayMs = (firstStep?.delay_minutes || 0) * 60 * 1000;
        const nextSendAt = new Date(Date.now() + delayMs).toISOString();

        const enrollments = contacts.map((c: { email: string; name?: string; metadata?: Record<string, unknown> }) => ({
          sequence_id,
          contact_email: c.email,
          contact_name: c.name || null,
          contact_metadata: c.metadata || {},
          current_step: 0,
          status: "active",
          next_send_at: nextSendAt,
        }));

        const { data: enrolled, error: enrollErr } = await supabase
          .from("email_drip_enrollments")
          .insert(enrollments)
          .select();

        if (enrollErr) throw new Error(`Error enrolling contacts: ${enrollErr.message}`);
        result = { enrolled: enrolled?.length || 0 };
        break;
      }

      case "pause-enrollment": {
        const { enrollment_id, resume } = body;
        if (!enrollment_id) throw new Error("enrollment_id requerido");

        const newStatus = resume ? "active" : "paused";
        await supabase
          .from("email_drip_enrollments")
          .update({ status: newStatus })
          .eq("id", enrollment_id);

        result = { status: newStatus };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[email-marketing-service] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
