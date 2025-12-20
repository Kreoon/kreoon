import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Download, FileVideo, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UploadedFile {
  name: string;
  url: string;
  size: number;
}

interface BunnyStorageUploaderProps {
  contentId: string;
  fileType: 'raw_video' | 'thumbnail';
  currentUrls?: string[] | null;
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  showDownload?: boolean;
  multiple?: boolean;
}

export function BunnyStorageUploader({ 
  contentId, 
  fileType,
  currentUrls = [],
  onUploadComplete,
  disabled,
  accept = "video/mp4,video/webm,video/quicktime,video/x-msvideo",
  label = "Subir archivo",
  showDownload = false,
  multiple,
}: BunnyStorageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    (currentUrls || []).filter(Boolean).map(url => ({
      name: url.split('/').pop() || 'archivo',
      url,
      size: 0
    }))
  );
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file sizes (max 5GB each)
    const maxSize = 5 * 1024 * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} supera los 5GB permitidos`,
          variant: "destructive"
        });
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);

    const newUploadedFiles: UploadedFile[] = [...uploadedFiles];

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("No autenticado");

      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseKey = (supabase as any).supabaseKey as string;
      if (!supabaseUrl || !supabaseKey) throw new Error("Configuración de backend no disponible");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        setProgress(0);

        // Simulate per-file upload progress
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const url = new URL(`${supabaseUrl}/functions/v1/bunny-storage`);
        url.searchParams.set('content_id', contentId);
        url.searchParams.set('file_type', fileType);
        url.searchParams.set('file_name', file.name);

        const res = await fetch(url.toString(), {
          method: 'PUT',
          headers: {
            apikey: supabaseKey,
            authorization: `Bearer ${accessToken}`,
            'content-type': file.type || 'application/octet-stream',
            'x-file-name': file.name,
            'x-file-type': fileType,
            'x-content-id': contentId,
          },
          body: file,
        });

        clearInterval(progressInterval);

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error || payload?.message || `Error ${res.status} al subir`);
        }

        setProgress(100);

        newUploadedFiles.push({
          name: file.name,
          url: payload.url,
          size: file.size
        });
      }

      setUploadedFiles(newUploadedFiles);
      onUploadComplete?.(newUploadedFiles.map(f => f.url));

      toast({
        title: "Archivos subidos",
        description: `${files.length} archivo(s) subido(s) correctamente`
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
      setCurrentFileIndex(0);
      setTotalFiles(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete?.(newFiles.map(f => f.url));
  };

  const handleDownload = async (url: string, index: number) => {
    setDownloadingIndex(index);
    
    try {
      // Use bunny-download edge function to get proper download URL
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: url }
      });

      if (error) throw error;

      if (data?.download_url) {
        // Open download URL in new tab
        window.open(data.download_url, '_blank');
        toast({
          title: "Descarga iniciada",
          description: data.title ? `Descargando: ${data.title}` : "El video se abrirá en una nueva pestaña"
        });
      } else {
        // Fallback: open the URL directly
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open URL directly
      window.open(url, '_blank');
    } finally {
      setDownloadingIndex(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const allowMultiple = multiple ?? true;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
        multiple={allowMultiple}
      />

      {/* Upload Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={uploadedFiles.length > 0 ? 'outline' : 'default'}
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {uploading 
            ? `Subiendo ${currentFileIndex}/${totalFiles}...` 
            : uploadedFiles.length > 0 
              ? 'Agregar más archivos' 
              : label
          }
        </Button>

        {uploadedFiles.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {uploadedFiles.length} archivo(s)
          </Badge>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Subiendo archivo {currentFileIndex} de {totalFiles}... {progress}%
          </p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && !uploading && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {uploadedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileVideo className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate" title={file.name}>{file.name}</span>
                {file.size > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {showDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(file.url, index)}
                    disabled={downloadingIndex === index}
                    title="Descargar"
                  >
                    {downloadingIndex === index ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveFile(index)}
                    title="Eliminar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {uploadedFiles.length} archivo(s) listo(s)
        </p>
      )}
    </div>
  );
}
