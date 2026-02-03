import { supabase } from "@/integrations/supabase/client";

export interface FeedbackSignal {
  executionId: string;
  moduleKey: string;
  userRating?: 1 | 2 | 3 | 4 | 5;
  userFeedback?: string;
  feedbackTags?: string[];
  wasRegenerated: boolean;
  regenerationCount: number;
  wasEdited: boolean;
  editDistance?: number;
  timeToAccept?: number;
  wasUsed: boolean;
}

export class FeedbackCollector {
  /**
   * Registrar feedback explícito (rating, comentario, tags)
   */
  async recordExplicitFeedback(
    executionId: string,
    rating: number,
    feedback?: string,
    tags?: string[]
  ): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from("ai_usage_logs")
      .update({
        user_rating: rating >= 1 && rating <= 5 ? rating : null,
        user_feedback: feedback ?? null,
        feedback_tags: tags ?? null,
      })
      .eq("id", executionId);

    return { error: error ?? null };
  }

  /**
   * Registrar que el usuario regeneró la respuesta
   */
  async recordRegeneration(executionId: string): Promise<{ error: Error | null }> {
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("regeneration_count")
      .eq("id", executionId)
      .single();

    const count = (data?.regeneration_count ?? 0) + 1;

    const { error } = await supabase
      .from("ai_usage_logs")
      .update({
        was_regenerated: true,
        regeneration_count: count,
      })
      .eq("id", executionId);

    return { error: error ?? null };
  }

  /**
   * Registrar que el usuario editó el contenido
   */
  async recordEdit(
    executionId: string,
    originalContent: string,
    editedContent: string
  ): Promise<{ error: Error | null; editDistance?: number }> {
    const editDistance = this.calculateEditDistance(originalContent, editedContent);

    const { error } = await supabase
      .from("ai_usage_logs")
      .update({
        was_edited: true,
        edit_distance: editDistance,
        edited_content: editedContent.length > 10000 ? editedContent.slice(0, 10000) + "…" : editedContent,
      })
      .eq("id", executionId);

    return { error: error ?? null, editDistance };
  }

  /**
   * Registrar si el output se usó realmente (publicó, asignó, etc.)
   */
  async recordUsage(executionId: string, wasUsed: boolean): Promise<{ error: Error | null }> {
    const { error } = await supabase
      .from("ai_usage_logs")
      .update({ was_used: wasUsed })
      .eq("id", executionId);

    return { error: error ?? null };
  }

  /**
   * Distancia de Levenshtein: número mínimo de inserciones, eliminaciones o sustituciones.
   * Devuelve un valor 0-100 (porcentual respecto al largo del texto más largo) para consistencia.
   */
  private calculateEditDistance(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 0;
    if (a.length === 0) return 100;
    if (b.length === 0) return 100;

    const lenA = a.length;
    const lenB = b.length;
    const matrix: number[][] = Array(lenA + 1)
      .fill(null)
      .map(() => Array(lenB + 1).fill(0));

    for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
    for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(lenA, lenB);
    const distance = matrix[lenA][lenB];
    return Math.round((distance / maxLen) * 100);
  }
}

let defaultCollector: FeedbackCollector | null = null;

function getCollector(): FeedbackCollector {
  if (!defaultCollector) defaultCollector = new FeedbackCollector();
  return defaultCollector;
}

/**
 * Hook para usar en componentes: expone métodos del FeedbackCollector
 */
export function useFeedbackCollector() {
  const collector = getCollector();

  return {
    recordRating: collector.recordExplicitFeedback.bind(collector),
    recordRegeneration: collector.recordRegeneration.bind(collector),
    recordEdit: collector.recordEdit.bind(collector),
    recordUsage: collector.recordUsage.bind(collector),
  };
}
