import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS, Product } from '@/types/database';
import { ContentDetailDialog } from '@/components/content/ContentDetailDialog/index';
import { KpiContentDialog } from '@/components/dashboard/KpiContentDialog';
import { 
  Lightbulb, 
  FileText, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Wand2,
  Play,
  Clock,
  TrendingUp,
  Send,
  Scroll
} from 'lucide-react';
import { MedievalBanner } from '@/components/layout/MedievalBanner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "primary",
  onClick,
  subtitle
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "orange";
  onClick?: () => void;
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    success: "from-success/20 to-success/5 border-success/30",
    warning: "from-warning/20 to-warning/5 border-warning/30",
    info: "from-info/20 to-info/5 border-info/30",
    destructive: "from-destructive/20 to-destructive/5 border-destructive/30",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    orange: "text-orange-500",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-4",
        "bg-gradient-to-br backdrop-blur-xl",
        "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        colorClasses[color],
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50", iconColors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default function StrategistDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState<Content[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // AI Script Generator State
  const [generatingScript, setGeneratingScript] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedAngle, setSelectedAngle] = useState<string>("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  
  const [kpiDialog, setKpiDialog] = useState<{
    open: boolean;
    title: string;
    content: Content[];
  }>({ open: false, title: '', content: [] });

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch content where user is strategist
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          client:clients(*),
          product_rel:products(*)
        `)
        .eq('strategist_id', user.id)
        .order('created_at', { ascending: false });

      if (contentError) {
        console.error('Content error:', contentError);
      }
      setContent((contentData || []) as Content[]);

      // Fetch products for script generation - only for clients in user's current organization
      const { data: authProfile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const orgId = authProfile?.current_organization_id;

      let productsQuery = supabase
        .from('products')
        .select('*, client:clients(organization_id)')
        .order('name');

      const { data: productsData } = await productsQuery;

      // Filter products to only those belonging to clients in the current org
      const filteredProducts = orgId
        ? (productsData || []).filter((p: any) => p.client?.organization_id === orgId)
        : productsData || [];

      // Remove the partial `client` join so it matches our local `Product` type
      const sanitizedProducts = filteredProducts.map(({ client, ...p }: any) => p);

      setProducts(sanitizedProducts as Product[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleGenerateScript = async () => {
    if (!selectedProduct) {
      toast({
        title: 'Selecciona un producto',
        description: 'Debes seleccionar un producto para generar el guión',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingScript(true);
    setGeneratedScript("");

    try {
      const response = await supabase.functions.invoke('generate-script', {
        body: {
          product_name: selectedProduct.name,
          strategy: selectedProduct.strategy || '',
          market_research: selectedProduct.market_research || '',
          ideal_avatar: selectedProduct.ideal_avatar || '',
          sales_angle: selectedAngle || (selectedProduct.sales_angles?.[0] || ''),
          additional_context: additionalContext
        }
      });

      if (response.error) {
        if (response.error.message?.includes('429')) {
          toast({
            title: 'Límite de solicitudes',
            description: 'Has excedido el límite de solicitudes. Intenta de nuevo en unos minutos.',
            variant: 'destructive'
          });
        } else if (response.error.message?.includes('402')) {
          toast({
            title: 'Créditos agotados',
            description: 'Necesitas agregar créditos a tu workspace de Lovable.',
            variant: 'destructive'
          });
        } else {
          throw response.error;
        }
        return;
      }

      // Handle MODULE_INACTIVE error
      if (response.data?.error === 'MODULE_INACTIVE') {
        toast({
          title: 'IA no habilitada',
          description: response.data?.message || "El módulo de IA 'Generación de Guiones' no está activado. Un administrador debe habilitarlo en Configuración → IA & Modelos.",
          variant: 'destructive'
        });
        return;
      }

      setGeneratedScript(response.data?.script || '');
      toast({ title: 'Guión generado exitosamente' });
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el guión. Intenta de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingScript(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    toast({ title: 'Guión copiado al portapapeles' });
  };

  const openKpiDialog = (title: string, contentList: Content[]) => {
    setKpiDialog({ open: true, title, content: contentList });
  };

  // Metrics
  const draftContent = content.filter(c => c.status === 'draft');
  const scriptApprovedContent = content.filter(c => c.status === 'script_approved');
  const assignedContent = content.filter(c => c.status === 'assigned');
  const inProgressContent = content.filter(c => ['recording', 'editing'].includes(c.status));
  const approvedContent = content.filter(c => ['approved', 'delivered', 'paid'].includes(c.status));

  // Progress
  const completedCount = approvedContent.length;
  const progressPercent = content.length > 0 ? (completedCount / content.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Banner */}
      <MedievalBanner
        icon={Scroll}
        title="KREOON Board"
        subtitle={`Bienvenido, ${profile?.full_name}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard
          title="Total Asignados"
          value={content.length}
          icon={FileText}
          color="orange"
          onClick={() => openKpiDialog('Total Asignados', content)}
        />
        <StatsCard
          title="En Borrador"
          value={draftContent.length}
          icon={Clock}
          color="warning"
          onClick={() => openKpiDialog('En Borrador', draftContent)}
        />
        <StatsCard
          title="Guión Aprobado"
          value={scriptApprovedContent.length}
          icon={FileText}
          color="info"
          onClick={() => openKpiDialog('Guión Aprobado', scriptApprovedContent)}
        />
        <StatsCard
          title="En Progreso"
          value={inProgressContent.length}
          icon={Play}
          color="primary"
          onClick={() => openKpiDialog('En Progreso', inProgressContent)}
        />
        <StatsCard
          title="Completados"
          value={approvedContent.length}
          icon={CheckCircle2}
          color="success"
          onClick={() => openKpiDialog('Completados', approvedContent)}
        />
      </div>

      {/* Progress Card */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Progreso General</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {completedCount} de {content.length} completados
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI Script Generator */}
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand2 className="w-5 h-5 text-orange-500" />
              Generador de Guiones con IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct?.sales_angles && selectedProduct.sales_angles.length > 0 && (
              <div className="space-y-2">
                <Label>Ángulo de Venta</Label>
                <Select value={selectedAngle} onValueChange={setSelectedAngle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ángulo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.sales_angles.map((angle, idx) => (
                      <SelectItem key={idx} value={angle}>
                        {angle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Contexto adicional (opcional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Indicaciones específicas para el guión..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerateScript} 
              disabled={generatingScript || !selectedProductId}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {generatingScript ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar Guión
                </>
              )}
            </Button>

            {generatedScript && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Guión Generado</Label>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Send className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                  {generatedScript}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Contenido Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.slice(0, 6).map(item => (
                <div 
                  key={item.id} 
                  className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setSelectedContent(item)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.client?.name || 'Sin cliente'}</p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[item.status]}`} variant="secondary">
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                </div>
              ))}
              {content.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-semibold mb-2">Sin proyectos asignados</h4>
                  <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Detail Dialog */}
      <ContentDetailDialog
        content={selectedContent}
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
        onUpdate={() => {
          fetchData();
          setSelectedContent(null);
        }}
      />

      {/* KPI Content Dialog */}
      <KpiContentDialog
        title={kpiDialog.title}
        content={kpiDialog.content}
        open={kpiDialog.open}
        onOpenChange={(open) => setKpiDialog(prev => ({ ...prev, open }))}
        onSelectContent={setSelectedContent}
      />
    </div>
  );
}
