import { useState, useEffect } from 'react';
import {
  Store, User, Briefcase, Star, Calendar, DollarSign,
  Building2, Target, Users, Sparkles,
  Plus, X, Gift, ExternalLink, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useCreatorServices } from '@/hooks/useCreatorServices';
import { cn } from '@/lib/utils';
import { MarketplaceRoleSelector } from '@/components/marketplace/roles/MarketplaceRoleSelector';
import type { MarketplaceRoleId } from '@/components/marketplace/types/marketplace';
import { CONTENT_STYLE_LABELS, BUDGET_RANGE_LABELS } from '@/types/ai-matching';
import type { ContentStyle, BudgetRange } from '@/types/ai-matching';
import { SERVICE_TYPE_LABELS } from '@/types/marketplace';

// ─── Constants ──────────────────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Principiante', desc: 'Menos de 1 año', years: 1 },
  { value: 'intermediate', label: 'Intermedio', desc: '1-3 años', years: 2 },
  { value: 'advanced', label: 'Avanzado', desc: '3-5 años', years: 4 },
  { value: 'expert', label: 'Experto', desc: 'Más de 5 años', years: 6 },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog' },
];

const BRAND_VOICES = [
  { value: 'professional', label: 'Profesional' },
  { value: 'friendly', label: 'Amigable' },
  { value: 'casual', label: 'Casual' },
  { value: 'inspirational', label: 'Inspiracional' },
  { value: 'humorous', label: 'Humorístico' },
  { value: 'educational', label: 'Educativo' },
];

const CONTENT_GOALS = [
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'lead_generation', label: 'Generación de Leads' },
  { value: 'sales', label: 'Ventas' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'education', label: 'Educación' },
  { value: 'community', label: 'Comunidad' },
];

// ─── Main Component ─────────────────────────────────────────────────────────────

export function MarketplaceSettings() {
  const { activeRole } = useAuth();
  const isBrandRole = activeRole === 'client';
  const showCreatorView = !isBrandRole;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 p-6 border border-purple-500/20">
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Store className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Marketplace</h2>
              <p className="text-muted-foreground">
                {showCreatorView
                  ? 'Configura tu perfil, roles, servicios y disponibilidad en el marketplace'
                  : 'Configura tu empresa y preferencias para encontrar creadores'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showCreatorView ? <CreatorSettingsTabs /> : <BrandSettingsTabs />}
    </div>
  );
}

// ─── Creator Settings ───────────────────────────────────────────────────────────

