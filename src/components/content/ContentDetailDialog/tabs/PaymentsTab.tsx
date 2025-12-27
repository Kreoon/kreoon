import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TabProps } from '../types';
import { DollarSign, CheckCircle } from 'lucide-react';

interface PaymentsTabProps extends TabProps {}

export function PaymentsTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions
}: PaymentsTabProps) {
  const canEditPayments = permissions.can('content.payments', 'edit');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pago Creador */}
        <div className="p-4 rounded-lg border space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pago Creador
          </h4>
          {editMode && canEditPayments ? (
            <>
              <Input
                type="number"
                value={formData.creator_payment}
                onChange={(e) => setFormData((prev) => ({ 
                  ...prev, 
                  creator_payment: parseFloat(e.target.value) || 0 
                }))}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="creator_paid"
                  checked={formData.creator_paid}
                  onCheckedChange={(checked) => setFormData((prev) => ({ 
                    ...prev, 
                    creator_paid: !!checked 
                  }))}
                />
                <Label htmlFor="creator_paid">Pagado</Label>
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">${content?.creator_payment?.toLocaleString() || 0}</p>
              <Badge variant={content?.creator_paid ? "default" : "secondary"}>
                {content?.creator_paid ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Pagado</>
                ) : "Pendiente"}
              </Badge>
            </>
          )}
        </div>

        {/* Pago Editor */}
        <div className="p-4 rounded-lg border space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pago Editor
          </h4>
          {editMode && canEditPayments ? (
            <>
              <Input
                type="number"
                value={formData.editor_payment}
                onChange={(e) => setFormData((prev) => ({ 
                  ...prev, 
                  editor_payment: parseFloat(e.target.value) || 0 
                }))}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editor_paid"
                  checked={formData.editor_paid}
                  onCheckedChange={(checked) => setFormData((prev) => ({ 
                    ...prev, 
                    editor_paid: !!checked 
                  }))}
                />
                <Label htmlFor="editor_paid">Pagado</Label>
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">${content?.editor_payment?.toLocaleString() || 0}</p>
              <Badge variant={content?.editor_paid ? "default" : "secondary"}>
                {content?.editor_paid ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Pagado</>
                ) : "Pendiente"}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Facturado */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2">
          {editMode && canEditPayments ? (
            <>
              <Checkbox
                id="invoiced"
                checked={formData.invoiced}
                onCheckedChange={(checked) => setFormData((prev) => ({ 
                  ...prev, 
                  invoiced: !!checked 
                }))}
              />
              <Label htmlFor="invoiced">Facturado</Label>
            </>
          ) : (
            <Badge variant={content?.invoiced ? "default" : "outline"}>
              {content?.invoiced ? "Facturado" : "Sin facturar"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
