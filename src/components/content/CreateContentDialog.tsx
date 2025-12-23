import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Package, FileText, Pencil, Target, TrendingUp } from "lucide-react";
import { ScriptGenerator } from "./ScriptGenerator";

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectOption {
  id: string;
  name: string;
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

export function CreateContentDialog({ open, onOpenChange, onSuccess }: CreateContentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [clientId, setClientId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [editorId, setEditorId] = useState("");
  const [strategistId, setStrategistId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [campaignWeek, setCampaignWeek] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [script, setScript] = useState("");
  const [description, setDescription] = useState("");
  const [creatorPayment, setCreatorPayment] = useState("");
  const [editorPayment, setEditorPayment] = useState("");
  const [hooksCount, setHooksCount] = useState(1);
  const [packageId, setPackageId] = useState("");
  
  // Guidelines
  const [editorGuidelines, setEditorGuidelines] = useState("");
  const [strategistGuidelines, setStrategistGuidelines] = useState("");
  const [traffickerGuidelines, setTraffickerGuidelines] = useState("");
  
  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);
  
  // Client-specific data
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [clientProducts, setClientProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open]);

  // Fetch client's packages and products when client changes
  useEffect(() => {
    if (clientId) {
      fetchClientData(clientId);
    } else {
      setClientPackages([]);
      setClientProducts([]);
      setPackageId("");
      setProductId("");
      setSelectedProduct(null);
      setHooksCount(1);
    }
  }, [clientId]);

  // Update hooks count when package changes
  useEffect(() => {
    if (packageId) {
      const pkg = clientPackages.find(p => p.id === packageId);
      if (pkg?.hooks_per_video && pkg.hooks_per_video > 0) {
        setHooksCount(pkg.hooks_per_video);
      }
    }
  }, [packageId, clientPackages]);

  // Update selected product when productId changes
  useEffect(() => {
    if (productId) {
      const product = clientProducts.find(p => p.id === productId);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, clientProducts]);

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
    // Fetch clients
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(clientsData || []);

    // Fetch creators
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
  };

  const resetForm = () => {
    setTitle("");
    setProductId("");
    setClientId("");
    setCreatorId("");
    setEditorId("");
    setStrategistId("");
    setDeadline("");
    setStartDate("");
    setCampaignWeek("");
    setReferenceUrl("");
    setScript("");
    setDescription("");
    setCreatorPayment("");
    setEditorPayment("");
    setHooksCount(1);
    setPackageId("");
    setClientPackages([]);
    setClientProducts([]);
    setSelectedProduct(null);
    setEditorGuidelines("");
    setStrategistGuidelines("");
    setTraffickerGuidelines("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El nombre del video es requerido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('content').insert({
        title: title.trim(),
        product: selectedProduct?.name || null,
        product_id: productId || null,
        client_id: clientId || null,
        creator_id: creatorId || null,
        editor_id: editorId || null,
        strategist_id: strategistId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        campaign_week: campaignWeek.trim() || null,
        reference_url: referenceUrl.trim() || null,
        script: script.trim() || null,
        description: description.trim() || null,
        creator_payment: creatorPayment ? parseFloat(creatorPayment) : 0,
        editor_payment: editorPayment ? parseFloat(editorPayment) : 0,
        hooks_count: hooksCount,
        video_urls: Array(hooksCount).fill(''),
        editor_guidelines: editorGuidelines.trim() || null,
        strategist_guidelines: strategistGuidelines.trim() || null,
        trafficker_guidelines: traffickerGuidelines.trim() || null,
        status: 'draft',
        creator_assigned_at: creatorId ? new Date().toISOString() : null,
        editor_assigned_at: editorId ? new Date().toISOString() : null
      });

      if (error) throw error;

      toast({
        title: "Proyecto creado",
        description: "El proyecto se ha creado exitosamente"
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nombre del Video *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Video testimonial Q1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignWeek">Campaña / Semana</Label>
                <Input
                  id="campaignWeek"
                  value={campaignWeek}
                  onChange={(e) => setCampaignWeek(e.target.value)}
                  placeholder="Ej: Semana 1 - Enero"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Package selector */}
              <div className="space-y-2">
                <Label htmlFor="package">Paquete de Contenido</Label>
                <Select value={packageId} onValueChange={setPackageId} disabled={!clientId || clientPackages.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={clientId ? (clientPackages.length > 0 ? "Seleccionar paquete" : "Sin paquetes") : "Primero selecciona un cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientPackages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          {pkg.name}
                          {pkg.is_active && <Badge variant="secondary" className="text-xs ml-1">Activo</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product selector */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={productId} onValueChange={setProductId} disabled={!clientId || clientProducts.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={clientId ? (clientProducts.length > 0 ? "Seleccionar producto" : "Sin productos registrados") : "Primero selecciona un cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Variables count selector */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <Label className="font-medium">Cantidad de Variables (Videos Finales)</Label>
            </div>
            <div className="flex items-center gap-4">
              <Select value={String(hooksCount)} onValueChange={(v) => setHooksCount(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {packageId && clientPackages.find(p => p.id === packageId)?.hooks_per_video 
                  ? `Predefinido por paquete "${clientPackages.find(p => p.id === packageId)?.name}"`
                  : "Define cuántos videos finales se entregarán"
                }
              </p>
            </div>
          </div>

          <Separator />

          {/* Equipo */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Equipo Asignado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creator">Creador</Label>
                <Select value={creatorId} onValueChange={setCreatorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar creador" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editor">Editor</Label>
                <Select value={editorId} onValueChange={setEditorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar editor" />
                  </SelectTrigger>
                  <SelectContent>
                    {editors.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategist">Estratega</Label>
                <Select value={strategistId} onValueChange={setStrategistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estratega" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategists.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Fecha Límite de Entrega</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* URLs */}
          <div className="space-y-2">
            <Label htmlFor="referenceUrl">URL Video Referencia</Label>
            <Input
              id="referenceUrl"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <Separator />

          {/* Pagos */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pagos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creatorPayment">Pago Creador (COP)</Label>
                <Input
                  id="creatorPayment"
                  type="number"
                  value={creatorPayment}
                  onChange={(e) => setCreatorPayment(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editorPayment">Pago Editor (COP)</Label>
                <Input
                  id="editorPayment"
                  type="number"
                  value={editorPayment}
                  onChange={(e) => setEditorPayment(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Guión */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Guión</h3>
            </div>
            
            {/* AI Script Generator */}
            <ScriptGenerator 
              product={selectedProduct} 
              onScriptGenerated={(generatedContent) => {
                console.log("[CreateContentDialog] onScriptGenerated", {
                  script: generatedContent.script?.length,
                  editor: generatedContent.editor_guidelines?.length,
                  strategist: generatedContent.strategist_guidelines?.length,
                  trafficker: generatedContent.trafficker_guidelines?.length,
                });
                setScript(generatedContent.script);
                if (generatedContent.editor_guidelines) {
                  setEditorGuidelines(generatedContent.editor_guidelines);
                }
                if (generatedContent.strategist_guidelines) {
                  setStrategistGuidelines(generatedContent.strategist_guidelines);
                }
                if (generatedContent.trafficker_guidelines) {
                  setTraffickerGuidelines(generatedContent.trafficker_guidelines);
                }
              }} 
            />
            
            <div className="space-y-2">
              <Label htmlFor="script">Guión / Estrategia</Label>
              <Textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Escribe el guión o estrategia del contenido..."
                rows={6}
              />
            </div>
          </div>

          <Separator />

          {/* Pautas para Editor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pautas para Editor</h3>
            </div>
            <Textarea
              value={editorGuidelines}
              onChange={(e) => setEditorGuidelines(e.target.value)}
              placeholder="Instrucciones específicas para el editor: estilo de edición, música, efectos, ritmo del video..."
              rows={4}
            />
          </div>

          <Separator />

          {/* Pautas para Estratega */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pautas para Estratega</h3>
            </div>
            <Textarea
              value={strategistGuidelines}
              onChange={(e) => setStrategistGuidelines(e.target.value)}
              placeholder="Indicaciones estratégicas: objetivos del contenido, mensaje clave, call to action..."
              rows={4}
            />
          </div>

          <Separator />

          {/* Pautas para Trafficker */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pautas para Trafficker</h3>
            </div>
            <Textarea
              value={traffickerGuidelines}
              onChange={(e) => setTraffickerGuidelines(e.target.value)}
              placeholder="Indicaciones para pauta: audiencia objetivo, plataformas, presupuesto sugerido, objetivos de campaña..."
              rows={4}
            />
          </div>

          <Separator />

          {/* Descripción adicional */}
          <div className="space-y-2">
            <Label htmlFor="description">Notas adicionales</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Proyecto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}