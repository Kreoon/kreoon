import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  MarketplaceProject,
  MarketplaceCreator,
  ProjectStatus,
  HiringBrief,
  KanbanColumnConfig,
} from '@/components/marketplace/types/marketplace';

// ── Kanban column configs (previously in mockProjectData) ──────────────

export const BRAND_COLUMNS: KanbanColumnConfig[] = [
  { id: 'pending', label: 'Pendientes', color: '#a855f7', allowedTransitions: ['briefing', 'cancelled'] },
  { id: 'briefing', label: 'En Brief', color: '#3b82f6', allowedTransitions: ['in_progress', 'cancelled'] },
  { id: 'in_progress', label: 'En Producción', color: '#eab308', allowedTransitions: [] },
  { id: 'revision', label: 'En Revisión', color: '#ec4899', allowedTransitions: ['approved', 'in_progress'] },
  { id: 'overdue', label: 'Vencidos', color: '#ef4444', allowedTransitions: ['in_progress', 'cancelled'] },
  { id: 'approved', label: 'Aprobados', color: '#22c55e', allowedTransitions: ['completed'] },
  { id: 'completed', label: 'Completados', color: '#06b6d4', allowedTransitions: [] },
];

export const CREATOR_COLUMNS: KanbanColumnConfig[] = [
  { id: 'pending', label: 'Nuevas Ofertas', color: '#a855f7', allowedTransitions: ['briefing'] },
  { id: 'briefing', label: 'En Brief', color: '#3b82f6', allowedTransitions: ['in_progress'] },
  { id: 'in_progress', label: 'En Producción', color: '#eab308', allowedTransitions: ['revision'] },
  { id: 'revision', label: 'En Revisión', color: '#ec4899', allowedTransitions: [] },
  { id: 'overdue', label: 'Vencidos', color: '#ef4444', allowedTransitions: ['in_progress'] },
  { id: 'approved', label: 'Aprobados', color: '#22c55e', allowedTransitions: ['completed'] },
  { id: 'completed', label: 'Completados', color: '#06b6d4', allowedTransitions: [] },
];

export const EDITOR_COLUMNS: KanbanColumnConfig[] = [
  { id: 'in_progress', label: 'Por Editar', color: '#eab308', allowedTransitions: ['revision'] },
  { id: 'revision', label: 'Entregados', color: '#ec4899', allowedTransitions: [] },
  { id: 'approved', label: 'Aprobados', color: '#22c55e', allowedTransitions: [] },
];

// ── Helper: map a creator_profiles row → MarketplaceCreator shape ──────

function mapCreatorRow(row: Record<string, unknown>): MarketplaceCreator {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    display_name: (row.display_name as string) || '',
    avatar_url: row.avatar_url as string | null,
    bio: row.bio as string | null,
    location_city: row.location_city as string | null,
    location_country: row.location_country as string | null,
    country_flag: row.country_flag as string | null,
    categories: (row.categories as string[]) || [],
    content_types: (row.content_types as string[]) || [],
    level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: (row.is_verified as boolean) || false,
    rating_avg: Number(row.rating_avg) || 0,
    rating_count: Number(row.rating_count) || 0,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    currency: (row.currency as string) || 'USD',
    portfolio_media: [],
    is_available: row.is_available !== false,
    languages: (row.languages as string[]) || ['es'],
    completed_projects: Number(row.completed_projects) || 0,
    joined_at: (row.created_at as string) || '',
    accepts_product_exchange: (row.accepts_product_exchange as boolean) || false,
    marketplace_roles: (row.marketplace_roles as any[]) || [],
  };
}

// ── Null creator fallback ──────────────────────────────────────────────

