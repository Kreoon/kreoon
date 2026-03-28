import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldRow, SectionCard } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps } from '../types';
import { CheckCircle, Medal, Sparkles, Info, ShieldCheck, Ban } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useInternalOrgContent } from '@/hooks/useInternalOrgContent';

export function PaymentsTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  readOnly = false,
}: TabProps) {
  const effectiveEditMode = editMode && !readOnly;

  // Use centralized hook for internal org content detection - SINGLE SOURCE OF TRUTH
  const { isInternalOrgContent } = useInternalOrgContent(formData.client_id || content?.client_id);

  // CRITICAL: Internal org content has NO monetary payments - HIDE EVERYTHING
  if (isInternalOrgContent) {
    return (
      <div className="space-y-6">
        {/* Fixed Banner - Clear Communication */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                🏅 Contenido Interno de la Organización
              </span>
              <span className="text-sm text-muted-foreground">
                Este contenido es creado por embajadores. No tiene pago monetario. La recompensa se otorga en puntos UP.
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {/* UP Reward Section */}
        <SectionCard title="Recompensa UP" iconEmoji="🏅">
          <div className="p-4 rounded-sm bg-amber-500/5 border border-amber-500/20">
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
              <div className="p-3 rounded-sm bg-background/50 border">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Contenido</p>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Medal className="h-3 w-3 mr-1" />
                  Embajador Interno
                </Badge>
              </div>
              <div className="p-3 rounded-sm bg-background/50 border">
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

        {/* Payment Status - BLOCKED for Internal Content */}
        <SectionCard title="Estado de Pagos" iconEmoji="💰">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-sm bg-muted/30 border border-dashed">
              <div className="flex items-center gap-2 mb-1">
                <Ban className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pago Creador</p>
              </div>
              <Badge variant="secondary" className="bg-muted">
                No aplica (Contenido Interno)
              </Badge>
            </div>
            <div className="p-3 rounded-sm bg-muted/30 border border-dashed">
              <div className="flex items-center gap-2 mb-1">
                <Ban className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pago Editor</p>
              </div>
              <Badge variant="secondary" className="bg-muted">
                No aplica (Contenido Interno)
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
                <input
                  type="number"
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.creator_payment || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, creator_payment: parseFloat(e.target.value) || 0 }))}
                />
              }
              viewComponent={
                <p className="font-medium flex items-center gap-1">
                  ${formData.creator_payment?.toLocaleString() || 0}
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
                <input
                  type="number"
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.editor_payment || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, editor_payment: parseFloat(e.target.value) || 0 }))}
                />
              }
              viewComponent={
                <p className="font-medium flex items-center gap-1">
                  ${formData.editor_payment?.toLocaleString() || 0}
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