function CreatorSettingsTabs() {
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();
  const { profile, loading, exists } = useCreatorProfile();

  return (
    <div className="space-y-6">
      {/* CTA to wizard if no profile */}
      {!loading && !exists && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-semibold text-lg">Crea tu perfil de marketplace</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usa nuestro wizard paso a paso para configurar tu perfil completo
              </p>
            </div>
            <Button onClick={() => navigate('/marketplace/profile/setup')} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Wizard
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          {[
            { value: 'profile', icon: User, label: 'Perfil' },
            { value: 'expertise', icon: Briefcase, label: 'Expertise' },
            { value: 'services', icon: Star, label: 'Servicios' },
            { value: 'availability', icon: Calendar, label: 'Disponibilidad' },
            { value: 'pricing', icon: DollarSign, label: 'Precios' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile"><CreatorProfileTab /></TabsContent>
        <TabsContent value="expertise"><CreatorExpertiseTab /></TabsContent>
        <TabsContent value="services"><CreatorServicesTab /></TabsContent>
        <TabsContent value="availability"><CreatorAvailabilityTab /></TabsContent>
        <TabsContent value="pricing"><CreatorPricingTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Creator Profile Tab ────────────────────────────────────────────────────────

function CreatorProfileTab() {
  const { profile, loading, saving, updateField, save, exists, createProfile } = useCreatorProfile();

  const [tagline, setTagline] = useState('');
  const [bioExtended, setBioExtended] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);

  // Sync from DB profile
  useEffect(() => {
    if (profile) {
      setTagline(profile.bio || '');
      setBioExtended(profile.bio_full || '');
      setMarketplaceEnabled(profile.is_active);
      // Derive experience level from response_time or other data
    }
  }, [profile]);

  const handleSave = async () => {
    if (!exists) {
      await createProfile({
        bio: tagline,
        bio_full: bioExtended,
        is_active: marketplaceEnabled,
      });
      return;
    }
    updateField('bio', tagline);
    updateField('bio_full', bioExtended);
    updateField('is_active', marketplaceEnabled);
    // We need a slight delay for state to settle before save
    setTimeout(() => save(), 50);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil del Marketplace</CardTitle>
        <CardDescription>Tu información profesional visible para las marcas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Marketplace enabled */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div>
            <p className="font-medium">Visible en el Marketplace</p>
            <p className="text-sm text-muted-foreground">Aparecerás en las búsquedas de marcas</p>
          </div>
          <Switch checked={marketplaceEnabled} onCheckedChange={setMarketplaceEnabled} />
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tu tagline profesional</label>
          <Input
            placeholder="Ej: Creador de contenido lifestyle | Especialista en reels"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">{tagline.length}/100</p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Biografía extendida</label>
          <Textarea
            placeholder="Cuéntanos tu historia, experiencia y qué te hace único como creador..."
            value={bioExtended}
            onChange={e => setBioExtended(e.target.value)}
            className="min-h-[150px]"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{bioExtended.length}/1000</p>
        </div>

        {/* Experience level */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Nivel de experiencia</label>
          <div className="grid grid-cols-2 gap-3">
            {EXPERIENCE_LEVELS.map(level => {
              const isSelected =
                (yearsExperience >= 1 && yearsExperience < 2 && level.value === 'beginner') ||
                (yearsExperience >= 2 && yearsExperience < 4 && level.value === 'intermediate') ||
                (yearsExperience >= 4 && yearsExperience < 6 && level.value === 'advanced') ||
                (yearsExperience >= 6 && level.value === 'expert');

              return (
                <button
                  key={level.value}
                  onClick={() => setYearsExperience(level.years)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  <p className="font-medium text-sm">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : 'Guardar Perfil'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Creator Expertise Tab ──────────────────────────────────────────────────────

export function CreatorExpertiseTab() {
  const { profile, loading, saving, updateFields, save, exists, createProfile } = useCreatorProfile();

  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [contentStyles, setContentStyles] = useState<ContentStyle[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [marketplaceRoles, setMarketplaceRoles] = useState<MarketplaceRoleId[]>([]);

  // Sync from DB
  useEffect(() => {
    if (profile) {
      setPlatforms(profile.platforms || []);
      setMarketplaceRoles((profile.marketplace_roles || []) as MarketplaceRoleId[]);
      setContentStyles((profile.content_types || []) as ContentStyle[]);
      setExpertiseTags(profile.categories || []);
    }
  }, [profile]);

  const toggleArrayItem = <T extends string>(arr: T[], item: T, setter: (v: T[]) => void) => {
    setter(arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item]);
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !expertiseTags.includes(trimmed)) {
      setExpertiseTags([...expertiseTags, trimmed]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (!exists) {
      await createProfile({
        platforms,
        marketplace_roles: marketplaceRoles,
        content_types: contentStyles,
        categories: expertiseTags,
      });
      return;
    }
    updateFields({
      platforms,
      marketplace_roles: marketplaceRoles,
      content_types: contentStyles,
      categories: expertiseTags,
    });
    setTimeout(() => save(), 50);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Marketplace Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Tus Roles en el Marketplace</CardTitle>
          <CardDescription>Selecciona hasta 5 roles que describan tus especialidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0a0a0f] rounded-xl p-4">
            <MarketplaceRoleSelector
              selectedRoles={marketplaceRoles}
              onChange={setMarketplaceRoles}
              maxRoles={5}
              showCategories
            />
          </div>
        </CardContent>
      </Card>

      {/* Expertise Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Etiquetas de Especialización</CardTitle>
          <CardDescription>Agrega tags que describan tu expertise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Agregar etiqueta personalizada"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomTag()}
            />
            <Button variant="outline" onClick={addCustomTag}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
          {expertiseTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {expertiseTags.map(tag => (
                <Badge key={tag} className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setExpertiseTags(expertiseTags.filter(t => t !== tag))}
                  />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Styles */}
      <Card>
        <CardHeader>
          <CardTitle>Estilo de Contenido</CardTitle>
          <CardDescription>Define tu estilo creativo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CONTENT_STYLE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={contentStyles.includes(key as ContentStyle) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayItem(contentStyles, key as ContentStyle, setContentStyles)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Plataformas</CardTitle>
          <CardDescription>Donde creas contenido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(platform => (
              <Badge
                key={platform.value}
                variant={platforms.includes(platform.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayItem(platforms, platform.value, setPlatforms)}
              >
                {platform.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : 'Guardar Expertise'}
      </Button>
    </div>
  );
}

// ─── Creator Services Tab ───────────────────────────────────────────────────────

export function CreatorServicesTab() {
  const { services, isLoading, createService, deleteService } = useCreatorServices();
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const handleAdd = () => {
    if (newTitle && newType && newPrice) {
      createService({
        service_type: newType as any,
        title: newTitle,
        price_amount: parseFloat(newPrice),
        price_currency: 'USD',
        is_active: true,
      });
      setNewTitle('');
      setNewType('');
      setNewPrice('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus Servicios</CardTitle>
        <CardDescription>Define qué servicios ofreces y sus precios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Services list from DB */}
        {services.length > 0 && (
          <div className="space-y-2">
            {services.map(service => (
              <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="font-medium">{service.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {SERVICE_TYPE_LABELS[service.service_type as keyof typeof SERVICE_TYPE_LABELS] || service.service_type}
                    {service.price_amount ? ` · $${service.price_amount.toLocaleString()} ${service.price_currency}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteService(service.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add service form */}
        <div className="space-y-3 p-4 rounded-lg border border-dashed border-border">
          <p className="text-sm font-medium">Agregar servicio</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Título del servicio"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Precio"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAdd}
              disabled={!newTitle || !newType || !newPrice}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Creator Availability Tab ───────────────────────────────────────────────────

export function CreatorAvailabilityTab() {
  const { profile, loading, saving, updateFields, save, exists, createProfile } = useCreatorProfile();

  const [availableForHire, setAvailableForHire] = useState(true);
  const [responseTimeHours, setResponseTimeHours] = useState('24');

  useEffect(() => {
    if (profile) {
      setAvailableForHire(profile.is_available);
      setResponseTimeHours(String(profile.response_time_hours));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!exists) {
      await createProfile({
        is_available: availableForHire,
        response_time_hours: parseInt(responseTimeHours),
      });
      return;
    }
    updateFields({
      is_available: availableForHire,
      response_time_hours: parseInt(responseTimeHours),
    });
    setTimeout(() => save(), 50);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidad</CardTitle>
        <CardDescription>Indica cuándo estás disponible para nuevos proyectos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available for hire */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div>
            <p className="font-medium">Disponible para contratación</p>
            <p className="text-sm text-muted-foreground">Aparecerás en las búsquedas de marcas</p>
          </div>
          <Switch checked={availableForHire} onCheckedChange={setAvailableForHire} />
        </div>

        {/* Response time */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tiempo de respuesta típico</label>
          <Select value={responseTimeHours} onValueChange={setResponseTimeHours}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Menos de 1 hora</SelectItem>
              <SelectItem value="4">Unas horas</SelectItem>
              <SelectItem value="24">En el día</SelectItem>
              <SelectItem value="48">1-2 días</SelectItem>
              <SelectItem value="72">2-3 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm">
            <strong>Tip:</strong> Los creadores con tiempos de respuesta más rápidos
            tienen un 40% más de probabilidades de ser contactados por marcas.
          </p>
        </div>

        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : 'Guardar Disponibilidad'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Creator Pricing Tab ────────────────────────────────────────────────────────

export function CreatorPricingTab() {
  const { profile, loading, saving, updateFields, save, exists, createProfile } = useCreatorProfile();

  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [acceptsExchange, setAcceptsExchange] = useState(false);
  const [exchangeConditions, setExchangeConditions] = useState('');

  useEffect(() => {
    if (profile) {
      setBasePrice(profile.base_price != null ? String(profile.base_price) : '');
      setCurrency(profile.currency || 'USD');
      setAcceptsExchange(profile.accepts_product_exchange);
      setExchangeConditions(profile.exchange_conditions || '');
    }
  }, [profile]);

  const handleSave = async () => {
    const data = {
      base_price: basePrice ? parseFloat(basePrice) : null,
      currency,
      accepts_product_exchange: acceptsExchange,
      exchange_conditions: acceptsExchange ? exchangeConditions : null,
    };
    if (!exists) {
      await createProfile(data);
      return;
    }
    updateFields(data);
    setTimeout(() => save(), 50);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precios y Pagos</CardTitle>
        <CardDescription>Configura tus tarifas y preferencias de pago</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base price */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Precio base por video</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Precio base"
                value={basePrice}
                onChange={e => setBasePrice(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="COP">COP</SelectItem>
                <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Accepts product exchange */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Acepta canje de producto</p>
              <p className="text-sm text-muted-foreground">Recibe productos en lugar de pago monetario</p>
            </div>
          </div>
          <Switch checked={acceptsExchange} onCheckedChange={setAcceptsExchange} />
        </div>

        {/* Exchange conditions */}
        {acceptsExchange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Condiciones de canje</label>
            <Textarea
              placeholder="Ej: Acepto productos de moda y skincare con valor mínimo de $150.000 COP"
              value={exchangeConditions}
              onChange={e => setExchangeConditions(e.target.value)}
              maxLength={500}
            />
          </div>
        )}

        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : 'Guardar Precios'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Brand Settings ─────────────────────────────────────────────────────────────

export function BrandSettingsTabs() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 h-auto p-1">
        {[
          { value: 'company', icon: Building2, label: 'Empresa' },
          { value: 'industry', icon: Target, label: 'Industria' },
          { value: 'audience', icon: Users, label: 'Audiencia' },
          { value: 'preferences', icon: Sparkles, label: 'Preferencias' },
        ].map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="company"><BrandCompanyTab /></TabsContent>
      <TabsContent value="industry"><BrandIndustryTab /></TabsContent>
      <TabsContent value="audience"><BrandAudienceTab /></TabsContent>
      <TabsContent value="preferences"><BrandPreferencesTab /></TabsContent>
    </Tabs>
  );
}

// ─── Brand Company Tab ──────────────────────────────────────────────────────────

function BrandCompanyTab() {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu Empresa</CardTitle>
        <CardDescription>Información básica de tu empresa o marca</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nombre de la empresa *</label>
          <Input
            placeholder="Nombre de tu empresa"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descripción</label>
          <Textarea
            placeholder="Describe tu empresa, productos y servicios..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-[120px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
        </div>

        <Button className="w-full sm:w-auto">Guardar Empresa</Button>
      </CardContent>
    </Card>
  );
}

// ─── Brand Industry Tab ─────────────────────────────────────────────────────────

function BrandIndustryTab() {
  const [nicheTags, setNicheTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const addTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !nicheTags.includes(trimmed)) {
      setNicheTags([...nicheTags, trimmed]);
      setCustomTag('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Industria</CardTitle>
        <CardDescription>Define tu industria y nicho de mercado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Etiquetas de nicho</label>
          <div className="flex gap-2">
            <Input
              placeholder="Agregar etiqueta de nicho"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
            />
            <Button variant="outline" onClick={addTag}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
          {nicheTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nicheTags.map(tag => (
                <Badge key={tag} className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setNicheTags(nicheTags.filter(t => t !== tag))}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full sm:w-auto">Guardar Industria</Button>
      </CardContent>
    </Card>
  );
}

// ─── Brand Audience Tab ─────────────────────────────────────────────────────────

function BrandAudienceTab() {
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [contentGoals, setContentGoals] = useState<string[]>([]);

  const toggleGoal = (goal: string) => {
    setContentGoals(
      contentGoals.includes(goal)
        ? contentGoals.filter(g => g !== goal)
        : [...contentGoals, goal],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audiencia Objetivo</CardTitle>
        <CardDescription>Define a quién quieres llegar con tu contenido</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Audiencia objetivo *</label>
          <Textarea
            placeholder="Describe tu audiencia ideal: edad, intereses, ubicación..."
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tono de marca</label>
          <Select value={brandVoice} onValueChange={setBrandVoice}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tono" />
            </SelectTrigger>
            <SelectContent>
              {BRAND_VOICES.map(voice => (
                <SelectItem key={voice.value} value={voice.value}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Objetivos de contenido</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_GOALS.map(goal => (
              <Badge
                key={goal.value}
                variant={contentGoals.includes(goal.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleGoal(goal.value)}
              >
                {goal.label}
              </Badge>
            ))}
          </div>
        </div>

        <Button className="w-full sm:w-auto">Guardar Audiencia</Button>
      </CardContent>
    </Card>
  );
}

// ─── Brand Preferences Tab ──────────────────────────────────────────────────────

function BrandPreferencesTab() {
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [creatorStyles, setCreatorStyles] = useState<ContentStyle[]>([]);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | ''>('');

  const toggleArrayItem = <T extends string>(arr: T[], item: T, setter: (v: T[]) => void) => {
    setter(arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias de Contenido</CardTitle>
        <CardDescription>Qué tipo de contenido y creadores buscas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content types */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Tipos de contenido preferidos</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={contentTypes.includes(key) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayItem(contentTypes, key, setContentTypes)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Plataformas objetivo</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(platform => (
              <Badge
                key={platform.value}
                variant={platforms.includes(platform.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayItem(platforms, platform.value, setPlatforms)}
              >
                {platform.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Creator styles */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Estilos de creador preferidos</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CONTENT_STYLE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={creatorStyles.includes(key as ContentStyle) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArrayItem(creatorStyles, key as ContentStyle, setCreatorStyles)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Budget range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rango de presupuesto típico</label>
          <Select value={budgetRange} onValueChange={v => setBudgetRange(v as BudgetRange)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rango" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BUDGET_RANGE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full sm:w-auto">Guardar Preferencias</Button>
      </CardContent>
    </Card>
  );
}
