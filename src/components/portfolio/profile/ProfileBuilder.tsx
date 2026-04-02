import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useProfile, ProfileData } from '@/hooks/useProfile';
import { 
  User, MapPin, Briefcase, Star, Camera, Save, X, 
  Instagram, Music2, Globe, Linkedin, Youtube, Twitter,
  DollarSign, Tags, Sparkles, Eye, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 años)' },
  { value: 'mid', label: 'Mid (2-5 años)' },
  { value: 'senior', label: 'Senior (5+ años)' },
  { value: 'expert', label: 'Experto (10+ años)' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Disponible', color: 'bg-green-500' },
  { value: 'busy', label: 'Ocupado', color: 'bg-yellow-500' },
  { value: 'unavailable', label: 'No disponible', color: 'bg-red-500' },
];

interface ProfileBuilderProps {
  onClose?: () => void;
}

export function ProfileBuilder({ onClose }: ProfileBuilderProps) {
  const {
    profile,
    loading,
    saving,
    hasChanges,
    updateField,
    save,
    uploadAvatar,
    uploadCover,
    addTag,
    removeTag,
  } = useProfile({ useSonner: true });

  const [activeTab, setActiveTab] = useState('basic');
  const [newTag, setNewTag] = useState('');
  const [activeTagField, setActiveTagField] = useState<keyof ProfileData | null>(null);

  const handleAddTag = (field: keyof ProfileData) => {
    if (newTag.trim()) {
      addTag(field, newTag.trim());
      setNewTag('');
    }
  };

  const handleSave = async () => {
    await save();
  };

  if (loading || !profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Editar Mi Perfil</h2>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">Sin guardar</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="mx-4 mt-4 grid grid-cols-3 sm:grid-cols-5 w-auto">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="about">Sobre mí</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="social">Redes</TabsTrigger>
              <TabsTrigger value="settings">Config</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-4 space-y-6">
                {/* Basic Info */}
                <TabsContent value="basic" className="mt-0 space-y-6">
                  {/* Cover & Avatar */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Imágenes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Cover */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Portada</Label>
                        <div 
                          className="mt-1 h-32 rounded-sm bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => document.getElementById('cover-upload')?.click()}
                        >
                          {profile.cover_url && (
                            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                        />
                      </div>

                      {/* Avatar */}
                      <div className="flex items-center gap-4">
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                        >
                          <Avatar className="h-20 w-20 ring-4 ring-background">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-2xl">{profile.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                        />
                        <div>
                          <p className="text-sm font-medium">Foto de perfil</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG o GIF. Máx 5MB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Name & Username */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Información básica
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="full_name">Nombre completo</Label>
                          <Input
                            id="full_name"
                            value={profile.full_name}
                            onChange={(e) => updateField('full_name', e.target.value)}
                            placeholder="Tu nombre"
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Usuario</Label>
                          <Input
                            id="username"
                            value={profile.username || ''}
                            onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="@usuario"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="tagline">Tagline</Label>
                        <Input
                          id="tagline"
                          value={profile.tagline || ''}
                          onChange={(e) => updateField('tagline', e.target.value)}
                          placeholder="Ej: Creador de contenido especializado en tech"
                          maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{(profile.tagline?.length || 0)}/100</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Ubicación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">Ciudad</Label>
                          <Input
                            id="city"
                            value={profile.city || ''}
                            onChange={(e) => updateField('city', e.target.value)}
                            placeholder="Tu ciudad"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">País</Label>
                          <Input
                            id="country"
                            value={profile.country || ''}
                            onChange={(e) => updateField('country', e.target.value)}
                            placeholder="Tu país"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* About Me */}
                <TabsContent value="about" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Bio</CardTitle>
                      <CardDescription>Cuéntale al mundo quién eres</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={profile.bio || ''}
                        onChange={(e) => updateField('bio', e.target.value)}
                        placeholder="Escribe una descripción sobre ti..."
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{(profile.bio?.length || 0)}/500</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Star className="h-4 w-4" /> ¿Qué se te da mejor?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={profile.best_at || ''}
                        onChange={(e) => updateField('best_at', e.target.value)}
                        placeholder="Describe en qué destacas..."
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Intereses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.interests?.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeTag('interests', tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Agrega un interés..."
                          value={activeTagField === 'interests' ? newTag : ''}
                          onFocus={() => setActiveTagField('interests')}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('interests'))}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddTag('interests')}
                        >
                          Agregar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Skills & Categories */}
                <TabsContent value="skills" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Tags className="h-4 w-4" /> Especialidades
                      </CardTitle>
                      <CardDescription>Tags que describen tu trabajo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.specialties_tags?.map((tag) => (
                          <Badge 
                            key={tag}
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeTag('specialties_tags', tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: UGC, Reels, Lifestyle..."
                          value={activeTagField === 'specialties_tags' ? newTag : ''}
                          onFocus={() => setActiveTagField('specialties_tags')}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('specialties_tags'))}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleAddTag('specialties_tags')}>+</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Categorías de contenido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.content_categories?.map((tag) => (
                          <Badge 
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive"
                            onClick={() => removeTag('content_categories', tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Belleza, Tech, Gaming..."
                          value={activeTagField === 'content_categories' ? newTag : ''}
                          onFocus={() => setActiveTagField('content_categories')}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('content_categories'))}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleAddTag('content_categories')}>+</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Industrias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.industries?.map((tag) => (
                          <Badge 
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-destructive"
                            onClick={() => removeTag('industries', tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Moda, Tecnología, Alimentos..."
                          value={activeTagField === 'industries' ? newTag : ''}
                          onFocus={() => setActiveTagField('industries')}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('industries'))}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleAddTag('industries')}>+</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Experiencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {EXPERIENCE_LEVELS.map((level) => (
                          <Badge
                            key={level.value}
                            variant={profile.experience_level === level.value ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => updateField('experience_level', level.value)}
                          >
                            {level.label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Tarifas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Tarifa por contenido</Label>
                          <Input
                            type="number"
                            value={profile.rate_per_content || ''}
                            onChange={(e) => updateField('rate_per_content', e.target.value ? Number(e.target.value) : null)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Moneda</Label>
                          <select
                            className="w-full h-10 rounded-sm border border-input bg-background px-3 py-2 text-sm"
                            value={profile.rate_currency}
                            onChange={(e) => updateField('rate_currency', e.target.value)}
                          >
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                            <option value="MXN">MXN</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Social */}
                <TabsContent value="social" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Redes sociales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Instagram className="h-5 w-5 text-pink-500" />
                        <Input
                          value={profile.instagram || ''}
                          onChange={(e) => updateField('instagram', e.target.value)}
                          placeholder="@usuario"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Music2 className="h-5 w-5" />
                        <Input
                          value={profile.tiktok || ''}
                          onChange={(e) => updateField('tiktok', e.target.value)}
                          placeholder="@usuario TikTok"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Youtube className="h-5 w-5 text-red-500" />
                        <Input
                          value={profile.social_youtube || ''}
                          onChange={(e) => updateField('social_youtube', e.target.value)}
                          placeholder="Canal de YouTube"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                        <Input
                          value={profile.social_linkedin || ''}
                          onChange={(e) => updateField('social_linkedin', e.target.value)}
                          placeholder="LinkedIn URL"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Twitter className="h-5 w-5 text-sky-500" />
                        <Input
                          value={profile.social_twitter || ''}
                          onChange={(e) => updateField('social_twitter', e.target.value)}
                          placeholder="@usuario X/Twitter"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <Input
                          value={profile.portfolio_url || ''}
                          onChange={(e) => updateField('portfolio_url', e.target.value)}
                          placeholder="https://tuportfolio.com"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings */}
                <TabsContent value="settings" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Visibilidad
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Perfil público</p>
                          <p className="text-sm text-muted-foreground">Cualquiera puede ver tu perfil</p>
                        </div>
                        <Switch
                          checked={profile.is_public}
                          onCheckedChange={(checked) => updateField('is_public', checked)}
                        />
                      </div>

                      <Separator />

                      <div>
                        <Label className="mb-2 block">Disponibilidad</Label>
                        <div className="flex gap-2">
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <Badge
                              key={opt.value}
                              variant={profile.availability_status === opt.value ? 'default' : 'outline'}
                              className={cn(
                                "cursor-pointer",
                                profile.availability_status === opt.value && opt.color
                              )}
                              onClick={() => updateField('availability_status', opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Idiomas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.languages?.map((tag) => (
                          <Badge 
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => removeTag('languages', tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Español, Inglés..."
                          value={activeTagField === 'languages' ? newTag : ''}
                          onFocus={() => setActiveTagField('languages')}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('languages'))}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleAddTag('languages')}>+</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
