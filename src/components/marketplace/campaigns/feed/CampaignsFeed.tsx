import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Loader2 } from 'lucide-react';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { CampaignCard } from './CampaignCard';
import { CampaignsFeedHeader } from './CampaignsFeedHeader';
import { CampaignsFeedFilters } from './CampaignsFeedFilters';
import { DEFAULT_CAMPAIGN_FILTERS } from '../../types/marketplace';
import type { Campaign, CampaignFilters, CampaignType } from '../../types/marketplace';

export function CampaignsFeed() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CampaignFilters>({ ...DEFAULT_CAMPAIGN_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { campaigns: allCampaigns, loading } = useMarketplaceCampaigns();

  const filteredCampaigns = useMemo(() => {
    let result = allCampaigns.filter(c => c.status !== 'draft' && c.status !== 'cancelled');

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.brand_name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q)),
      );
    }

    // Type filter
    if (filters.campaign_type) {
      result = result.filter(c => c.campaign_type === filters.campaign_type);
    }

    // Pricing mode filter
    if (filters.pricing_mode) {
      result = result.filter(c => (c.pricing_mode ?? 'fixed') === filters.pricing_mode);
    }

    // Category
    if (filters.category) {
      result = result.filter(c => c.category === filters.category);
    }

    // Budget range
    if (filters.budget_min != null) {
      result = result.filter(c => {
        const budget = c.budget_per_video ?? c.total_budget ?? 0;
        return budget >= filters.budget_min!;
      });
    }
    if (filters.budget_max != null) {
      result = result.filter(c => {
        const budget = c.budget_per_video ?? c.total_budget ?? 0;
        return budget <= filters.budget_max!;
      });
    }

    // Sort
    switch (filters.sort_by) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'budget_high':
        result.sort((a, b) => (b.budget_per_video ?? b.total_budget ?? 0) - (a.budget_per_video ?? a.total_budget ?? 0));
        break;
      case 'budget_low':
        result.sort((a, b) => (a.budget_per_video ?? a.total_budget ?? 0) - (b.budget_per_video ?? b.total_budget ?? 0));
        break;
      case 'deadline':
        result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case 'applications':
        result.sort((a, b) => b.applications_count - a.applications_count);
        break;
    }

    return result;
  }, [allCampaigns, filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters (desktop) */}
        <div className="lg:w-64 flex-shrink-0">
          <CampaignsFeedFilters
            filters={filters}
            onFiltersChange={setFilters}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          <CampaignsFeedHeader
            search={filters.search}
            onSearchChange={search => setFilters(prev => ({ ...prev, search }))}
            activeTypeFilter={filters.campaign_type}
            onTypeFilterChange={(campaign_type: CampaignType | null) => setFilters(prev => ({ ...prev, campaign_type }))}
            sortBy={filters.sort_by}
            onSortChange={sort_by => setFilters(prev => ({ ...prev, sort_by: sort_by as CampaignFilters['sort_by'] }))}
          />

          {/* Campaign grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCampaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onClick={() => navigate(`/marketplace/campaigns/${campaign.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <Megaphone className="h-12 w-12 text-gray-600 mx-auto" />
              <div>
                <h3 className="text-white font-semibold">No se encontraron campanas</h3>
                <p className="text-gray-500 text-sm mt-1">Intenta ajustar los filtros de busqueda</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
