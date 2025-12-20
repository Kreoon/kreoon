import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Download, FileVideo, RefreshCw } from "lucide-react";

interface BunnyStorageUploaderProps {
  contentId: string;
  fileType: 'raw_video' | 'thumbnail';
  currentUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  showDownload?: boolean;
}

export function BunnyStorageUploader({ 
  contentId, 
  fileType,
  currentUrl,
  onUploadComplete,
  disabled,
  accept = "video/mp4,video/webm,video/quicktime,video/x-msvideo",
  label = "Subir archivo",
  showDownload = false
}: BunnyStorageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede superar los 5GB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content_id', contentId);
      formData.append('file_type', fileType);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('bunny-storage', {
        body: formData
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setProgress(100);
      setUploadedUrl(data.url);
      onUploadComplete?.(data.url);

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente a Bunny.net"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = () => {
    const url = uploadedUrl || currentUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const displayUrl = uploadedUrl || currentUrl;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={displayUrl ? 'outline' : 'default'}
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : displayUrl ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'Subiendo...' : displayUrl ? 'Reemplazar' : label}
        </Button>

        {showDownload && displayUrl && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Subiendo... {progress}%</p>
        </div>
      )}

      {displayUrl && !uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileVideo className="h-3 w-3" />
          <span className="truncate max-w-[200px]" title={displayUrl}>
            {displayUrl.split('/').pop()}
          </span>
        </div>
      )}
    </div>
  );
}
