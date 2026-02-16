import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

export default function PaymentsTab({ project, formData, setFormData, editMode, readOnly, typeConfig }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;

  const formatCurrency = (amount: number | undefined, currency: string = 'COP') => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  // Content source uses creator_payment / editor_payment
  if (project.source === 'content') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Finanzas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PaymentField
            label="Pago Creador"
            value={formData.creator_payment}
            onChange={(val) => setFormData((prev: Record<string, any>) => ({ ...prev, creator_payment: val }))}
            editing={isEditing}
            paid={formData.creator_paid}
          />
          <PaymentField
            label="Pago Editor"
            value={formData.editor_payment}
            onChange={(val) => setFormData((prev: Record<string, any>) => ({ ...prev, editor_payment: val }))}
            editing={isEditing}
            paid={formData.editor_paid}
          />
        </div>

        <div className="border-t pt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {formData.invoiced && <Badge variant="secondary">Facturado</Badge>}
          {formData.is_published && <Badge variant="secondary">Publicado</Badge>}
        </div>
      </div>
    );
  }

  // Marketplace source
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Finanzas del Proyecto
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-xs font-medium text-muted-foreground uppercase">Total</label>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(formData.total_price || project.totalPrice, project.currency)}
          </p>
        </div>

        {typeConfig.roles.primary.length > 0 && (
          <>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Pago Creador</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.creator_payout || project.creatorPayment, project.currency)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Pago Editor</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.editor_payout || project.editorPayment, project.currency)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase">Comision Plataforma</label>
              <p className="text-lg font-semibold mt-1">
                {formatCurrency(formData.platform_fee || project.platformFee, project.currency)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentField({
  label,
  value,
  onChange,
  editing,
  paid,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  editing: boolean;
  paid?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {paid && <Badge className="bg-green-500/10 text-green-600 text-xs">Pagado</Badge>}
      </div>
      {editing ? (
        <Input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="text-lg font-semibold"
        />
      ) : (
        <p className="text-lg font-semibold">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)}
        </p>
      )}
    </div>
  );
}
