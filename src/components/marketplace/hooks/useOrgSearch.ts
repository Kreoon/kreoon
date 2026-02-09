import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceOrg, MarketplaceFilters } from '../types/marketplace';

export function useOrgSearch(filters: MarketplaceFilters) {
  const [allOrgs, setAllOrgs] = useState<MarketplaceOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        // Query organizations table for marketplace-enabled orgs
        const { data: rows } = await supabase
          .from('organizations')
          .select('id, slug, name, logo_url, org_tagline, created_at')
          .order('name');

        const mapped: MarketplaceOrg[] = (rows || []).map((row: any) => ({
          id: row.id,
          slug: row.slug || '',
          org_display_name: row.name || '',
          logo_url: row.logo_url,
          org_tagline: row.org_tagline || null,
          org_type: 'agency' as const,
          org_cover_url: null,
          org_specialties: [],
          org_team_size_range: null,
          org_marketplace_rating_avg: 0,
          org_marketplace_rating_count: 0,
          org_marketplace_projects_count: 0,
          org_min_budget: null,
          org_max_budget: null,
          org_budget_currency: 'COP',
          org_response_time: null,
          portfolio_color: null,
        }));

        setAllOrgs(mapped);
      } catch (err) {
        console.error('[useOrgSearch] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, []);

  const { orgs, totalCount } = useMemo(() => {
    let result = [...allOrgs];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(org =>
        org.org_display_name.toLowerCase().includes(q) ||
        (org.org_tagline?.toLowerCase().includes(q)) ||
        org.org_specialties.some(s => s.toLowerCase().includes(q))
      );
    }

    if (filters.category) {
      result = result.filter(org =>
        org.org_specialties.includes(filters.category!)
      );
    }

    if (filters.rating_min) {
      result = result.filter(org => org.org_marketplace_rating_avg >= filters.rating_min!);
    }

    switch (filters.sort_by) {
      case 'rating':
        result.sort((a, b) => b.org_marketplace_rating_avg - a.org_marketplace_rating_avg);
        break;
      case 'price_low':
        result.sort((a, b) => (a.org_min_budget || 0) - (b.org_min_budget || 0));
        break;
      case 'price_high':
        result.sort((a, b) => (b.org_max_budget || 0) - (a.org_max_budget || 0));
        break;
      case 'most_projects':
        result.sort((a, b) => b.org_marketplace_projects_count - a.org_marketplace_projects_count);
        break;
      default:
        result.sort((a, b) => b.org_marketplace_rating_avg - a.org_marketplace_rating_avg);
    }

    return { orgs: result, totalCount: result.length };
  }, [allOrgs, filters]);

  return { orgs, totalCount, loading };
}
