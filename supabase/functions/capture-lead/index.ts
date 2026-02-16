import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  // Datos básicos
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;

  // Clasificación
  lead_type: 'talent' | 'brand' | 'organization' | 'other';
  talent_category?: string;
  specific_role?: string;
  talent_subtype?: 'creator' | 'editor' | 'both';
  registration_intent?: 'talent' | 'brand' | 'organization' | 'join';
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  // Tracking
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_url?: string;
  landing_page?: string;

  // Adicionales
  portfolio_url?: string;
  social_profiles?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
  };
  interests?: string[];
  message?: string;
  custom_fields?: Record<string, unknown>;
}

// Calcular lead score inicial basado en completitud de datos
function calculateInitialScore(data: LeadData): number {
  let score = 20; // Base score por registrarse

  // Datos de contacto
  if (data.phone) score += 10;
  if (data.city) score += 5;
  if (data.country) score += 5;

  // Perfil profesional
  if (data.talent_category) score += 10;
  if (data.specific_role) score += 10;
  if (data.experience_level) score += 5;

  // Presencia online
  if (data.portfolio_url) score += 15;
  if (data.social_profiles) {
    const profiles = Object.values(data.social_profiles).filter(Boolean);
    score += Math.min(profiles.length * 5, 15);
  }

  // Intención clara
  if (data.registration_intent) score += 5;

  return Math.min(score, 100);
}

// Determinar source si no viene
function determineSource(data: LeadData): string {
  if (data.lead_source) return data.lead_source;
  if (data.utm_source) return data.utm_source;
  if (data.referrer_url) {
    if (data.referrer_url.includes('instagram')) return 'instagram';
    if (data.referrer_url.includes('tiktok')) return 'tiktok';
    if (data.referrer_url.includes('facebook')) return 'facebook';
    if (data.referrer_url.includes('google')) return 'google';
    if (data.referrer_url.includes('linkedin')) return 'linkedin';
    if (data.referrer_url.includes('youtube')) return 'youtube';
  }
  return 'direct';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: LeadData = await req.json();

    // Validación básica
    if (!data.email || !data.full_name) {
      return new Response(
        JSON.stringify({ error: 'Email y nombre son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si ya existe el email
    const { data: existingLead } = await supabase
      .from('platform_leads')
      .select('id, stage')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existingLead) {
      // Si ya existe pero está en stage 'lost', permitir re-registro
      if (existingLead.stage === 'lost') {
        const { data: updatedLead, error: updateError } = await supabase
          .from('platform_leads')
          .update({
            stage: 'new',
            lead_source: determineSource(data),
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            lead_id: updatedLead.id,
            message: 'Lead reactivado',
            is_reactivation: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si existe y no está lost, retornar como existente
      return new Response(
        JSON.stringify({
          success: true,
          lead_id: existingLead.id,
          message: 'Ya estás registrado',
          already_exists: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular score
    const leadScore = calculateInitialScore(data);

    // Preparar datos para inserción
    const leadRecord = {
      full_name: data.full_name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      city: data.city?.trim() || null,
      country: data.country?.trim() || 'CO',

      lead_type: data.lead_type || 'talent',
      talent_category: data.talent_category || null,
      specific_role: data.specific_role || null,
      talent_subtype: data.talent_subtype || null,
      registration_intent: data.registration_intent || data.lead_type,
      experience_level: data.experience_level || null,

      lead_source: determineSource(data),
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,

      lead_score: leadScore,
      stage: 'new',

      portfolio_url: data.portfolio_url || null,
      social_profiles: data.social_profiles || null,

      custom_fields: {
        ...(data.custom_fields || {}),
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        referrer_url: data.referrer_url,
        landing_page: data.landing_page,
        interests: data.interests,
        initial_message: data.message,
        captured_at: new Date().toISOString()
      }
    };

    // Insertar lead
    const { data: newLead, error: insertError } = await supabase
      .from('platform_leads')
      .insert(leadRecord)
      .select()
      .single();

    if (insertError) throw insertError;

    // Registrar interacción inicial
    await supabase
      .from('platform_lead_interactions')
      .insert({
        lead_id: newLead.id,
        interaction_type: 'form_submitted',
        subject: 'Registro desde landing',
        content: `Nuevo lead capturado desde ${data.landing_page || 'landing'}`,
        metadata: {
          source: determineSource(data),
          utm_campaign: data.utm_campaign,
          initial_score: leadScore
        }
      });

    // TODO: Trigger notificación (Discord/Slack webhook)
    // await notifyNewLead(newLead);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: newLead.id,
        score: leadScore,
        message: '¡Registro exitoso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error capturing lead:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
