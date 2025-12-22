import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientPackage, Product, PaymentStatus } from "@/types/database";
import { Save, Loader2 } from "lucide-react";
import { CurrencyInput, CurrencyDisplay, CurrencyBadge, type CurrencyType } from "@/components/ui/currency-input";

interface ClientPackageDialogProps {
  clientId: string;
  package_?: ClientPackage | null;
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientPackageDialog({ 
  clientId, 
  package_, 
  products,
  open, 
  onOpenChange,
  onSuccess 
}: ClientPackageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_value: 0,
    currency: "COP" as CurrencyType,
    content_quantity: 1,
    hooks_per_video: 1,
    creators_count: 1,
    products_count: 1,
    product_ids: [] as string[],
    payment_status: "pending" as PaymentStatus,
    paid_amount: 0,
    notes: ""
  });

  useEffect(() => {
    if (package_) {
      setFormData({
        name: package_.name || "",
        description: package_.description || "",
        total_value: package_.total_value || 0,
        currency: ((package_ as any).currency as CurrencyType) || "COP",
        content_quantity: package_.content_quantity || 1,
        hooks_per_video: package_.hooks_per_video || 1,
        creators_count: package_.creators_count || 1,
        products_count: package_.products_count || 1,
        product_ids: package_.product_ids || [],
        payment_status: package_.payment_status || "pending",
        paid_amount: package_.paid_amount || 0,
        notes: package_.notes || ""
      });
    } else {
      setFormData({
        name: "",
        description: "",
        total_value: 0,
        currency: "COP",
        content_quantity: 1,
        hooks_per_video: 1,
        creators_count: 1,
        products_count: 1,
        product_ids: [],
        payment_status: "pending",
        paid_amount: 0,
        notes: ""
      });
    }
  }, [package_, open]);

  const handleProductToggle = (productId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      product_ids: checked 
        ? [...prev.product_ids, productId]
        : prev.product_ids.filter(id => id !== productId),
      products_count: checked 
        ? prev.products_count + 1 
        : Math.max(1, prev.products_count - 1)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del paquete es requerido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = {
        client_id: clientId,
        name: formData.name,
        description: formData.description || null,
        total_value: formData.total_value,
        currency: formData.currency,
        content_quantity: formData.content_quantity,
        hooks_per_video: formData.hooks_per_video,
        creators_count: formData.creators_count,
        products_count: formData.product_ids.length || formData.products_count,
        product_ids: formData.product_ids,
        payment_status: formData.payment_status,
        paid_amount: formData.paid_amount,
        paid_at: formData.payment_status === 'paid' ? new Date().toISOString() : null,
        notes: formData.notes || null
      };

      if (package_) {
        const { error } = await supabase
          .from('client_packages')
          .update(data)
          .eq('id', package_.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_packages')
          .insert(data);
        if (error) throw error;
      }

      toast({
        title: package_ ? "Paquete actualizado" : "Paquete creado",
        description: "Los cambios se guardaron correctamente"
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el paquete",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingAmount = formData.total_value - formData.paid_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {package_ ? "Editar Paquete" : "Nuevo Paquete de Contenido"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Paquete *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Paquete Premium Q1 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <CurrencyInput
                value={formData.total_value}
                currency={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, total_value: value })}
                onCurrencyChange={(currency) => setFormData({ ...formData, currency })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del paquete..."
              rows={2}
            />
          </div>

          {/* Content Details */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-4">
            <h4 className="font-medium">Detalles del Contenido</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Cantidad de Videos</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.content_quantity}
                  onChange={(e) => setFormData({ ...formData, content_quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hooks por Video</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.hooks_per_video}
                  onChange={(e) => setFormData({ ...formData, hooks_per_video: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Creadores</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.creators_count}
                  onChange={(e) => setFormData({ ...formData, creators_count: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Productos</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.product_ids.length || formData.products_count}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Products Selection */}
          {products.length > 0 && (
            <div className="space-y-3">
              <Label>Productos Incluidos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {products.map(product => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={formData.product_ids.includes(product.id)}
                      onCheckedChange={(checked) => handleProductToggle(product.id, !!checked)}
                    />
                    <label 
                      htmlFor={product.id} 
                      className="text-sm cursor-pointer"
                    >
                      {product.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Section */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Estado de Pago</h4>
              <CurrencyBadge currency={formData.currency} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(value: PaymentStatus) => setFormData({ ...formData, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="partial">Pago Parcial</SelectItem>
                    <SelectItem value="paid">Pagado Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto Pagado</Label>
                <Input
                  type="number"
                  value={formData.paid_amount}
                  onChange={(e) => {
                    const paid = Number(e.target.value);
                    setFormData({ 
                      ...formData, 
                      paid_amount: paid,
                      payment_status: paid >= formData.total_value ? 'paid' : paid > 0 ? 'partial' : 'pending'
                    });
                  }}
                  max={formData.total_value}
                />
              </div>
              <div className="space-y-2">
                <Label>Pendiente</Label>
                <div className={`h-10 px-3 flex items-center rounded-md border ${pendingAmount > 0 ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-success/10 border-success/30 text-success'}`}>
                  <CurrencyDisplay value={pendingAmount} currency={formData.currency} />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas Adicionales</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas sobre este paquete..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {package_ ? "Guardar Cambios" : "Crear Paquete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}