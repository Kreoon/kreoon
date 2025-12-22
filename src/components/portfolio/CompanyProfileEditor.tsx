import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Save, Building2, Globe, Lock, Instagram } from 'lucide-react';

interface CompanyProfileEditorProps {
  companyId: string;
  currentName: string;
  currentBio: string | null;
  currentLogo: string | null;
  currentUsername?: string | null;
  currentIsPublic?: boolean;
  currentInstagram?: string | null;
  currentTiktok?: string | null;
  currentFacebook?: string | null;
  currentPortfolioUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function CompanyProfileEditor({
  companyId,
  currentName,
  currentBio,
  currentLogo,
  currentUsername,
  currentIsPublic = true,
  currentInstagram,
  currentTiktok,
  currentFacebook,
  currentPortfolioUrl,
  open,
  onOpenChange,
  onSave,
}: CompanyProfileEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio || '');
  const [username, setUsername] = useState(currentUsername || '');
  const [isPublic, setIsPublic] = useState(currentIsPublic);
  const [instagram, setInstagram] = useState(currentInstagram || '');
  const [tiktok, setTiktok] = useState(currentTiktok || '');
  const [facebook, setFacebook] = useState(currentFacebook || '');
  const [portfolioUrl, setPortfolioUrl] = useState(currentPortfolioUrl || '');
  const [logoUrl, setLogoUrl] = useState(currentLogo);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    setName(currentName);
    setBio(currentBio || '');
    setUsername(currentUsername || '');
    setIsPublic(currentIsPublic);
    setInstagram(currentInstagram || '');
    setTiktok(currentTiktok || '');
    setFacebook(currentFacebook || '');
    setPortfolioUrl(currentPortfolioUrl || '');
    setLogoUrl(currentLogo);
  }, [currentName, currentBio, currentUsername, currentIsPublic, currentLogo, currentInstagram, currentTiktok, currentFacebook, currentPortfolioUrl]);

  // Validate username in real-time
  useEffect(() => {
    const validateUsername = async () => {
      if (!username || username === currentUsername) {
        setUsernameError(null);
        return;
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameError('Solo letras, números y guiones bajos');
        return;
      }

      if (username.length < 3) {
        setUsernameError('Mínimo 3 caracteres');
        return;
      }

      if (username.length > 30) {
        setUsernameError('Máximo 30 caracteres');
        return;
      }

      setCheckingUsername(true);
      try {
        const { data } = await supabase
          .from('clients')
          .select('id')
          .eq('username', username.toLowerCase())
          .neq('id', companyId)
          .maybeSingle();

        if (data) {
          setUsernameError('Este nombre de usuario ya está en uso');
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
  }, [username, currentUsername, companyId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Solo se permiten imágenes',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'El archivo es muy grande (máx 5MB)',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!selectedFile) return logoUrl;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `company-${companyId}-${Date.now()}.${fileExt}`;
      const filePath = `companies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el logo',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (usernameError) {
      toast({
        title: 'Error',
        description: usernameError,
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      if (selectedFile) {
        finalLogoUrl = await uploadLogo();
      }

      const { error } = await supabase
        .from('clients')
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          username: username.toLowerCase().trim() || null,
          is_public: isPublic,
          logo_url: finalLogoUrl,
          instagram: instagram.trim() || null,
          tiktok: tiktok.trim() || null,
          facebook: facebook.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: 'Perfil actualizado',
        description: 'Los cambios se guardaron correctamente',
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el perfil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Editar perfil de empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={logoPreview || logoUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Building2 className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la empresa</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de tu empresa"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="nombreempresa"
                className="pl-8"
              />
            </div>
            {checkingUsername && (
              <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
            )}
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            {username && !usernameError && !checkingUsername && (
              <p className="text-xs text-muted-foreground">
                Tu perfil estará en: /empresa/@{username}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Descripción</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos sobre tu empresa..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <Label>Redes sociales</Label>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="usuario_instagram"
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <Input
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="usuario_tiktok"
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://tuempresa.com"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">Perfil público</p>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Cualquiera puede ver tu perfil' : 'Solo usuarios asociados'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || uploading || !!usernameError}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}