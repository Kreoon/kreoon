import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorPerformance {
  creator_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  slug: string | null;
  videos_delivered: number;
  total_investment: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  engagement_rate: number;
  cost_per_video: number;
  cost_per_view: number;
  estimated_value: number;
  roi_multiplier: number;
}

export interface ROITrend {
  cpv_trend: 'up' | 'down' | 'neutral';
  cpv_change: string;
  cpm_trend: 'up' | 'down' | 'neutral';
  cpm_change: string;
  engagement_trend: 'up' | 'down' | 'neutral';
  engagement_change: string;
}

export interface ROIData {
  campaign_id: string;
  // Investment
  investment: number;
  currency: string;
  total_videos: number;
  total_creators: number;
  // Metrics
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  avg_engagement_rate: number;
  // Cost metrics
  cost_per_video: number;
  cost_per_view: number;
  cost_per_engagement: number;
  cost_per_thousand_views: number;
  // Value estimation
  estimated_value: number;
  roi_multiplier: number;
  roi_percentage: number;
  // By creator
  creator_performances: CreatorPerformance[];
  // Trends (vs previous period)
  trend_vs_previous?: ROITrend;
  // Meta
  calculated_at: string;
  period_start?: string;
  period_end?: string;
}

// Value estimation factors (USD)
const VALUE_FACTORS = {
  view: 0.005, // $0.005 per view
  like: 0.02, // $0.02 per like
  comment: 0.10, // $0.10 per comment
  share: 0.15, // $0.15 per share
  save: 0.08, // $0.08 per save
};

function calculateEstimatedValue(metrics: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
}): number {
  return (
    (metrics.views * VALUE_FACTORS.view) +
    (metrics.likes * VALUE_FACTORS.like) +
    (metrics.comments * VALUE_FACTORS.comment) +
    (metrics.shares * VALUE_FACTORS.share) +
    ((metrics.saves || 0) * VALUE_FACTORS.save)
  );
}

