import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { UnifiedProjectModal } from '@/components/projects/UnifiedProjectModal';
import { TechKpiDialog } from '@/components/dashboard/TechKpiDialog';
import { TechKpiCard } from '@/components/dashboard/TechKpiCard';
import { ThisMonthFilter, useThisMonthFilter } from '@/components/dashboard/ThisMonthFilter';
import { TechGrid, TechParticles, TechOrb } from '@/components/ui/tech-effects';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

export default function StrategistDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [thisMonthActive, setThisMonthActive] = useState(false);
  
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

  const content = useThisMonthFilter(allContent, thisMonthActive);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch content WITHOUT JOIN to clients (avoids RLS timeout)
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('strategist_id', user.id)
        .order('created_at', { ascending: false });

      if (contentError) {
        console.error('Content error:', contentError);
      }
      setAllContent((contentData || []) as Content[]);

      const { data: authProfile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const orgId = authProfile?.current_organization_id;

      const productsQuery = supabase
        .from('products')
        .select('*, client:clients(organization_id)')
        .order('name');

      const { data: productsData } = await productsQuery;

      const filteredProducts = orgId
        ? (productsData || []).filter((p: any) => p.client?.organization_id === orgId)
        : productsData || [];

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
            description: 'Necesitas agregar créditos a tu cuenta.',
            variant: 'destructive'
          });
        } else {
          throw response.error;
        }
        return;
      }

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
  const approvedContent = content.filter(c => ['approved', 'delivered', 'corrected', 'paid'].includes(c.status));

  // Progress
  const completedCount = approvedContent.length;
  const progressPercent = content.length > 0 ? (completedCount / content.length) * 100 : 0;

  // Chart data
  const chartData = [draftContent.length, scriptApprovedContent.length, inProgressContent.length, approvedContent.length];

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
            <Loader2 className="w-10 h-10 text-orange-500" />
          </motion.div>
          <motion.span
            className="text-orange-400 text-sm font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Cargando panel...
          </motion.span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Tech Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={25} />
        <TechOrb size="lg" position="top-right" />
        <TechOrb size="md" position="bottom-left" delay={1} />
      </div>

      <div className="relative z-10 space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <PageHeader
          icon={Scroll}
          title="KREOON Board"
          subtitle={`Bienvenido, ${profile?.full_name}`}
          action={
            <ThisMonthFilter isActive={thisMonthActive} onToggle={setThisMonthActive} />
          }
        />

        {/* Stats Grid - Tech Style */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-5 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <TechKpiCard
            title="Total Asignados"
            value={content.length}
            icon={FileText}
            color="amber"
            chartType="sparkline"
            chartData={chartData}
            onClick={() => openKpiDialog('Total Asignados', content)}
            size="sm"
          />
          <TechKpiCard
            title="En Borrador"
            value={draftContent.length}
            icon={Clock}
            color="amber"
            chartType="radial"
            goalValue={content.length}
            onClick={() => openKpiDialog('En Borrador', draftContent)}
            size="sm"
          />
          <TechKpiCard
            title="Guión Aprobado"
            value={scriptApprovedContent.length}
            icon={FileText}
            color="cyan"
            chartType="bar"
            onClick={() => openKpiDialog('Guión Aprobado', scriptApprovedContent)}
            size="sm"
          />
          <TechKpiCard
            title="En Progreso"
            value={inProgressContent.length}
            icon={Play}
            color="violet"
            chartType="bar"
            onClick={() => openKpiDialog('En Progreso', inProgressContent)}
            size="sm"
          />
          <TechKpiCard
            title="Completados"
            value={approvedContent.length}
            icon={CheckCircle2}
            color="emerald"
            chartType="radial"
            goalValue={content.length}
            onClick={() => openKpiDialog('Completados', approvedContent)}
            size="sm"
          />
        </motion.div>

        {/* Progress Card - Tech Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-[hsl(270,100%,60%,0.15)] bg-gradient-to-br from-card to-background overflow-hidden relative">
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(circle at 50% 0%, hsl(40 100% 50% / 0.1), transparent 50%)',
              }}
            />
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="p-2 rounded-sm"
                    style={{
                      background: 'hsl(40 100% 50% / 0.15)',
                      border: '1px solid hsl(40 100% 50% / 0.3)',
                    }}
                    animate={{
                      boxShadow: [
                        '0 0 10px hsl(40 100% 50% / 0.2)',
                        '0 0 20px hsl(40 100% 50% / 0.4)',
                        '0 0 10px hsl(40 100% 50% / 0.2)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </motion.div>
                  <h3 className="font-semibold text-sm text-amber-400">Progreso General</h3>
                </div>
                <span className="text-xs text-amber-400/70">
                  {completedCount} de {content.length} completados
                </span>
              </div>
              
              {/* Custom Tech Progress Bar */}
              <div className="h-3 bg-muted rounded-full overflow-hidden border border-amber-500/20">
                <motion.div
                  className="h-full relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(90deg, hsl(40 100% 50%), hsl(30 100% 50%))',
                    boxShadow: '0 0 20px hsl(40 100% 50% / 0.5)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <motion.div 
          className="grid lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* AI Script Generator - Tech Style */}
          <Card className="border-amber-500/20 bg-gradient-to-br from-card via-amber-500/5 to-background overflow-hidden relative">
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(40 100% 50% / 0.2), transparent 70%)' }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{
                    rotate: [0, 15, -15, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Wand2 className="w-5 h-5 text-amber-400" />
                </motion.div>
                <span className="text-amber-400">Generador de Guiones con IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="space-y-2">
                <Label className="text-amber-400/80">Producto</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="border-amber-500/30 bg-muted focus:border-amber-500/50">
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
                  <Label className="text-amber-400/80">Ángulo de Venta</Label>
                  <Select value={selectedAngle} onValueChange={setSelectedAngle}>
                    <SelectTrigger className="border-amber-500/30 bg-muted focus:border-amber-500/50">
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
                <Label className="text-amber-400/80">Contexto adicional (opcional)</Label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Indicaciones específicas para el guión..."
                  rows={3}
                  className="border-amber-500/30 bg-muted focus:border-amber-500/50"
                />
              </div>

              <Button 
                onClick={handleGenerateScript} 
                disabled={generatingScript || !selectedProductId}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                style={{
                  boxShadow: '0 0 20px hsl(40 100% 50% / 0.3)',
                }}
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
                <motion.div 
                  className="space-y-2 mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-amber-400">Guión Generado</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyToClipboard}
                      className="border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="p-4 bg-muted border border-amber-500/20 rounded-sm text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                    {generatedScript}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Recent Content - Tech Style */}
          <Card className="border-[hsl(270,100%,60%,0.15)] bg-gradient-to-br from-card to-background overflow-hidden relative">
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(270 100% 60% / 0.15), transparent 70%)' }}
            />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-[hsl(270,100%,60%)]" />
                <span className="text-primary">Contenido Reciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-2">
                {content.slice(0, 6).map((item, index) => (
                  <motion.div 
                    key={item.id} 
                    className="p-3 bg-muted border border-[hsl(270,100%,60%,0.1)] rounded-sm hover:border-[hsl(270,100%,60%,0.3)] cursor-pointer transition-all group"
                    onClick={() => setSelectedContent(item)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-sm bg-muted flex items-center justify-center flex-shrink-0 border border-[hsl(270,100%,60%,0.2)]">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover rounded-sm" />
                        ) : (
                          <Play className="h-4 w-4 text-[hsl(270,100%,60%)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-white group-hover:text-primary transition-colors">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.client?.name || 'Sin cliente'}</p>
                      </div>
                      <Badge className={cn("text-xs", STATUS_COLORS[item.status])} variant="secondary">
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
                {content.length === 0 && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Lightbulb className="w-12 h-12 mx-auto text-[hsl(270,100%,60%)] mb-4" />
                    </motion.div>
                    <h4 className="font-semibold mb-2 text-white">Sin proyectos asignados</h4>
                    <p className="text-sm text-muted-foreground">Cuando te asignen proyectos aparecerán aquí</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Detail Dialog */}
        <UnifiedProjectModal
          source="content"
          projectId={selectedContent?.id}
          open={!!selectedContent}
          onOpenChange={(open) => !open && setSelectedContent(null)}
          onUpdate={() => {
            fetchData();
            setSelectedContent(null);
          }}
        />

        {/* KPI Content Dialog - Tech Style */}
        <TechKpiDialog
          title={kpiDialog.title}
          content={kpiDialog.content}
          open={kpiDialog.open}
          onOpenChange={(open) => setKpiDialog(prev => ({ ...prev, open }))}
          onSelectContent={setSelectedContent}
        />
      </div>
    </div>
  );
}
