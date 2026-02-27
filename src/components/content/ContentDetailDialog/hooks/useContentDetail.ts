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

// Video-related fields protected from stale overwrites in admin updates.
// These fields are NEVER included unless the admin explicitly modified them.
const VIDEO_FIELDS = new Set<keyof ContentFormData>([
  'video_url', 'video_urls', 'raw_video_urls', 'hooks_count'
]);

interface UseContentDetailOptions {
  content: Content | null;
  onUpdate?: () => void;
}

export function useContentDetail({ content, onUpdate }: UseContentDetailOptions) {
  const { toast } = useToast();
  const { isAdmin, isClient, isCreator, isEditor, isStrategist, isTeamLeader, user } = useAuth();
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
  const formDataRef = useRef<ContentFormData>(initialFormData);
  const skipNextContentResetRef = useRef(false);
  // Track content ID to detect when we switch to a DIFFERENT content item
  const prevContentIdRef = useRef<string | null>(null);

  // Keep ref in sync so handleSave always reads the latest formData
  formDataRef.current = formData;

  // Initialize form data from content
  useEffect(() => {
    if (content) {
      const contentIdChanged = prevContentIdRef.current !== null && prevContentIdRef.current !== content.id;
      prevContentIdRef.current = content.id;

      // Skip reset if we just saved (onUpdate refetch should not overwrite local state)
      if (skipNextContentResetRef.current) {
        skipNextContentResetRef.current = false;
        return;
      }
      // Don't reset formData while in edit mode - prevents losing changes on Realtime refetch.
      // CRITICAL: BUT always reset if the content ID changed (switching between different items)
      // to prevent stale data from one content being saved to another.
      if (editMode && !contentIdChanged) {
        return;
      }
      // If content ID changed while in edit mode, exit edit mode to prevent stale writes
      if (contentIdChanged && editMode) {
        setEditMode(false);
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

  // Capture formData snapshot when ENTERING edit mode (not when dialog opens).
  // This is the baseline for diff-only updates - only changed fields are sent to DB.
  const prevEditModeRef = useRef(false);
  useEffect(() => {
    if (editMode && !prevEditModeRef.current) {
      originalFormDataRef.current = JSON.parse(JSON.stringify(formData));
    }
    prevEditModeRef.current = editMode;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

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
    // Mark as local update to prevent realtime refetch from closing the dialog.
    // Use 5-minute window to avoid overwriting VideoTab's longer protection.
    markLocalUpdate(content.id, 5 * 60 * 1000);

    try {
      // Use ref to guarantee we read the LATEST formData, not a stale closure snapshot.
      // This prevents video_urls (set by VideoTab's onUploadComplete) from being lost.
      const data = formDataRef.current;

      // Use diff-only updates: only send fields that actually changed
      const diffUpdates = buildRoleBasedUpdates(data, originalFormDataRef.current);
      const finalUpdates: Record<string, any> = diffUpdates ? { ...diffUpdates } : {};

      // Assignment timestamps (admin, strategist, team_leader can assign team members)
      if (isAdmin || isStrategist || isTeamLeader) {
        if (data.creator_id && !content.creator_id) {
          finalUpdates.creator_assigned_at = new Date().toISOString();
        }
        if (data.editor_id && !content.editor_id) {
          finalUpdates.editor_assigned_at = new Date().toISOString();
        }
      }

      // Admin-only: paid status transition
      if (isAdmin) {
        const bothPaid = data.creator_paid && data.editor_paid;
        const wasNotBothPaid = !content.creator_paid || !content.editor_paid;
        if (bothPaid && wasNotBothPaid && content.status === 'approved') {
          finalUpdates.status = 'paid';
          finalUpdates.paid_at = new Date().toISOString();
        }
      }

      // Only hit the DB if there are actual updates
      if (Object.keys(finalUpdates).length > 0) {
        const { error } = await supabase
          .from('content')
          .update(finalUpdates)
          .eq('id', content.id);

        if (error) throw error;
      }

      // Notify drive upload if changed
      const driveUrlChanged = data.drive_url && data.drive_url !== content.drive_url;
      if (driveUrlChanged) {
        try {
          await supabase.functions.invoke('notify-drive-upload', {
            body: { content_id: content.id, drive_url: data.drive_url }
          });
        } catch (e) {
          console.error('Drive notification error:', e);
        }
      }

      originalFormDataRef.current = JSON.parse(JSON.stringify(data));
      markAsSaved('content-detail');
      toast({ title: 'Cambios guardados' });
      setEditMode(false);
      // Skip the next formData reset from content prop change (prevents dialog "refresh")
      skipNextContentResetRef.current = true;
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to build role-based updates using diff-only logic.
  // Compares current data against original snapshot and only returns changed fields.
  // Video fields (VIDEO_FIELDS) are NEVER included unless explicitly modified.
  const buildRoleBasedUpdates = useCallback((data: ContentFormData, original: ContentFormData) => {
    // Check content assignment, NOT global activeRole — a user with activeRole='creator'
    // who is assigned as editor_id must still get the editor save path.
    const isAssignedEditorCheck = content?.editor_id === user?.id && !isAdmin;
    const isAssignedCreatorCheck = content?.creator_id === user?.id && !isAdmin;

    // Deep comparison per field
    const changed = (field: keyof ContentFormData): boolean => {
      return JSON.stringify(data[field]) !== JSON.stringify(original[field]);
    };

    // Editor check FIRST: if user is both creator and editor on the same content,
    // editor path includes video_urls which is the critical field to persist.
    if (isAssignedEditorCheck) {
      const updates: Record<string, any> = {};
      if (changed('video_url')) updates.video_url = data.video_url || null;
      if (changed('video_urls')) updates.video_urls = data.video_urls.filter(url => url.trim() !== '');
      if (changed('hooks_count')) updates.hooks_count = data.hooks_count;
      if (changed('drive_url')) updates.drive_url = data.drive_url || null;
      if (changed('notes')) updates.notes = data.notes || null;
      return Object.keys(updates).length > 0 ? updates : null;
    } else if (isAssignedCreatorCheck) {
      const updates: Record<string, any> = {};
      if (changed('drive_url')) updates.drive_url = data.drive_url || null;
      if (changed('notes')) updates.notes = data.notes || null;
      return Object.keys(updates).length > 0 ? updates : null;
    } else if (isStrategist || isTeamLeader) {
      // Strategists & team leaders can edit content, team, dates, scripts, video, material
      // but NOT payments, invoicing, is_published, or admin_guidelines
      const updates: Record<string, any> = {};

      if (changed('title')) updates.title = data.title;
      if (changed('product')) updates.product = data.product || null;
      if (changed('product_id')) updates.product_id = data.product_id || null;
      if (changed('sales_angle')) updates.sales_angle = data.sales_angle || null;
      if (changed('client_id')) updates.client_id = data.client_id || null;
      if (changed('creator_id')) updates.creator_id = data.creator_id || null;
      if (changed('editor_id')) updates.editor_id = data.editor_id || null;
      if (changed('strategist_id')) updates.strategist_id = data.strategist_id || null;
      if (changed('deadline')) updates.deadline = data.deadline ? new Date(data.deadline).toISOString() : null;
      if (changed('start_date')) updates.start_date = data.start_date ? new Date(data.start_date).toISOString() : null;
      if (changed('campaign_week')) updates.campaign_week = data.campaign_week || null;
      if (changed('reference_url')) updates.reference_url = data.reference_url || null;
      if (changed('drive_url')) updates.drive_url = data.drive_url || null;
      if (changed('script')) updates.script = data.script || null;
      if (changed('description')) updates.description = data.description || null;
      if (changed('notes')) updates.notes = data.notes || null;
      if (changed('editor_guidelines')) updates.editor_guidelines = data.editor_guidelines || null;
      if (changed('strategist_guidelines')) updates.strategist_guidelines = data.strategist_guidelines || null;
      if (changed('trafficker_guidelines')) updates.trafficker_guidelines = data.trafficker_guidelines || null;
      if (changed('designer_guidelines')) updates.designer_guidelines = data.designer_guidelines || null;
      if (changed('sphere_phase')) updates.sphere_phase = data.sphere_phase || null;

      // Video fields
      if (changed('video_url')) updates.video_url = data.video_url || null;
      if (changed('video_urls')) updates.video_urls = data.video_urls.filter(url => url.trim() !== '');
      if (changed('hooks_count')) updates.hooks_count = data.hooks_count;

      return Object.keys(updates).length > 0 ? updates : null;
    } else if (isAdmin) {
      const updates: Record<string, any> = {};

      // Non-video fields
      if (changed('title')) updates.title = data.title;
      if (changed('product')) updates.product = data.product || null;
      if (changed('product_id')) updates.product_id = data.product_id || null;
      if (changed('sales_angle')) updates.sales_angle = data.sales_angle || null;
      if (changed('client_id')) updates.client_id = data.client_id || null;
      if (changed('creator_id')) updates.creator_id = data.creator_id || null;
      if (changed('editor_id')) updates.editor_id = data.editor_id || null;
      if (changed('strategist_id')) updates.strategist_id = data.strategist_id || null;
      if (changed('deadline')) updates.deadline = data.deadline ? new Date(data.deadline).toISOString() : null;
      if (changed('start_date')) updates.start_date = data.start_date ? new Date(data.start_date).toISOString() : null;
      if (changed('campaign_week')) updates.campaign_week = data.campaign_week || null;
      if (changed('reference_url')) updates.reference_url = data.reference_url || null;
      if (changed('drive_url')) updates.drive_url = data.drive_url || null;
      if (changed('script')) updates.script = data.script || null;
      if (changed('description')) updates.description = data.description || null;
      if (changed('notes')) updates.notes = data.notes || null;
      if (changed('creator_payment')) updates.creator_payment = data.creator_payment;
      if (changed('editor_payment')) updates.editor_payment = data.editor_payment;
      if (changed('creator_paid')) updates.creator_paid = data.creator_paid;
      if (changed('editor_paid')) updates.editor_paid = data.editor_paid;
      if (changed('invoiced')) updates.invoiced = data.invoiced;
      if (changed('is_published')) updates.is_published = data.is_published;
      if (changed('editor_guidelines')) updates.editor_guidelines = data.editor_guidelines || null;
      if (changed('strategist_guidelines')) updates.strategist_guidelines = data.strategist_guidelines || null;
      if (changed('trafficker_guidelines')) updates.trafficker_guidelines = data.trafficker_guidelines || null;
      if (changed('designer_guidelines')) updates.designer_guidelines = data.designer_guidelines || null;
      if (changed('admin_guidelines')) updates.admin_guidelines = data.admin_guidelines || null;
      if (changed('sphere_phase')) updates.sphere_phase = data.sphere_phase || null;

      // Video fields: ONLY include if explicitly modified by admin (protected by VIDEO_FIELDS set)
      if (changed('video_url')) updates.video_url = data.video_url || null;
      if (changed('video_urls')) updates.video_urls = data.video_urls.filter(url => url.trim() !== '');
      if (changed('hooks_count')) updates.hooks_count = data.hooks_count;

      return Object.keys(updates).length > 0 ? updates : null;
    }
    return null;
  }, [isAdmin, isStrategist, isTeamLeader, content?.creator_id, content?.editor_id, user?.id]);

  // AutoSave integration
  // SAFETY: capture content.id in a ref so the onSave callback always targets the correct record.
  const autoSaveContentIdRef = useRef<string | null>(content?.id ?? null);
  useEffect(() => {
    autoSaveContentIdRef.current = content?.id ?? null;
  }, [content?.id]);

  const { status: autoSaveStatus, lastSaved, forceSave } = useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (!editMode || !content) return;
      // CRITICAL GUARD: ensure we're saving to the content that was open when edit mode started.
      // This prevents stale data from a previous content being written to the current one.
      if (autoSaveContentIdRef.current !== content.id) {
        console.warn('[autoSave] Content ID mismatch — skipping save to prevent data corruption');
        return;
      }
      // Use diff-only updates: only send fields that actually changed
      const updates = buildRoleBasedUpdates(data, originalFormDataRef.current);
      if (!updates) return; // Nothing changed, skip DB update
      // Mark as local update (5min to match handleSave / VideoTab protection window)
      markLocalUpdate(content.id, 5 * 60 * 1000);
      await supabase.from('content').update(updates).eq('id', content.id);
    },
    enabled: editMode,
    debounceMs: 3000,
    intervalMs: 30000
  });

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
    
    // AutoSave
    autoSaveStatus,
    lastSaved,
    
    // Helpers
    hasUnsavedChanges: JSON.stringify(formData) !== JSON.stringify(originalFormDataRef.current)
  };
}
