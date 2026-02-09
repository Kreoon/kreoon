import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrgInquiry, InquiryStatus } from '@/components/marketplace/types/marketplace';

export function useOrgInquiries(organizationId: string | null, statusFilter?: InquiryStatus) {
  const { data: inquiries = [], isLoading: loading } = useQuery({
    queryKey: ['org-inquiries', organizationId, statusFilter],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = (supabase as any)
        .from('org_inquiries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OrgInquiry[];
    },
    enabled: !!organizationId,
  });

  return { inquiries, loading };
}
