import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FieldRow, SectionCard } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { DollarSign, CheckCircle } from 'lucide-react';

export function PaymentsTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
}: TabProps) {
  const canEditPayments = permissions.can('content.payments', 'edit');

  return (
    <div className="space-y-6">
      {/* Creator Payment */}
      <SectionCard title="Pago Creador" iconEmoji="🧍‍♂️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Monto">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={editMode}
              editComponent={
                <Input
                  type="number"
                  value={formData.creator_payment || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, creator_payment: parseFloat(e.target.value) || 0 }))}
                />
              }
              viewComponent={
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formData.creator_payment?.toLocaleString() || 0}
                </p>
              }
            />
          </FieldRow>

          <FieldRow label="Estado">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={editMode}
              editComponent={
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="creator_paid"
                    checked={formData.creator_paid}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, creator_paid: !!checked }))}
                  />
                  <Label htmlFor="creator_paid">Pagado</Label>
                </div>
              }
              viewComponent={
                formData.creator_paid ? (
                  <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>
                ) : (
                  <Badge variant="secondary">Pendiente</Badge>
                )
              }
            />
          </FieldRow>
        </div>
      </SectionCard>

      {/* Editor Payment */}
      <SectionCard title="Pago Editor" iconEmoji="🎬">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Monto">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={editMode}
              editComponent={
                <Input
                  type="number"
                  value={formData.editor_payment || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, editor_payment: parseFloat(e.target.value) || 0 }))}
                />
              }
              viewComponent={
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formData.editor_payment?.toLocaleString() || 0}
                </p>
              }
            />
          </FieldRow>

          <FieldRow label="Estado">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={editMode}
              editComponent={
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editor_paid"
                    checked={formData.editor_paid}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, editor_paid: !!checked }))}
                  />
                  <Label htmlFor="editor_paid">Pagado</Label>
                </div>
              }
              viewComponent={
                formData.editor_paid ? (
                  <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>
                ) : (
                  <Badge variant="secondary">Pendiente</Badge>
                )
              }
            />
          </FieldRow>
        </div>
      </SectionCard>

      {/* Invoiced */}
      <SectionCard title="Facturación" iconEmoji="📄">
        <FieldRow label="Estado de Factura">
          <EditableField
            permissions={permissions}
            resource="content.payments"
            editMode={editMode}
            editComponent={
              <div className="flex items-center gap-2">
                <Checkbox
                  id="invoiced"
                  checked={formData.invoiced}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, invoiced: !!checked }))}
                />
                <Label htmlFor="invoiced">Facturado</Label>
              </div>
            }
            viewComponent={
              formData.invoiced ? (
                <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Facturado</Badge>
              ) : (
                <Badge variant="secondary">Sin facturar</Badge>
              )
            }
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}
