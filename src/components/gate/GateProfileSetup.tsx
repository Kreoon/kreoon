import { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function GateProfileSetup() {
  const { user, profile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, isUploading, progress } = useMediaUpload();

  const hasAvatar = !!avatarUrl;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede pesar mas de 5MB');
      return;
    }

    try {
      // Upload to Bunny CDN (optimized WebP, 256x256)
      const result = await uploadAvatar(file, user.id);

      if (!result) {
        throw new Error('Error al subir la imagen');
      }

      const { cdnUrl } = result;

      // Update profiles table
      await supabase.from('profiles').update({ avatar_url: cdnUrl }).eq('id', user.id);

      // Also update creator_profiles if exists
      await (supabase as any).from('creator_profiles').update({ avatar_url: cdnUrl }).eq('user_id', user.id);

      setAvatarUrl(cdnUrl);
      toast.success('Foto de perfil actualizada');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir la imagen');
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-white font-semibold mb-2">Tu Perfil</h3>
      <p className="text-white/50 text-xs mb-4">
        Completa tu perfil para que cuentes como referido calificado para quien te invito.
      </p>

      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div
          className={cn(
            'relative w-16 h-16 rounded-full border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all',
            hasAvatar ? 'border-green-500/40' : 'border-dashed border-white/20 hover:border-purple-500/40'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-white/30" />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {hasAvatar ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Upload className="w-4 h-4 text-white/30" />
            )}
            <span className={cn('text-sm', hasAvatar ? 'text-green-400' : 'text-white/50')}>
              {hasAvatar ? 'Foto de perfil subida' : 'Sube tu foto de perfil'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {hasAvatar ? 'Cambiar foto' : 'Subir foto'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>
    </Card>
  );
}
