import { useState, useEffect, useCallback, useRef } from 'react';
import { Content, ContentStatus } from '@/types/database';
import { ContentFormData, ContentCommentWithProfile } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUnsavedChangesSafe } from '@/contexts/UnsavedChangesContext';
import { useTrialGuard } from '@/hooks/useTrialGuard';

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
    admin_guidelines: ''
  };

  const [formData, setFormData] = useState<ContentFormData>(initialFormData);
  const originalFormDataRef = useRef<ContentFormData>(initialFormData);

  // Initialize form data from content
  useEffect(() => {
    if (content) {
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
        admin_guidelines: (content as any).admin_guidelines || ''
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
      const { error } = await supabase
        .from('content')
        .update({ status: newStatus })
        .eq('id', content.id);
      if (error) throw error;
      setCurrentStatus(newStatus);
      toast({ title: 'Estado actualizado' });
      onUpdate?.();
    } catch (error) {
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
          admin_guidelines: formData.admin_guidelines || null
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

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);

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
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // AutoSave integration
  const { status: autoSaveStatus, lastSaved, forceSave } = useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (!editMode || !content) return;
      // Silent save - same logic as handleSave but without toast
      const updates: any = { ...data };
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
