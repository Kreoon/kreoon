import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { updateContentStatusWithUP } from '@/hooks/useContentStatusWithUP';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { useNavigate, Navigate } from 'react-router-dom';
import { useBrandClient } from '@/hooks/useBrandClient';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { ClientFinanceChart } from '@/components/dashboard/ClientFinanceChart';
import { PortfolioButton } from '@/components/portfolio/PortfolioButton';
import { FullscreenContentViewer } from '@/components/content/FullscreenContentViewer';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { ReviewCard } from '@/components/content/ReviewCard';
import { ContentVideoCard } from '@/components/content/ContentVideoCard';
import { ScriptReviewCard } from '@/components/content/ScriptReviewCard';
import { UnifiedContentModule } from '@/components/content/unified';
// Realtime removed — updates only on explicit user actions
import { ProductDNAWizard } from '@/components/product-dna';
import { ClientDNATab } from '@/components/clients/dna';
import { ProductDetailDialog } from '@/components/products/ProductDetailDialog';
import { TechGrid, TechParticles, TechOrb } from '@/components/ui/tech-effects';
import { TechKpiCard } from '@/components/dashboard/TechKpiCard';
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
  Home,
  Heart,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
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
  Dna,
  Trash2,
  ShoppingBag,
  Megaphone,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

