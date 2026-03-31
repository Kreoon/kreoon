import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useCreatorProfile, CreatorProfileData } from '@/hooks/useCreatorProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Camera,
  Save,
  Loader2,
  ImageIcon,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Share2,
  X,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { MARKETPLACE_ROLES } from '@/lib/talent-dna/constants';
import { SpecializationPicker } from '@/components/roles/SpecializationPicker';
import { useUserSpecializations } from '@/hooks/useUserSpecializations';
import type { AppRole, Specialization } from '@/types/database';
import { getBaseRole } from '@/lib/roles';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'ugc', label: 'UGC' },
  { value: 'authentic', label: 'Auténtico' },
  { value: 'professional', label: 'Profesional' },
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'product', label: 'Producto' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'animation', label: 'Animación' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
];

const CATEGORY_SUGGESTIONS = [
  'UGC', 'Food & Cocina', 'Lifestyle', 'Moda', 'Belleza', 'Fitness',
  'Tech', 'Gaming', 'Viajes', 'Educación', 'Finanzas', 'Salud',
  'Música', 'Arte', 'Deportes', 'Mascotas', 'Hogar', 'Negocios',
];

const COUNTRY_OPTIONS = [
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'BR', label: 'Brasil' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'PA', label: 'Panamá' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'DO', label: 'República Dominicana' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'HN', label: 'Honduras' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'NI', label: 'Nicaragua' },
];

const SOCIAL_LINK_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@usuario' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@usuario' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/usuario' },
  { key: 'twitter', label: 'Twitter/X', placeholder: '@usuario' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://mi-sitio.com' },
];

// Default empty profile structure for new profiles
const getDefaultFormData = (): Partial<CreatorProfileData> => ({
  display_name: '',
  slug: null,
  bio: null,
  bio_full: null,
  avatar_url: null,
  banner_url: null,
  location_city: null,
  location_country: 'CO',
  country_flag: '',
  categories: [],
  content_types: [],
  languages: ['es'],
  platforms: [],
  social_links: {},
  is_available: true,
  base_price: null,
  currency: 'USD',
  accepts_product_exchange: false,
  exchange_conditions: null,
  response_time_hours: 24,
  marketplace_roles: [],
  showreel_url: null,
});

