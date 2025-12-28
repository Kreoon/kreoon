import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity' | 'false_info' | 'other';
export type ContentType = 'post' | 'story' | 'profile' | 'comment' | 'content';

interface SubmitReportParams {
  contentId?: string;
  reportedUserId?: string;
  contentType: ContentType;
  reason: ReportReason;
  description?: string;
}

export function useContentReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const submitReport = async ({
    contentId,
    reportedUserId,
    contentType,
    reason,
    description,
  }: SubmitReportParams) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para reportar');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_id: contentId,
          reported_user_id: reportedUserId,
          content_type: contentType,
          reason,
          description,
        });

      if (error) throw error;

      toast.success('Reporte enviado', {
        description: 'Revisaremos tu reporte pronto. Gracias por ayudarnos a mantener la comunidad segura.',
      });
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error al enviar el reporte');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitReport,
    loading,
  };
}
