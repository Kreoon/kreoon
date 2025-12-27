import { useState, useEffect, useCallback } from 'react';
import { ContentFormData } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useInternalOrgContent } from '@/hooks/useInternalOrgContent';

interface UseContentCreateOptions {
  onSuccess?: () => void;
  onClose?: () => void;
}

interface SelectOption {
  id: string;
  name: string;
  is_internal_brand?: boolean;
}

interface ClientPackage {
  id: string;
  name: string;
  hooks_per_video: number | null;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
}

export function useContentCreate({ onSuccess, onClose }: UseContentCreateOptions) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);
  
  // Client-specific data
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [clientProducts, setClientProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [packageId, setPackageId] = useState('');
  
  // Get current org ID from profile
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

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
    video_urls: [''],
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
    is_ambassador_content: false,
    content_type: 'commercial',
    is_paid: true,
    reward_type: 'money'
  };

  const [formData, setFormData] = useState<ContentFormData>(initialFormData);

  // Use centralized hook for internal org content - SINGLE SOURCE OF TRUTH
  const { 
    isInternalOrgContent, 
    ambassadors, 
    getInternalContentDefaults,
    validateCreatorForInternalContent,
    checkIsInternalOrgContent 
  } = useInternalOrgContent(formData.client_id);

  // Fetch org ID
  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();
      setCurrentOrgId(data?.current_organization_id || null);
    };
    fetchOrgId();
  }, [user?.id]);

  // Fetch options on mount
  useEffect(() => {
    if (currentOrgId) {
      fetchOptions();
    }
  }, [currentOrgId]);

  // Handle client change - apply internal content defaults or reset
  useEffect(() => {
    const wasInternalContent = formData.is_ambassador_content;
    
    if (isInternalOrgContent && !wasInternalContent) {
      // Switched TO internal content - apply defaults and clear creator
      setFormData(prev => ({ 
        ...prev, 
        creator_payment: 0,
        editor_payment: 0,
        is_ambassador_content: true,
        content_type: 'ambassador_internal' as const,
        is_paid: false,
        reward_type: 'UP',
        creator_id: '' // Clear creator selection
      }));
    } else if (!isInternalOrgContent && wasInternalContent) {
      // Switched FROM internal content - reset to commercial
      setFormData(prev => ({ 
        ...prev, 
        is_ambassador_content: false,
        content_type: 'commercial' as const,
        is_paid: true,
        reward_type: 'money',
        creator_id: '' // Clear creator selection
      }));
    }
  }, [isInternalOrgContent, formData.client_id]);

  // Fetch client's packages and products when client changes
  useEffect(() => {
    if (formData.client_id) {
      fetchClientData(formData.client_id);
    } else {
      setClientPackages([]);
      setClientProducts([]);
      setPackageId('');
      setSelectedProduct(null);
    }
  }, [formData.client_id]);

  // Update hooks count when package changes
  useEffect(() => {
    if (packageId) {
      const pkg = clientPackages.find(p => p.id === packageId);
      if (pkg?.hooks_per_video && pkg.hooks_per_video > 0) {
        setFormData(prev => ({ 
          ...prev, 
          hooks_count: pkg.hooks_per_video!,
          video_urls: Array(pkg.hooks_per_video!).fill('')
        }));
      }
    }
  }, [packageId, clientPackages]);

  // Update selected product when productId changes
  useEffect(() => {
    if (formData.product_id) {
      const product = clientProducts.find(p => p.id === formData.product_id);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [formData.product_id, clientProducts]);

  const fetchClientData = async (clientId: string) => {
    // Fetch packages
    const { data: packages } = await supabase
      .from('client_packages')
      .select('id, name, hooks_per_video, is_active')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    setClientPackages(packages || []);
    
    // Auto-select active package
    const activePackage = packages?.find(p => p.is_active);
    if (activePackage) {
      setPackageId(activePackage.id);
    }

    // Fetch products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, strategy, market_research, ideal_avatar, sales_angles, brief_url')
      .eq('client_id', clientId)
      .order('name');
    
    setClientProducts(products || []);
  };

  const fetchOptions = async () => {
    if (!currentOrgId) return;
    
    setLoading(true);
    try {
      // Fetch clients with internal brand flag
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, is_internal_brand')
        .eq('organization_id', currentOrgId)
        .order('name');
      
      // Mark internal brand and sort first
      const clientsWithFlags = (clientsData || []).map(c => ({
        ...c,
        is_internal_brand: c.is_internal_brand === true
      }));
      
      clientsWithFlags.sort((a, b) => {
        if (a.is_internal_brand && !b.is_internal_brand) return -1;
        if (!a.is_internal_brand && b.is_internal_brand) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setClients(clientsWithFlags);

      // Fetch creators from organization_member_roles
      const { data: creatorRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('role', 'creator');
      
      if (creatorRoles?.length) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorRoles.map(r => r.user_id));
        setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setCreators([]);
      }

      // Fetch editors from organization_member_roles
      const { data: editorRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('role', 'editor');
      
      if (editorRoles?.length) {
        const { data: editorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorRoles.map(r => r.user_id));
        setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setEditors([]);
      }

      // Fetch strategists from organization_member_roles
      const { data: strategistRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('role', 'strategist');
      
      if (strategistRoles?.length) {
        const { data: strategistProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', strategistRoles.map(r => r.user_id));
        setStrategists(strategistProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setStrategists([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = async (productId: string) => {
    setFormData(prev => ({ ...prev, product_id: productId }));
    if (productId) {
      const product = clientProducts.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setFormData(prev => ({ ...prev, product: product.name }));
      }
    } else {
      setSelectedProduct(null);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setPackageId('');
    setClientPackages([]);
    setClientProducts([]);
    setSelectedProduct(null);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del video es requerido',
        variant: 'destructive'
      });
      return;
    }

    // CRITICAL: Validation for internal org content
    if (isInternalOrgContent) {
      const validation = validateCreatorForInternalContent(formData.creator_id);
      if (!validation.valid) {
        toast({
          title: 'Error',
          description: validation.error,
          variant: 'destructive'
        });
        return;
      }

      if (ambassadors.length === 0) {
        toast({
          title: 'Error',
          description: 'No hay embajadores disponibles. Primero asigna la insignia de Embajador a usuarios.',
          variant: 'destructive'
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Get user's current organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user?.id)
        .maybeSingle();

      const organizationId = profile?.current_organization_id;

      // CRITICAL: Force internal content values on backend - ignore any payment values
      // CRITICAL: Keep client_id for internal brand content to enable proper detection
      const contentData = {
        title: formData.title.trim(),
        product: selectedProduct?.name || formData.product || null,
        product_id: formData.product_id || null,
        client_id: formData.client_id || null,
        creator_id: formData.creator_id || null,
        editor_id: formData.editor_id || null,
        strategist_id: formData.strategist_id || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        campaign_week: formData.campaign_week?.trim() || null,
        reference_url: formData.reference_url?.trim() || null,
        script: formData.script?.trim() || null,
        description: formData.description?.trim() || null,
        // CRITICAL: Internal content = no monetary payment
        creator_payment: isInternalOrgContent ? 0 : (formData.creator_payment || 0),
        editor_payment: isInternalOrgContent ? 0 : (formData.editor_payment || 0),
        hooks_count: formData.hooks_count,
        video_urls: Array(formData.hooks_count).fill(''),
        editor_guidelines: formData.editor_guidelines?.trim() || null,
        strategist_guidelines: formData.strategist_guidelines?.trim() || null,
        trafficker_guidelines: formData.trafficker_guidelines?.trim() || null,
        designer_guidelines: formData.designer_guidelines?.trim() || null,
        admin_guidelines: formData.admin_guidelines?.trim() || null,
        status: 'draft' as const,
        organization_id: organizationId,
        creator_assigned_at: formData.creator_id ? new Date().toISOString() : null,
        editor_assigned_at: formData.editor_id ? new Date().toISOString() : null,
        // CRITICAL: Auto-mark internal content fields
        is_ambassador_content: isInternalOrgContent,
        content_type: isInternalOrgContent ? 'ambassador_internal' : 'commercial',
        is_paid: !isInternalOrgContent,
        reward_type: isInternalOrgContent ? 'UP' : 'money'
      };

      const { error } = await supabase.from('content').insert([contentData]);

      if (error) throw error;

      toast({
        title: isInternalOrgContent ? 'Proyecto de Embajador creado' : 'Proyecto creado',
        description: isInternalOrgContent 
          ? 'El proyecto de marca interna se ha creado. La recompensa será en puntos UP.'
          : 'El proyecto se ha creado exitosamente'
      });

      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Get available creators based on content type - CRITICAL: only ambassadors for internal content
  const availableCreators = isInternalOrgContent 
    ? ambassadors.map(a => ({ id: a.id, name: a.name }))
    : creators;

  return {
    // State
    loading,
    saving,
    formData,
    setFormData,
    selectedProduct,
    isAmbassadorContent: isInternalOrgContent, // Backward compatibility
    isInternalOrgContent,
    
    // Options
    clients,
    creators,
    ambassadors,
    availableCreators,
    editors,
    strategists,
    clientPackages,
    clientProducts,
    packageId,
    setPackageId,
    
    // Actions
    handleProductChange,
    handleCreate,
    resetForm
  };
}
