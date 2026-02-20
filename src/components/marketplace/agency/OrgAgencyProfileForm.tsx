import { useState, useEffect } from 'react';
import {
  Building2, Save, Loader2, Globe, Eye, EyeOff,
  Link2, DollarSign, Clock, Palette, Calendar,
  Users, Instagram, Plus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  MARKETPLACE_CATEGORIES,
  ORG_TYPE_LABELS,
  TEAM_SIZE_LABELS,
  RESPONSE_TIME_LABELS,
} from '../types/marketplace';
import type { OrgType, OrgService } from '../types/marketplace';
import { BunnyImageUploader } from '../BunnyImageUploader';
import { marketplaceStoragePath } from '@/hooks/useBunnyImageUpload';

interface AgencyProfile {
  org_profile_public: boolean;
  org_marketplace_visible: boolean;
  org_type: OrgType | '';
  org_display_name: string;
  org_tagline: string;
  org_cover_url: string;
  org_year_founded: number | null;
  org_team_size_range: string;
  org_specialties: string[];
  org_website: string;
  org_linkedin: string;
  org_instagram: string;
  org_tiktok: string;
  org_min_budget: number | null;
  org_max_budget: number | null;
  org_budget_currency: string;
  org_response_time: string;
  org_gallery: string[];
}

const EMPTY_PROFILE: AgencyProfile = {
  org_profile_public: false,
  org_marketplace_visible: false,
  org_type: '',
  org_display_name: '',
  org_tagline: '',
  org_cover_url: '',
  org_year_founded: null,
  org_team_size_range: '',
  org_specialties: [],
  org_website: '',
  org_linkedin: '',
  org_instagram: '',
  org_tiktok: '',
  org_min_budget: null,
  org_max_budget: null,
  org_budget_currency: 'COP',
  org_response_time: '',
  org_gallery: [],
};

