import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { OrgProfileHero } from './OrgProfileHero';
import { OrgProfileSidebar } from './OrgProfileSidebar';
import { OrgAboutSection } from './OrgAboutSection';
import { OrgServicesSection } from './OrgServicesSection';
import { OrgTeamSection } from './OrgTeamSection';
import { OrgReviewsSection } from './OrgReviewsSection';
import { OrgPortfolioSection } from './OrgPortfolioSection';
import { OrgCampaignsSection } from './OrgCampaignsSection';
import { OrgContactDialog } from './OrgContactDialog';
import { OrgProfileSkeleton } from './OrgProfileSkeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { OrgFullProfile, OrgService, OrgReview, OrgMemberContent, Campaign } from '../types/marketplace';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

type OrgTab = 'about' | 'portfolio' | 'services' | 'team' | 'reviews' | 'campaigns';

const TABS: { id: OrgTab; label: string }[] = [
  { id: 'about', label: 'Nosotros' },
  { id: 'campaigns', label: 'Campañas' },
  { id: 'portfolio', label: 'Portafolio' },
  { id: 'services', label: 'Servicios' },
  { id: 'team', label: 'Equipo' },
  { id: 'reviews', label: 'Reseñas' },
];

export default function OrgProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrgTab>('about');
  const [org, setOrg] = useState<OrgFullProfile | null>(null);
  const [services, setServices] = useState<OrgService[]>([]);
  const [reviews, setReviews] = useState<OrgReview[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [memberContent, setMemberContent] = useState<OrgMemberContent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);

      // Fetch org profile
      const { data: orgData, error } = await (supabase as any)
        .rpc('get_marketplace_org_profile', { org_slug: slug });

      if (error || !orgData || orgData.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const orgInfo = orgData[0] as OrgFullProfile;
      setOrg(orgInfo);

      // Fetch services, reviews, team, campaigns in parallel
      const [servicesRes, reviewsRes, teamRes, campaignsRes] = await Promise.all([
        (supabase as any)
          .from('org_services')
          .select('*')
          .eq('organization_id', orgInfo.id)
          .order('sort_order', { ascending: true }),
        (supabase as any)
          .from('org_reviews')
          .select('*')
          .eq('organization_id', orgInfo.id)
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .rpc('get_portfolio_creators', { org_id_param: orgInfo.id }),
        (supabase as any)
          .from('marketplace_campaigns')
          .select('*')
          .eq('organization_id', orgInfo.id)
          .in('status', ['active', 'in_progress', 'completed'])
          .order('created_at', { ascending: false }),
      ]);

      if (servicesRes.data) setServices(servicesRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (teamRes.data) setTeamMembers(teamRes.data);
      if (campaignsRes.data) {
        const orgDisplayName = orgInfo.org_display_name || orgInfo.name;
        setCampaigns(campaignsRes.data.map((row: any) => ({
          id: row.id,
          brand_user_id: row.brand_id || '',
          brand_name: row.brand_name_override || orgDisplayName,
          brand_logo: row.brand_logo_override || orgInfo.logo_url || undefined,
          title: row.title || '',
          description: row.description || '',
          category: row.category || '',
          campaign_type: row.campaign_type || 'paid',
          budget_mode: row.budget_mode || 'per_video',
          budget_per_video: row.budget_per_video != null ? Number(row.budget_per_video) : undefined,
          total_budget: row.total_budget != null ? Number(row.total_budget) : undefined,
          currency: row.currency || 'USD',
          platform_fee_pct: Number(row.platform_fee_pct) || 10,
          content_requirements: row.content_requirements || [],
          creator_requirements: row.creator_requirements || {},
          max_creators: Number(row.max_creators) || 5,
          applications_count: Number(row.applications_count) || 0,
          approved_count: Number(row.approved_count) || 0,
          status: row.status,
          deadline: row.deadline || '',
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
          tags: row.tags || [],
          pricing_mode: row.pricing_mode || 'fixed',
          min_bid: row.min_bid != null ? Number(row.min_bid) : undefined,
          max_bid: row.max_bid != null ? Number(row.max_bid) : undefined,
          visibility: row.visibility || 'public',
          organization_id: row.organization_id,
          organization_name: orgDisplayName,
          desired_roles: row.desired_roles || [],
          is_urgent: row.is_urgent || false,
          cover_image_url: row.cover_image_url || undefined,
        } as Campaign)));
      }

      // Fetch published content from org members
      const members = teamRes.data || [];
      if (members.length > 0) {
        const memberUserIds = members.map((m: any) => m.user_id);
        const profilesMap = new Map<string, { name: string; avatar: string | null; slug: string | null }>();
        for (const m of members) {
          profilesMap.set(m.user_id, {
            name: m.full_name || 'Creador',
            avatar: m.avatar_url || null,
            slug: null,
          });
        }

        // Get creator_profiles slugs for navigation
        const { data: cpRows } = await (supabase as any)
          .from('creator_profiles')
          .select('user_id, slug')
          .in('user_id', memberUserIds);
        for (const cp of cpRows || []) {
          const existing = profilesMap.get(cp.user_id);
          if (existing) existing.slug = cp.slug;
        }

        // Fetch published content + portfolio_items in parallel
        const [contentRes, portfolioRes] = await Promise.all([
          supabase
            .from('content')
            .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
            .in('creator_id', memberUserIds)
            .eq('is_published', true),
          (supabase as any)
            .from('portfolio_items')
            .select('id, creator_id, media_url, thumbnail_url, media_type, title')
            .in('creator_id', (cpRows || []).map((cp: any) => cp.id || cp.user_id))
            .eq('is_public', true)
            .order('is_featured', { ascending: false })
            .order('display_order', { ascending: true }),
        ]);

        const items: OrgMemberContent[] = [];
        const seenUrls = new Set<string>();

        // Add content videos
        for (const c of contentRes.data || []) {
          const urls = (c as any).video_urls as string[] | null;
          const url = urls?.[0] || (c as any).bunny_embed_url || (c as any).video_url || '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);
          const member = profilesMap.get((c as any).creator_id);
          items.push({
            id: c.id,
            url,
            thumbnail_url: (c as any).thumbnail_url || getBunnyThumbnailUrl(url) || null,
            type: 'video',
            title: (c as any).title || null,
            creator_name: member?.name || 'Creador',
            creator_avatar: member?.avatar || null,
            creator_slug: member?.slug || null,
          });
        }

        // Add portfolio items (map creator_id from creator_profiles back to user_id)
        const cpIdToUserId = new Map<string, string>();
        for (const cp of cpRows || []) {
          cpIdToUserId.set(cp.id, cp.user_id);
        }
        for (const pi of portfolioRes.data || []) {
          const url = pi.media_url || '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);
          const userId = cpIdToUserId.get(pi.creator_id) || pi.creator_id;
          const member = profilesMap.get(userId);
          items.push({
            id: pi.id,
            url,
            thumbnail_url: pi.thumbnail_url || (pi.media_type === 'video' ? getBunnyThumbnailUrl(url) : null) || null,
            type: pi.media_type === 'video' ? 'video' : 'image',
            title: pi.title || null,
            creator_name: member?.name || 'Creador',
            creator_avatar: member?.avatar || null,
            creator_slug: member?.slug || null,
          });
        }

        setMemberContent(items);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  useEffect(() => {
    if (org) {
      document.title = `${org.org_display_name || org.name} | KREOON Marketplace`;
    }
    return () => { document.title = 'KREOON'; };
  }, [org]);

  if (loading) return <OrgProfileSkeleton />;

  if (notFound || !org) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Organización no encontrada</h2>
          <p className="text-gray-400">El perfil que buscas no existe o no está disponible.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Volver al Marketplace
          </button>
        </div>
      </div>
    );
  }

  const accentColor = org.portfolio_color || org.primary_color || '#8B5CF6';
  const displayName = org.org_display_name || org.name;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-1"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <Link to="/marketplace" className="text-gray-500 hover:text-gray-300 transition-colors">
            Marketplace
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-gray-500">Organizaciones</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-white truncate">{displayName}</span>
        </div>
      </div>

      {/* Hero */}
      <OrgProfileHero org={org} accentColor={accentColor} onContact={() => setShowContact(true)} />

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2',
                activeTab === tab.id
                  ? 'text-white border-purple-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              )}
            >
              {tab.label}
              {tab.id === 'campaigns' && campaigns.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-500">({campaigns.length})</span>
              )}
              {tab.id === 'reviews' && reviews.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-500">({reviews.length})</span>
              )}
              {tab.id === 'team' && teamMembers.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-500">({teamMembers.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'about' && <OrgAboutSection org={org} />}
            {activeTab === 'campaigns' && <OrgCampaignsSection campaigns={campaigns} accentColor={accentColor} />}
            {activeTab === 'portfolio' && <OrgPortfolioSection gallery={org.org_gallery || []} memberContent={memberContent} accentColor={accentColor} />}
            {activeTab === 'services' && <OrgServicesSection services={services} accentColor={accentColor} />}
            {activeTab === 'team' && <OrgTeamSection members={teamMembers} accentColor={accentColor} />}
            {activeTab === 'reviews' && <OrgReviewsSection reviews={reviews} accentColor={accentColor} />}
          </div>

          {/* Sidebar (desktop) */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <OrgProfileSidebar org={org} accentColor={accentColor} onContact={() => setShowContact(true)} />
          </div>
        </div>
      </div>

      {/* Contact dialog */}
      {showContact && org && (
        <OrgContactDialog
          organizationId={org.id}
          organizationName={displayName}
          accentColor={accentColor}
          open={showContact}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  );
}
