import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { LazyRichTextViewer as RichTextViewer } from '@/components/ui/lazy-rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useBrandClient } from '@/hooks/useBrandClient';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { FullscreenContentViewer } from '@/components/content/FullscreenContentViewer';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { ReviewCard } from '@/components/content/ReviewCard';
import { ContentVideoCard } from '@/components/content/ContentVideoCard';
import { ScriptReviewCard } from '@/components/content/ScriptReviewCard';
import { ClientScriptReview } from '@/components/content/ClientScriptReview';
import { UnifiedContentModule } from '@/components/content/unified';
// Realtime removed — updates only on explicit user actions
import { ProductDNAWizard } from '@/components/product-dna';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';

// Lazy load ClientDNATab (424KB) - only loads when DNA tab is active
const ClientDNATab = lazy(() => import('@/components/clients/dna/ClientDNATab').then(m => ({ default: m.ClientDNATab })));
import {
  ClientDashboardOverview,
  ClientProductsTab,
  ClientReviewTab,
  ClientCompanyTab,
  ClientContentReviewDialog,
  EmptyBrandClientState,
} from '@/components/client-dashboard';
import { ClientInvoicesTab } from '@/components/client-dashboard/ClientInvoicesTab';
import { ClientPipelineChecklist } from '@/components/client-portal';
import { useClientPaymentStatus } from '@/hooks/useClientPaymentStatus';
import {
  LogOut,
  Video,
  Clock,
  CheckCircle2,
  FileText,
  Loader2,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Play,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Heart,
  Building2,
  Edit,
  Save,
  X,
  Wallet,
  BarChart3,
  Activity,
  Target,
  Users,
  Sparkles,
  ExternalLink,
  FolderOpen,
  AlertTriangle,
  FileCheck,
  Maximize2,
  Plus,
  Trash2,
  ShoppingBag,
  Megaphone,
  Briefcase,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  hooks_per_video: number;
  total_value: number;
  paid_amount: number;
  payment_status: string;
  is_active: boolean;
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

export interface Product {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: any | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  onboarding_url: string | null;
  research_url: string | null;
  brief_file_url: string | null;
  onboarding_file_url: string | null;
  research_file_url: string | null;
  brief_status?: string | null;
  brief_data?: any;
  competitor_analysis?: any | null;
  avatar_profiles?: any | null;
  sales_angles_data?: any | null;
  content_strategy?: any | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function ClientDashboard() {
  const { user, profile, signOut, refetchUserData, isClient: isClientRole } = useAuth();
  const { isImpersonating, effectiveClientId } = useImpersonation();
  const { brandClient, activeBrand, loading: brandClientLoading } = useBrandClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Detect independent brand member (no organization, just brand)
  // Include isClientRole for consistency with ProtectedRoute detection
  const isBrandMember = isClientRole ||
    !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client';
  const hasOrganization = !!(profile as any)?.current_organization_id;

  // Marketplace stats for brand
  const { stats: marketplaceStats, loading: marketplaceLoading } = useMarketplaceStats({
    role: 'brand',
    brandId: activeBrand?.id || brandClient?.brand_id,
  });

  // Independent brand members use their brand's client
  const isIndependentBrand = isBrandMember && !hasOrganization && !isImpersonating;
  const [content, setContent] = useState<Content[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [userClients, setUserClients] = useState<ClientInfo[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);

  // Estado de pagos del cliente (para bloquear descargas si hay pagos vencidos)
  const paymentStatus = useClientPaymentStatus(selectedClientId);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [showFullscreenReview, setShowFullscreenReview] = useState(false);
  const [fullscreenStartIndex, setFullscreenStartIndex] = useState(0);
  const [showCreateProductWizard, setShowCreateProductWizard] = useState(false);
  const [stagePopup, setStagePopup] = useState<{ id: string; label: string; statuses: string[] } | null>(null);
  const [stageScriptContent, setStageScriptContent] = useState<Content | null>(null);

  // Create brand state
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [createBrandForm, setCreateBrandForm] = useState({
    name: '',
    industry: '',
    website: '',
    city: '',
    description: '',
  });

  // Edit company state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Delete product confirmation dialog state (UX-C01)
  const [deleteProductDialog, setDeleteProductDialog] = useState<{ id: string; name: string } | null>(null);


  // In root mode, always force the dashboard to use the impersonated clientId
  useEffect(() => {
    if (isImpersonating && effectiveClientId) {
      setSelectedClientId(effectiveClientId);
      setShowClientSelector(false);
    }
  }, [isImpersonating, effectiveClientId]);

  useEffect(() => {
    if (user) {
      fetchUserClients();
    }
  }, [user, isImpersonating, effectiveClientId, brandClient?.id, brandClientLoading]);

  // Listen for client switching without full page reload
  useEffect(() => {
    const handleClientSelected = () => {
      const nextClientId = localStorage.getItem('selectedClientId');
      if (nextClientId && nextClientId !== selectedClientId) {
        setSelectedClientId(nextClientId);
        setShowClientSelector(false);
      }
    };

    const onCustom = () => handleClientSelected();
    window.addEventListener('client-selected', onCustom as EventListener);

    // Also react to localStorage changes coming from other tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selectedClientId') handleClientSelected();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('client-selected', onCustom as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [selectedClientId]);

  // Realtime auto-refresh removed — client dashboard updates only on explicit user actions

  useEffect(() => {
    if (selectedClientId) {
      fetchClientData(selectedClientId);
    }
  }, [selectedClientId]);

  const fetchUserClients = async () => {
    if (!user) return;

    // Root-mode override: the dashboard must follow the impersonated client,
    // not the root admin's own client associations / saved localStorage selection.
    if (isImpersonating && effectiveClientId) {
      setSelectedClientId(effectiveClientId);
      setShowClientSelector(false);
      await fetchClientData(effectiveClientId);
      return;
    }

    // Independent brand member: use brand's client directly
    if (isIndependentBrand && brandClient) {
      setSelectedClientId(brandClient.id);
      setUserClients([{
        id: brandClient.id,
        name: brandClient.name,
        logo_url: activeBrand?.logo_url || null,
        contact_email: null,
        contact_phone: null,
        notes: null,
      }]);
      setShowClientSelector(false);
      await fetchClientData(brandClient.id);
      return;
    }

    // If independent brand but client not loaded yet, wait
    if (isIndependentBrand && brandClientLoading) {
      return;
    }

    setLoading(true);

    try {
      // First try to get clients from the new client_users table
      const { data: associations } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id);

      let clientIds = associations?.map(a => a.client_id) || [];

      // Fallback to legacy user_id relationship if no associations
      if (clientIds.length === 0) {
        const { data: legacyClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (legacyClient) {
          clientIds = [legacyClient.id];
        }
      }

      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, logo_url, contact_email, contact_phone, notes')
          .in('id', clientIds);

        setUserClients(clientsData || []);

        // Check if there's a saved client selection in localStorage
        const savedClientId = localStorage.getItem('selectedClientId');

        if (savedClientId && clientsData?.some(c => c.id === savedClientId)) {
          // Use saved selection if valid
          const savedClient = clientsData.find(c => c.id === savedClientId);
          setSelectedClientId(savedClientId);
          setClientInfo(savedClient || null);
        } else if (clientsData && clientsData.length === 1) {
          // Auto-select if only one client
          setSelectedClientId(clientsData[0].id);
          setClientInfo(clientsData[0]);
          localStorage.setItem('selectedClientId', clientsData[0].id);
        } else if (clientsData && clientsData.length > 1) {
          // Show selector if multiple clients and no saved selection
          setShowClientSelector(true);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user clients:', error);
      setLoading(false);
    }
  };

  const fetchClientData = async (clientId: string, options?: { silent?: boolean }) => {
    if (!user || !clientId) return;
    const silent = options?.silent ?? false;

    if (!silent) setLoading(true);

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, logo_url, contact_email, contact_phone, notes, brand_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientData) {
        // For independent brand clients, use brand logo if client doesn't have one
        let logoUrl = clientData.logo_url;
        if (!logoUrl && isIndependentBrand && activeBrand?.logo_url) {
          logoUrl = activeBrand.logo_url;
        }

        setClientInfo({
          ...clientData,
          logo_url: logoUrl,
        });
        setEditForm({
          name: clientData.name || '',
          contact_email: clientData.contact_email || '',
          contact_phone: clientData.contact_phone || '',
          notes: clientData.notes || ''
        });

        // Fetch content WITHOUT JOIN to clients (avoids RLS timeout).
        // Lo borrado NO se le muestra al cliente: sin este filtro seguía
        // apareciendo en "Guiones por Aprobar" y contaba en las métricas, así
        // que el cliente veía como pendiente trabajo que ya no existe.
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('client_id', clientData.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (contentError) {
          console.error('Error fetching content:', contentError);
          if (!silent) setContent([]);
        } else {
          // Obtener perfiles de creadores y editores
          const contentItems = contentData || [];
          const creatorIds = [...new Set(contentItems.filter(c => c.creator_id).map(c => c.creator_id))];
          const editorIds = [...new Set(contentItems.filter(c => c.editor_id).map(c => c.editor_id))];

          const creatorMap = new Map();
          const editorMap = new Map();

          if (creatorIds.length > 0) {
            const { data: creators } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', creatorIds);
            creators?.forEach(c => creatorMap.set(c.id, c));
          }

          if (editorIds.length > 0) {
            const { data: editors } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', editorIds);
            editors?.forEach(e => editorMap.set(e.id, e));
          }

          const contentWithProfiles = contentItems.map(item => ({
            ...item,
            creator: item.creator_id ? creatorMap.get(item.creator_id) : null,
            editor: item.editor_id ? editorMap.get(item.editor_id) : null
          }));

          setContent(contentWithProfiles as unknown as Content[]);
        }

        const { data: packagesData } = await supabase
          .from('client_packages')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        setPackages(packagesData || []);

        // Fetch products for the client
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('client_id', clientData.id)
          .order('product_code', { ascending: true });

        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!clientInfo) return;
    setSavingCompany(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editForm.name,
          contact_email: editForm.contact_email,
          contact_phone: editForm.contact_phone,
          notes: editForm.notes
        })
        .eq('id', clientInfo.id);

      if (error) throw error;

      setClientInfo(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditingCompany(false);
      toast({ title: 'Empresa actualizada', description: 'Los datos de tu empresa se guardaron correctamente' });
    } catch (error) {
      console.error('Error saving company:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la información', variant: 'destructive' });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!createBrandForm.name || !user?.id) {
      toast({ title: 'Error', description: 'El nombre de la marca es requerido', variant: 'destructive' });
      return;
    }
    setIsCreatingBrand(true);
    try {
      const slug = createBrandForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({
          name: createBrandForm.name,
          slug,
          owner_id: user.id,
          industry: createBrandForm.industry || null,
          website: createBrandForm.website || null,
          city: createBrandForm.city || null,
          description: createBrandForm.description || null,
        })
        .select()
        .single();

      if (brandError) throw brandError;

      await supabase.from('brand_members').insert({
        brand_id: newBrand.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

      await supabase
        .from('profiles')
        .update({ active_brand_id: newBrand.id, active_role: 'client' } as any)
        .eq('id', user.id);

      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          name: createBrandForm.name,
          brand_id: newBrand.id,
          is_internal_brand: false,
          is_public: false,
          bio: createBrandForm.description || `Cliente de marca: ${createBrandForm.name}`,
        })
        .select()
        .single();

      if (newClient) {
        await supabase.from('client_users').insert({
          client_id: newClient.id,
          user_id: user.id,
          role: 'owner',
        });
      }

      toast({ title: 'Empresa creada', description: 'Tu empresa se ha creado correctamente' });
      setShowCreateBrandDialog(false);
      await refetchUserData();
    } catch (error: any) {
      console.error('Error creating brand:', error);
      if (error?.code === '23505') {
        toast({ title: 'Error', description: 'Ya existe una marca con ese nombre', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error?.message || 'Error al crear la marca', variant: 'destructive' });
      }
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedContent || !user) return;
    setSubmitting(true);

    try {
      // Use centralized UP-aware status change
      await updateContentStatusWithUP({
        contentId: selectedContent.id,
        oldStatus: selectedContent.status as ContentStatus,
        newStatus: 'approved'
      });
      
      // Update approved_by separately (UP handler doesn't set this)
      await supabase
        .from('content')
        .update({ approved_by: user.id })
        .eq('id', selectedContent.id);

      if (feedback) {
        await supabase
          .from('content_comments')
          .insert({
            content_id: selectedContent.id,
            user_id: user.id,
            comment: `Aprobado: ${feedback}`
          });
      }

      // UX-C04: optimistic update — remover item de lista inmediatamente
      const approvedId = selectedContent.id;
      setContent(prev => prev.filter(c => c.id !== approvedId));
      toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
      setSelectedContent(null);
      setFeedback('');
      // Sincronizacion silenciosa en background
      if (selectedClientId) fetchClientData(selectedClientId, { silent: true });
    } catch (error) {
      console.error('Error approving content:', error);
      if (selectedClientId) fetchClientData(selectedClientId);
      toast({ title: 'Error', description: 'No se pudo aprobar el contenido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedContent || !user || !feedback) {
      toast({ title: 'Feedback requerido', description: 'Por favor indica las correcciones necesarias', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    try {
      // Use centralized UP-aware status change (delivered -> issue triggers penalty)
      await updateContentStatusWithUP({
        contentId: selectedContent.id,
        oldStatus: selectedContent.status as ContentStatus,
        newStatus: 'issue'
      });
      
      // Update notes separately
      await supabase
        .from('content')
        .update({ notes: feedback })
        .eq('id', selectedContent.id);

      await supabase.from('content_comments').insert({
        content_id: selectedContent.id,
        user_id: user.id,
        comment: `Correcciones solicitadas: ${feedback}`
      });

      // UX-C04: optimistic update — remover item de lista inmediatamente
      const rejectedId = selectedContent.id;
      setContent(prev => prev.filter(c => c.id !== rejectedId));
      toast({ title: 'Enviado a corrección', description: 'El editor realizará los cambios solicitados' });
      setSelectedContent(null);
      setFeedback('');
      // Sincronizacion silenciosa en background
      if (selectedClientId) fetchClientData(selectedClientId, { silent: true });
    } catch (error) {
      console.error('Error rejecting content:', error);
      if (selectedClientId) fetchClientData(selectedClientId);
      toast({ title: 'Error', description: 'No se pudo enviar a corrección', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick status change handler for client
  const handleQuickStatusChange = async (contentId: string, newStatus: ContentStatus, notes?: string) => {
    if (!user) return;
    
    try {
      // Get current status for UP integration
      const { data: currentContent } = await supabase
        .from('content')
        .select('status')
        .eq('id', contentId)
        .single();
      
      if (currentContent) {
        // Use centralized UP-aware status change
        await updateContentStatusWithUP({
          contentId,
          oldStatus: currentContent.status as ContentStatus,
          newStatus
        });
        
        // Update additional fields that UP handler doesn't set
        const updateData: any = {};
        if (newStatus === 'approved') {
          updateData.approved_by = user.id;
        }
        if (newStatus === 'script_approved') {
          updateData.script_approved_at = new Date().toISOString();
          updateData.script_approved_by = user.id;
        }
        
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('content')
            .update(updateData)
            .eq('id', contentId);
        }
      }
      
      // Log the change as a comment
      await supabase.from('content_comments').insert({
        content_id: contentId,
        user_id: user.id,
        comment: `Estado cambiado a: ${STATUS_LABELS[newStatus]}`
      });
      
      if (selectedClientId) fetchClientData(selectedClientId);
    } catch (error) {
      console.error('Error changing content status:', error);
      throw error;
    }
  };

  // UX-C01: Abre el AlertDialog en lugar de window.confirm()
  const handleDeleteProduct = (productId: string, productName: string) => {
    setDeleteProductDialog({ id: productId, name: productName });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductDialog) return;
    const { id: productId } = deleteProductDialog;
    setDeleteProductDialog(null);
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast({ title: 'Producto eliminado' });
    } catch (err) {
      console.error('Error deleting product:', err);
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
    }
  };

  const getContentByStatus = (statuses: ContentStatus[]) => content.filter(c => statuses.includes(c.status));

  const inProgressContent = getContentByStatus(['draft', 'script_pending', 'script_approved', 'recording', 'editing', 'review']);
  const scriptReviewContent = getContentByStatus(['draft', 'script_pending']).filter(c => c.script); // Only show if script exists
  const videoReviewContent = getContentByStatus(['review', 'delivered', 'issue']); // Videos en review, entregados y novedades
  const approvedContent = getContentByStatus(['approved', 'paid']);
  const publishedContent = content.filter(c => c.is_published);
  
  // Total pending review (scripts + videos)
  const totalPendingReview = scriptReviewContent.length + videoReviewContent.length;

  // Financial Metrics
  const totalInvested = packages.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  const totalValue = packages.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
  const pendingPayment = totalValue - totalInvested;
  
  // Calcular total de videos finales (cantidad de contenidos × hooks por video)
  // Cada contenido puede generar múltiples videos finales según los hooks
  const totalFinalVideos = packages.reduce((sum, p) => {
    const hooksPerVideo = p.hooks_per_video || 1;
    return sum + ((p.content_quantity || 0) * hooksPerVideo);
  }, 0);
  
  // Contenidos prometidos (sin multiplicar por hooks, es la cantidad base)
  const totalContentPromised = packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
  const deliveredContentCount = approvedContent.length;
  const contentPending = Math.max(0, totalContentPromised - deliveredContentCount);
  
  // Calcular costo por video final del paquete
  // El valor del paquete se divide entre el total de videos finales (contenidos × hooks)
  const costPerFinalVideo = totalFinalVideos > 0 ? totalValue / totalFinalVideos : 0;
  
  // Calcular hooks promedio por video
  const avgHooksPerVideo = totalContentPromised > 0 ? totalFinalVideos / totalContentPromised : 1;
  
  // Valor de videos aprobados (consumidos) - cada contenido aprobado genera X videos finales
  const approvedVideosValue = deliveredContentCount * avgHooksPerVideo * costPerFinalVideo;
  
  // Saldo del cliente: positivo = saldo a favor, negativo = debe
  // Saldo = Lo que pagó - Valor de videos aprobados
  const clientBalance = totalInvested - approvedVideosValue;
  
  // Overall Progress - calculate based on content workflow stages
  const getContentProgress = (status: ContentStatus): number => {
    const progressMap: Record<ContentStatus, number> = {
      'draft': 10,
      'script_pending': 20,
      'script_approved': 30,
      'assigned': 40,
      'recording': 50,
      'recorded': 60,
      'editing': 70,
      'review': 80,
      'delivered': 90,
      'approved': 100,
      'paid': 100,
      'rejected': 50,
      'issue': 80,
      'corrected': 85
    };
    return progressMap[status] || 0;
  };
  
  const overallProgress = content.length > 0 
    ? Math.round(content.reduce((sum, c) => sum + getContentProgress(c.status), 0) / content.length)
    : 0;

  // Engagement Metrics
  const totalViews = content.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0);
  const avgViewsPerVideo = content.length > 0 ? Math.round(totalViews / content.length) : 0;

  const formatDate = (date: string) => {
    if (!date) return '';
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-sm text-zinc-500">Cargando portal...</span>
        </div>
      </div>
    );
  }

  // Show client selector if multiple clients
  if (userClients.length > 1 && !selectedClientId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Building2 className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selecciona una empresa</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Tienes acceso a múltiples empresas. Selecciona cuál deseas ver.
        </p>
        <div className="grid gap-3 w-full max-w-md">
          {userClients.map(client => (
            <Button
              key={client.id}
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => {
                localStorage.setItem('selectedClientId', client.id);
                setSelectedClientId(client.id);
              }}
            >
              {client.logo_url ? (
                <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded-sm object-cover mr-3" />
              ) : (
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center mr-3">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <span className="font-medium">{client.name}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (!clientInfo) {
    // Independent brand member waiting for brandClient to load
    if (isIndependentBrand && brandClientLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Cargando tu empresa...</p>
        </div>
      );
    }

    // Independent brand member without client yet - polling automático (UX-C02b + UX-C03)
    if (isIndependentBrand && activeBrand && !brandClient) {
      return (
        <EmptyBrandClientState
          onRetry={fetchUserClients}
        />
      );
    }

    // No brand and no client — let the user create their own company
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Tu cuenta está siendo configurada</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          El equipo de KREOON está vinculando tu empresa a la plataforma. Mientras tanto puedes explorar el marketplace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setShowCreateBrandDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear mi Empresa
          </Button>
          <Button variant="outline" onClick={() => navigate('/marketplace')}>
            <ShoppingBag className="w-4 h-4 mr-2" />
            Explorar Marketplace
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        <Dialog open={showCreateBrandDialog} onOpenChange={setShowCreateBrandDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear tu Empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Nombre de tu empresa *</Label>
                <Input
                  id="brand-name"
                  placeholder="Mi Empresa S.A.S"
                  value={createBrandForm.name}
                  onChange={(e) => setCreateBrandForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-industry">Industria</Label>
                <Input
                  id="brand-industry"
                  placeholder="Ej: Tecnología, Moda, Alimentos..."
                  value={createBrandForm.industry}
                  onChange={(e) => setCreateBrandForm(prev => ({ ...prev, industry: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-website">Sitio web</Label>
                  <Input
                    id="brand-website"
                    placeholder="www.miempresa.com"
                    value={createBrandForm.website}
                    onChange={(e) => setCreateBrandForm(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-city">Ciudad</Label>
                  <Input
                    id="brand-city"
                    placeholder="Bogotá"
                    value={createBrandForm.city}
                    onChange={(e) => setCreateBrandForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-description">Descripción</Label>
                <Textarea
                  id="brand-description"
                  placeholder="Breve descripción de tu empresa..."
                  value={createBrandForm.description}
                  onChange={(e) => setCreateBrandForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateBrandDialog(false)} disabled={isCreatingBrand}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBrand} disabled={isCreatingBrand}>
                {isCreatingBrand ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Empresa'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header - Client selector (only shows if multiple clients) */}
      {userClients.length > 1 && (
        <div className="sticky top-0 z-30 bg-white dark:bg-[#0f0f14] border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-end px-4 md:px-6">
            <div className="flex items-center gap-2 py-3">
              {/* Client Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowClientSelector(!showClientSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  <span className="hidden md:inline text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{clientInfo.name}</span>
                  <svg className={cn("h-4 w-4 text-zinc-400 transition-transform", showClientSelector && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showClientSelector && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowClientSelector(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 w-56 bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-lg overflow-hidden">
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {userClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              localStorage.setItem('selectedClientId', client.id);
                              setSelectedClientId(client.id);
                              setShowClientSelector(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded-sm transition-colors text-left text-sm",
                              client.id === clientInfo.id
                                ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            {client.logo_url ? (
                              <img src={client.logo_url} alt={client.name} className="h-6 w-6 rounded-sm object-cover" />
                            ) : (
                              <div className="h-6 w-6 rounded-sm bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Building2 className="h-3 w-3 text-zinc-500" />
                              </div>
                            )}
                            <span className="truncate">{client.name}</span>
                            {client.id === clientInfo.id && (
                              <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 p-4 md:p-6 space-y-6">
        {/* Vista principal: el checklist de 5 pasos del cliente */}
        {activeTab === 'overview' && (
          <ClientPipelineChecklist
            clientId={selectedClientId}
            clientName={profile?.full_name?.split(' ')[0] || clientInfo.name}
            content={content}
            onGoToTab={setActiveTab}
          />
        )}

        {/* Resumen anterior (métricas, videos recientes, alertas de pago) */}
        {activeTab === 'resumen' && (
          <ClientDashboardOverview
            clientName={clientInfo.name}
            userName={profile?.full_name}
            userId={user?.id}
            content={content}
            packages={packages}
            onVideoClick={(video) => setSelectedContent(video)}
            onViewAllContent={() => setActiveTab('portfolio')}
            onUpdate={() => selectedClientId && fetchClientData(selectedClientId, { silent: true })}
            hasExpiredPayment={paymentStatus.hasExpiredPayment}
            expiredAmount={paymentStatus.expiredAmount}
          />
        )}

        {/* DNA Tab - lazy loaded */}
        {activeTab === 'dna' && selectedClientId && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            {/* Portal del cliente: solo el resultado. Su marca sale del
                formulario inicial y la construye el proceso, así que aquí no
                se graba ni se genera nada — solo se lee. */}
            <ClientDNATab clientId={selectedClientId} soloResultado />
          </Suspense>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <ClientProductsTab
            selectedClientId={selectedClientId}
            products={products}
            showCreateProductWizard={showCreateProductWizard}
            setShowCreateProductWizard={setShowCreateProductWizard}
            onProductCreated={() => selectedClientId && fetchClientData(selectedClientId)}
            onSelectProduct={setSelectedProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {/* Review Tab */}
        {activeTab === 'review' && (
          <ClientReviewTab
            scriptReviewContent={scriptReviewContent}
            videoReviewContent={videoReviewContent}
            totalPendingReview={totalPendingReview}
            userId={user?.id}
            onUpdate={() => selectedClientId && fetchClientData(selectedClientId)}
            onViewScript={setStageScriptContent}
          />
        )}

        {/* Portfolio Tab - Unified Module */}
        {activeTab === 'portfolio' && selectedClientId && (
          <UnifiedContentModule
            clientId={selectedClientId}
            mode="client"
            showMetrics={false}
            showKreoonToggle={true}
            onContentUpdate={() => fetchClientData(selectedClientId)}
          />
        )}

        {/* Facturas Tab */}
        {activeTab === 'facturas' && selectedClientId && clientInfo && (
          <ClientInvoicesTab
            clientId={selectedClientId}
            clientName={clientInfo.name}
            orgName="Kreoon"
          />
        )}

        {/* Company Tab */}
        {activeTab === 'company' && (
          <ClientCompanyTab
            clientInfo={clientInfo}
            packages={packages}
            content={content}
            totalInvested={totalInvested}
            avgViewsPerVideo={avgViewsPerVideo}
            isEditingCompany={isEditingCompany}
            setIsEditingCompany={setIsEditingCompany}
            editForm={editForm}
            setEditForm={setEditForm}
            savingCompany={savingCompany}
            onSave={handleSaveCompany}
          />
        )}
      </div>

      {/* Review Dialog */}
      <ClientContentReviewDialog
        selectedContent={selectedContent}
        onClose={() => { setSelectedContent(null); setFeedback(''); }}
        feedback={feedback}
        setFeedback={setFeedback}
        submitting={submitting}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Product Detail Dialog - Usando el mismo componente que los admins */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        readOnly={true}
        onResearchComplete={(updated) => {
          // Refrescar el producto seleccionado para que las pestañas nuevas
          // (Comunidad, SEO, Partnerships, etc.) muestren el contenido recien generado.
          setSelectedProduct(updated as any);
          if (selectedClientId) fetchClientData(selectedClientId, { silent: true });
        }}
      />

      {/* Stage Content Script Review Dialog */}
      {stageScriptContent && (
        <ClientScriptReview
          content={stageScriptContent}
          userId={user?.id}
          open={!!stageScriptContent}
          onOpenChange={(open) => !open && setStageScriptContent(null)}
          onUpdate={() => selectedClientId && fetchClientData(selectedClientId)}
        />
      )}

      {/* Fullscreen Review Viewer */}
      {showFullscreenReview && videoReviewContent.length > 0 && (
        <FullscreenContentViewer
          items={videoReviewContent.map(c => ({
            id: c.id,
            title: c.title,
            thumbnail_url: c.thumbnail_url,
            video_url: c.video_url,
            video_urls: c.video_urls,
            bunny_embed_url: c.bunny_embed_url,
            status: c.status,
            creator: c.creator,
            script: c.script,
            description: c.description
          }))}
          initialIndex={fullscreenStartIndex}
          onClose={() => setShowFullscreenReview(false)}
          onApprove={async (item, feedbackText) => {
            // Use centralized UP-aware status change
            await updateContentStatusWithUP({
              contentId: item.id,
              oldStatus: item.status as ContentStatus,
              newStatus: 'approved'
            });
            
            // Update approved_by separately
            await supabase
              .from('content')
              .update({ approved_by: user?.id })
              .eq('id', item.id);
            
            if (feedbackText) {
              await supabase.from('content_comments').insert({
                content_id: item.id,
                user_id: user?.id,
                comment: `Aprobado: ${feedbackText}`
              });
            }
            
            toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
            if (selectedClientId) fetchClientData(selectedClientId);
          }}
          onReject={async (item, feedbackText) => {
            // Use centralized UP-aware status change
            await updateContentStatusWithUP({
              contentId: item.id,
              oldStatus: item.status as ContentStatus,
              newStatus: 'issue'
            });
            
            // Update notes separately
            await supabase
              .from('content')
              .update({ notes: feedbackText })
              .eq('id', item.id);
            
            await supabase.from('content_comments').insert({
              content_id: item.id,
              user_id: user?.id,
              comment: `Correcciones solicitadas: ${feedbackText}`
            });
            
            toast({ title: 'Enviado a corrección', description: 'El editor realizará los cambios solicitados' });
            if (selectedClientId) fetchClientData(selectedClientId);
          }}
          showActions={true}
          mode="review"
        />
      )}

      {/* UX-C01: AlertDialog para confirmar eliminación de producto */}
      <AlertDialog
        open={!!deleteProductDialog}
        onOpenChange={(open) => { if (!open) setDeleteProductDialog(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteProductDialog?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteProduct}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
