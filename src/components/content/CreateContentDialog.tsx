import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Package } from "lucide-react";

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

export function CreateContentDialog({ open, onOpenChange, onSuccess }: CreateContentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
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
  
  // Options lists
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);
  
  // Client package info
  const [clientPackage, setClientPackage] = useState<ClientPackage | null>(null);

  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open]);

  // Fetch client's active package when client changes
  useEffect(() => {
    if (clientId) {
      fetchClientPackage(clientId);
    } else {
      setClientPackage(null);
      setHooksCount(1);
    }
  }, [clientId]);

  const fetchClientPackage = async (clientId: string) => {
    const { data } = await supabase
      .from('client_packages')
      .select('id, name, hooks_per_video, is_active')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setClientPackage(data);
      // Pre-fill hooks count from package
      if (data.hooks_per_video && data.hooks_per_video > 0) {
        setHooksCount(data.hooks_per_video);
      }
    } else {
      setClientPackage(null);
    }
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
    setProduct("");
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
    setClientPackage(null);
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
        product: product.trim() || null,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
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
              <Label htmlFor="product">Producto</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Ej: Producto X"
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
              {/* Show package info if available */}
              {clientPackage && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {clientPackage.name}
                  </Badge>
                  {clientPackage.hooks_per_video && (
                    <Badge variant="outline" className="text-xs">
                      {clientPackage.hooks_per_video} hooks/video
                    </Badge>
                  )}
                </div>
              )}
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
          </div>

          {/* Hooks count selector */}
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <Label className="font-medium">Cantidad de Hooks (Videos Finales)</Label>
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
                {clientPackage?.hooks_per_video 
                  ? `Predefinido por paquete "${clientPackage.name}"`
                  : "Define cuántos videos finales se entregarán para este proyecto"
                }
              </p>
            </div>
          </div>

          {/* Equipo */}
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

          {/* Fechas */}
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

          {/* Pagos */}
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

          {/* Guión y estrategia */}
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

          <div className="space-y-2">
            <Label htmlFor="description">Descripción adicional</Label>
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
