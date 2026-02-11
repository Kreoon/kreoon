import { useState, useEffect, useCallback, useRef } from 'react';
import { Content, ContentStatus } from '@/types/database';
import { ContentFormData, ContentCommentWithProfile } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUnsavedChangesSafe } from '@/contexts/UnsavedChangesContext';
import { useTrialGuard } from '@/hooks/useTrialGuard';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';
import { markLocalUpdate } from '@/hooks/useContent';

interface UseContentDetailOptions {
  content: Content | null;
  onUpdate?: () => void;
}

export function useContentDetail({ content, onUpdate }: UseContentDetailOptions) {
  const { toast } = useToast();
  const { isAdmin, isClient, isCreator, isEditor, user } = useAuth();
  const { markAsChanged, markAsSaved, registerSaveHandler, unregisterSaveHandler } = useUnsavedChangesSafe();
  const { guardAction, isReadOnly } = useTrialGuard();
  
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus | null>(null);
  const [comments, setComments] = useState<ContentCommentWithProfile[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const initialFormData: ContentFormData = {
    title: '',
    product: '',
    product_id: '',
    sales_angle: '',
    client_id: '',
    creator_id: '',
    editor_id: '',
    strategist_id: '',
    deadline: '',
    start_date: '',
    campaign_week: '',
    reference_url: '',
    video_url: '',
    video_urls: [],
    raw_video_urls: [],
    hooks_count: 1,
    drive_url: '',
    script: '',
    description: '',
    notes: '',
    creator_payment: 0,
    editor_payment: 0,
    creator_paid: false,
    editor_paid: false,
    invoiced: false,
    is_published: false,
    editor_guidelines: '',
    strategist_guidelines: '',
    trafficker_guidelines: '',
    designer_guidelines: '',
    admin_guidelines: '',
    sphere_phase: ''
  };

  const [formData, setFormData] = useState<ContentFormData>(initialFormData);
  const originalFormDataRef = useRef<ContentFormData>(initialFormData);
  const skipNextContentResetRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // Initialize form data from content
  useEffect(() => {
    if (content) {
      // Skip reset if we just saved (onUpdate refetch should not overwrite local state)
      if (skipNextContentResetRef.current) {
        skipNextContentResetRef.current = false;
        return;
      }
      // Don't reset formData while in edit mode - prevents losing changes on Realtime refetch
      if (editMode) {
        return;
      }
      const existingVideoUrls = (content as any).video_urls || [];
      const hooksCount = (content as any).hooks_count || Math.max(existingVideoUrls.length, 1);
      const videoUrls = Array.from({ length: hooksCount }, (_, i) => existingVideoUrls[i] || '');
      
      const newFormData: ContentFormData = {
        title: content.title || '',
        product: content.product || '',
        product_id: content.product_id || '',
        sales_angle: content.sales_angle || '',
        client_id: content.client_id || '',
        creator_id: content.creator_id || '',
        editor_id: content.editor_id || '',
        strategist_id: content.strategist_id || '',
        deadline: content.deadline ? content.deadline.split('T')[0] : '',
        start_date: content.start_date ? content.start_date.split('T')[0] : '',
        campaign_week: content.campaign_week || '',
        reference_url: content.reference_url || '',
        video_url: content.video_url || '',
        video_urls: videoUrls,
        raw_video_urls: content.raw_video_urls?.length > 0 
          ? content.raw_video_urls 
          : (content.drive_url ? [content.drive_url] : []),
        hooks_count: hooksCount,
        drive_url: content.drive_url || '',
        script: content.script || '',
        description: content.description || '',
        notes: content.notes || '',
        creator_payment: content.creator_payment || 0,
        editor_payment: content.editor_payment || 0,
        creator_paid: content.creator_paid || false,
        editor_paid: content.editor_paid || false,
        invoiced: content.invoiced || false,
        is_published: (content as any).is_published || false,
        editor_guidelines: (content as any).editor_guidelines || '',
        strategist_guidelines: (content as any).strategist_guidelines || '',
        trafficker_guidelines: (content as any).trafficker_guidelines || '',
        designer_guidelines: (content as any).designer_guidelines || '',
        admin_guidelines: (content as any).admin_guidelines || '',
        sphere_phase: (content as any).sphere_phase || ''
      };
      
      setFormData(newFormData);
      originalFormDataRef.current = newFormData;
      setCurrentStatus(content.status);
      
      if (content.product_id) {
        fetchProduct(content.product_id);
      }
      fetchComments();
    }
  }, [content]);

  // Track changes
  useEffect(() => {
    if (editMode && JSON.stringify(formData) !== JSON.stringify(originalFormDataRef.current)) {
      markAsChanged('content-detail');
    }
  }, [formData, editMode, markAsChanged]);

  // Register save handler
  useEffect(() => {
    const saveHandler = async () => {
      await handleSave();
    };
    registerSaveHandler('content-detail', saveHandler);
    return () => unregisterSaveHandler('content-detail');
  }, [formData, content]);

  const fetchProduct = async (productId: string) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();
    setSelectedProduct(data);
  };

  const handleProductChange = async (productId: string) => {
    setFormData(prev => ({ ...prev, product_id: productId }));
    if (productId) {
      await fetchProduct(productId);
    } else {
      setSelectedProduct(null);
    }
  };

  const fetchComments = async () => {
    if (!content) return;
    const { data: commentsData } = await supabase
      .from('content_comments')
      .select('*')
      .eq('content_id', content.id)
      .order('created_at', { ascending: false });
    
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const commentsWithProfiles = commentsData.map(c => ({
        ...c,
        profile: { full_name: profileMap.get(c.user_id) || 'Usuario' }
      }));
      setComments(commentsWithProfiles);
    } else {
      setComments([]);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!content) return;
    setLoading(true);
    try {
      // Use centralized status change with UP points integration
      await updateContentStatusWithUP({
        contentId: content.id,
        oldStatus: content.status as ContentStatus,
        newStatus
      });
      setCurrentStatus(newStatus);
      toast({ title: 'Estado actualizado' });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;

    // Check trial status before saving
    if (isReadOnly) {
      guardAction(() => {});
      return;
    }

    setLoading(true);
    // Mark as local update to prevent realtime refetch from closing the dialog
    markLocalUpdate(content.id);

    try {
      let updates: any = {};

      const isAssignedCreatorCheck = isCreator && content.creator_id === user?.id && !isAdmin;
      const isAssignedEditorCheck = isEditor && content.editor_id === user?.id && !isAdmin;

      if (isAssignedCreatorCheck) {
        updates = {
          drive_url: formData.drive_url || null,
          notes: formData.notes || null
        };
      } else if (isAssignedEditorCheck) {
        updates = {
          video_url: formData.video_url || null,
          video_urls: formData.video_urls.filter(url => url.trim() !== ''),
          hooks_count: formData.hooks_count,
          notes: formData.notes || null
        };
      } else if (isAdmin) {
        updates = {
          title: formData.title,
          product: formData.product || null,
          product_id: formData.product_id || null,
          sales_angle: formData.sales_angle || null,
          client_id: formData.client_id || null,
          creator_id: formData.creator_id || null,
          editor_id: formData.editor_id || null,
          strategist_id: formData.strategist_id || null,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          campaign_week: formData.campaign_week || null,
          reference_url: formData.reference_url || null,
          video_url: formData.video_url || null,
          video_urls: formData.video_urls.filter(url => url.trim() !== ''),
          hooks_count: formData.hooks_count,
          drive_url: formData.drive_url || null,
          script: formData.script || null,
          description: formData.description || null,
          notes: formData.notes || null,
          creator_payment: formData.creator_payment,
          editor_payment: formData.editor_payment,
          creator_paid: formData.creator_paid,
          editor_paid: formData.editor_paid,
          invoiced: formData.invoiced,
          is_published: formData.is_published,
          editor_guidelines: formData.editor_guidelines || null,
          strategist_guidelines: formData.strategist_guidelines || null,
          trafficker_guidelines: formData.trafficker_guidelines || null,
          designer_guidelines: formData.designer_guidelines || null,
          admin_guidelines: formData.admin_guidelines || null,
          sphere_phase: formData.sphere_phase || null
        };

        if (formData.creator_id && !content.creator_id) {
          updates.creator_assigned_at = new Date().toISOString();
        }
        if (formData.editor_id && !content.editor_id) {
          updates.editor_assigned_at = new Date().toISOString();
        }

        const bothPaid = formData.creator_paid && formData.editor_paid;
        const wasNotBothPaid = !content.creator_paid || !content.editor_paid;
        if (bothPaid && wasNotBothPaid && content.status === 'approved') {
          updates.status = 'paid';
          updates.paid_at = new Date().toISOString();
        }
      }

      // Update via SECURITY DEFINER RPC (bypasses 18 RLS policies)
      const { error } = await supabase
        .rpc('update_content_by_id', { p_content_id: content.id, p_updates: updates });

      if (error) throw error;

      // Notify drive upload if changed
      const driveUrlChanged = formData.drive_url && formData.drive_url !== content.drive_url;
      if (driveUrlChanged) {
        try {
          await supabase.functions.invoke('notify-drive-upload', {
            body: { content_id: content.id, drive_url: formData.drive_url }
          });
        } catch (e) {
          console.error('Drive notification error:', e);
        }
      }

      originalFormDataRef.current = formData;
      markAsSaved('content-detail');
      toast({ title: 'Cambios guardados' });
      setEditMode(false);
      // Don't call onUpdate() here — it causes a jarring refresh that temporarily
      // hides videos/data. Instead, mark for refresh when the dialog closes.
      pendingRefreshRef.current = true;
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to build role-based updates
  const buildRoleBasedUpdates = useCallback((data: ContentFormData) => {
    const isAssignedCreatorCheck = isCreator && content?.creator_id === user?.id && !isAdmin;
    const isAssignedEditorCheck = isEditor && content?.editor_id === user?.id && !isAdmin;

    if (isAssignedCreatorCheck) {
      return {
        drive_url: data.drive_url || null,
        notes: data.notes || null
      };
    } else if (isAssignedEditorCheck) {
      return {
        video_url: data.video_url || null,
        video_urls: data.video_urls.filter(url => url.trim() !== ''),
        hooks_count: data.hooks_count,
        notes: data.notes || null
      };
    } else if (isAdmin) {
      return {
        title: data.title,
        product: data.product || null,
        product_id: data.product_id || null,
        sales_angle: data.sales_angle || null,
        client_id: data.client_id || null,
        creator_id: data.creator_id || null,
        editor_id: data.editor_id || null,
        strategist_id: data.strategist_id || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        campaign_week: data.campaign_week || null,
        reference_url: data.reference_url || null,
        video_url: data.video_url || null,
        video_urls: data.video_urls.filter(url => url.trim() !== ''),
        hooks_count: data.hooks_count,
        drive_url: data.drive_url || null,
        script: data.script || null,
        description: data.description || null,
        notes: data.notes || null,
        creator_payment: data.creator_payment,
        editor_payment: data.editor_payment,
        creator_paid: data.creator_paid,
        editor_paid: data.editor_paid,
        invoiced: data.invoiced,
        is_published: data.is_published,
        editor_guidelines: data.editor_guidelines || null,
        strategist_guidelines: data.strategist_guidelines || null,
        trafficker_guidelines: data.trafficker_guidelines || null,
        designer_guidelines: data.designer_guidelines || null,
        admin_guidelines: data.admin_guidelines || null,
        sphere_phase: data.sphere_phase || null
      };
    }
    return null;
  }, [isAdmin, isCreator, isEditor, content?.creator_id, content?.editor_id, user?.id]);

  // AutoSave integration
  const { status: autoSaveStatus, lastSaved, forceSave } = useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (!editMode || !content) return;
      // Use role-based updates (same logic as handleSave)
      const updates = buildRoleBasedUpdates(data);
      if (!updates) return;
      // Mark as local update to prevent realtime refetch from closing the dialog
      markLocalUpdate(content.id);
      // Update via SECURITY DEFINER RPC (bypasses 18 RLS policies)
      await supabase.rpc('update_content_by_id', { p_content_id: content.id, p_updates: updates });
    },
    enabled: editMode,
    debounceMs: 3000,
    intervalMs: 30000
  });

  // Call when dialog closes to refresh parent with saved data
  const flushPendingRefresh = useCallback(() => {
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onUpdate?.();
    }
  }, [onUpdate]);

  return {
    // State
    loading,
    setLoading,
    editMode,
    setEditMode,
    currentStatus,
    comments,
    selectedProduct,
    formData,
    setFormData,

    // Actions
    handleStatusChange,
    handleSave,
    handleProductChange,
    fetchComments,
    forceSave,
    flushPendingRefresh,

    // AutoSave
    autoSaveStatus,
    lastSaved,

    // Helpers
    hasUnsavedChanges: JSON.stringify(formData) !== JSON.stringify(originalFormDataRef.current)
  };
}