export function CreatorProfileEditor() {
  const { user } = useAuth();
  const {
    profile: savedProfile,
    loading,
    saving,
    save,
    exists,
    updateFields,
    createProfile,
  } = useCreatorProfile();

  const [formData, setFormData] = useState<Partial<CreatorProfileData>>(getDefaultFormData());
  const [categoryInput, setCategoryInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Hook para especializaciones del sistema
  const {
    specializations,
    loading: specsLoading,
    updateSpecializations,
  } = useUserSpecializations();

  // Derivar roles base de los marketplace_roles seleccionados
  const derivedRoles: AppRole[] = (formData.marketplace_roles || [])
    .map(role => getBaseRole(role))
    .filter((role, index, arr) => arr.indexOf(role) === index); // unique

  const isNew = !exists;

  // Sync form when profile loads from DB
  useEffect(() => {
    if (savedProfile) {
      setFormData(savedProfile);
    }
  }, [savedProfile]);

  const updateField = <K extends keyof CreatorProfileData>(
    field: K,
    value: CreatorProfileData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof CreatorProfileData, value: string) => {
    setFormData(prev => {
      const current = ((prev as Record<string, unknown>)[field] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const updateSocialLink = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: { ...(prev.social_links || {}), [key]: value },
    }));
  };

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    const categories = formData.categories || [];
    if (trimmed && !categories.includes(trimmed)) {
      updateField('categories', [...categories, trimmed]);
    }
    setCategoryInput('');
  };

  const removeCategory = (cat: string) => {
    updateField('categories', (formData.categories || []).filter(c => c !== cat));
  };

  // Upload file to Supabase Storage
  const uploadFile = useCallback(async (file: File, bucket: string, path: string): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Error al subir la imagen');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const url = await uploadFile(file, 'avatars', `creator-profiles/${user.id}`);
    if (url) updateField('avatar_url', url);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const url = await uploadFile(file, 'banners', `creator-profiles/${user.id}`);
    if (url) updateField('banner_url', url);
  };

  const handleSave = async () => {
    if (!formData.display_name?.trim()) {
      toast.error('El nombre de creador es requerido');
      return;
    }

    if (isNew) {
      // Create new profile
      setCreating(true);
      try {
        await createProfile(formData as Partial<CreatorProfileData>);
      } finally {
        setCreating(false);
      }
    } else {
      // Update existing profile
      updateFields(formData as Partial<CreatorProfileData>);
      await save();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Perfil de Creador</h2>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? 'Configura tu perfil para aparecer en el marketplace'
                : 'Actualiza tu perfil de creador para el marketplace'}
            </p>
          </div>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={['identity', 'media', 'specialization']}
        className="space-y-3"
      >
        {/* Section 1: Identity */}
        <AccordionItem value="identity" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="font-semibold">Identidad</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de creador *</Label>
                <Input
                  value={formData.display_name || ''}
                  onChange={e => updateField('display_name', e.target.value)}
                  placeholder="Tu nombre artístico o profesional"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL amigable)</Label>
                <Input
                  value={formData.slug || ''}
                  onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mi-perfil"
                />
                {formData.slug && (
                  <p className="text-xs text-muted-foreground">
                    kreoon.com/creator/{formData.slug}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio corta</Label>
              <Textarea
                value={formData.bio || ''}
                onChange={e => updateField('bio', e.target.value)}
                placeholder="Describe brevemente quién eres..."
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(formData.bio || '').length}/200
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bio completa</Label>
              <Textarea
                value={formData.bio_full || ''}
                onChange={e => updateField('bio_full', e.target.value)}
                placeholder="Cuéntanos tu historia, experiencia y qué te hace único..."
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(formData.bio_full || '').length}/2000
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Media */}
        <AccordionItem value="media" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold">Multimedia</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            {/* Avatar */}
            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={formData.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {(formData.display_name || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Imagen cuadrada, máx 5MB
                </p>
              </div>
            </div>

            {/* Banner */}
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div
                className="relative group cursor-pointer rounded-sm overflow-hidden border border-white/10 h-32 bg-muted/20 flex items-center justify-center"
                onClick={() => bannerInputRef.current?.click()}
              >
                {formData.banner_url ? (
                  <img
                    src={formData.banner_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Click para subir portada</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">1200x400px recomendado, máx 5MB</p>
            </div>

            {/* Showreel */}
            <div className="space-y-2">
              <Label>URL del showreel</Label>
              <Input
                value={formData.showreel_url || ''}
                onChange={e => updateField('showreel_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Location */}
        <AccordionItem value="location" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold">Ubicación</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={formData.location_city || ''}
                  onChange={e => updateField('location_city', e.target.value)}
                  placeholder="Tu ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={formData.location_country || 'CO'}
                  onValueChange={v => updateField('location_country', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un país" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Specialization */}
        <AccordionItem value="specialization" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-semibold">Especialización</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            {/* Marketplace Roles */}
            <div className="space-y-3">
              <Label>Roles en el marketplace</Label>
              <p className="text-xs text-muted-foreground">Selecciona los roles que desempeñas</p>
              <div className="flex flex-wrap gap-2">
                {MARKETPLACE_ROLES.map(role => (
                  <Badge
                    key={role.id}
                    variant={(formData.marketplace_roles || []).includes(role.id) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem('marketplace_roles', role.id)}
                  >
                    {role.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Especializaciones detalladas */}
            {derivedRoles.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <Label>Especializaciones detalladas</Label>
                <p className="text-xs text-muted-foreground">
                  Selecciona hasta 5 habilidades especificas (basadas en tus roles)
                </p>
                {specsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <SpecializationPicker
                    selectedRoles={derivedRoles}
                    selectedSpecializations={specializations}
                    onSpecializationsChange={updateSpecializations}
                    maxSpecializations={5}
                  />
                )}
              </div>
            )}

            {/* Categories */}
            <div className="space-y-3">
              <Label>Categorías</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.categories || []).map(cat => (
                  <Badge key={cat} className="gap-1">
                    {cat}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeCategory(cat)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory(categoryInput);
                    }
                  }}
                  placeholder="Agregar categoría"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCategory(categoryInput)}
                  disabled={!categoryInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORY_SUGGESTIONS.filter(s => !(formData.categories || []).includes(s)).slice(0, 10).map(s => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="cursor-pointer text-xs opacity-60 hover:opacity-100"
                    onClick={() => addCategory(s)}
                  >
                    + {s}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Content Types */}
            <div className="space-y-3">
              <Label>Tipos de contenido</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={(formData.content_types || []).includes(opt.value) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem('content_types', opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label>Plataformas donde creas</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={(formData.platforms || []).includes(opt.value) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem('platforms', opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-3">
              <Label>Idiomas</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={(formData.languages || []).includes(opt.value) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleArrayItem('languages', opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Product Exchange */}
        <AccordionItem value="exchange" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-semibold">Intercambio de Producto</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="flex items-center justify-between p-4 rounded-sm bg-muted/10 border border-white/5">
              <div>
                <p className="text-sm font-medium">Acepta intercambio de producto</p>
                <p className="text-xs text-muted-foreground">
                  Puedes recibir productos en lugar de pago
                </p>
              </div>
              <Switch
                checked={formData.accepts_product_exchange}
                onCheckedChange={v => updateField('accepts_product_exchange', v)}
              />
            </div>

            {formData.accepts_product_exchange && (
              <div className="space-y-2">
                <Label>Condiciones de intercambio</Label>
                <Textarea
                  value={formData.exchange_conditions || ''}
                  onChange={e => updateField('exchange_conditions', e.target.value)}
                  placeholder="Describe qué tipo de productos aceptas y bajo qué condiciones..."
                  rows={3}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Availability */}
        <AccordionItem value="availability" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold">Disponibilidad</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="flex items-center justify-between p-4 rounded-sm bg-muted/10 border border-white/5">
              <div>
                <p className="text-sm font-medium">Disponible para contratación</p>
                <p className="text-xs text-muted-foreground">
                  Aparecerás en las búsquedas del marketplace
                </p>
              </div>
              <Switch
                checked={formData.is_available}
                onCheckedChange={v => updateField('is_available', v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tiempo de respuesta típico</Label>
              <Select
                value={(formData.response_time_hours || 24).toString()}
                onValueChange={v => updateField('response_time_hours', parseInt(v))}
              >
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
          </AccordionContent>
        </AccordionItem>

        {/* Section 7: Social Links */}
        <AccordionItem value="social" className="bg-white/5 border border-white/10 rounded-sm px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              <span className="font-semibold">Redes Sociales</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOCIAL_LINK_FIELDS.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    value={(formData.social_links || {})[field.key] || ''}
                    onChange={e => updateSocialLink(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Save Button */}
      <div className="flex justify-end pt-2 pb-8">
        <Button
          onClick={handleSave}
          disabled={saving || creating || !(formData.display_name || '').trim()}
          className="min-w-[180px] bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          size="lg"
        >
          {saving || creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {creating ? 'Creando...' : 'Guardando...'}
            </>
          ) : (
            <>
              {isNew ? <UserPlus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {isNew ? 'Crear perfil' : 'Guardar cambios'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
