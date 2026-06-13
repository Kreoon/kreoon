import { supabase } from '@/integrations/supabase/client';

/**
 * Registra los consentimientos legales del usuario.
 * Se llama después de un signup convencional y de cada upgrade (student → creator/brand).
 *
 * No bloquea el flujo: si falla, se loguea y se continúa — la cuenta ya existe.
 */
export async function recordLegalConsents(userId: string): Promise<void> {
  try {
    await supabase.rpc('record_age_verification', {
      p_user_id: userId,
      p_declared_age_18_plus: true,
      p_ip_address: null,
      p_user_agent: navigator.userAgent,
    });

    const { data: documents } = await supabase
      .from('legal_documents')
      .select('id')
      .eq('is_current', true)
      .eq('is_required', true);

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await supabase.rpc('record_consent', {
          p_user_id: userId,
          p_document_id: doc.id,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
        });
      }
    }
  } catch (error) {
    console.warn('Error recording legal consents:', error);
  }
}
