import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MarketingReport, ReportConfig } from '../types/marketing.types';

export function useAdReports() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: reports = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketing-reports', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_reports')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MarketingReport[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const generateReport = useMutation({
    mutationFn: async (params: { name: string; report_type: string; config: ReportConfig }) => {
      const { data, error } = await supabase.functions.invoke('marketing-reports/generate', {
        body: { ...params, organization_id: orgId },
      });
      if (error) throw error;
      return data as MarketingReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-reports', orgId] });
    },
  });

  const downloadReport = useMutation({
    mutationFn: async (params: { reportId: string; format: 'csv' | 'pdf' }) => {
      const { data, error } = await supabase.functions.invoke('marketing-reports/download', {
        body: { report_id: params.reportId, format: params.format },
      });
      if (error) throw error;
      return data as { content: string; filename: string; content_type: string };
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-reports/delete', {
        body: { report_id: reportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-reports', orgId] });
    },
  });

  return {
    reports,
    isLoading,
    error: error as Error | null,
    refetch,
    generateReport,
    downloadReport,
    deleteReport,
  };
}
