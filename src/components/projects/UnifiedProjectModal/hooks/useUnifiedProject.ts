import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useProjectAssignments } from '@/hooks/useProjectAssignments';
import { useProductSelection } from './useProductSelection';
import { ProjectAdapter } from '@/lib/projectAdapter';
import {
  getProjectTypeConfig,
  PROJECT_TYPE_REGISTRY,
} from '@/types/unifiedProject.types';
import type {
  UnifiedProject,
  ProjectType,
  ProjectTypeConfig,
  UnifiedPermissions,
} from '@/types/unifiedProject.types';
import { adaptContentPermissions, buildMarketplacePermissions } from '@/lib/unifiedPermissions';
import { useContentPermissions } from '@/components/content/ContentDetailDialog/hooks/useContentPermissions';
import { useBlockConfig } from '@/components/content/ContentDetailDialog/hooks/useBlockConfig';
import type { UseUnifiedProjectReturn } from '../types';

interface UseUnifiedProjectOptions {
  source: 'content' | 'marketplace';
  projectId?: string;
  preloaded?: UnifiedProject;
  onUpdate?: () => void;
  createProjectType?: ProjectType;
}

export function useUnifiedProject({
  source,
  projectId,
  preloaded,
  onUpdate,
  createProjectType,
}: UseUnifiedProjectOptions): UseUnifiedProjectReturn {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState<UnifiedProject | null>(preloaded || null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(!preloaded && !!projectId);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const pendingRefreshRef = useRef(false);

  // Determine project type
  const projectType: ProjectType = project?.projectType || createProjectType || 'content_creation';
  const typeConfig = useMemo(() => getProjectTypeConfig(projectType), [projectType]);

  // ---- Content-specific permission hooks (only used for source=content) ----
  const contentData = source === 'content' ? project?.contentData || null : null;
  const contentPermissions = useContentPermissions(contentData);
  const blockConfig = useBlockConfig(contentData);

  // ---- Product selection (content projects reference a product for AI script generation) ----
  const contentProductId = source === 'content' ? (formData.product_id || contentData?.product_id) : undefined;
  const { selectedProduct, handleProductChange } = useProductSelection(contentProductId);

  // ---- Multi-talent assignments ----
  const assignmentsHook = useProjectAssignments({
    projectSource: source,
    projectId: projectId || project?.id || '',
  });

  // Fetch assignments when project is loaded
  useEffect(() => {
    if (projectId || project?.id) {
      assignmentsHook.fetchAssignments();
    }
  }, [projectId, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach assignments to project for permission resolution
  const projectWithAssignments = useMemo(() => {
    if (!project) return null;
    if (assignmentsHook.assignments.length === 0 && !project.assignments?.length) return project;
    return { ...project, assignments: assignmentsHook.assignments };
  }, [project, assignmentsHook.assignments]);

  // ---- Build unified permissions ----
  const permissions: UnifiedPermissions = useMemo(() => {
    if (!projectWithAssignments) {
      // Create mode: full permissions
      return {
        can: () => true,
        visibleSections: typeConfig.visibleTabs,
        isReadOnly: () => false,
        canEnterEditMode: true,
      };
    }

    if (source === 'content') {
      return adaptContentPermissions(
        contentPermissions,
        blockConfig,
        user?.id,
        assignmentsHook.assignments,
      );
    }

    return buildMarketplacePermissions(projectWithAssignments, {
      userId: user?.id || '',
      isAdmin,
      roles: [],
      isBrandOwner: projectWithAssignments.marketplaceData?.brand_user_id === user?.id,
      isProjectCreator: projectWithAssignments.creatorId === user?.id,
      isProjectEditor: projectWithAssignments.editorId === user?.id,
    });
  }, [projectWithAssignments, source, contentPermissions, blockConfig, typeConfig, user?.id, isAdmin, assignmentsHook.assignments]);

  // ---- Fetch project data ----
  useEffect(() => {
    if (preloaded || !projectId) return;

    const fetchProject = async () => {
      setLoading(true);
      try {
        if (source === 'content') {
          const { data, error } = await supabase.rpc('get_content_by_id', {
            p_content_id: projectId,
          });
          if (error) throw error;
          if (data && data.length > 0) {
            const row = data[0];
            const unified = ProjectAdapter.fromContent(row, row.organization_id || '');
            setProject(unified);
            setFormData(buildFormData(unified, 'content'));
          }
        } else {
          const { data, error } = await (supabase as any)
            .from('marketplace_projects')
            .select(`
              *,
              creator:creator_profiles!marketplace_projects_creator_id_fkey(
                id, user_id, display_name, slug, avatar_url
              ),
              brand:brands!marketplace_projects_brand_id_fkey(
                id, name, logo_url
              )
            `)
            .eq('id', projectId)
            .single();

          if (error) throw error;
          if (data) {
            const unified = ProjectAdapter.fromMarketplace(data);
            setProject(unified);
            setFormData(buildFormData(unified, 'marketplace'));
          }
        }
      } catch (err) {
        console.error('[useUnifiedProject] Fetch error:', err);
        toast({
          title: 'Error al cargar proyecto',
          description: 'No se pudo obtener los datos del proyecto.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [source, projectId, preloaded]);

  // ---- Auto-save (content source only, when editing) ----
  const handleAutoSave = useCallback(async (data: Record<string, any>) => {
    if (!project || source !== 'content') return;

    const updatePayload = ProjectAdapter.toContentUpdate({
      ...project,
      title: data.title || project.title,
      brief: { ...project.brief, ...data.brief },
      clientId: data.client_id,
      creatorId: data.creator_id,
      editorId: data.editor_id,
      strategistId: data.strategist_id,
      deadline: data.deadline,
      startDate: data.start_date,
      creatorPayment: data.creator_payment,
      editorPayment: data.editor_payment,
    });

    const { error } = await supabase.rpc('update_content_by_id', {
      p_content_id: project.id,
      p_updates: updatePayload,
    });

    if (error) throw error;
    pendingRefreshRef.current = true;
  }, [project, source]);

  const autoSave = useAutoSave({
    data: formData,
    onSave: handleAutoSave,
    enabled: editMode && source === 'content' && !!project,
    debounceMs: 3000,
    intervalMs: 30000,
  });

  // ---- Manual save ----
  const handleSave = useCallback(async () => {
    if (!project) return;
    setSaving(true);

    try {
      if (source === 'content') {
        await handleAutoSave(formData);
      } else {
        const payload = ProjectAdapter.toMarketplaceUpdate({
          ...project,
          title: formData.title || project.title,
          brief: formData.brief || project.brief,
          status: formData.status || project.status,
        });

        const { error } = await (supabase as any)
          .from('marketplace_projects')
          .update(payload)
          .eq('id', project.id);

        if (error) throw error;
      }

      toast({ title: 'Guardado', description: 'Proyecto actualizado correctamente.' });
      pendingRefreshRef.current = true;
    } catch (err) {
      console.error('[useUnifiedProject] Save error:', err);
      toast({
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [project, source, formData, handleAutoSave, toast]);

  // ---- Status change ----
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!project) return;

    try {
      if (source === 'content') {
        const { error } = await supabase.rpc('update_content_by_id', {
          p_content_id: project.id,
          p_updates: { status: newStatus },
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('marketplace_projects')
          .update({ status: newStatus })
          .eq('id', project.id);
        if (error) throw error;
      }

      setProject(prev => prev ? { ...prev, status: newStatus } : null);
      setFormData(prev => ({ ...prev, status: newStatus }));
      pendingRefreshRef.current = true;

      toast({ title: 'Estado actualizado' });
    } catch (err) {
      console.error('[useUnifiedProject] Status change error:', err);
      toast({
        title: 'Error al cambiar estado',
        variant: 'destructive',
      });
    }
  }, [project, source, toast]);

  // ---- Deferred refresh on close ----
  const flushPendingRefresh = useCallback(() => {
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onUpdate?.();
    }
  }, [onUpdate]);

  return {
    project: projectWithAssignments,
    formData,
    setFormData,
    loading,
    saving,
    editMode,
    setEditMode,
    handleSave,
    handleStatusChange,
    permissions,
    typeConfig,
    autoSaveStatus: autoSave.status,
    lastSaved: autoSave.lastSaved,
    flushPendingRefresh,
    assignmentsHook,
    selectedProduct,
    handleProductChange,
  };
}

// ============================================================
// HELPERS
// ============================================================

function buildFormData(project: UnifiedProject, source: 'content' | 'marketplace'): Record<string, any> {
  if (source === 'content' && project.contentData) {
    const c = project.contentData;
    return {
      title: c.title || '',
      client_id: c.client_id || '',
      creator_id: c.creator_id || '',
      editor_id: c.editor_id || '',
      strategist_id: c.strategist_id || '',
      product_id: c.product_id || '',
      product: c.product || '',
      sales_angle: c.sales_angle || '',
      deadline: c.deadline || '',
      start_date: c.start_date || '',
      campaign_week: c.campaign_week || '',
      reference_url: c.reference_url || '',
      script: c.script || '',
      description: c.description || '',
      notes: c.notes || '',
      video_url: c.video_url || '',
      video_urls: c.video_urls || [],
      raw_video_urls: c.raw_video_urls || [],
      hooks_count: c.hooks_count || 1,
      drive_url: c.drive_url || '',
      creator_payment: c.creator_payment || 0,
      editor_payment: c.editor_payment || 0,
      creator_paid: c.creator_paid || false,
      editor_paid: c.editor_paid || false,
      invoiced: c.invoiced || false,
      is_published: c.is_published || false,
      editor_guidelines: c.editor_guidelines || '',
      strategist_guidelines: c.strategist_guidelines || '',
      trafficker_guidelines: c.trafficker_guidelines || '',
      designer_guidelines: c.designer_guidelines || '',
      admin_guidelines: c.admin_guidelines || '',
      sphere_phase: c.sphere_phase || '',
      status: c.status,
      brief: project.brief,
    };
  }

  // Marketplace
  return {
    title: project.title || '',
    status: project.status || 'pending',
    brief: project.brief || {},
    deadline: project.deadline || '',
    total_price: project.totalPrice || 0,
    creator_payout: project.creatorPayment || 0,
    editor_payout: project.editorPayment || 0,
    platform_fee: project.platformFee || 0,
    currency: project.currency || 'USD',
  };
}
