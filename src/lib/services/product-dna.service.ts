// ============================================
// Product DNA Service Functions
// Adapted to actual product_dna table schema
// ============================================

import { supabase } from '@/integrations/supabase/client';
import type { ProductDNARecord } from '@/components/product-dna/ProductDNADisplay';

const sb = supabase as any;

// ============================================
// TYPES (aligned with actual DB columns)
// ============================================

export interface CreateProductDNAInput {
  client_id: string;
  service_group: string;
  service_types: string[];
  wizard_responses?: Record<string, any>;
  audio_url?: string;
  audio_duration_seconds?: number;
  reference_links?: Array<{ url: string; type?: string; notes?: string }>;
  competitor_links?: Array<{ url: string; type?: string; notes?: string }>;
  inspiration_links?: Array<{ url: string; type?: string; notes?: string }>;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// CREATE
// ============================================

export async function createProductDNA(
  input: CreateProductDNAInput
): Promise<ServiceResult<ProductDNARecord>> {
  try {
    const { data, error } = await sb
      .from('product_dna')
      .insert({
        client_id: input.client_id,
        service_group: input.service_group,
        service_types: input.service_types,
        wizard_responses: input.wizard_responses || {},
        audio_url: input.audio_url || null,
        audio_duration_seconds: input.audio_duration_seconds || null,
        reference_links: input.reference_links || [],
        competitor_links: input.competitor_links || [],
        inspiration_links: input.inspiration_links || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating Product DNA:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in createProductDNA:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// READ
// ============================================

export async function getProductDNA(id: string): Promise<ProductDNARecord | null> {
  try {
    const { data, error } = await sb
      .from('product_dna')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching Product DNA:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in getProductDNA:', error);
    return null;
  }
}

// ============================================
// LIST
// ============================================

export async function listProductDNAs(options?: {
  page?: number;
  pageSize?: number;
  serviceGroup?: string;
  status?: string;
  clientId?: string;
}): Promise<{ data: ProductDNARecord[]; count: number; page: number; pageSize: number }> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  try {
    let query = sb
      .from('product_dna')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options?.serviceGroup) query = query.eq('service_group', options.serviceGroup);
    if (options?.status) query = query.eq('status', options.status);
    if (options?.clientId) query = query.eq('client_id', options.clientId);

    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error listing Product DNAs:', error);
      return { data: [], count: 0, page, pageSize };
    }

    return { data: data || [], count: count || 0, page, pageSize };
  } catch (error) {
    console.error('Error in listProductDNAs:', error);
    return { data: [], count: 0, page, pageSize };
  }
}

// ============================================
// UPDATE
// ============================================

export async function updateProductDNA(
  id: string,
  updates: Record<string, any>
): Promise<ServiceResult<ProductDNARecord>> {
  try {
    const { data, error } = await sb
      .from('product_dna')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating Product DNA:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateProductDNA:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// DELETE (hard delete - no deleted_at column)
// ============================================

export async function deleteProductDNA(
  id: string
): Promise<ServiceResult> {
  try {
    const { error } = await sb
      .from('product_dna')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting Product DNA:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteProductDNA:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ANALYZE (invoke edge function)
// ============================================

export async function analyzeProductDNA(
  productDnaId: string
): Promise<ServiceResult> {
  try {
    // Set status to analyzing
    await sb
      .from('product_dna')
      .update({ status: 'analyzing' })
      .eq('id', productDnaId);

    const { data, error } = await supabase.functions.invoke('generate-product-dna', {
      body: { product_dna_id: productDnaId },
    });

    if (error) {
      console.error('Error analyzing Product DNA:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in analyzeProductDNA:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// REGENERATE (reset analysis + re-analyze)
// ============================================

export async function regenerateProductDNAAnalysis(
  productDnaId: string
): Promise<ServiceResult> {
  // Clear existing analysis, bump version, reset to draft
  const { error: updateError } = await sb
    .from('product_dna')
    .update({
      market_research: null,
      competitor_analysis: null,
      strategy_recommendations: null,
      content_brief: null,
      ai_confidence_score: null,
      estimated_complexity: null,
      status: 'draft',
    })
    .eq('id', productDnaId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return analyzeProductDNA(productDnaId);
}

// ============================================
// DUPLICATE
// ============================================

export async function duplicateProductDNA(
  id: string
): Promise<ServiceResult<ProductDNARecord>> {
  try {
    const original = await getProductDNA(id);
    if (!original) return { success: false, error: 'Product DNA no encontrado' };

    const { data, error } = await sb
      .from('product_dna')
      .insert({
        client_id: original.client_id,
        service_group: original.service_group,
        service_types: original.service_types,
        wizard_responses: original.wizard_responses || {},
        audio_url: original.audio_url,
        audio_duration_seconds: original.audio_duration_seconds,
        transcription: original.transcription,
        reference_links: original.reference_links || [],
        competitor_links: original.competitor_links || [],
        inspiration_links: original.inspiration_links || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating Product DNA:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in duplicateProductDNA:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// UPLOAD AUDIO
// ============================================

export async function uploadProductDNAAudio(
  productDnaId: string,
  audioBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileName = `product-dna/${productDnaId}/audio-${Date.now()}.webm`;

    const { error } = await supabase.storage
      .from('audio-recordings')
      .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: true });

    if (error) {
      console.error('Error uploading audio:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(fileName);

    await updateProductDNA(productDnaId, { audio_url: urlData.publicUrl });

    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    console.error('Error in uploadProductDNAAudio:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// POLLING
// ============================================

/**
 * Polls product_dna status until it's no longer 'analyzing'.
 * Returns a cancel function.
 */
export function pollProductDNAStatus(
  productDnaId: string,
  onUpdate: (status: string, data?: ProductDNARecord) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 60
): () => void {
  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    const data = await getProductDNA(productDnaId);

    if (data) {
      onUpdate(data.status, data);
      if (data.status !== 'analyzing' && data.status !== 'draft' || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}

// ============================================
// GENERATE FULL RESEARCH (ADN Recargado)
// ============================================

/**
 * Invokes the generate-full-research edge function (fire-and-forget).
 * The function runs all 12 steps sequentially (5-10 min total),
 * so we don't await the response — polling tracks progress instead.
 */
export async function generateFullResearch(
  productId: string
): Promise<ServiceResult> {
  try {
    // Fire-and-forget: invoke but don't await the full response.
    // The edge function runs all 12 steps in one invocation (~5-10 min).
    // The browser will timeout, but the server keeps running.
    // Polling via pollResearchProgress() tracks real-time progress.
    supabase.functions.invoke('generate-full-research', {
      body: { product_id: productId },
    }).then(({ error }) => {
      if (error) {
        console.warn('[generateFullResearch] Edge function response (may be timeout):', error.message);
      } else {
        console.log('[generateFullResearch] Edge function completed successfully');
      }
    }).catch((err) => {
      // Expected: browser timeout after ~60s while function continues server-side
      console.warn('[generateFullResearch] Expected timeout:', err.message);
    });

    // Give a brief moment for the request to be dispatched
    await new Promise(r => setTimeout(r, 500));

    return { success: true };
  } catch (error: any) {
    console.error('Error in generateFullResearch:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Polls research_progress from the products table.
 * Returns a cancel function.
 */
export function pollResearchProgress(
  productId: string,
  onUpdate: (progress: { step: number; total: number; label: string } | null, done: boolean) => void,
  intervalMs: number = 3000,
  maxAttempts: number = 200 // ~10 min at 3s
): () => void {
  let attempts = 0;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('research_progress, research_generated_at')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error polling research progress:', error);
        return;
      }

      const progress = data?.research_progress as any;
      const isDone = !!data?.research_generated_at && (!progress || progress.step >= progress.total);
      const isError = !!progress?.error;

      onUpdate(progress, isDone || isError);

      if (isDone || isError || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}

// ============================================
// CONVENIENCE HELPERS
// ============================================

export async function getProductDNAsByClient(clientId: string) {
  return listProductDNAs({ clientId });
}

export async function getRecentProductDNAs(limit: number = 5) {
  return listProductDNAs({ pageSize: limit });
}
