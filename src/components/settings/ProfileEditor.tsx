import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Save, Loader2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  bio: string;
  avatar_url: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  document_type: string;
  document_number: string;
  username: string;
}

export function ProfileEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    bio: "",
    avatar_url: "",
    instagram: "",
    tiktok: "",
    facebook: "",
    document_type: "",
    document_number: "",
    username: ""
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  // Validate username in real-time
  useEffect(() => {
    const validateUsername = async () => {
      if (!profile.username || profile.username === originalUsername) {
        setUsernameError(null);
        return;
      }

      // Validate format: only letters, numbers, underscores
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(profile.username)) {
        setUsernameError('Solo letras, números y guiones bajos');
        return;
      }

      if (profile.username.length < 3) {
        setUsernameError('Mínimo 3 caracteres');
        return;
      }

      if (profile.username.length > 30) {
        setUsernameError('Máximo 30 caracteres');
        return;
      }

      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', profile.username.toLowerCase())
          .neq('id', user?.id || '')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUsernameError('Este username ya está en uso');
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounce = setTimeout(validateUsername, 500);
    return () => clearTimeout(debounce);
  }, [profile.username, originalUsername, user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          instagram: data.instagram || "",
          tiktok: data.tiktok || "",
          facebook: data.facebook || "",
          document_type: data.document_type || "",
          document_number: data.document_number || "",
          username: data.username || ""
        });
        setOriginalUsername(data.username || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (usernameError) {
      toast({
        title: "Username inválido",
        description: usernameError,
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          city: profile.city,
          address: profile.address,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          instagram: profile.instagram,
          tiktok: profile.tiktok,
          facebook: profile.facebook,
          document_type: profile.document_type,
          document_number: profile.document_number,
          username: profile.username.toLowerCase().trim() || null
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setOriginalUsername(profile.username);
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists (ignore errors)
      if (profile.avatar_url && profile.avatar_url.includes('avatars')) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil se ha subido correctamente"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
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
        <CardDescription>Actualiza tu información personal y foto de perfil</CardDescription>
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
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
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
              onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
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
                onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
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
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={profile.city}
              onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Tu ciudad"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Tu dirección"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Cuéntanos sobre ti..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de documento</Label>
            <Input
              id="document_type"
              value={profile.document_type}
              onChange={(e) => setProfile(prev => ({ ...prev, document_type: e.target.value }))}
              placeholder="CC, CE, NIT..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_number">Número de documento</Label>
            <Input
              id="document_number"
              value={profile.document_number}
              onChange={(e) => setProfile(prev => ({ ...prev, document_number: e.target.value }))}
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
                onChange={(e) => setProfile(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={profile.tiktok}
                onChange={(e) => setProfile(prev => ({ ...prev, tiktok: e.target.value }))}
                placeholder="@usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={profile.facebook}
                onChange={(e) => setProfile(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="facebook.com/usuario"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
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
