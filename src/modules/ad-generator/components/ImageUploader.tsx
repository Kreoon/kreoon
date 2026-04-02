import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../config';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  storagePath: string;
  className?: string;
}

export function ImageUploader({ value, onChange, label, storagePath, className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'Error', description: `Archivo muy grande. Máximo ${MAX_IMAGE_SIZE_MB}MB.`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${storagePath}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ad-generator')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ad-generator')
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: 'Error al subir imagen', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [onChange, storagePath, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: uploading,
  });

  if (value) {
    return (
      <div className={cn("relative group", className)}>
        {label && <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>}
        <div className="relative rounded-sm overflow-hidden border border-border bg-muted/30">
          <img src={value} alt="Preview" className="w-full h-32 object-cover" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 hover:bg-destructive hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-sm p-4 text-center cursor-pointer transition-colors h-32 flex flex-col items-center justify-center gap-2",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Arrastra o haz clic</p>
          </>
        )}
      </div>
    </div>
  );
}
