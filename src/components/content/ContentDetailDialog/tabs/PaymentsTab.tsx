import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldRow, SectionCard } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { DollarSign, CheckCircle, Medal, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PaymentsTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  readOnly = false,
}: TabProps) {
  const effectiveEditMode = editMode && !readOnly;
  const canEditPayments = permissions.can('content.payments', 'edit') && !readOnly;

  // Detect if content is ambassador type
  const isAmbassadorContent = content?.is_ambassador_content === true;

  // Ambassador content - show special UI
  if (isAmbassadorContent) {
    return (
      <div className="space-y-6">
        {/* Ambassador Alert */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Medal className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center gap-2">
            <span className="font-medium text-amber-600 dark:text-amber-400">
              🏅 Proyecto de Marca Interna – Recompensa UP
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Este contenido es producido por embajadores sin pago monetario. La recompensa se otorga en puntos UP según las reglas de la organización.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </AlertDescription>
        </Alert>

        {/* UP Reward Section */}
        <SectionCard title="Recompensa UP" iconEmoji="🏅">
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">Sistema de Puntos UP</p>
                <p className="text-sm text-muted-foreground">
                  La recompensa se calcula automáticamente según las reglas configuradas
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Contenido</p>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Embajador Interno
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Recompensa</p>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Puntos UP
                </Badge>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Los puntos UP se otorgarán automáticamente cuando el contenido sea aprobado según la configuración de la organización.
            </p>
          </div>
        </SectionCard>

        {/* Payment Status - Read Only for Ambassador */}
        <SectionCard title="Estado de Pagos" iconEmoji="💰">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-sm text-muted-foreground mb-1">Pago Creador</p>
              <Badge variant="secondary" className="bg-muted">
                No aplica (Embajador)
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-sm text-muted-foreground mb-1">Pago Editor</p>
              <Badge variant="secondary" className="bg-muted">
                No aplica (Embajador)
              </Badge>
            </div>
          </div>
        </SectionCard>

        {/* Invoiced - Still applicable */}
        <SectionCard title="Facturación" iconEmoji="📄">
          <FieldRow label="Estado de Factura">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={effectiveEditMode}
              readOnly={readOnly}
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

  // Regular content - standard payment UI
  return (
    <div className="space-y-6">
      {/* Creator Payment */}
      <SectionCard title="Pago Creador" iconEmoji="🧍‍♂️">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Monto">
            <EditableField
              permissions={permissions}
              resource="content.payments"
              editMode={effectiveEditMode}
              readOnly={readOnly}
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
              editMode={effectiveEditMode}
              readOnly={readOnly}
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
              editMode={effectiveEditMode}
              readOnly={readOnly}
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
              editMode={effectiveEditMode}
              readOnly={readOnly}
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
            editMode={effectiveEditMode}
            readOnly={readOnly}
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
