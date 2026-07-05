import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Edit, Save, X, Loader2, Package, Video, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Content } from '@/types/database';

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

interface ClientPackage {
  id: string;
  total_value: number;
  paid_amount: number;
  content_quantity: number;
  hooks_per_video: number;
  created_at: string;
}

interface EditForm {
  name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
}

export interface ClientCompanyTabProps {
  clientInfo: ClientInfo;
  packages: ClientPackage[];
  content: Content[];
  totalInvested: number;
  avgViewsPerVideo: number;
  isEditingCompany: boolean;
  setIsEditingCompany: (v: boolean) => void;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  savingCompany: boolean;
  onSave: () => void;
}

function formatDate(date: string) {
  if (!date) return '';
  return format(new Date(date), "d MMM yyyy", { locale: es });
}

export function ClientCompanyTab({
  clientInfo, packages, content, totalInvested, avgViewsPerVideo,
  isEditingCompany, setIsEditingCompany, editForm, setEditForm, savingCompany, onSave,
}: ClientCompanyTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold mb-1">Datos de la Empresa</h2>
          <p className="text-sm text-muted-foreground">Administra la información de tu marca</p>
        </div>
        {!isEditingCompany && (
          <Button variant="outline" size="sm" onClick={() => setIsEditingCompany(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {isEditingCompany ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Nombre de la empresa</Label>
                <Input
                  id="company-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de tu empresa"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Email de contacto</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Teléfono de contacto</Label>
                <Input
                  id="contact-phone"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="+57 300 000 0000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Información adicional sobre tu empresa..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={savingCompany} className="flex-1">
                  {savingCompany ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setIsEditingCompany(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {clientInfo.logo_url ? (
                  <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-16 w-16 rounded-sm object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-sm bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{clientInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">Cliente desde {formatDate(packages[packages.length - 1]?.created_at || '')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Email de contacto</Label>
                  <p className="font-medium">{clientInfo.contact_email || 'No especificado'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{clientInfo.contact_phone || 'No especificado'}</p>
                </div>
              </div>

              {clientInfo.notes && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <p className="text-sm mt-1">{clientInfo.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{packages.length}</p>
            <p className="text-xs text-muted-foreground">Paquetes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Video className="h-5 w-5 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">{content.length}</p>
            <p className="text-xs text-muted-foreground">Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">${(totalInvested / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">Invertido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">{avgViewsPerVideo.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Vistas/Video</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
