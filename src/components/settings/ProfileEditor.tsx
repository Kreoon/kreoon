import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { Camera, Save, Loader2 } from "lucide-react";

export function ProfileEditor() {
  const {
    profile,
    loading,
    saving,
    usernameError,
    checkingUsername,
    updateField,
    save,
    uploadAvatar,
  } = useProfile();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading || !profile) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mi Perfil</CardTitle>
        <CardDescription>Actualiza tu información personal y foto de perfil. Los cambios se reflejan en toda la plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-border">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(profile.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold">{profile.full_name}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="tu_username"
                className={`pl-7 ${
                  usernameError ? 'border-destructive' : profile.username && !checkingUsername && !usernameError ? 'border-green-500' : ''
                }`}
                maxLength={30}
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            {!usernameError && profile.username && !checkingUsername && (
              <p className="text-xs text-green-500">Username disponible</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={profile.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Tu ciudad"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={profile.country}
              onChange={(e) => updateField('country', e.target.value)}
              placeholder="Tu país"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={profile.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Tu dirección"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Cuéntanos sobre ti..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de documento</Label>
            <Input
              id="document_type"
              value={profile.document_type}
              onChange={(e) => updateField('document_type', e.target.value)}
              placeholder="CC, CE, NIT..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_number">Número de documento</Label>
            <Input
              id="document_number"
              value={profile.document_number}
              onChange={(e) => updateField('document_number', e.target.value)}
              placeholder="123456789"
            />
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="text-sm font-medium mb-3">Redes sociales</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={profile.instagram}
                onChange={(e) => updateField('instagram', e.target.value)}
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={profile.tiktok}
                onChange={(e) => updateField('tiktok', e.target.value)}
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={profile.facebook}
                onChange={(e) => updateField('facebook', e.target.value)}
                placeholder="facebook.com/usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn</Label>
              <Input
                id="social_linkedin"
                value={profile.social_linkedin}
                onChange={(e) => updateField('social_linkedin', e.target.value)}
                placeholder="linkedin.com/in/usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_youtube">YouTube</Label>
              <Input
                id="social_youtube"
                value={profile.social_youtube}
                onChange={(e) => updateField('social_youtube', e.target.value)}
                placeholder="youtube.com/@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_twitter">X (Twitter)</Label>
              <Input
                id="social_twitter"
                value={profile.social_twitter}
                onChange={(e) => updateField('social_twitter', e.target.value)}
                placeholder="@usuario"
              />
            </div>
          </div>
        </div>

        {/* Portfolio URL */}
        <div className="space-y-2">
          <Label htmlFor="portfolio_url">URL de Portafolio</Label>
          <Input
            id="portfolio_url"
            value={profile.portfolio_url}
            onChange={(e) => updateField('portfolio_url', e.target.value)}
            placeholder="https://mi-portfolio.com"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={save} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
