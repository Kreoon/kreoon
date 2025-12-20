import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Save, X } from 'lucide-react';

interface ProfileEditorProps {
  userId: string;
  currentName: string;
  currentBio: string | null;
  currentAvatar: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ProfileEditor({
  userId,
  currentName,
  currentBio,
  currentAvatar,
  open,
  onOpenChange,
  onSave,
}: ProfileEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Archivo no válido',
        description: 'Por favor selecciona una imagen',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile) return avatarUrl;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error al subir imagen',
        description: 'No se pudo subir la foto de perfil',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa tu nombre',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Upload new avatar if selected
      const newAvatarUrl = await uploadAvatar();

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl,
        })
        .eq('id', userId);

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

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-2 ring-white/20">
                <AvatarImage src={displayAvatar || undefined} className="object-cover" />
                <AvatarFallback className="bg-zinc-800 text-white text-2xl">
                  {name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
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
            <p className="text-xs text-white/50">Toca el ícono para cambiar tu foto</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/70">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-white/40"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white/70">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos sobre ti..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-white/40 resize-none"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-white/40 text-right">{bio.length}/300</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