export function useCampaignROI(campaignId: string, timeRange: '7d' | '30d' | '90d' | 'all' = 'all') {
  return useQuery<ROIData | null>({
    queryKey: ['campaign-roi', campaignId, timeRange],
    queryFn: async () => {
      // Get campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('marketplace_campaigns')
        .select(`
          id,
          title,
          budget_per_video,
          total_budget,
          budget_mode,
          currency,
          created_at
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Calculate time range filter
      let dateFilter = undefined;
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      }

      // Get all applications with their deliverables and metrics
      let applicationsQuery = supabase
        .from('campaign_applications')
        .select(`
          id,
          creator_id,
          agreed_price,
          status,
          creator_profiles!inner (
            id,
            user_id,
            display_name,
            avatar_url,
            slug
          )
        `)
        .eq('campaign_id', campaignId)
        .in('status', ['delivered', 'completed']);

      const { data: applications, error: appError } = await applicationsQuery;

      if (appError) {
        console.error('Error fetching applications:', appError);
      }

      // Get all deliverables with metrics
      let deliverablesQuery = supabase
        .from('campaign_deliverables')
        .select(`
          id,
          creator_id,
          application_id,
          status,
          submitted_at
        `)
        .eq('campaign_id', campaignId)
        .eq('status', 'approved');

      if (dateFilter) {
        deliverablesQuery = deliverablesQuery.gte('submitted_at', dateFilter);
      }

      const { data: deliverables, error: delError } = await deliverablesQuery;

      if (delError) {
        console.error('Error fetching deliverables:', delError);
      }

      // Get publication metrics (if using activation campaign)
      let publicationsQuery = supabase
        .from('activation_publications')
        .select(`
          id,
          creator_id,
          application_id,
          views_count,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          engagement_rate,
          base_payment,
          total_payment,
          published_at
        `)
        .eq('campaign_id', campaignId)
        .in('verification_status', ['verified', 'pending']);

      if (dateFilter) {
        publicationsQuery = publicationsQuery.gte('published_at', dateFilter);
      }

      const { data: publications, error: pubError } = await publicationsQuery;

      if (pubError) {
        console.error('Error fetching publications:', pubError);
      }

      // Calculate aggregates
      const totalVideos = (deliverables?.length || 0) + (publications?.length || 0);

      if (totalVideos === 0) {
        return null;
      }

      // Calculate total metrics from publications
      const totalViews = publications?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalLikes = publications?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const totalComments = publications?.reduce((sum, p) => sum + (p.comments_count || 0), 0) || 0;
      const totalShares = publications?.reduce((sum, p) => sum + (p.shares_count || 0), 0) || 0;
      const totalSaves = publications?.reduce((sum, p) => sum + (p.saves_count || 0), 0) || 0;

      // Calculate total investment
      const investmentFromApplications = applications?.reduce((sum, app) => sum + (app.agreed_price || 0), 0) || 0;
      const investmentFromPublications = publications?.reduce((sum, p) => sum + (p.total_payment || p.base_payment || 0), 0) || 0;

      const totalInvestment = investmentFromApplications > 0
        ? investmentFromApplications
        : investmentFromPublications > 0
          ? investmentFromPublications
          : (campaign.budget_per_video || 0) * totalVideos;

      // Calculate engagement rate
      const avgEngagementRate = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : publications?.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / (publications?.length || 1) || 0;

      // Calculate cost metrics
      const costPerVideo = totalInvestment / totalVideos;
      const costPerView = totalViews > 0 ? totalInvestment / totalViews : 0;
      const totalEngagements = totalLikes + totalComments + totalShares;
      const costPerEngagement = totalEngagements > 0 ? totalInvestment / totalEngagements : 0;
      const costPerThousandViews = totalViews > 0 ? (totalInvestment / totalViews) * 1000 : 0;

      // Calculate estimated value
      const estimatedValue = calculateEstimatedValue({
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
      });

      // Calculate ROI
      const roiMultiplier = totalInvestment > 0 ? estimatedValue / totalInvestment : 0;
      const roiPercentage = totalInvestment > 0 ? ((estimatedValue - totalInvestment) / totalInvestment) * 100 : 0;

      // Calculate per-creator performance
      const creatorMap = new Map<string, CreatorPerformance>();

      applications?.forEach(app => {
        const profile = app.creator_profiles as any;
        if (!profile) return;

        const creatorId = app.creator_id;
        const existing = creatorMap.get(creatorId);

        if (!existing) {
          creatorMap.set(creatorId, {
            creator_id: creatorId,
            user_id: profile.user_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            slug: profile.slug,
            videos_delivered: 0,
            total_investment: app.agreed_price || 0,
            total_views: 0,
            total_likes: 0,
            total_comments: 0,
            total_shares: 0,
            engagement_rate: 0,
            cost_per_video: 0,
            cost_per_view: 0,
            estimated_value: 0,
            roi_multiplier: 0,
          });
        } else {
          existing.total_investment += app.agreed_price || 0;
        }
      });

      // Add publication metrics to creators
      publications?.forEach(pub => {
        const creator = creatorMap.get(pub.creator_id);
        if (creator) {
          creator.videos_delivered += 1;
          creator.total_views += pub.views_count || 0;
          creator.total_likes += pub.likes_count || 0;
          creator.total_comments += pub.comments_count || 0;
          creator.total_shares += pub.shares_count || 0;
        }
      });

      // Calculate per-creator ROI
      creatorMap.forEach(creator => {
        if (creator.videos_delivered > 0) {
          creator.cost_per_video = creator.total_investment / creator.videos_delivered;
          creator.cost_per_view = creator.total_views > 0 ? creator.total_investment / creator.total_views : 0;
          creator.engagement_rate = creator.total_views > 0
            ? ((creator.total_likes + creator.total_comments + creator.total_shares) / creator.total_views) * 100
            : 0;
          creator.estimated_value = calculateEstimatedValue({
            views: creator.total_views,
            likes: creator.total_likes,
            comments: creator.total_comments,
            shares: creator.total_shares,
          });
          creator.roi_multiplier = creator.total_investment > 0 ? creator.estimated_value / creator.total_investment : 0;
        }
      });

      const creatorPerformances = Array.from(creatorMap.values()).filter(c => c.videos_delivered > 0);

      // Get unique creators count
      const uniqueCreators = new Set(publications?.map(p => p.creator_id) || []);

      return {
        campaign_id: campaignId,
        investment: totalInvestment,
        currency: campaign.currency || 'USD',
        total_videos: totalVideos,
        total_creators: uniqueCreators.size || creatorPerformances.length,
        total_views: totalViews,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        total_saves: totalSaves,
        avg_engagement_rate: avgEngagementRate,
        cost_per_video: costPerVideo,
        cost_per_view: costPerView,
        cost_per_engagement: costPerEngagement,
        cost_per_thousand_views: costPerThousandViews,
        estimated_value: estimatedValue,
        roi_multiplier: roiMultiplier,
        roi_percentage: roiPercentage,
        creator_performances: creatorPerformances,
        calculated_at: new Date().toISOString(),
        period_start: dateFilter,
        period_end: new Date().toISOString(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!campaignId,
  });
}

// Hook for brand-level ROI across all campaigns
export function useBrandROI(brandId: string, timeRange: '30d' | '90d' | '1y' | 'all' = 'all') {
  return useQuery({
    queryKey: ['brand-roi', brandId, timeRange],
    queryFn: async () => {
      // Get all campaigns for this brand
      const { data: campaigns, error } = await supabase
        .from('marketplace_campaigns')
        .select('id')
        .eq('brand_user_id', brandId)
        .in('status', ['in_progress', 'completed']);

      if (error || !campaigns || campaigns.length === 0) {
        return null;
      }

      // Aggregate ROI across campaigns
      // This would ideally be a server-side aggregation
      const campaignIds = campaigns.map(c => c.id);

      const { data: publications } = await supabase
        .from('activation_publications')
        .select(`
          views_count,
          likes_count,
          comments_count,
          shares_count,
          saves_count,
          total_payment,
          base_payment
        `)
        .in('campaign_id', campaignIds)
        .in('verification_status', ['verified', 'pending']);

      if (!publications || publications.length === 0) {
        return null;
      }

      const totals = publications.reduce((acc, p) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        comments: acc.comments + (p.comments_count || 0),
        shares: acc.shares + (p.shares_count || 0),
        saves: acc.saves + (p.saves_count || 0),
        investment: acc.investment + (p.total_payment || p.base_payment || 0),
      }), { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, investment: 0 });

      const estimatedValue = calculateEstimatedValue(totals);

      return {
        total_campaigns: campaigns.length,
        total_publications: publications.length,
        total_investment: totals.investment,
        total_views: totals.views,
        total_engagements: totals.likes + totals.comments + totals.shares,
        estimated_value: estimatedValue,
        roi_multiplier: totals.investment > 0 ? estimatedValue / totals.investment : 0,
        avg_cost_per_video: totals.investment / publications.length,
        avg_engagement_rate: totals.views > 0
          ? ((totals.likes + totals.comments + totals.shares) / totals.views) * 100
          : 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!brandId,
  });
}