const UNKNOWN_CREATOR: MarketplaceCreator = {
  id: '',
  user_id: '',
  display_name: 'Creador',
  avatar_url: null,
  bio: null,
  location_city: null,
  location_country: null,
  country_flag: null,
  categories: [],
  content_types: [],
  level: 'bronze',
  is_verified: false,
  rating_avg: 0,
  rating_count: 0,
  base_price: null,
  currency: 'USD',
  portfolio_media: [],
  is_available: true,
  languages: ['es'],
  completed_projects: 0,
  joined_at: '',
  accepts_product_exchange: false,
};

// ── Main hook ──────────────────────────────────────────────────────────

interface UseMarketplaceProjectsOptions {
  role?: 'brand' | 'creator' | 'editor';
  brandId?: string;
  /** For brand members without brandId yet - returns empty array instead of all projects */
  isBrandMember?: boolean;
}

export interface CreateProjectParams {
  campaign_id: string;
  application_id: string;
  creator_id: string; // auth.users.id (NOT creator_profiles.id)
  brand_id?: string | null;
  organization_id?: string | null;
  title: string;
  total_price?: number;
  currency?: string;
  deadline?: string;
  payment_method?: string;
}

export function useMarketplaceProjects(options: UseMarketplaceProjectsOptions = {}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MarketplaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // NOTE: marketplace_projects.creator_id references auth.users(id), NOT creator_profiles(id)
      let query = (supabase as any)
        .from('marketplace_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (options.role === 'creator') {
        query = query.eq('creator_id', user.id);
      } else if (options.role === 'editor') {
        query = query.eq('editor_id', user.id);
      } else if (options.role === 'brand') {
        if (options.brandId) {
          // Brand member with assigned brand - filter by their brand
          query = query.eq('brand_id', options.brandId);
        } else if (options.isBrandMember) {
          // Brand member without brand yet - return empty (they have no projects yet)
          setProjects([]);
          setLoading(false);
          return;
        }
        // Otherwise (org admin/strategist) - show all projects (no filter)
      }

      const { data: projectRows, error: projErr } = await query;
      if (projErr) throw projErr;
      if (!projectRows?.length) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch brands for these projects
      const brandIds = [...new Set(projectRows.map((p: any) => p.brand_id).filter(Boolean))] as string[];
      const brandsMap = new Map<string, { name: string; logo_url: string | null }>();

      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, name, logo_url')
          .in('id', brandIds);
        for (const b of brands || []) {
          brandsMap.set(b.id, { name: b.name, logo_url: b.logo_url });
        }
      }

      // Fetch creator profiles (creator_id = auth user UUID, so look up by user_id)
      const creatorUserIds = [...new Set(projectRows.map((p: any) => p.creator_id).filter(Boolean))] as string[];
      const creatorsMap = new Map<string, MarketplaceCreator>();

      if (creatorUserIds.length > 0) {
        const { data: creators } = await (supabase as any)
          .from('creator_profiles')
          .select('*')
          .in('user_id', creatorUserIds);
        for (const c of creators || []) {
          creatorsMap.set(c.user_id, mapCreatorRow(c));
        }
      }

      // 5. Fetch org names for org-based projects
      const orgIds = [...new Set(projectRows.map((p: any) => p.organization_id).filter(Boolean))] as string[];
      const orgNamesMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        for (const o of orgs || []) {
          orgNamesMap.set(o.id, o.name);
        }
      }

      // 6. Map to MarketplaceProject shape
      const mapped: MarketplaceProject[] = projectRows.map((row: any) => {
        const brand = row.brand_id ? brandsMap.get(row.brand_id) : null;
        const creator = creatorsMap.get(row.creator_id) || { ...UNKNOWN_CREATOR, user_id: row.creator_id };
        const orgName = row.organization_id ? orgNamesMap.get(row.organization_id) : null;

        return {
          id: row.id,
          creator_id: row.creator_id,
          brand_user_id: row.brand_id || '',
          creator,
          brand_name: brand?.name || orgName || '',
          brand_logo: brand?.logo_url || undefined,
          package_id: row.service_id || '',
          package_name: row.package_name || '',
          payment_method: row.payment_method || 'payment',
          payment_status: row.payment_status || 'pending',
          status: row.status as ProjectStatus,
          brief: (row.brief as HiringBrief) || {
            product_name: '',
            objective: '',
            target_audience: '',
            key_messages: [],
            references: [],
            tone: '',
            dos: [],
            donts: [],
          },
          total_price: Number(row.total_price) || 0,
          currency: row.currency || 'USD',
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
          deadline: row.deadline || undefined,
          deliverables_count: Number(row.deliverables_count) || 0,
          deliverables_approved: Number(row.deliverables_approved) || 0,
          last_message_at: row.last_message_at || undefined,
          unread_messages: options.role === 'brand'
            ? Number(row.unread_brand_messages || 0)
            : Number(row.unread_creator_messages || 0),
          // Editor & payment split
          requires_editor: row.requires_editor ?? false,
          editor_id: row.editor_id || undefined,
          editor_payout: row.editor_payout != null ? Number(row.editor_payout) : undefined,
          creator_payout: row.creator_payout != null ? Number(row.creator_payout) : undefined,
          platform_fee: row.platform_fee != null ? Number(row.platform_fee) : undefined,
          delivery_days: row.delivery_days != null ? Number(row.delivery_days) : undefined,
          // Overdue / novedades
          overdue_at: row.overdue_at || undefined,
          overdue_action: row.overdue_action || undefined,
          overdue_notes: row.overdue_notes || undefined,
          deadline_extension_reason: row.deadline_extension_reason || undefined,
        };
      });

      setProjects(mapped);
    } catch (err) {
      console.error('[useMarketplaceProjects] Error:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.role, options.brandId, options.isBrandMember]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Create project from approved application ────────────────────────

  const createProject = useCallback(
    async (params: CreateProjectParams): Promise<string | null> => {
      try {
        const { data: result, error: err } = await (supabase as any)
          .from('marketplace_projects')
          .insert({
            campaign_id: params.campaign_id,
            application_id: params.application_id,
            creator_id: params.creator_id,
            brand_id: params.brand_id || null,
            organization_id: params.organization_id || null,
            title: params.title,
            total_price: params.total_price ?? 0,
            currency: params.currency || 'COP',
            deadline: params.deadline || null,
            payment_method: params.payment_method || 'payment',
            status: 'pending',
          })
          .select('id')
          .single();

        if (err) throw err;
        return result?.id || null;
      } catch (err) {
        console.error('[useMarketplaceProjects] Create project error:', err);
        return null;
      }
    },
    [],
  );

  // ── Get projects by campaign ────────────────────────────────────────

  const getProjectsByCampaign = useCallback(
    async (campaignId: string): Promise<Array<{ id: string; application_id: string; status: string; creator_id: string }>> => {
      try {
        const { data, error: err } = await (supabase as any)
          .from('marketplace_projects')
          .select('id, application_id, status, creator_id')
          .eq('campaign_id', campaignId);
        if (err) throw err;
        return data || [];
      } catch (err) {
        console.error('[useMarketplaceProjects] Get by campaign error:', err);
        return [];
      }
    },
    [],
  );

  const updateProjectStatus = useCallback(
    async (projectId: string, newStatus: ProjectStatus): Promise<boolean> => {
      try {
        const { error: err } = await (supabase as any)
          .from('marketplace_projects')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', projectId);

        if (err) throw err;

        setProjects(prev =>
          prev.map(p => (p.id === projectId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p)),
        );
        return true;
      } catch (err) {
        console.error('[useMarketplaceProjects] Status update error:', err);
        return false;
      }
    },
    [],
  );

  const getProjectById = useCallback(
    (id: string) => projects.find(p => p.id === id),
    [projects],
  );

  return {
    projects,
    loading,
    error,
    createProject,
    getProjectsByCampaign,
    updateProjectStatus,
    getProjectById,
    refetch: fetchProjects,
  };
}