const CURRENCIES = [
  { value: 'COP', label: 'COP (Peso Colombiano)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'MXN', label: 'MXN (Peso Mexicano)' },
  { value: 'EUR', label: 'EUR (Euro)' },
];

export function OrgAgencyProfileForm() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const orgId = profile?.current_organization_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AgencyProfile>(EMPTY_PROFILE);
  const [services, setServices] = useState<OrgService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Fetch org profile
  useEffect(() => {
    if (!orgId) return;

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select(
          'org_profile_public, org_marketplace_visible, org_type, org_display_name, org_tagline, ' +
          'org_cover_url, org_year_founded, org_team_size_range, org_specialties, org_website, ' +
          'org_linkedin, org_instagram, org_tiktok, org_min_budget, org_max_budget, org_budget_currency, ' +
          'org_response_time, org_gallery'
        )
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setForm({
          org_profile_public: data.org_profile_public === true,
          org_marketplace_visible: data.org_marketplace_visible === true,
          org_type: data.org_type || '',
          org_display_name: data.org_display_name || '',
          org_tagline: data.org_tagline || '',
          org_cover_url: data.org_cover_url || '',
          org_year_founded: data.org_year_founded || null,
          org_team_size_range: data.org_team_size_range || '',
          org_specialties: data.org_specialties || [],
          org_website: data.org_website || '',
          org_linkedin: data.org_linkedin || '',
          org_instagram: data.org_instagram || '',
          org_tiktok: data.org_tiktok || '',
          org_min_budget: data.org_min_budget || null,
          org_max_budget: data.org_max_budget || null,
          org_budget_currency: data.org_budget_currency || 'COP',
          org_response_time: data.org_response_time || '',
          org_gallery: Array.isArray(data.org_gallery) ? data.org_gallery : [],
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [orgId]);

  // Fetch services
  useEffect(() => {
    if (!orgId) return;

    const fetchServices = async () => {
      setServicesLoading(true);
      const { data } = await (supabase as any)
        .from('org_services')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order', { ascending: true });

      if (data) setServices(data);
      setServicesLoading(false);
    };

    fetchServices();
  }, [orgId]);

  const updateField = <K extends keyof AgencyProfile>(key: K, value: AgencyProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleSpecialty = (id: string) => {
    setForm(prev => ({
      ...prev,
      org_specialties: prev.org_specialties.includes(id)
        ? prev.org_specialties.filter(s => s !== id)
        : [...prev.org_specialties, id],
    }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from('organizations')
      .update({
        org_profile_public: form.org_profile_public,
        org_marketplace_visible: form.org_marketplace_visible,
        org_type: form.org_type || null,
        org_display_name: form.org_display_name.trim() || null,
        org_tagline: form.org_tagline.trim() || null,
        org_cover_url: form.org_cover_url.trim() || null,
        org_year_founded: form.org_year_founded || null,
        org_team_size_range: form.org_team_size_range || null,
        org_specialties: form.org_specialties,
        org_website: form.org_website.trim() || null,
        org_linkedin: form.org_linkedin.trim() || null,
        org_instagram: form.org_instagram.trim() || null,
        org_tiktok: form.org_tiktok.trim() || null,
        org_min_budget: form.org_min_budget || null,
        org_max_budget: form.org_max_budget || null,
        org_budget_currency: form.org_budget_currency,
        org_response_time: form.org_response_time || null,
        org_gallery: form.org_gallery,
      })
      .eq('id', orgId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Perfil de agencia actualizado' });
    }
    setSaving(false);
  };

  // --- Services CRUD ---
  const addService = async () => {
    if (!orgId) return;
    const newService = {
      organization_id: orgId,
      icon: '🎯',
      title: 'Nuevo servicio',
      description: '',
      is_featured: false,
      sort_order: services.length,
    };
    const { data, error } = await (supabase as any)
      .from('org_services')
      .insert(newService)
      .select()
      .single();

    if (!error && data) {
      setServices(prev => [...prev, data]);
    }
  };

  const updateService = async (id: string, field: string, value: string | boolean) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    await (supabase as any).from('org_services').update({ [field]: value }).eq('id', id);
  };

  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    await (supabase as any).from('org_services').delete().eq('id', id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const slug = (profile as any)?.current_organization_id;
  const profileUrl = slug ? `${window.location.origin}/marketplace/org/${slug}` : '';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
          <Building2 className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Perfil de Agencia</h2>
          <p className="text-sm text-muted-foreground">
            Configura tu perfil público de agencia para aparecer en el marketplace
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="specialties">Especialidades</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="gallery">Galería</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información básica</CardTitle>
              <CardDescription>Datos principales de tu agencia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre para mostrar</Label>
                <Input
                  placeholder="Ej: Kreative Studios"
                  value={form.org_display_name}
                  onChange={e => updateField('org_display_name', e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input
                  placeholder="Ej: Agencia de contenido UGC premium"
                  value={form.org_tagline}
                  onChange={e => updateField('org_tagline', e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de organización</Label>
                <Select value={form.org_type} onValueChange={v => updateField('org_type', v as OrgType)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORG_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Imagen de portada</Label>
                <BunnyImageUploader
                  mode="single"
                  value={form.org_cover_url}
                  onChange={(url) => updateField('org_cover_url', url)}
                  getStoragePath={(file) => marketplaceStoragePath('org-cover', orgId!, file)}
                  aspectRatio="video"
                  height="h-40"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Año de fundación
                  </Label>
                  <Input
                    type="number"
                    placeholder="2020"
                    value={form.org_year_founded ?? ''}
                    onChange={e => updateField('org_year_founded', e.target.value ? parseInt(e.target.value) : null)}
                    min={1900}
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Tamaño del equipo
                  </Label>
                  <Select value={form.org_team_size_range} onValueChange={v => updateField('org_team_size_range', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEAM_SIZE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Specialties + Links + Budget */}
        <TabsContent value="specialties" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Especialidades</CardTitle>
              <CardDescription>Selecciona las categorías en las que se especializa tu agencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const selected = form.org_specialties.includes(cat.id);
                  return (
                    <Badge
                      key={cat.id}
                      variant={selected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all ${selected ? 'bg-purple-600 hover:bg-purple-500' : 'hover:border-purple-500/50'}`}
                      onClick={() => toggleSpecialty(cat.id)}
                    >
                      {cat.label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Redes sociales y web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Sitio web</Label>
                <Input placeholder="https://tuagencia.com" value={form.org_website} onChange={e => updateField('org_website', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />Instagram</Label>
                <Input placeholder="https://instagram.com/tuagencia" value={form.org_instagram} onChange={e => updateField('org_instagram', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/company/tuagencia" value={form.org_linkedin} onChange={e => updateField('org_linkedin', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>TikTok</Label>
                <Input placeholder="https://tiktok.com/@tuagencia" value={form.org_tiktok} onChange={e => updateField('org_tiktok', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Rango de presupuesto
              </CardTitle>
              <CardDescription>Define el rango de precios de tus servicios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Mínimo</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={form.org_min_budget ?? ''}
                    onChange={e => updateField('org_min_budget', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Máximo</Label>
                  <Input
                    type="number"
                    placeholder="5000000"
                    value={form.org_max_budget ?? ''}
                    onChange={e => updateField('org_max_budget', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select value={form.org_budget_currency} onValueChange={v => updateField('org_budget_currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Services */}
        <TabsContent value="services" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Servicios</CardTitle>
                  <CardDescription>Agrega los servicios que ofrece tu agencia</CardDescription>
                </div>
                <Button size="sm" onClick={addService} className="bg-purple-600 hover:bg-purple-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tienes servicios aún. Agrega tu primer servicio.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div key={svc.id} className="p-3 rounded-lg border bg-card/50 space-y-2">
                      <div className="flex items-start gap-2">
                        <Input
                          className="w-14 text-center text-lg"
                          value={svc.icon}
                          onChange={e => updateService(svc.id, 'icon', e.target.value)}
                          maxLength={4}
                        />
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Título del servicio"
                            value={svc.title}
                            onChange={e => updateService(svc.id, 'title', e.target.value)}
                            maxLength={100}
                          />
                          <Textarea
                            placeholder="Descripción breve..."
                            value={svc.description || ''}
                            onChange={e => updateService(svc.id, 'description', e.target.value)}
                            maxLength={500}
                            rows={2}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={svc.is_featured}
                              onChange={e => updateService(svc.id, 'is_featured', e.target.checked)}
                              className="rounded"
                            />
                            Destacado
                          </label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/60 hover:text-destructive"
                            onClick={() => deleteService(svc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Gallery */}
        <TabsContent value="gallery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Galería de portafolio</CardTitle>
              <CardDescription>Sube imágenes para mostrar tu trabajo</CardDescription>
            </CardHeader>
            <CardContent>
              <BunnyImageUploader
                mode="gallery"
                values={form.org_gallery}
                onGalleryChange={(urls) => updateField('org_gallery', urls)}
                getStoragePath={(file) => marketplaceStoragePath('org-gallery', orgId!, file)}
                aspectRatio="video"
                maxFiles={12}
                disabled={saving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Configuration */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibilidad</CardTitle>
              <CardDescription>Controla la visibilidad de tu perfil de agencia en el marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    Perfil público
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tu perfil de agencia será accesible desde su URL directa
                  </p>
                </div>
                <Switch
                  checked={form.org_profile_public}
                  onCheckedChange={v => updateField('org_profile_public', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Globe className="h-3.5 w-3.5" />
                    Visible en marketplace
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tu agencia aparecerá en la pestaña "Agencias & Estudios" del marketplace
                  </p>
                </div>
                <Switch
                  checked={form.org_marketplace_visible}
                  onCheckedChange={v => updateField('org_marketplace_visible', v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempo de respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.org_response_time} onValueChange={v => updateField('org_response_time', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESPONSE_TIME_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