interface Product {
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

// Optimized animated number counter using requestAnimationFrame
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current || value === 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 800;
    let startTime: number | null = null;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationId = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Premium Stats Card
const PremiumStatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "primary",
  onClick,
  subtitle,
  prefix = "",
  suffix = ""
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: number;
  color?: "primary" | "success" | "warning" | "info" | "destructive";
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    success: "from-success/20 to-success/5 border-success/30",
    warning: "from-warning/20 to-warning/5 border-warning/30",
    info: "from-info/20 to-info/5 border-info/30",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30",
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-4 md:p-5",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-xl",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn(
        "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20",
        "bg-current blur-3xl transition-all duration-700 group-hover:scale-150",
        iconColors[color]
      )} />
      
      <div className={cn(
        "absolute right-3 top-3 p-2 rounded-xl",
        "bg-current/10 backdrop-blur-sm",
        "transition-transform duration-500 group-hover:scale-110"
      )}>
        <Icon className={cn("h-5 w-5", iconColors[color])} />
      </div>
      
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-success" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            ) : null}
            <span className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend > 0 && "+"}{trend}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { isImpersonating, effectiveClientId } = useImpersonation();
  const { brandClient, activeBrand, loading: brandClientLoading } = useBrandClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Detect independent brand member (no organization, just brand)
  const isBrandMember = !!(profile as any)?.active_brand_id ||
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
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [showFullscreenReview, setShowFullscreenReview] = useState(false);
  const [fullscreenStartIndex, setFullscreenStartIndex] = useState(0);
  const [showCreateProductWizard, setShowCreateProductWizard] = useState(false);

  // Edit company state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Create brand state (for users without brand)
  const [showCreateBrandDialog, setShowCreateBrandDialog] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [createBrandForm, setCreateBrandForm] = useState({
    name: '',
    industry: '',
    website: '',
    city: '',
    description: '',
  });

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

        // Fetch content WITHOUT JOIN to clients (avoids RLS timeout)
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('client_id', clientData.id)
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

  // Create brand for users without one
  const handleCreateBrand = async () => {
    if (!createBrandForm.name || !user?.id) {
      toast({ title: 'Error', description: 'El nombre de la marca es requerido', variant: 'destructive' });
      return;
    }

    setIsCreatingBrand(true);
    try {
      // Generate slug
      const slug = createBrandForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      // Create brand
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

      // Create brand membership
      await supabase.from('brand_members').insert({
        brand_id: newBrand.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

      // Update profile with active_brand_id
      await supabase
        .from('profiles')
        .update({ active_brand_id: newBrand.id, active_role: 'client' } as any)
        .eq('id', user.id);

      // Create associated client
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

      // Add owner to client_users
      if (newClient) {
        await supabase.from('client_users').insert({
          client_id: newClient.id,
          user_id: user.id,
          role: 'owner',
        });
      }

      toast({ title: 'Empresa creada', description: 'Tu empresa se ha creado correctamente' });
      setShowCreateBrandDialog(false);

      // Reload page to refresh brand context
      window.location.reload();
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

      toast({ title: 'Contenido aprobado', description: 'El contenido ha sido aprobado exitosamente' });
      setSelectedContent(null);
      setFeedback('');
      if (selectedClientId) fetchClientData(selectedClientId);
    } catch (error) {
      console.error('Error approving content:', error);
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

      toast({ title: 'Enviado a corrección', description: 'El editor realizará los cambios solicitados' });
      setSelectedContent(null);
      setFeedback('');
      if (selectedClientId) fetchClientData(selectedClientId);
    } catch (error) {
      console.error('Error rejecting content:', error);
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

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;
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
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={15} />
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-[hsl(270,100%,60%)]" />
          </motion.div>
          <motion.span
            className="text-primary text-sm font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Cargando portal...
          </motion.span>
        </motion.div>
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
                <img src={client.logo_url} alt={client.name} className="h-10 w-10 rounded-lg object-cover mr-3" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
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

    // Independent brand member without client yet - show create button
    if (isIndependentBrand && activeBrand && !brandClient) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <Building2 className="w-16 h-16 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Configurando tu empresa</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Estamos preparando tu espacio de trabajo. Esto tomará solo un momento...
          </p>
          <Button onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </div>
      );
    }

    // No brand and no client — show create brand option
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Building2 className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Crea tu empresa</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Comienza creando tu empresa para acceder a todas las funcionalidades de la plataforma.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setShowCreateBrandDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear mi Empresa
          </Button>
          <Button variant="outline" onClick={() => navigate('/marketplace')}>
            Ver Marketplace
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesion
          </Button>
        </div>

        {/* Create Brand Dialog */}
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
              <Button
                variant="outline"
                onClick={() => setShowCreateBrandDialog(false)}
                disabled={isCreatingBrand}
              >
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
    <div className="min-h-screen relative">
      {/* Tech Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={20} />
        <TechOrb size="lg" position="top-right" />
        <TechOrb size="md" position="bottom-left" delay={1} />
      </div>

      {/* Header - Tech Style */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl relative overflow-hidden">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {clientInfo.logo_url ? (
              <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              {userClients.length > 1 ? (
                <div className="relative">
                  <button
                    onClick={() => setShowClientSelector(!showClientSelector)}
                    className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    <h1 className="text-lg font-bold truncate">{clientInfo.name}</h1>
                    <svg 
                      className={cn("h-4 w-4 text-muted-foreground transition-transform", showClientSelector && "rotate-180")}
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {showClientSelector && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowClientSelector(false)} 
                      />
                      <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 border-b border-border/50 bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground px-2">Cambiar empresa</p>
                        </div>
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
                                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                                client.id === clientInfo.id 
                                  ? "bg-primary/10 text-primary" 
                                  : "hover:bg-muted"
                              )}
                            >
                              {client.logo_url ? (
                                <img src={client.logo_url} alt={client.name} className="h-8 w-8 rounded-lg object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <span className={cn(
                                "font-medium text-sm truncate",
                                client.id === clientInfo.id && "text-primary"
                              )}>
                                {client.name}
                              </span>
                              {client.id === clientInfo.id && (
                                <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground hidden sm:block">Portal de Cliente • {userClients.length} empresas</p>
                </div>
              ) : (
                <>
                  <h1 className="text-lg font-bold truncate">{clientInfo.name}</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Portal de Cliente</p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Portfolio Button */}
            <PortfolioButton userId={clientInfo.id} />

            {totalPendingReview > 0 && (
              <Button size="sm" onClick={() => setActiveTab('review')} className="gap-1">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{totalPendingReview} por revisar</span>
                <span className="sm:hidden">{totalPendingReview}</span>
              </Button>
            )}
            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg bg-success/10 border border-success/20">
              <Activity className="h-3 w-3 text-success animate-pulse" />
              <span className="text-xs font-medium text-success">En vivo</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-t border-border/30 px-2">
          {[
            { id: 'overview', label: 'Dashboard', icon: Home },
            { id: 'finance', label: 'Finanzas', icon: Wallet },
            { id: 'dna', label: 'ADN de Marca', icon: Dna },
            { id: 'products', label: 'ADN de Productos', icon: Package, badge: products.length },
            { id: 'review', label: 'Revisar', icon: Eye, badge: totalPendingReview },
            { id: 'content', label: 'Contenido', icon: Video },
            { id: 'company', label: 'Empresa', icon: Building2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 p-4 md:p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome - Tech Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold text-white">Hola, {profile?.full_name?.split(' ')[0] || 'Cliente'} 👋</h2>
              <p className="text-sm text-muted-foreground">Aquí está el resumen de tu cuenta</p>
            </motion.div>

            {/* Main KPIs - Tech Style */}
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TechKpiCard
                title="Inversión Total"
                value={totalInvested}
                prefix="$"
                icon={DollarSign}
                color="emerald"
                subtitle={`de $${totalValue.toLocaleString()}`}
                chartType="radial"
                goalValue={totalValue}
                size="sm"
              />
              <TechKpiCard
                title="Videos"
                value={content.length}
                icon={Video}
                color="violet"
                subtitle={`${deliveredContentCount} aprobados`}
                chartType="bar"
                chartData={[inProgressContent.length, approvedContent.length, content.length]}
                size="sm"
              />
              <TechKpiCard
                title="Vistas Totales"
                value={totalViews}
                icon={TrendingUp}
                color="cyan"
                chartType="sparkline"
                size="sm"
              />
              <TechKpiCard
                title="Likes"
                value={totalLikes}
                icon={Heart}
                color="rose"
                chartType="sparkline"
                size="sm"
              />
            </motion.div>

            {/* Marketplace KPIs */}
            {(marketplaceStats.activeProjects > 0 || marketplaceStats.activeCampaigns > 0 || marketplaceStats.completedProjects > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-border bg-gradient-to-br from-card to-background overflow-hidden relative">
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, hsl(280 100% 50% / 0.1), transparent 50%)',
                    }}
                  />
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30">
                          <ShoppingBag className="h-4 w-4 text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-white">Marketplace</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-purple-400"
                        onClick={() => navigate('/marketplace')}
                      >
                        Ver todo
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Megaphone className="h-4 w-4 text-purple-400" />
                          <span className="text-xs text-muted-foreground">Campañas</span>
                        </div>
                        <p className="text-xl font-bold text-purple-400">{marketplaceStats.activeCampaigns}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-muted-foreground">Proyectos Activos</span>
                        </div>
                        <p className="text-xl font-bold text-blue-400">{marketplaceStats.activeProjects}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="h-4 w-4 text-amber-400" />
                          <span className="text-xs text-muted-foreground">En Revisión</span>
                        </div>
                        <p className="text-xl font-bold text-amber-400">{marketplaceStats.inRevision}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-muted-foreground">Completados</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-400">{marketplaceStats.completedProjects}</p>
                      </div>
                    </div>
                    {marketplaceStats.totalInvested > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total invertido en Marketplace</span>
                        <span className="text-lg font-bold text-emerald-400">${marketplaceStats.totalInvested.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Overall Progress Bar - Tech Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border bg-gradient-to-br from-card to-background overflow-hidden relative">
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, hsl(270 100% 60% / 0.1), transparent 50%)',
                  }}
                />
                <CardContent className="p-4 md:p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="p-2 rounded-lg"
                        style={{
                          background: 'hsl(270 100% 60% / 0.15)',
                          border: '1px solid hsl(270 100% 60% / 0.3)',
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 10px hsl(270 100% 60% / 0.2)',
                            '0 0 20px hsl(270 100% 60% / 0.4)',
                            '0 0 10px hsl(270 100% 60% / 0.2)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Target className="h-5 w-5 text-[hsl(270,100%,60%)]" />
                      </motion.div>
                      <div>
                        <h3 className="font-semibold text-white">Progreso General</h3>
                        <p className="text-xs text-muted-foreground">
                          {content.length} contenidos en proceso
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.span 
                        className="text-3xl font-bold"
                        style={{ 
                          color: 'hsl(270 100% 60%)',
                          textShadow: '0 0 20px hsl(270 100% 60% / 0.4)',
                        }}
                      >
                        {overallProgress}%
                      </motion.span>
                      <p className="text-xs text-muted-foreground">completado</p>
                    </div>
                  </div>
                  
                  {/* Tech Progress Bar */}
                  <div className="h-3 bg-muted rounded-full overflow-hidden border border-[hsl(270,100%,60%,0.2)]">
                    <motion.div
                      className="h-full relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(90deg, hsl(270 100% 60%), hsl(300 100% 60%))',
                        boxShadow: '0 0 20px hsl(270 100% 60% / 0.5)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>
                  
                  {/* Stage Buttons */}
                  <div className="flex justify-between mt-4 gap-1 flex-wrap">
                    {[
                      { id: 'inicio', label: 'Inicio', statuses: ['draft', 'script_pending'], count: content.filter(c => ['draft', 'script_pending'].includes(c.status)).length },
                      { id: 'guion', label: 'Guión', statuses: ['script_approved', 'assigned'], count: content.filter(c => ['script_approved', 'assigned'].includes(c.status)).length },
                      { id: 'grabacion', label: 'Grabación', statuses: ['recording', 'recorded'], count: content.filter(c => ['recording', 'recorded'].includes(c.status)).length },
                      { id: 'edicion', label: 'Edición', statuses: ['editing', 'review'], count: content.filter(c => ['editing', 'review'].includes(c.status)).length },
                      { id: 'correccion', label: 'Corrección', statuses: ['issue'], count: content.filter(c => ['issue'].includes(c.status)).length },
                      { id: 'entrega', label: 'Entrega', statuses: ['delivered', 'corrected'], count: content.filter(c => ['delivered', 'corrected'].includes(c.status)).length },
                      { id: 'aprobado', label: 'Aprobado', statuses: ['approved', 'paid'], count: content.filter(c => ['approved', 'paid'].includes(c.status)).length },
                    ].map((stage) => (
                      <motion.button
                        key={stage.id}
                        onClick={() => {
                          if (stage.count > 0) {
                            setStageFilter(stageFilter === stage.id ? null : stage.id);
                            setActiveTab('content');
                          }
                        }}
                        disabled={stage.count === 0}
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all text-xs",
                          "border backdrop-blur-sm",
                          stage.count > 0 && "cursor-pointer",
                          stage.count === 0 && "opacity-40 cursor-not-allowed",
                          stageFilter === stage.id 
                            ? "bg-[hsl(270,100%,60%,0.2)] border-[hsl(270,100%,60%,0.5)] text-primary" 
                            : "border-[hsl(270,100%,60%,0.1)] hover:border-[hsl(270,100%,60%,0.3)] text-muted-foreground"
                        )}
                        whileHover={stage.count > 0 ? { scale: 1.05 } : {}}
                        whileTap={stage.count > 0 ? { scale: 0.95 } : {}}
                      >
                        <span className={stageFilter === stage.id ? "text-primary" : ""}>
                          {stage.label}
                        </span>
                        {stage.count > 0 && (
                          <Badge 
                            className={cn(
                              "h-5 text-[10px] border",
                              stageFilter === stage.id 
                                ? "bg-[hsl(270,100%,60%,0.3)] border-[hsl(270,100%,60%,0.5)] text-white" 
                                : "bg-muted border-[hsl(270,100%,60%,0.2)] text-[hsl(270,30%,70%)]"
                            )}
                          >
                            {stage.count}
                          </Badge>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <ClientFinanceChart
                    packages={packages}
                    content={content}
                    chartType="content-status"
                    title="Estado del Contenido"
                  />
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <ClientFinanceChart
                    packages={packages}
                    content={content}
                    chartType="engagement"
                    title="Engagement Mensual"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Pending Reviews Alert */}
            {totalPendingReview > 0 && (
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-500/20">
                        <Eye className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Tienes {scriptReviewContent.length > 0 ? `${scriptReviewContent.length} guión(es)` : ''} 
                          {scriptReviewContent.length > 0 && videoReviewContent.length > 0 ? ' y ' : ''}
                          {videoReviewContent.length > 0 ? `${videoReviewContent.length} video(s)` : ''} por revisar
                        </p>
                        <p className="text-xs text-muted-foreground">Revisa y aprueba tu contenido</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('review')}>
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Card */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Progreso del Paquete</h3>
                  <span className="text-xs text-muted-foreground">
                    {deliveredContentCount} de {totalContentPromised} videos
                  </span>
                </div>
                <Progress 
                  value={totalContentPromised > 0 ? (deliveredContentCount / totalContentPromised) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {contentPending > 0 ? `Faltan ${contentPending} videos por entregar` : 'Todos los videos entregados 🎉'}
                </p>
              </CardContent>
            </Card>

            {/* Contenido Aprobado Reciente */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Contenido Aprobado</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('content')}>
                  Ver todo
                </Button>
              </div>
              <div className="space-y-2">
                {content.filter(c => c.status === 'approved').slice(0, 4).map(item => {
                  // Resolve thumbnail: prefer thumbnail_url, fallback to Bunny video thumbnail
                  let thumbUrl: string | null = null;
                  if (item.thumbnail_url && !item.thumbnail_url.includes('iframe.mediadelivery.net')) {
                    thumbUrl = item.thumbnail_url;
                  } else {
                    // Extract thumbnail from first video URL (Bunny embed → thumbnail.jpg)
                    const videoUrl = (item.video_urls as string[] | undefined)?.find(u => u?.trim())
                      || item.video_url || item.bunny_embed_url || '';
                    const embedMatch = videoUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
                    if (embedMatch) {
                      thumbUrl = `https://vz-${embedMatch[1]}.b-cdn.net/${embedMatch[2]}/thumbnail.jpg`;
                    }
                  }
                  return (
                    <Card
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedContent(item)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="" className="h-full w-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Play className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.created_at || '')}</p>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600" variant="secondary">
                          Aprobado
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Finance Tab */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Control Financiero</h2>
              <p className="text-sm text-muted-foreground">Resumen de tu inversión y paquetes</p>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <PremiumStatsCard
                title="Total Pagado"
                value={totalInvested}
                prefix="$"
                icon={DollarSign}
                color="success"
              />
              <PremiumStatsCard
                title="Videos Aprobados"
                value={Math.round(approvedVideosValue)}
                prefix="$"
                icon={CheckCircle2}
                color="primary"
                subtitle={`${deliveredContentCount} videos`}
              />
              <PremiumStatsCard
                title={clientBalance >= 0 ? "Saldo a Favor" : "Saldo Pendiente"}
                value={Math.abs(Math.round(clientBalance))}
                prefix={clientBalance >= 0 ? "+$" : "-$"}
                icon={Wallet}
                color={clientBalance >= 0 ? "success" : "destructive"}
                subtitle={clientBalance >= 0 ? "Tienes crédito disponible" : "Monto por regularizar"}
              />
              <PremiumStatsCard
                title="Por Pagar"
                value={pendingPayment > 0 ? pendingPayment : 0}
                prefix="$"
                icon={Clock}
                color={pendingPayment > 0 ? "warning" : "success"}
                subtitle={`de $${totalValue.toLocaleString()} total`}
              />
              <PremiumStatsCard
                title="Costo por Video"
                value={Math.round(costPerFinalVideo)}
                prefix="$"
                icon={BarChart3}
                color="info"
                subtitle={`${totalFinalVideos} videos finales`}
              />
            </div>

            {/* Investment Chart */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <ClientFinanceChart
                  packages={packages}
                  content={content}
                  chartType="investment"
                  title="Inversión Mensual"
                />
              </CardContent>
            </Card>

            {/* Packages List */}
            <div>
              <h3 className="font-semibold mb-3">Mis Paquetes</h3>
              {packages.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-2">Sin paquetes</h4>
                    <p className="text-sm text-muted-foreground">Contacta al equipo para contratar un paquete</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {packages.map(pkg => (
                    <Card key={pkg.id} className={pkg.is_active ? 'border-primary/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-xs text-muted-foreground">{formatDate(pkg.created_at)}</p>
                          </div>
                          <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                            {pkg.is_active ? 'Activo' : 'Completado'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Videos</p>
                            <p className="font-semibold">{pkg.content_quantity}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Valor Total</p>
                            <p className="font-semibold">${Number(pkg.total_value).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Pagado</p>
                            <p className="font-semibold text-success">${Number(pkg.paid_amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Estado</p>
                            <Badge variant={pkg.payment_status === 'paid' ? 'default' : 'outline'} className="text-xs">
                              {pkg.payment_status === 'paid' ? 'Pagado' : pkg.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress bar for package */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Pago</span>
                            <span className="text-muted-foreground">
                              {Math.round((Number(pkg.paid_amount) / Number(pkg.total_value)) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(Number(pkg.paid_amount) / Number(pkg.total_value)) * 100} 
                            className="h-1.5"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DNA Tab */}
        {activeTab === 'dna' && selectedClientId && (
          <ClientDNATab clientId={selectedClientId} />
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Show wizard if creating new product */}
            {showCreateProductWizard ? (
              <ProductDNAWizard
                clientId={selectedClientId!}
                onComplete={() => {
                  setShowCreateProductWizard(false);
                  if (selectedClientId) {
                    fetchClientData(selectedClientId);
                  }
                }}
                onCancel={() => setShowCreateProductWizard(false)}
              />
            ) : (
              <>
                {/* Header with CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold mb-1">Mis Productos</h2>
                    <p className="text-sm text-muted-foreground">
                      Productos y servicios que estamos promocionando para ti
                    </p>
                  </div>
                  
                  {/* Prominent Create Button */}
                  <Button 
                    size="lg" 
                    onClick={() => setShowCreateProductWizard(true)}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Crear Nuevo Producto
                  </Button>
                </div>

                {/* Create Product CTA Card when no products */}
                {products.length === 0 ? (
                  <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2">¡Crea tu primer producto!</h4>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Graba un audio describiendo tu producto y nuestra IA investigará tu mercado,
                        competencia y creará estrategias automáticamente.
                      </p>
                      <Button 
                        size="lg"
                        onClick={() => setShowCreateProductWizard(true)}
                        className="gap-2"
                      >
                        <Sparkles className="h-5 w-5" />
                        Crear Producto con IA
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {products.map((product) => (
                      <Card 
                        key={product.id} 
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <CardContent className="p-0">
                          {/* Product Header */}
                          <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {product.product_code && <span className="text-primary">#{product.product_code}</span>}{' '}
                                    {product.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    Creado: {product.created_at ? format(new Date(product.created_at), "d 'de' MMM, yyyy", { locale: es }) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver detalles
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(product.id, product.name);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Product Quick Info */}
                          <div className="p-4 space-y-4">
                            {/* Sales Angles */}
                            {product.sales_angles && product.sales_angles.length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                  <Sparkles className="h-3 w-3" /> Ángulos de Venta
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {product.sales_angles.map((angle, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {angle}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Quick Links */}
                            <div className="flex flex-wrap gap-2">
                              {product.brief_url && (
                                <a 
                                  href={product.brief_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <FolderOpen className="h-3 w-3" /> Brief
                                </a>
                              )}
                              {product.onboarding_url && (
                                <a 
                                  href={product.onboarding_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <FileText className="h-3 w-3" /> Onboarding
                                </a>
                              )}
                              {product.research_url && (
                                <a 
                                  href={product.research_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                                >
                                  <Target className="h-3 w-3" /> Investigación
                                </a>
                              )}
                            </div>

                            {/* Description preview */}
                            {product.description && (
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                <RichTextViewer content={product.description} className="prose-sm" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Review Tab - Inline Cards */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Scripts to Review */}
            {scriptReviewContent.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Guiones por Aprobar
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {scriptReviewContent.length} {scriptReviewContent.length === 1 ? 'guión pendiente' : 'guiones pendientes'} de aprobación
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scriptReviewContent.map((item) => (
                    <ScriptReviewCard
                      key={item.id}
                      content={item}
                      userId={user?.id}
                      onUpdate={() => selectedClientId && fetchClientData(selectedClientId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Videos to Review */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Video className="h-5 w-5 text-info" />
                    Videos por Revisar
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {videoReviewContent.length} {videoReviewContent.length === 1 ? 'video pendiente' : 'videos pendientes'} de revisión
                  </p>
                </div>
              </div>

              {videoReviewContent.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
                    <h3 className="font-semibold mb-2">Todo al día</h3>
                    <p className="text-sm text-muted-foreground">No hay videos pendientes de revisión</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videoReviewContent.map((item) => (
                    <ReviewCard
                      key={item.id}
                      content={item}
                      userId={user?.id}
                      onUpdate={() => selectedClientId && fetchClientData(selectedClientId)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Empty state when nothing to review */}
            {totalPendingReview === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-4" />
                  <h3 className="font-semibold mb-2">Todo al día</h3>
                  <p className="text-sm text-muted-foreground">No hay contenido pendiente de revisión</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Content Tab - Unified Module */}
        {activeTab === 'content' && selectedClientId && (
          <UnifiedContentModule
            clientId={selectedClientId}
            mode="client"
            showMetrics={false}
            showKreoonToggle={true}
            onContentUpdate={() => fetchClientData(selectedClientId)}
          />
        )}

        {/* Company Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">Datos de la Empresa</h2>
                <p className="text-sm text-muted-foreground">Administra la información de tu marca</p>
              </div>
              {!isEditingCompany && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingCompany(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-6">
                {isEditingCompany ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-name">Nombre de la empresa</Label>
                      <Input
                        id="company-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre de tu empresa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email de contacto</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={editForm.contact_email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="email@empresa.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-phone">Teléfono de contacto</Label>
                      <Input
                        id="contact-phone"
                        value={editForm.contact_phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                        placeholder="+57 300 000 0000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notas adicionales</Label>
                      <Textarea
                        id="notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Información adicional sobre tu empresa..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCompany} disabled={savingCompany} className="flex-1">
                        {savingCompany ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingCompany(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {clientInfo.logo_url ? (
                        <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold">{clientInfo.name}</h3>
                        <p className="text-sm text-muted-foreground">Cliente desde {formatDate(packages[packages.length - 1]?.created_at || '')}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email de contacto</Label>
                        <p className="font-medium">{clientInfo.contact_email || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <p className="font-medium">{clientInfo.contact_phone || 'No especificado'}</p>
                      </div>
                    </div>

                    {clientInfo.notes && (
                      <div className="pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Notas</Label>
                        <p className="text-sm mt-1">{clientInfo.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats about company */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{packages.length}</p>
                  <p className="text-xs text-muted-foreground">Paquetes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Video className="h-5 w-5 mx-auto text-info mb-2" />
                  <p className="text-2xl font-bold">{content.length}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-success mb-2" />
                  <p className="text-2xl font-bold">${(totalInvested / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">Invertido</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-warning mb-2" />
                  <p className="text-2xl font-bold">{avgViewsPerVideo.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Vistas/Video</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => { setSelectedContent(null); setFeedback(''); }}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg">{selectedContent?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedContent && (
            <ScrollArea className="max-h-[calc(90vh-80px)]">
              <div className="p-4 space-y-4">
                <Badge className={STATUS_COLORS[selectedContent.status]}>
                  {STATUS_LABELS[selectedContent.status]}
                </Badge>

                {selectedContent.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <p className="text-sm mt-1">{selectedContent.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Creador</Label>
                    <p>{selectedContent.creator?.full_name || 'Sin asignar'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Editor</Label>
                    <p>{selectedContent.editor?.full_name || 'Sin asignar'}</p>
                  </div>
                </div>

                {selectedContent.script && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Guión</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                      {selectedContent.script}
                    </div>
                  </div>
                )}

                {/* Video(s) inline */}
                {(() => {
                  const urls = (selectedContent.video_urls as string[] | undefined)?.filter(u => u?.trim()) || [];
                  const singleUrl = selectedContent.video_url || selectedContent.bunny_embed_url;
                  const allUrls = urls.length > 0 ? urls : (singleUrl ? [singleUrl] : []);
                  if (allUrls.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {allUrls.length > 1 ? `Videos (${allUrls.length})` : 'Video'}
                      </Label>
                      {allUrls.map((url, i) => (
                        <div key={i} className="rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: '350px' }}>
                          <AutoPauseVideo
                            src={url}
                            contentId={selectedContent.id}
                            thumbnailUrl={selectedContent.thumbnail_url}
                            className="w-full h-full"
                            autoPlay={false}
                            muted
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {selectedContent.status === 'review' && (
                  <>
                    <div>
                      <Label htmlFor="feedback" className="text-xs text-muted-foreground">
                        Comentarios (opcional para aprobar, requerido para rechazar)
                      </Label>
                      <Textarea
                        id="feedback"
                        placeholder="Escribe tus comentarios o correcciones..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-success hover:bg-success/90" 
                        onClick={handleApprove}
                        disabled={submitting}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={handleReject}
                        disabled={submitting || !feedback}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Correcciones
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog - Usando el mismo componente que los admins */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        readOnly={true}
      />

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
    </div>
  );
}

// Content List Component with Quick Actions
function ContentList({ 
  items, 
  onSelect, 
  onStatusChange,
  userId,
  onUpdate,
  showRatings = false
}: { 
  items: Content[]; 
  onSelect: (c: Content) => void;
  onStatusChange?: (id: string, status: ContentStatus, notes?: string) => Promise<void>;
  userId?: string;
  onUpdate?: () => void;
  showRatings?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hay contenido en esta categoría</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <ContentVideoCard
          key={item.id}
          content={item}
          userId={userId}
          onStatusChange={onStatusChange}
          onUpdate={onUpdate}
          showRatings={showRatings}
        />
      ))}
    </div>
  );
}
