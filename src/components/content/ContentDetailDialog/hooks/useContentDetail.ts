import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content, ContentStatus, ContentComment } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  ContentFormData, 
  SelectOption, 
  ContentCommentWithProfile 
} from '../types';

interface UseContentDetailOptions {
  content: Content | null;
  onUpdate?: () => void;
}

const initialFormData: ContentFormData = {
  title: "",
  product: "",
  product_id: "",
  sales_angle: "",
  client_id: "",
  creator_id: "",
  editor_id: "",
  strategist_id: "",
  deadline: "",
  start_date: "",
  campaign_week: "",
  reference_url: "",
  video_url: "",
  video_urls: [],
  raw_video_urls: [],
  hooks_count: 1,
  drive_url: "",
  script: "",
  description: "",
  notes: "",
  creator_payment: 0,
  editor_payment: 0,
  creator_paid: false,
  editor_paid: false,
  invoiced: false,
  is_published: false,
  editor_guidelines: "",
  strategist_guidelines: "",
  trafficker_guidelines: "",
  designer_guidelines: "",
  admin_guidelines: ""
};

export function useContentDetail({ content, onUpdate }: UseContentDetailOptions) {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Form state
  const [formData, setFormData] = useState<ContentFormData>(initialFormData);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Product data
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  // Comments
  const [comments, setComments] = useState<ContentCommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);

  // Track original data for change detection
  const originalDataRef = useRef<ContentFormData>(initialFormData);

  // Initialize form data from content
  useEffect(() => {
    if (content) {
      const existingVideoUrls = (content as any).video_urls || [];
      const hooksCount = (content as any).hooks_count || Math.max(existingVideoUrls.length, 1);
      const videoUrls = Array.from({ length: hooksCount }, (_, i) => existingVideoUrls[i] || '');

      const newFormData: ContentFormData = {
        title: content.title || "",
        product: content.product || "",
        product_id: content.product_id || "",
        sales_angle: content.sales_angle || "",
        client_id: content.client_id || "",
        creator_id: content.creator_id || "",
        editor_id: content.editor_id || "",
        strategist_id: content.strategist_id || "",
        deadline: content.deadline ? content.deadline.split('T')[0] : "",
        start_date: content.start_date ? content.start_date.split('T')[0] : "",
        campaign_week: content.campaign_week || "",
        reference_url: content.reference_url || "",
        video_url: content.video_url || "",
        video_urls: videoUrls,
        raw_video_urls: content.raw_video_urls?.length > 0
          ? content.raw_video_urls
          : (content.drive_url ? [content.drive_url] : []),
        hooks_count: hooksCount,
        drive_url: content.drive_url || "",
        script: content.script || "",
        description: content.description || "",
        notes: content.notes || "",
        creator_payment: content.creator_payment || 0,
        editor_payment: content.editor_payment || 0,
        creator_paid: content.creator_paid || false,
        editor_paid: content.editor_paid || false,
        invoiced: content.invoiced || false,
        is_published: (content as any).is_published || false,
        editor_guidelines: (content as any).editor_guidelines || "",
        strategist_guidelines: (content as any).strategist_guidelines || "",
        trafficker_guidelines: (content as any).trafficker_guidelines || "",
        designer_guidelines: (content as any).designer_guidelines || "",
        admin_guidelines: (content as any).admin_guidelines || ""
      };

      setFormData(newFormData);
      originalDataRef.current = newFormData;
      setCurrentStatus(content.status);
      fetchOptions();
      fetchComments();

      if (content.product_id) {
        fetchProduct(content.product_id);
      }
    }
  }, [content]);

  // Fetch product details
  const fetchProduct = async (productId: string) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();
    setSelectedProduct(data);
  };

  // Handle product change
  const handleProductChange = async (productId: string) => {
    setFormData(prev => ({ ...prev, product_id: productId }));
    if (productId) {
      await fetchProduct(productId);
    } else {
      setSelectedProduct(null);
    }
  };

  // Fetch comments
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

  // Add comment
  const handleAddComment = async (section?: string, sectionIndex?: number) => {
    if (!content || !newComment.trim() || !user) return;
    setLoadingComment(true);
    try {
      const { error } = await supabase
        .from('content_comments')
        .insert({
          content_id: content.id,
          user_id: user.id,
          comment: newComment.trim(),
          section: section || null,
          section_index: sectionIndex !== undefined ? sectionIndex : null
        });
      if (error) throw error;
      setNewComment("");
      fetchComments();
      toast({ title: "Comentario agregado" });
    } catch (error) {
      toast({ title: "Error al agregar comentario", variant: "destructive" });
    } finally {
      setLoadingComment(false);
    }
  };

  // Change status
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
      toast({ 
        title: "Estado actualizado", 
        description: `Nuevo estado: ${newStatus}` 
      });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch options for selects
  const fetchOptions = async () => {
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(clientsData || []);

    const { data: creatorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'creator');

    if (creatorRoles?.length) {
      const { data: creatorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorRoles.map(r => r.user_id));
      setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: editorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'editor');

    if (editorRoles?.length) {
      const { data: editorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', editorRoles.map(r => r.user_id));
      setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles?.length) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminRoles.map(r => r.user_id));
      setStrategists(adminProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }
  };

  // Save content
  const handleSave = useCallback(async () => {
    if (!content) return;
    setLoading(true);

    try {
      let updates: any = {};
      const isAssignedCreator = !isAdmin && content.creator_id === user?.id;
      const isAssignedEditor = !isAdmin && content.editor_id === user?.id;

      if (isAssignedCreator && !isAdmin) {
        updates = {
          drive_url: formData.drive_url || null,
          notes: formData.notes || null
        };
      } else if (isAssignedEditor && !isAdmin) {
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

      // Notify if drive URL changed
      const driveUrlChanged = formData.drive_url && formData.drive_url !== content.drive_url;
      if (driveUrlChanged) {
        try {
          await supabase.functions.invoke('notify-drive-upload', {
            body: { content_id: content.id, drive_url: formData.drive_url }
          });
          toast({
            title: "Procesando video",
            description: "El video se está procesando automáticamente"
          });
        } catch (webhookErr) {
          console.error('Error calling webhook:', webhookErr);
        }
      } else {
        toast({
          title: "Guardado",
          description: "Los cambios se han guardado exitosamente"
        });
      }

      originalDataRef.current = formData;
      setEditMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [content, formData, isAdmin, user?.id, onUpdate, toast]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(originalDataRef.current);

  return {
    // Form state
    formData,
    setFormData,
    currentStatus,
    setCurrentStatus,
    loading,
    setLoading,
    editMode,
    setEditMode,

    // Product
    selectedProduct,
    setSelectedProduct,
    handleProductChange,
    fetchProduct,

    // Options
    clients,
    creators,
    editors,
    strategists,

    // Comments
    comments,
    newComment,
    setNewComment,
    loadingComment,
    handleAddComment,
    fetchComments,

    // Actions
    handleSave,
    handleStatusChange,

    // Change detection
    hasUnsavedChanges,
  };
}
