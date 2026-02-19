import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getKreoonClient } from "../_shared/kreoon-client.ts";
import { sendEmail, resolveTemplateVariables } from "../_shared/resend-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Email Drip Processor
 *
 * Called every 5 minutes by pg_cron. Processes pending drip enrollments
 * and sends the next email in their sequence.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getKreoonClient();
    const now = new Date().toISOString();

    // Fetch enrollments that are due
    const { data: enrollments, error: fetchErr } = await supabase
      .from("email_drip_enrollments")
      .select("*")
      .eq("status", "active")
      .lte("next_send_at", now)
      .order("next_send_at", { ascending: true })
      .limit(50); // Process max 50 per run to stay within rate limits

    if (fetchErr) {
      console.error("[drip-processor] Fetch error:", fetchErr);
      throw new Error(fetchErr.message);
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending enrollments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[drip-processor] Processing ${enrollments.length} enrollments`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const enrollment of enrollments) {
      try {
        // Get the current step for this enrollment
        const { data: step, error: stepErr } = await supabase
          .from("email_drip_steps")
          .select("*, email_templates(*)")
          .eq("sequence_id", enrollment.sequence_id)
          .eq("step_order", enrollment.current_step)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (stepErr || !step) {
          // No more steps — mark as completed
          await supabase
            .from("email_drip_enrollments")
            .update({ status: "completed", next_send_at: null })
            .eq("id", enrollment.id);
          skipped++;
          continue;
        }

        // Check conditions
        const conditions = step.conditions || {};
        if (conditions.skip_if_opened_prev || conditions.skip_if_clicked_prev) {
          // Check if previous step email was opened/clicked
          const prevEvents = await supabase
            .from("email_events")
            .select("event_type")
            .eq("enrollment_id", enrollment.id)
            .in("event_type", ["opened", "clicked"]);

          const prevTypes = (prevEvents.data || []).map((e: any) => e.event_type);
          if (conditions.skip_if_opened_prev && prevTypes.includes("opened")) {
            // Skip this step — advance to next
            await advanceToNextStep(supabase, enrollment);
            skipped++;
            continue;
          }
          if (conditions.skip_if_clicked_prev && prevTypes.includes("clicked")) {
            await advanceToNextStep(supabase, enrollment);
            skipped++;
            continue;
          }
        }

        // Resolve template
        const template = step.email_templates;
        if (!template) {
          console.warn(`[drip-processor] Step ${step.id} has no template, skipping`);
          await advanceToNextStep(supabase, enrollment);
          skipped++;
          continue;
        }

        const metadata = enrollment.contact_metadata || {};
        const variables: Record<string, string> = {
          first_name: metadata.first_name || enrollment.contact_name?.split(" ")[0] || "",
          last_name: metadata.last_name || enrollment.contact_name?.split(" ").slice(1).join(" ") || "",
          email: enrollment.contact_email,
          name: enrollment.contact_name || "",
          ...Object.fromEntries(
            Object.entries(metadata.properties || {}).map(([k, v]) => [k, String(v)])
          ),
        };

        const subject = resolveTemplateVariables(
          step.subject_override || template.subject,
          variables
        );
        const html = resolveTemplateVariables(template.html_body, variables);

        // Send email via Resend
        const { id: emailId } = await sendEmail({
          to: [enrollment.contact_email],
          subject,
          html,
          text: template.text_body ? resolveTemplateVariables(template.text_body, variables) : undefined,
          tags: [
            { name: "drip_enrollment_id", value: enrollment.id },
            { name: "drip_sequence_id", value: enrollment.sequence_id },
            { name: "drip_step", value: String(enrollment.current_step) },
          ],
        });

        console.log(`[drip-processor] Sent email ${emailId} to ${enrollment.contact_email} (step ${enrollment.current_step})`);

        // Record event
        await supabase.from("email_events").insert({
          enrollment_id: enrollment.id,
          resend_email_id: emailId,
          event_type: "sent",
          recipient_email: enrollment.contact_email,
          metadata: { step_order: enrollment.current_step, sequence_id: enrollment.sequence_id },
        });

        // Advance to next step
        await advanceToNextStep(supabase, enrollment);
        processed++;

        // Rate limit: ~2 req/s for Resend
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error(`[drip-processor] Error processing enrollment ${enrollment.id}:`, err);
        errors++;
      }
    }

    const result = { processed, skipped, errors, total: enrollments.length };
    console.log("[drip-processor] Done:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[drip-processor] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Advance an enrollment to the next step in its sequence.
 * If no more steps, mark as completed.
 */
async function advanceToNextStep(supabase: any, enrollment: any) {
  const nextStepOrder = enrollment.current_step + 1;

  // Check if next step exists
  const { data: nextStep } = await supabase
    .from("email_drip_steps")
    .select("step_order, delay_minutes")
    .eq("sequence_id", enrollment.sequence_id)
    .eq("step_order", nextStepOrder)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!nextStep) {
    // No more steps — completed
    await supabase
      .from("email_drip_enrollments")
      .update({
        status: "completed",
        current_step: nextStepOrder,
        next_send_at: null,
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);
    return;
  }

  // Calculate next send time
  const delayMs = (nextStep.delay_minutes || 0) * 60 * 1000;
  const nextSendAt = new Date(Date.now() + delayMs).toISOString();

  await supabase
    .from("email_drip_enrollments")
    .update({
      current_step: nextStepOrder,
      next_send_at: nextSendAt,
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", enrollment.id);
}
