import { useState, useEffect, useCallback } from 'react';
import { ContentFormData } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';

// Special ID to represent "Organization as client" (internal brand)
const ORG_AS_CLIENT_ID = '__INTERNAL_BRAND__';

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
  const { currentOrgId, currentOrgName } = useOrgOwner();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [ambassadors, setAmbassadors] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);
  
  // Client-specific data
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [clientProducts, setClientProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [packageId, setPackageId] = useState('');
  
  // Ambassador content detection
  const [isAmbassadorContent, setIsAmbassadorContent] = useState(false);
  const [organizationClientId, setOrganizationClientId] = useState<string | null>(null);

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

  // Fetch options on mount
  useEffect(() => {
    fetchOptions();
  }, [currentOrgId]);

  // Detect if client is the organization (ambassador content)
  useEffect(() => {
    // Special ID means user selected org as internal brand
    const isOrgAsClient = formData.client_id === ORG_AS_CLIENT_ID;
    
    const wasAmbassadorContent = isAmbassadorContent;
    setIsAmbassadorContent(isOrgAsClient);
    setOrganizationClientId(isOrgAsClient ? currentOrgId : null);
    
    // Clear creator selection when switching to/from ambassador content
    if (isOrgAsClient !== wasAmbassadorContent) {
      setFormData(prev => ({ ...prev, creator_id: '' }));
    }
    
    // Clear payments and set ambassador fields
    if (isOrgAsClient) {
      setFormData(prev => ({ 
        ...prev, 
        creator_payment: 0,
        editor_payment: 0,
        is_ambassador_content: true,
        content_type: 'ambassador_internal',
        is_paid: false,
        reward_type: 'UP'
      }));
    } else if (wasAmbassadorContent && !isOrgAsClient) {
      setFormData(prev => ({ 
        ...prev, 
        is_ambassador_content: false,
        content_type: 'commercial',
        is_paid: true,
        reward_type: 'money'
      }));
    }
  }, [formData.client_id, currentOrgId]);

  // Fetch client's packages and products when client changes (skip for internal brand)
  useEffect(() => {
    if (formData.client_id && formData.client_id !== ORG_AS_CLIENT_ID) {
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
    setLoading(true);
    try {
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      // Add organization as first option for internal brand / ambassador content
      const orgOption: SelectOption = {
        id: ORG_AS_CLIENT_ID,
        name: currentOrgName ? `🏅 ${currentOrgName} (Marca Interna)` : '🏅 Marca Interna',
        is_internal_brand: true
      };
      setClients([orgOption, ...(clientsData || [])]);

      // Fetch creators (regular)
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

      // Fetch ambassadors (for ambassador content)
      if (currentOrgId) {
        const { data: ambassadorRoles } = await supabase
          .from('organization_member_roles')
          .select('user_id')
          .eq('organization_id', currentOrgId)
          .eq('role', 'ambassador');
        
        if (ambassadorRoles?.length) {
          const { data: ambassadorProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', ambassadorRoles.map(r => r.user_id));
          setAmbassadors(ambassadorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
        } else {
          setAmbassadors([]);
        }
      }

      // Fetch editors
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

      // Fetch strategists (admins)
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
    setIsAmbassadorContent(false);
    setOrganizationClientId(null);
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

    // Validation for ambassador content
    if (isAmbassadorContent && !formData.creator_id) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un embajador para contenido de marca interna',
        variant: 'destructive'
      });
      return;
    }

    if (isAmbassadorContent && ambassadors.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay embajadores disponibles. Primero asigna el rol de embajador a usuarios.',
        variant: 'destructive'
      });
      return;
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

      const { error } = await supabase.from('content').insert({
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
        // Ambassador content: no monetary payment
        creator_payment: isAmbassadorContent ? 0 : (formData.creator_payment || 0),
        editor_payment: isAmbassadorContent ? 0 : (formData.editor_payment || 0),
        hooks_count: formData.hooks_count,
        video_urls: Array(formData.hooks_count).fill(''),
        editor_guidelines: formData.editor_guidelines?.trim() || null,
        strategist_guidelines: formData.strategist_guidelines?.trim() || null,
        trafficker_guidelines: formData.trafficker_guidelines?.trim() || null,
        designer_guidelines: formData.designer_guidelines?.trim() || null,
        admin_guidelines: formData.admin_guidelines?.trim() || null,
        status: 'draft',
        organization_id: organizationId,
        creator_assigned_at: formData.creator_id ? new Date().toISOString() : null,
        editor_assigned_at: formData.editor_id ? new Date().toISOString() : null,
        // Ambassador content fields
        is_ambassador_content: isAmbassadorContent,
        content_type: isAmbassadorContent ? 'ambassador_internal' : 'commercial',
        is_paid: !isAmbassadorContent,
        reward_type: isAmbassadorContent ? 'UP' : 'money'
      });

      if (error) throw error;

      toast({
        title: isAmbassadorContent ? 'Proyecto de Embajador creado' : 'Proyecto creado',
        description: isAmbassadorContent 
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

  // Get available creators based on content type
  const availableCreators = isAmbassadorContent ? ambassadors : creators;

  return {
    // State
    loading,
    saving,
    formData,
    setFormData,
    selectedProduct,
    isAmbassadorContent,
    
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
